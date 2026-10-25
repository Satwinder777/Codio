export const ROOM_SLUG_PATTERN = /^(?=.*[a-z0-9])[a-z0-9_-]{1,40}$/i;

export function isValidRoomSlug(value: string): boolean {
  return ROOM_SLUG_PATTERN.test(value);
}

export function normalizeRoomSlug(value: string): string | null {
  const slug = value.trim().toLowerCase();
  return isValidRoomSlug(slug) ? slug : null;
}
