'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Room } from '@/types';
import { 
  Code2, 
  Plus, 
  Search, 
  Clock, 
  ExternalLink, 
  Trash2, 
  Lock, 
  Globe, 
  Check, 
  Copy,
  Layers,
  Edit2
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New room modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomLang, setNewRoomLang] = useState('typescript');
  const [newRoomVisibility, setNewRoomVisibility] = useState<'unlisted' | 'public' | 'private'>('unlisted');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rename modal state
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialFetchFrame = window.requestAnimationFrame(() => {
      void fetchRooms();
    });
    return () => window.cancelAnimationFrame(initialFetchFrame);
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newRoomTitle.trim() || 'Untitled Room',
          language: newRoomLang,
          visibility: newRoomVisibility,
          defaultAccessMode: 'editor',
        }),
      });

      const data = await res.json();
      if (data.url) {
        toast.success('Room created successfully!');
        router.push(data.url);
      } else {
        toast.error('Failed to create room');
      }
    } catch {
      toast.error('Network error creating room');
    } finally {
      setIsSubmitting(false);
      setShowCreateModal(false);
    }
  };

  const handleCopyLink = (publicId: string) => {
    const url = `${window.location.origin}/${publicId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(publicId);
    toast.success('Room link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveRename = async () => {
    if (!editingRoom) return;
    try {
      const res = await fetch(`/api/rooms/${editingRoom.public_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitleInput }),
      });

      if (res.ok) {
        setRooms((prev) =>
          prev.map((r) => (r.id === editingRoom.id ? { ...r, title: editTitleInput } : r))
        );
        toast.success('Room renamed');
        setEditingRoom(null);
      } else {
        toast.error('Failed to rename room');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleCloseRoom = async (room: Room) => {
    if (!confirm(`Are you sure you want to close "${room.title}"? Collaborators will no longer be able to access it.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${room.public_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isClosed: true }),
      });

      if (res.ok) {
        setRooms((prev) => prev.filter((r) => r.id !== room.id));
        toast.success(`Closed room "${room.title}"`);
      } else {
        toast.error('Failed to close room');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const filteredRooms = rooms.filter((r) => {
    return r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.public_id.includes(searchQuery);
  });

  return (
    <div className="flex-1 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 transition-colors">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-500" />
            <span>Workspace Rooms</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your collaborative coding rooms and active sessions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-medium shadow-sm transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Room</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-[#111622] p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs text-slate-500 dark:text-slate-400">
          <span>{filteredRooms.length} {filteredRooms.length === 1 ? 'room' : 'rooms'} total</span>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs font-mono">
          <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading rooms...</span>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white dark:bg-[#111622] p-10 rounded-xl text-center space-y-3 max-w-md mx-auto border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="w-10 h-10 mx-auto rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
            <Code2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No rooms found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {searchQuery
              ? `No rooms matched "${searchQuery}".`
              : 'You haven’t created any rooms yet. Launch your first collaborative session now.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-medium shadow-sm transition"
            >
              Create First Room
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white dark:bg-[#111622] rounded-xl p-4 border border-slate-200 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                    {room.title}
                  </h3>
                  {room.visibility === 'private' ? (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                      <Globe className="w-2.5 h-2.5" /> {room.visibility === 'public' ? 'Public' : 'Link Access'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/5">
                    {room.public_id}
                  </span>
                  <span>•</span>
                  <span className="capitalize">{room.default_access_mode} Mode</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(room.updated_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyLink(room.public_id)}
                    title="Copy share link"
                    className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-white/5"
                  >
                    {copiedId === room.public_id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => {
                      setEditingRoom(room);
                      setEditTitleInput(room.title);
                    }}
                    title="Rename Room"
                    className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-white/5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleCloseRoom(room)}
                    title="Close / Archive Room"
                    className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition border border-slate-200 dark:border-white/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <Link
                    href={`/${room.public_id}`}
                    className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-medium text-xs px-2.5 py-1.5 rounded-md transition shadow-sm"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-500" /> Create Collaborative Room
            </h3>

            <form onSubmit={handleCreateRoom} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Room Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint Planning Session"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Language</label>
                  <select
                    value={newRoomLang}
                    onChange={(e) => setNewRoomLang(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="rust">Rust</option>
                    <option value="go">Go</option>
                    <option value="cpp">C++</option>
                    <option value="html">HTML</option>
                    <option value="sql">SQL</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Visibility</label>
                  <select
                    value={newRoomVisibility}
                    onChange={(event) => setNewRoomVisibility(event.target.value as 'unlisted' | 'public' | 'private')}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="unlisted">Unlisted (Link)</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm"
                >
                  {isSubmitting ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md p-6 shadow-xl relative space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-slate-500" /> Rename Room
            </h3>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">New Room Title</label>
              <input
                type="text"
                value={editTitleInput}
                onChange={(e) => setEditTitleInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
