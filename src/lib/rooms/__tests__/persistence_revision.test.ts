import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, getRoomDetails, persistSnapshot } from '../store';

describe('Room Snapshot Persistence & Monotonic Revision Control', () => {
  let roomId: string;
  let publicId: string;

  beforeEach(async () => {
    const res = await createRoom({
      title: 'Revision Test Room',
      language: 'typescript',
      visibility: 'unlisted',
      defaultAccessMode: 'editor',
    });
    roomId = res.roomId;
    publicId = res.publicId;
  });

  it('initializes a document with revision 1', async () => {
    const details = await getRoomDetails(publicId);
    expect(details).not.toBeNull();
    expect(details?.document.revision).toBe(1);
    expect(details?.document.language).toBe('typescript');
  });

  it('increments revision sequentially on valid snapshot saves', async () => {
    const save1 = await persistSnapshot(publicId, {
      content: 'console.log("version 1");',
      revision: 1,
    });
    expect(save1.success).toBe(true);
    expect(save1.revision).toBe(2);

    const save2 = await persistSnapshot(publicId, {
      content: 'console.log("version 2");',
      revision: 2,
    });
    expect(save2.success).toBe(true);
    expect(save2.revision).toBe(3);

    const updated = await getRoomDetails(publicId);
    expect(updated?.document.content_snapshot).toBe('console.log("version 2");');
    expect(updated?.document.revision).toBe(3);
  });

  it('rejects stale / out-of-order snapshots (revision conflict)', async () => {
    // Save version with revision 1 -> produces revision 2
    await persistSnapshot(publicId, {
      content: 'console.log("fresh save");',
      revision: 1,
    });

    // An outdated client tries to save an older revision 0 or 1
    const staleSave = await persistSnapshot(publicId, {
      content: 'console.log("stale overwrite attempt");',
      revision: 1,
    });

    expect(staleSave.success).toBe(false);
    expect(staleSave.error).toContain('Revision conflict');

    // Verify document content was preserved and not overwritten
    const doc = await getRoomDetails(publicId);
    expect(doc?.document.content_snapshot).toBe('console.log("fresh save");');
  });
});
