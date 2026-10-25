import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CollaboratorUser } from '@/types';
import { SupabaseYjsProvider } from '../SupabaseYjsProvider';

class TestBroadcastChannel {
  static channels = new Map<string, Set<TestBroadcastChannel>>();
  onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Set<TestBroadcastChannel>;

  constructor(name: string) {
    this.listeners = TestBroadcastChannel.channels.get(name) || new Set();
    this.listeners.add(this);
    TestBroadcastChannel.channels.set(name, this.listeners);
  }

  postMessage(data: unknown) {
    this.listeners.forEach((channel) => {
      if (channel !== this) channel.onmessage?.({ data } as MessageEvent);
    });
  }

  close() {
    this.listeners.delete(this);
  }

  static reset() {
    TestBroadcastChannel.channels.clear();
  }
}

type BroadcastMessage = { type: 'broadcast'; event: string; payload: unknown };

class TestRealtimeChannel {
  static channels = new Map<string, Set<TestRealtimeChannel>>();
  private handlers = new Map<string, (message: { payload: unknown }) => void>();
  private listeners: Set<TestRealtimeChannel>;

  constructor(name: string) {
    this.listeners = TestRealtimeChannel.channels.get(name) || new Set();
    this.listeners.add(this);
    TestRealtimeChannel.channels.set(name, this.listeners);
  }

  on(_type: 'broadcast', filter: { event: string }, callback: (message: { payload: unknown }) => void) {
    this.handlers.set(filter.event, callback);
    return this;
  }

  subscribe(callback: (status: string) => void) {
    setTimeout(() => callback('SUBSCRIBED'), 0);
    return this;
  }

  async send(message: BroadcastMessage) {
    this.listeners.forEach((channel) => {
      if (channel !== this) channel.handlers.get(message.event)?.({ payload: message.payload });
    });
    return 'ok';
  }

  track() { return Promise.resolve('ok'); }
  untrack() { return Promise.resolve('ok'); }
  presenceState() { return {}; }

  close() {
    this.listeners.delete(this);
  }

  static reset() {
    TestRealtimeChannel.channels.clear();
  }
}

function fakeSupabaseClient(): SupabaseClient {
  return {
    channel: (name: string) => new TestRealtimeChannel(name),
    removeChannel: (channel: TestRealtimeChannel) => {
      channel.close();
      return Promise.resolve('ok');
    },
  } as unknown as SupabaseClient;
}

const user = (id: string): CollaboratorUser => ({ id, name: id, color: '#6366f1' });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  TestBroadcastChannel.reset();
  TestRealtimeChannel.reset();
});

describe('local room provider sync', () => {
  it('synchronizes inserts, edits, and deletions between room participants', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {});
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);

    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const peerChanges: number[] = [];
    const options = {
      initialSnapshot: { content: 'first line\nsecond line', revision: 3 },
    };
    const providerA = new SupabaseYjsProvider('same-room', docA, user('a'), null, options);
    const providerB = new SupabaseYjsProvider('same-room', docB, user('b'), null, {
      ...options,
      onPeersChange: (peers) => peerChanges.push(peers.length),
    });

    await vi.advanceTimersByTimeAsync(1000);
    const textA = docA.getText('monaco');
    const textB = docB.getText('monaco');
    expect(textA.toString()).toBe('first line\nsecond line');
    expect(textB.toString()).toBe(textA.toString());

    docA.transact(() => {
      textA.delete(0, textA.length);
      textA.insert(0, 'updated by collaborator');
    });
    expect(textB.toString()).toBe('updated by collaborator');

    textA.delete(0, textA.length);
    expect(textB.toString()).toBe('');
    expect(providerB.peers.has('a')).toBe(true);

    providerA.destroy();
    expect(providerB.peers.has('a')).toBe(false);
    expect(peerChanges.at(-1)).toBe(0);

    providerB.destroy();
    docA.destroy();
    docB.destroy();
  });

  it('delivers edits made during connection through Supabase Realtime', async () => {
    vi.useFakeTimers();
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const textA = docA.getText('monaco');
    const textB = docB.getText('monaco');
    textA.insert(0, 'typed before connection');

    const providerA = new SupabaseYjsProvider('remote-room', docA, user('remote-a'), fakeSupabaseClient(), {});
    const providerB = new SupabaseYjsProvider('remote-room', docB, user('remote-b'), fakeSupabaseClient(), {});

    await vi.advanceTimersByTimeAsync(0);
    expect(textB.toString()).toBe('typed before connection');

    docA.transact(() => {
      textA.delete(0, textA.length);
      textA.insert(0, 'replaced remotely');
    });
    expect(textB.toString()).toBe('replaced remotely');

    textA.delete(0, textA.length);
    expect(textB.toString()).toBe('');

    providerA.destroy();
    providerB.destroy();
    docA.destroy();
    docB.destroy();
  });
});
