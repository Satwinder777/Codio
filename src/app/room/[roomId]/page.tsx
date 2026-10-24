import React from 'react';
import Link from 'next/link';
import { getRoomDetails } from '@/lib/rooms/store';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { AlertTriangle, Clock, Lock, ArrowLeft, Plus } from 'lucide-react';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const { roomId } = await params;
  const details = await getRoomDetails(roomId);

  if (!details) {
    return {
      title: 'Room Unavailable - Codio',
    };
  }

  return {
    title: `${details.room.title} | Codio (CODENEST)`,
    description: `Collaborate in real-time on ${details.document.language} code in Codio.`,
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

  let userId: string | null = null;
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  }

  const details = await getRoomDetails(roomId, userId);

  // Room not found, closed, expired, or private access denied
  if (!details) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6 bg-tech-grid">
        <div className="glass-card max-w-md w-full p-8 rounded-2xl text-center space-y-4 border border-rose-500/20">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">Room Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            This collaborative room may have expired, been closed by its owner, or is set to private access.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" /> Return Home
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition"
            >
              <Plus className="w-4 h-4" /> Create New Room
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CollaborativeEditor
      initialRoom={details.room}
      initialDocument={details.document}
      role={details.role}
      isOwner={details.isOwner}
      canEdit={details.canEdit}
    />
  );
}
