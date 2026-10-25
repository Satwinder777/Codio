import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createRoom } from '../route';
import { PATCH as updateRoom } from '../[roomId]/route';
import { POST as persistSnapshot } from '../[roomId]/snapshot/route';

function malformedJsonRequest(url: string, method: 'POST' | 'PATCH'): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
}

describe('room API request validation', () => {
  it('returns 400 for malformed room creation JSON', async () => {
    const response = await createRoom(malformedJsonRequest('http://localhost/api/rooms', 'POST'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Request body must be valid JSON' });
  });

  it('returns 400 for an unsupported room language', async () => {
    const response = await createRoom(new NextRequest('http://localhost/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'not-a-language' }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Invalid input parameters' });
  });

  it('returns 400 for malformed room update JSON', async () => {
    const response = await updateRoom(malformedJsonRequest('http://localhost/api/rooms/room-id', 'PATCH'), {
      params: Promise.resolve({ roomId: 'room-id' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Request body must be valid JSON' });
  });

  it('returns 400 for malformed snapshot JSON', async () => {
    const response = await persistSnapshot(malformedJsonRequest('http://localhost/api/rooms/room-id/snapshot', 'POST'), {
      params: Promise.resolve({ roomId: 'room-id' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Request body must be valid JSON' });
  });
});
