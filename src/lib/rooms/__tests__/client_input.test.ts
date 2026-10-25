import { describe, expect, it } from 'vitest';
import { CreateRoomSchema, PersistSnapshotSchema, UpdateRoomSchema } from '@/lib/validation/schemas';
import {
  DEFAULT_ROOM_TITLE,
  extractRoomError,
  extractRoomPath,
  MAX_ROOM_TITLE_LENGTH,
  normalizeRoomTitle,
} from '../client-input';

describe('room creation input helpers', () => {
  it('uses a safe default for an empty or whitespace-only title', () => {
    expect(normalizeRoomTitle('')).toBe(DEFAULT_ROOM_TITLE);
    expect(normalizeRoomTitle('   \n  ')).toBe(DEFAULT_ROOM_TITLE);
  });

  it('trims the title without changing its inner spacing', () => {
    expect(normalizeRoomTitle('  Pair   session  ')).toBe('Pair   session');
  });

  it('accepts the API room link and rejects malformed or unsafe room ids', () => {
    expect(extractRoomPath({ publicId: 'pair_session-7' })).toBe('/pair_session-7');
    expect(extractRoomPath({ publicId: '../settings' })).toBeNull();
    expect(extractRoomPath({ publicId: 'a'.repeat(41) })).toBeNull();
    expect(extractRoomPath({ url: '//example.com' })).toBeNull();
    expect(extractRoomPath(null)).toBeNull();
  });

  it('shows only non-empty error messages from object responses', () => {
    expect(extractRoomError({ error: 'Room name is already taken.' })).toBe('Room name is already taken.');
    expect(extractRoomError({ error: '  ' })).toBeNull();
    expect(extractRoomError('server error')).toBeNull();
    expect(extractRoomError(null)).toBeNull();
  });
});

describe('room request schemas', () => {
  it('applies create-room defaults and accepts the maximum title length', () => {
    const parsed = CreateRoomSchema.safeParse({ title: 'x'.repeat(MAX_ROOM_TITLE_LENGTH) });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.language).toBe('typescript');
      expect(parsed.data.visibility).toBe('unlisted');
      expect(parsed.data.defaultAccessMode).toBe('editor');
    }
  });

  it('rejects invalid room titles, languages, visibility and access modes', () => {
    expect(CreateRoomSchema.safeParse({ title: '' }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ title: 'x'.repeat(MAX_ROOM_TITLE_LENGTH + 1) }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ language: '' }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ language: 'not-a-language' }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ language: 'PYTHON' }).success).toBe(true);
    expect(CreateRoomSchema.safeParse({ visibility: 'friends-only' }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ defaultAccessMode: 'admin' }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ customSlug: '!!!' }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ customSlug: 'a'.repeat(41) }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ customSlug: 'Pair_Interview-2' }).success).toBe(true);
  });

  it('rejects empty room updates and invalid update values', () => {
    expect(UpdateRoomSchema.safeParse({}).success).toBe(false);
    expect(UpdateRoomSchema.safeParse({ title: 'Renamed', isClosed: false }).success).toBe(true);
    expect(UpdateRoomSchema.safeParse({ title: '  ' }).success).toBe(false);
    expect(UpdateRoomSchema.safeParse({ isClosed: 'false' }).success).toBe(false);
  });

  it('accepts an empty document at the size boundary and rejects oversized or invalid revisions', () => {
    expect(PersistSnapshotSchema.safeParse({ content: '', revision: 0 }).success).toBe(true);
    expect(PersistSnapshotSchema.safeParse({ content: 'x'.repeat(1024 * 1024), revision: 1 }).success).toBe(true);
    expect(PersistSnapshotSchema.safeParse({ content: 'x'.repeat(1024 * 1024 + 1), revision: 1 }).success).toBe(false);
    expect(PersistSnapshotSchema.safeParse({ content: 'ok', revision: -1 }).success).toBe(false);
    expect(PersistSnapshotSchema.safeParse({ content: 'ok', revision: 1.5 }).success).toBe(false);
    expect(PersistSnapshotSchema.safeParse({ content: 'ok', language: 'not-a-language', revision: 1 }).success).toBe(false);
  });
});
