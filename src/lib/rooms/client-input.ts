import { MAX_ROOM_TITLE_LENGTH } from '@/lib/validation/constants';
import { isValidRoomSlug } from './identifiers';

export { MAX_ROOM_TITLE_LENGTH };

export const DEFAULT_ROOM_TITLE = 'Untitled Session';

export function normalizeRoomTitle(value: string): string {
  return value.trim() || DEFAULT_ROOM_TITLE;
}

export function extractRoomPath(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('publicId' in payload)) return null;

  const publicId = payload.publicId;
  if (typeof publicId !== 'string' || !isValidRoomSlug(publicId)) return null;

  return `/${publicId}`;
}

export function extractRoomError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) return null;

  const error = payload.error;
  return typeof error === 'string' && error.trim() ? error.trim() : null;
}
