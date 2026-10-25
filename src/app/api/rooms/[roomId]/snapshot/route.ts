import { NextRequest, NextResponse } from 'next/server';
import { persistSnapshot } from '@/lib/rooms/store';
import { PersistSnapshotSchema } from '@/lib/validation/schemas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    const parsed = PersistSnapshotSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid snapshot data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    const result = await persistSnapshot(roomId, parsed.data, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to persist snapshot', revision: result.revision },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      revision: result.revision,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Error persisting snapshot:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error persisting snapshot' },
      { status: 500 }
    );
  }
}
