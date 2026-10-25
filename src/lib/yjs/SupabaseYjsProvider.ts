import * as Y from 'yjs';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { ConnectionStatus, PeerPresence, CollaboratorUser } from '@/types';
import { uint8ArrayToBase64, base64ToUint8Array, createSnapshotUpdate } from './utils';

export interface ProviderOptions {
  onStatusChange?: (status: ConnectionStatus) => void;
  onPeersChange?: (peers: PeerPresence[]) => void;
  onInitialStateReady?: () => void;
  initialSnapshot?: { content: string; revision: number };
}

export class SupabaseYjsProvider {
  public readonly doc: Y.Doc;
  public readonly roomId: string;
  public readonly user: CollaboratorUser;
  public status: ConnectionStatus = 'connecting';
  public peers: Map<string, PeerPresence> = new Map();

  private supabase: SupabaseClient | null;
  private channel: RealtimeChannel | null = null;
  private localBroadcastChannel: BroadcastChannel | null = null;
  private options: ProviderOptions;
  private isDestroyed: boolean = false;
  private receivedRemoteState = false;
  private initialStateReady = false;
  private initialSnapshotTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    roomId: string,
    doc: Y.Doc,
    user: CollaboratorUser,
    supabase: SupabaseClient | null,
    options: ProviderOptions = {}
  ) {
    this.roomId = roomId;
    this.doc = doc;
    this.user = user;
    this.supabase = supabase;
    this.options = options;

    this.init();
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status !== status) {
      this.status = status;
      this.options.onStatusChange?.(status);
    }
  }

  private notifyPeers() {
    this.options.onPeersChange?.(Array.from(this.peers.values()));
  }

  private init() {
    // 1. Listen to local Yjs document changes and broadcast them
    this.doc.on('update', this.handleLocalDocUpdate);

    // 2. Connect to Supabase Realtime or fallback to local BroadcastChannel
    if (this.supabase) {
      this.connectSupabase();
    } else {
      this.connectLocalBroadcastChannel();
    }
  }

  private handleLocalDocUpdate = (update: Uint8Array, origin: unknown) => {
    // Prevent echo loop: only broadcast updates that originated locally
    if (origin === this || this.isDestroyed) return;

    const base64Update = uint8ArrayToBase64(update);

    if (this.channel && this.status === 'connected') {
      this.channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { update: base64Update, senderId: this.user.id },
      });
    }

    if (this.localBroadcastChannel) {
      this.localBroadcastChannel.postMessage({
        type: 'yjs-update',
        update: base64Update,
        senderId: this.user.id,
      });
    }
  };

  private connectSupabase() {
    if (!this.supabase || this.isDestroyed) return;

    this.setStatus('connecting');
    const channelName = `room:${this.roomId}`;

    this.channel = this.supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: this.user.id },
      },
    });

    // Handle incoming Yjs updates
    this.channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
      if (this.isDestroyed || typeof payload?.update !== 'string') return;
      if (payload.senderId === this.user.id) return;
      try {
        const update = base64ToUint8Array(payload.update);
        Y.applyUpdate(this.doc, update, this);
        this.receivedRemoteState ||= Y.encodeStateVector(this.doc).byteLength > 1;
        if (this.receivedRemoteState) this.markInitialStateReady();
      } catch (err) {
        console.error('[SupabaseYjsProvider] Failed to apply remote update:', err);
      }
    });

    // Handle sync handshake step 1 (a peer asks for document state)
    this.channel.on('broadcast', { event: 'yjs-sync-step-1' }, ({ payload }) => {
      if (this.isDestroyed || typeof payload?.stateVector !== 'string') return;
      if (payload.senderId === this.user.id) return;
      try {
        const remoteStateVector = base64ToUint8Array(payload.stateVector);
        const update = Y.encodeStateAsUpdate(this.doc, remoteStateVector);
        if (update.byteLength > 0 && Y.encodeStateVector(this.doc).byteLength > 1) {
          this.channel?.send({
            type: 'broadcast',
            event: 'yjs-sync-step-2',
            payload: {
              targetId: payload.senderId,
              update: uint8ArrayToBase64(update),
            },
          });
        }
      } catch (err) {
        console.error('[SupabaseYjsProvider] Failed to process sync step 1:', err);
      }
    });

    // Handle sync handshake step 2 (peer sent us document state diff)
    this.channel.on('broadcast', { event: 'yjs-sync-step-2' }, ({ payload }) => {
      if (this.isDestroyed || typeof payload?.update !== 'string') return;
      if (payload.targetId && payload.targetId !== this.user.id) return;
      try {
        const update = base64ToUint8Array(payload.update);
        Y.applyUpdate(this.doc, update, this);
        this.receivedRemoteState ||= Y.encodeStateVector(this.doc).byteLength > 1;
        if (this.receivedRemoteState) this.markInitialStateReady();
      } catch (err) {
        console.error('[SupabaseYjsProvider] Failed to apply sync step 2 update:', err);
      }
    });

    // Handle Presence updates
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel?.presenceState() || {};
      const newPeers = new Map<string, PeerPresence>();

      Object.entries(state).forEach(([key, presences]) => {
        if (Array.isArray(presences) && presences.length > 0) {
          const latest = presences[presences.length - 1] as (Partial<CollaboratorUser> & { lastActive?: number }) | undefined;
          if (latest?.id && latest.id !== this.user.id) {
            newPeers.set(key, {
              clientId: key,
              user: {
                id: latest.id,
                name: latest.name || 'Anonymous Coder',
                color: latest.color || '#6366f1',
                avatar: latest.avatar,
                cursor: latest.cursor,
              },
              lastActive: latest.lastActive || Date.now(),
            });
          }
        }
      });

      this.peers = newPeers;
      this.notifyPeers();
    });

    // Subscribe to channel
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.setStatus('connected');

        // Track our presence
        await this.channel?.track({
          id: this.user.id,
          name: this.user.name,
          color: this.user.color,
          avatar: this.user.avatar,
          cursor: null,
          lastActive: Date.now(),
        });

        // Send local edits made while connecting, then request state from peers.
        const localState = Y.encodeStateAsUpdate(this.doc);
        if (localState.byteLength > 0 && Y.encodeStateVector(this.doc).byteLength > 1) {
          await this.channel?.send({
            type: 'broadcast',
            event: 'yjs-update',
            payload: {
              update: uint8ArrayToBase64(localState),
              senderId: this.user.id,
            },
          });
        }

        const stateVector = Y.encodeStateVector(this.doc);
        this.channel?.send({
          type: 'broadcast',
          event: 'yjs-sync-step-1',
          payload: {
            senderId: this.user.id,
            stateVector: uint8ArrayToBase64(stateVector),
          },
        });
        this.scheduleInitialSnapshotSeed();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.setStatus('reconnecting');
        this.scheduleInitialSnapshotSeed();
      } else if (status === 'CLOSED') {
        this.setStatus('offline');
        this.scheduleInitialSnapshotSeed();
      }
    });
  }

  private connectLocalBroadcastChannel() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      this.setStatus('connected');
      this.scheduleInitialSnapshotSeed();
      return;
    }

    this.setStatus('connecting');
    const channelName = `codio-local-room-${this.roomId}`;
    this.localBroadcastChannel = new BroadcastChannel(channelName);

    this.localBroadcastChannel.onmessage = (event) => {
      if (this.isDestroyed) return;
      const data = event.data;
      if (!data) return;

      if (data.type === 'yjs-update' && data.senderId !== this.user.id) {
        try {
          const update = base64ToUint8Array(data.update);
          Y.applyUpdate(this.doc, update, this);
          this.receivedRemoteState ||= Y.encodeStateVector(this.doc).byteLength > 1;
          if (this.receivedRemoteState) this.markInitialStateReady();
        } catch (err) {
          console.error('[LocalBroadcast] Failed to apply update:', err);
        }
      } else if (data.type === 'sync-step-1' && data.senderId !== this.user.id) {
        try {
          const remoteStateVector = base64ToUint8Array(data.stateVector);
          const update = Y.encodeStateAsUpdate(this.doc, remoteStateVector);
          if (update.byteLength > 0 && Y.encodeStateVector(this.doc).byteLength > 1) {
            this.localBroadcastChannel?.postMessage({
              type: 'sync-step-2',
              targetId: data.senderId,
              update: uint8ArrayToBase64(update),
            });
          }
        } catch {}
      } else if (data.type === 'sync-step-2' && (data.targetId === this.user.id || !data.targetId)) {
        try {
          const update = base64ToUint8Array(data.update);
          Y.applyUpdate(this.doc, update, this);
          this.receivedRemoteState ||= Y.encodeStateVector(this.doc).byteLength > 1;
          if (this.receivedRemoteState) this.markInitialStateReady();
        } catch {}
      } else if (data.type === 'presence-ping' && data.senderId !== this.user.id) {
        this.peers.set(data.senderId, {
          clientId: data.senderId,
          user: data.user,
          lastActive: Date.now(),
        });
        this.notifyPeers();

        // Respond with our presence
        if (data.isGreeting) {
          this.localBroadcastChannel?.postMessage({
            type: 'presence-ping',
            senderId: this.user.id,
            user: this.user,
            isGreeting: false,
          });
        }
      } else if (data.type === 'presence-leave' && data.senderId !== this.user.id) {
        this.peers.delete(data.senderId);
        this.notifyPeers();
      }
    };

    this.setStatus('connected');

    // Announce presence and request initial state
    const stateVector = Y.encodeStateVector(this.doc);
    this.localBroadcastChannel.postMessage({
      type: 'sync-step-1',
      senderId: this.user.id,
      stateVector: uint8ArrayToBase64(stateVector),
    });

    this.localBroadcastChannel.postMessage({
      type: 'presence-ping',
      senderId: this.user.id,
      user: this.user,
      isGreeting: true,
    });
    this.scheduleInitialSnapshotSeed();
  }

  private scheduleInitialSnapshotSeed() {
    const snapshot = this.options.initialSnapshot;
    if (!snapshot || this.initialSnapshotTimer || this.initialStateReady || this.isDestroyed) return;

    // Allow an open peer to send its Yjs state first. Concurrent first joins
    // seed identical updates derived from the same persisted snapshot.
    this.initialSnapshotTimer = setTimeout(() => {
      this.initialSnapshotTimer = null;
      if (this.isDestroyed) return;
      if (!this.receivedRemoteState && this.doc.getText('monaco').length === 0 && snapshot.content.length > 0) {
        const update = createSnapshotUpdate(this.roomId, snapshot.revision, snapshot.content);
        Y.applyUpdate(this.doc, update, 'codio-initial-snapshot');
      }
      this.markInitialStateReady();
    }, 1000);
  }

  private markInitialStateReady() {
    if (this.initialStateReady || this.isDestroyed) return;
    this.initialStateReady = true;
    if (this.initialSnapshotTimer) {
      clearTimeout(this.initialSnapshotTimer);
      this.initialSnapshotTimer = null;
    }
    this.options.onInitialStateReady?.();
  }

  public updateCursor(lineNumber: number, column: number) {
    if (this.isDestroyed) return;

    this.user.cursor = { lineNumber, column };

    if (this.channel) {
      this.channel.track({
        id: this.user.id,
        name: this.user.name,
        color: this.user.color,
        avatar: this.user.avatar,
        cursor: { lineNumber, column },
        lastActive: Date.now(),
      });
    }

    if (this.localBroadcastChannel) {
      this.localBroadcastChannel.postMessage({
        type: 'presence-ping',
        senderId: this.user.id,
        user: { ...this.user, cursor: { lineNumber, column } },
        isGreeting: false,
      });
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.initialSnapshotTimer) {
      clearTimeout(this.initialSnapshotTimer);
      this.initialSnapshotTimer = null;
    }
    this.doc.off('update', this.handleLocalDocUpdate);

    if (this.channel) {
      this.channel.untrack();
      this.supabase?.removeChannel(this.channel);
      this.channel = null;
    }

    if (this.localBroadcastChannel) {
      this.localBroadcastChannel.postMessage({
        type: 'presence-leave',
        senderId: this.user.id,
      });
      this.localBroadcastChannel.close();
      this.localBroadcastChannel = null;
    }

    this.peers.clear();
    this.setStatus('offline');
  }
}
