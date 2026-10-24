import * as Y from 'yjs';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { ConnectionStatus, PeerPresence, CollaboratorUser } from '@/types';
import { uint8ArrayToBase64, base64ToUint8Array } from './utils';

export interface ProviderOptions {
  onStatusChange?: (status: ConnectionStatus) => void;
  onPeersChange?: (peers: PeerPresence[]) => void;
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
  private syncStep1Sent: boolean = false;

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

  private handleLocalDocUpdate = (update: Uint8Array, origin: any) => {
    // Prevent echo loop: only broadcast updates that originated locally
    if (origin === this) return;

    const base64Update = uint8ArrayToBase64(update);

    if (this.channel) {
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

    // Remove any pre-existing channel instance on this topic to avoid duplicate callback errors
    try {
      const existingChannels = this.supabase.getChannels();
      const existing = existingChannels.find((ch: any) => ch.topic === `realtime:${channelName}` || ch.topic === channelName);
      if (existing) {
        this.supabase.removeChannel(existing);
      }
    } catch {
      // ignore
    }

    this.channel = this.supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: this.user.id },
      },
    });

    // Handle incoming Yjs updates
    this.channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
      if (payload.senderId === this.user.id) return;
      try {
        const update = base64ToUint8Array(payload.update);
        Y.applyUpdate(this.doc, update, this);
      } catch (err) {
        console.error('[SupabaseYjsProvider] Failed to apply remote update:', err);
      }
    });

    // Handle sync handshake step 1 (a peer asks for document state)
    this.channel.on('broadcast', { event: 'yjs-sync-step-1' }, ({ payload }) => {
      if (payload.senderId === this.user.id) return;
      try {
        const remoteStateVector = base64ToUint8Array(payload.stateVector);
        const update = Y.encodeStateAsUpdate(this.doc, remoteStateVector);
        if (update.byteLength > 0) {
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
      if (payload.targetId && payload.targetId !== this.user.id) return;
      try {
        const update = base64ToUint8Array(payload.update);
        Y.applyUpdate(this.doc, update, this);
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
          const latest: any = presences[presences.length - 1];
          if (latest && latest.id !== this.user.id) {
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

        // Send sync step 1 handshake
        const stateVector = Y.encodeStateVector(this.doc);
        this.channel?.send({
          type: 'broadcast',
          event: 'yjs-sync-step-1',
          payload: {
            senderId: this.user.id,
            stateVector: uint8ArrayToBase64(stateVector),
          },
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.setStatus('reconnecting');
      } else if (status === 'CLOSED') {
        this.setStatus('offline');
      }
    });
  }

  private connectLocalBroadcastChannel() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      this.setStatus('connected');
      return;
    }

    this.setStatus('connecting');
    const channelName = `codio-local-room-${this.roomId}`;
    this.localBroadcastChannel = new BroadcastChannel(channelName);

    this.localBroadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'yjs-update' && data.senderId !== this.user.id) {
        try {
          const update = base64ToUint8Array(data.update);
          Y.applyUpdate(this.doc, update, this);
        } catch (err) {
          console.error('[LocalBroadcast] Failed to apply update:', err);
        }
      } else if (data.type === 'sync-step-1' && data.senderId !== this.user.id) {
        try {
          const remoteStateVector = base64ToUint8Array(data.stateVector);
          const update = Y.encodeStateAsUpdate(this.doc, remoteStateVector);
          if (update.byteLength > 0) {
            this.localBroadcastChannel?.postMessage({
              type: 'sync-step-2',
              targetId: data.senderId,
              update: uint8ArrayToBase64(update),
            });
          }
        } catch (err) {}
      } else if (data.type === 'sync-step-2' && (data.targetId === this.user.id || !data.targetId)) {
        try {
          const update = base64ToUint8Array(data.update);
          Y.applyUpdate(this.doc, update, this);
        } catch (err) {}
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
