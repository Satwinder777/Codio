import { NextRequest, NextResponse } from 'next/server';
import { getRoomDetails, getOrCreateRoom, updateRoom } from '@/lib/rooms/store';
import { UpdateRoomSchema } from '@/lib/validation/schemas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;

    let userId: string | null = null;
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    const details = await getOrCreateRoom(roomId, userId);

    if (!details) {
      return NextResponse.json(
        { error: 'Room not found, expired, or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      room: details.room,
      document: details.document,
      role: details.role,
      isOwner: details.isOwner,
      canEdit: details.canEdit,
    });
  } catch (error: any) {
    console.error('Error fetching room:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const json = await req.json();
    const parsed = UpdateRoomSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    const success = await updateRoom(roomId, parsed.data, userId);
    if (!success) {
      return NextResponse.json(
        { error: 'Unauthorized or room update failed' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
