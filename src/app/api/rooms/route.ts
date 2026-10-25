import { NextRequest, NextResponse } from 'next/server';
import { CreateRoomSchema } from '@/lib/validation/schemas';
import { createRoom, getUserRooms } from '@/lib/rooms/store';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    const parsed = CreateRoomSchema.safeParse(json);

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

    const { publicId, roomId } = await createRoom(parsed.data, userId);

    return NextResponse.json({
      success: true,
      publicId,
      roomId,
      url: `/${publicId}`,
    });
  } catch (error: unknown) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error creating room' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ rooms: [] });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rooms = await getUserRooms(user.id);
    return NextResponse.json({ rooms });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error listing rooms' },
      { status: 500 }
    );
  }
}
