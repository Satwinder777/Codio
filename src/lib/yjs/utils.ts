// Base64 and Uint8Array binary conversion utilities for Yjs CRDT payloads
import * as Y from 'yjs';

/**
 * Builds a persisted text snapshot as a shared Yjs genesis update.
 * Clients opening the same room revision receive identical CRDT items, so
 * simultaneous first joins cannot duplicate the starter document.
 */
export function createSnapshotUpdate(roomId: string, revision: number, content: string): Uint8Array {
  const seed = `${roomId}:${revision}:${content}`;
  let clientId = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    clientId = Math.imul(clientId ^ seed.charCodeAt(index), 16777619);
  }
  clientId >>>= 0;
  if (clientId === 0) clientId = 1;

  const snapshotDoc = new Y.Doc();
  snapshotDoc.clientID = clientId;
  if (content.length > 0) snapshotDoc.getText('monaco').insert(0, content);
  const update = Y.encodeStateAsUpdate(snapshotDoc);
  snapshotDoc.destroy();
  return update;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const buf = Buffer.from(base64, 'base64');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

// Random collaborator colors for distinct cursor avatars
export const COLLABORATOR_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
];

export function getRandomColor(seed?: string): string {
  if (!seed) {
    return COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)];
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLLABORATOR_COLORS.length;
  return COLLABORATOR_COLORS[index];
}
