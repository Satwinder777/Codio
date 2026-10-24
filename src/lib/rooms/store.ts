import { nanoid } from 'nanoid';
import { Room, DocumentSnapshot, RoomDetails, MemberRole } from '@/types';
import { getLanguageById } from '@/lib/languages';
import { CreateRoomInput, UpdateRoomInput, PersistSnapshotInput } from '@/lib/validation/schemas';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

// Server-side / in-memory fallback store when Supabase credentials are not configured
const memoryRooms = new Map<string, Room>();
const memoryDocuments = new Map<string, DocumentSnapshot>();

export async function createRoom(input: CreateRoomInput, userId?: string | null): Promise<{ publicId: string; roomId: string }> {
  const publicId = input.customSlug?.trim() ? input.customSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') : nanoid(10);
  const selectedLang = getLanguageById(input.language);

  const supabase = await createSupabaseServerClient();

  if (supabase) {
    // 1. Insert room record
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert({
        public_id: publicId,
        owner_id: userId || null,
        title: input.title || 'Untitled Room',
        visibility: input.visibility,
        default_access_mode: input.defaultAccessMode,
      })
      .select('id, public_id')
      .single();

    if (roomError) {
      console.error('[Store] Failed to create room in Supabase:', roomError);
      throw new Error(`Failed to create room: ${roomError.message}`);
    }

    // 2. Insert initial document
    const { error: docError } = await supabase.from('documents').insert({
      room_id: roomData.id,
      file_name: `main${selectedLang.extension}`,
      language: selectedLang.monacoId,
      content_snapshot: selectedLang.sampleCode,
      revision: 1,
    });

    if (docError) {
      console.error('[Store] Failed to create initial document in Supabase:', docError);
    }

    // 3. Add owner to room_members if authenticated
    if (userId) {
      await supabase.from('room_members').insert({
        room_id: roomData.id,
        user_id: userId,
        role: 'owner',
      });
    }

    return { publicId: roomData.public_id, roomId: roomData.id };
  }

  // Fallback: in-memory store
  const id = `room_${nanoid(16)}`;
  const now = new Date().toISOString();

  const newRoom: Room = {
    id,
    public_id: publicId,
    owner_id: userId || null,
    title: input.title || 'Untitled Room',
    visibility: input.visibility,
    default_access_mode: input.defaultAccessMode,
    is_closed: false,
    closed_at: null,
    expires_at: null,
    created_at: now,
    updated_at: now,
  };

  const newDoc: DocumentSnapshot = {
    id: `doc_${nanoid(16)}`,
    room_id: id,
    file_name: `main${selectedLang.extension}`,
    language: selectedLang.monacoId,
    content_snapshot: selectedLang.sampleCode,
    revision: 1,
    created_at: now,
    updated_at: now,
  };

  memoryRooms.set(publicId, newRoom);
  memoryRooms.set(id, newRoom);
  memoryDocuments.set(id, newDoc);

  return { publicId, roomId: id };
}

export async function getRoomDetails(publicIdOrId: string, userId?: string | null): Promise<RoomDetails | null> {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    // Fetch room by public_id or UUID id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(publicIdOrId);
    let query = supabase.from('rooms').select('*');
    if (isUuid) {
      query = query.or(`id.eq.${publicIdOrId},public_id.eq.${publicIdOrId}`);
    } else {
      query = query.eq('public_id', publicIdOrId);
    }

    const { data: room, error: roomError } = await query.single();
    if (roomError || !room) {
      return null;
    }

    // Check expiration and closure
    if (room.is_closed) {
      return null;
    }
    if (room.expires_at && new Date(room.expires_at) <= new Date()) {
      return null;
    }

    // Check user membership and permissions
    let role: MemberRole = room.default_access_mode === 'viewer' ? 'viewer' : 'editor';
    const isOwner = Boolean(userId && room.owner_id === userId);
    if (isOwner) {
      role = 'owner';
    } else if (userId) {
      const { data: member } = await supabase
        .from('room_members')
        .select('role')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .single();
      if (member) {
        role = member.role as MemberRole;
      }
    }

    // Check private room access
    if (room.visibility === 'private' && !isOwner && role === 'viewer' && room.default_access_mode !== 'viewer') {
      return null;
    }

    // Fetch primary document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (docError || !document) {
      // Fallback document if none found
      const defaultLang = getLanguageById('typescript');
      return {
        room,
        document: {
          id: `doc_${nanoid(16)}`,
          room_id: room.id,
          file_name: `main${defaultLang.extension}`,
          language: defaultLang.monacoId,
          content_snapshot: defaultLang.sampleCode,
          revision: 1,
          created_at: room.created_at,
          updated_at: room.updated_at,
        },
        role,
        isOwner,
        canEdit: role === 'owner' || role === 'editor',
      };
    }

    return {
      room,
      document,
      role,
      isOwner,
      canEdit: role === 'owner' || role === 'editor',
    };
  }

  // Fallback in-memory check
  const room = memoryRooms.get(publicIdOrId);
  if (!room) {
    // If not found in memory, generate a default guest room on-the-fly for seamless local prototyping
    const selectedLang = getLanguageById('typescript');
    const now = new Date().toISOString();
    const guestRoom: Room = {
      id: `room_${publicIdOrId}`,
      public_id: publicIdOrId,
      owner_id: null,
      title: 'Collaborative Session',
      visibility: 'unlisted',
      default_access_mode: 'editor',
      is_closed: false,
      closed_at: null,
      expires_at: null,
      created_at: now,
      updated_at: now,
    };
    const guestDoc: DocumentSnapshot = {
      id: `doc_${publicIdOrId}`,
      room_id: guestRoom.id,
      file_name: `main${selectedLang.extension}`,
      language: selectedLang.monacoId,
      content_snapshot: selectedLang.sampleCode,
      revision: 1,
      created_at: now,
      updated_at: now,
    };
    memoryRooms.set(publicIdOrId, guestRoom);
    memoryDocuments.set(guestRoom.id, guestDoc);
    return {
      room: guestRoom,
      document: guestDoc,
      role: 'editor',
      isOwner: true,
      canEdit: true,
    };
  }

  if (room.is_closed) return null;
  if (room.expires_at && new Date(room.expires_at) <= new Date()) return null;

  const doc = memoryDocuments.get(room.id) || {
    id: `doc_${room.id}`,
    room_id: room.id,
    file_name: 'main.ts',
    language: 'typescript',
    content_snapshot: getLanguageById('typescript').sampleCode,
    revision: 1,
    created_at: room.created_at,
    updated_at: room.updated_at,
  };

  const isOwner = Boolean(userId && room.owner_id === userId);
  const role: MemberRole = isOwner ? 'owner' : (room.default_access_mode as MemberRole);

  return {
    room,
    document: doc,
    role,
    isOwner,
    canEdit: role === 'owner' || role === 'editor',
  };
}

export async function persistSnapshot(
  publicIdOrId: string,
  input: PersistSnapshotInput,
  userId?: string | null
): Promise<{ success: boolean; revision: number; error?: string }> {
  const details = await getRoomDetails(publicIdOrId, userId);
  if (!details || !details.canEdit) {
    return { success: false, revision: 0, error: 'Unauthorized or room unavailable' };
  }

  const supabase = await createSupabaseServerClient();

  if (supabase) {
    // Fetch latest revision to prevent race conditions & out-of-order writes
    const { data: currentDoc } = await supabase
      .from('documents')
      .select('id, revision')
      .eq('room_id', details.room.id)
      .single();

    if (currentDoc && input.revision < currentDoc.revision) {
      return {
        success: false,
        revision: currentDoc.revision,
        error: 'Revision conflict: newer snapshot already saved.',
      };
    }

    const nextRevision = (currentDoc?.revision || 0) + 1;
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        content_snapshot: input.content,
        language: input.language || details.document.language,
        revision: nextRevision,
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', details.room.id);

    if (updateError) {
      return { success: false, revision: currentDoc?.revision || 1, error: updateError.message };
    }

    return { success: true, revision: nextRevision };
  }

  // Memory fallback update
  const currentDoc = memoryDocuments.get(details.room.id);
  if (currentDoc && input.revision < currentDoc.revision) {
    return {
      success: false,
      revision: currentDoc.revision,
      error: 'Revision conflict',
    };
  }

  const nextRevision = (currentDoc?.revision || 0) + 1;
  const updatedDoc: DocumentSnapshot = {
    ...(currentDoc || details.document),
    content_snapshot: input.content,
    language: input.language || details.document.language,
    revision: nextRevision,
    updated_at: new Date().toISOString(),
  };

  memoryDocuments.set(details.room.id, updatedDoc);
  return { success: true, revision: nextRevision };
}

export async function updateRoom(
  publicIdOrId: string,
  input: UpdateRoomInput,
  userId?: string | null
): Promise<boolean> {
  const details = await getRoomDetails(publicIdOrId, userId);
  if (!details || !details.isOwner) {
    return false;
  }

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (input.title) updatePayload.title = input.title;
    if (input.visibility) updatePayload.visibility = input.visibility;
    if (input.defaultAccessMode) updatePayload.default_access_mode = input.defaultAccessMode;
    if (input.isClosed !== undefined) {
      updatePayload.is_closed = input.isClosed;
      if (input.isClosed) updatePayload.closed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('rooms')
      .update(updatePayload)
      .eq('id', details.room.id);

    return !error;
  }

  const room = memoryRooms.get(details.room.id);
  if (room) {
    if (input.title) room.title = input.title;
    if (input.visibility) room.visibility = input.visibility;
    if (input.defaultAccessMode) room.default_access_mode = input.defaultAccessMode;
    if (input.isClosed !== undefined) {
      room.is_closed = input.isClosed;
      room.closed_at = input.isClosed ? new Date().toISOString() : null;
    }
    room.updated_at = new Date().toISOString();
  }
  return true;
}

export async function getUserRooms(userId: string): Promise<Room[]> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('*')
      .or(`owner_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Store] Failed to list user rooms:', error);
      return [];
    }
    return rooms || [];
  }

  // Memory fallback
  const userRooms = Array.from(memoryRooms.values()).filter((r) => r.owner_id === userId);
  return userRooms;
}
