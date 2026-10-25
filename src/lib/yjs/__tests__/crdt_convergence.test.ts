import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { uint8ArrayToBase64, base64ToUint8Array, createSnapshotUpdate } from '../utils';

describe('Yjs CRDT Real-time Concurrency & Convergence', () => {
  it('converts Uint8Array to base64 and back with byte-for-byte fidelity', () => {
    const original = new Uint8Array([0, 1, 42, 128, 255, 64, 18, 99]);
    const b64 = uint8ArrayToBase64(original);
    const decoded = base64ToUint8Array(b64);

    expect(decoded.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(decoded[i]).toBe(original[i]);
    }
  });

  it('converges two Yjs documents with concurrent edits without data loss', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const text1 = doc1.getText('monaco');
    const text2 = doc2.getText('monaco');

    // Initial synchronized baseline
    text1.insert(0, 'function calculate() {\n');
    const initUpdate = Y.encodeStateAsUpdate(doc1);
    Y.applyUpdate(doc2, initUpdate);

    expect(text2.toString()).toBe('function calculate() {\n');

    // Concurrent edits: Client 1 types return 42; Client 2 types // note
    text1.insert(23, '  return 42;\n}');
    text2.insert(0, '// Author: Antigravity\n');

    // Exchange updates
    const updateFrom1 = Y.encodeStateAsUpdate(doc1, Y.encodeStateVector(doc2));
    const updateFrom2 = Y.encodeStateAsUpdate(doc2, Y.encodeStateVector(doc1));

    Y.applyUpdate(doc2, updateFrom1);
    Y.applyUpdate(doc1, updateFrom2);

    // Both documents must converge to the exact same text
    expect(text1.toString()).toBe(text2.toString());
    expect(text1.toString()).toContain('Author: Antigravity');
    expect(text1.toString()).toContain('return 42;');
  });

  it('performs initial state sync handshake (SyncStep1 / SyncStep2)', () => {
    const serverDoc = new Y.Doc();
    const serverText = serverDoc.getText('monaco');
    serverText.insert(0, 'console.log("Welcome to Codio!");');

    // New client doc starts empty
    const clientDoc = new Y.Doc();
    const clientText = clientDoc.getText('monaco');
    expect(clientText.toString()).toBe('');

    // Client sends state vector (Step 1)
    const clientStateVector = Y.encodeStateVector(clientDoc);

    // Server encodes difference (Step 2)
    const diffUpdate = Y.encodeStateAsUpdate(serverDoc, clientStateVector);

    // Client applies update
    Y.applyUpdate(clientDoc, diffUpdate);

    expect(clientText.toString()).toBe('console.log("Welcome to Codio!");');
  });

  it('handles multiple clients typing simultaneously at the same offset', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const docC = new Y.Doc();

    const textA = docA.getText('monaco');
    const textB = docB.getText('monaco');
    const textC = docC.getText('monaco');

    textA.insert(0, 'A');
    textB.insert(0, 'B');
    textC.insert(0, 'C');

    // Broadcast all to all
    const uA = Y.encodeStateAsUpdate(docA);
    const uB = Y.encodeStateAsUpdate(docB);
    const uC = Y.encodeStateAsUpdate(docC);

    Y.applyUpdate(docB, uA);
    Y.applyUpdate(docC, uA);

    Y.applyUpdate(docA, uB);
    Y.applyUpdate(docC, uB);

    Y.applyUpdate(docA, uC);
    Y.applyUpdate(docB, uC);

    // All must be identical length 3 and contain A, B, C
    expect(textA.toString()).toBe(textB.toString());
    expect(textB.toString()).toBe(textC.toString());
    expect(textA.toString().length).toBe(3);
    expect(textA.toString()).toContain('A');
    expect(textA.toString()).toContain('B');
    expect(textA.toString()).toContain('C');
  });

  it('uses the same persisted snapshot seed for simultaneous room joins', () => {
    const snapshot = createSnapshotUpdate('shared-room', 4, 'starter code\n');
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    Y.applyUpdate(docA, snapshot);
    Y.applyUpdate(docB, snapshot);

    expect(docA.getText('monaco').toString()).toBe('starter code\n');
    expect(docB.getText('monaco').toString()).toBe('starter code\n');

    docA.getText('monaco').insert(0, '// from A\n');
    docB.getText('monaco').insert(0, '// from B\n');
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA)));
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB)));

    expect(docA.getText('monaco').toString()).toBe(docB.getText('monaco').toString());
    expect(docA.getText('monaco').toString()).toContain('starter code');
    expect(docA.getText('monaco').toString()).toContain('// from A');
    expect(docA.getText('monaco').toString()).toContain('// from B');

    docA.destroy();
    docB.destroy();
  });
});
