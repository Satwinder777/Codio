import { describe, expect, it } from 'vitest';
import { createRoom, getOrCreateRoom } from '../store';

describe('room identity across creation and navigation', () => {
  it('creates lowercase share ids and keeps the selected title and language', async () => {
    const created = await createRoom({
      title: 'Python Pair Session',
      language: 'python',
      visibility: 'unlisted',
      defaultAccessMode: 'editor',
    });

    expect(created.publicId).toMatch(/^[a-z0-9_-]{12}$/);

    const room = await getOrCreateRoom(created.publicId);
    expect(room?.room.title).toBe('Python Pair Session');
    expect(room?.document.language).toBe('python');
    expect(room?.document.file_name).toBe('main.py');
  });

  it('does not create rooms for empty, punctuation-only, or overlong path ids', async () => {
    await expect(getOrCreateRoom('!!!')).resolves.toBeNull();
    await expect(getOrCreateRoom('---')).resolves.toBeNull();
    await expect(getOrCreateRoom('a'.repeat(41))).resolves.toBeNull();
  });
});
