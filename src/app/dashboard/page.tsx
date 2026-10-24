'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Room } from '@/types';
import { getLanguageById } from '@/lib/languages';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { 
  Code2, 
  Plus, 
  Search, 
  Clock, 
  Share2, 
  ExternalLink, 
  Trash2, 
  Lock, 
  Globe, 
  FileCode, 
  Check, 
  Copy,
  Layers,
  Edit2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
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
      setLoading(true);
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
    fetchRooms();
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
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.public_id.includes(searchQuery);
    return matchesSearch;
  });

  return (
    <div className="flex-1 bg-[#090d16] text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-indigo-400" />
            <span>Room Dashboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your collaborative coding rooms, permissions, and active sessions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Room</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search rooms by title or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs text-slate-400">
          <span>Showing <strong className="text-white">{filteredRooms.length}</strong> rooms</span>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading your workspace rooms...</span>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-4 max-w-lg mx-auto border border-white/10">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Code2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No rooms found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchQuery
              ? `No rooms matched the search query "${searchQuery}".`
              : 'You haven’t created any rooms yet. Launch your first collaborative session now.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition"
            >
              Create First Room
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="glass-card rounded-2xl p-5 border border-white/[0.08] hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-sm tracking-tight truncate group-hover:text-indigo-300 transition">
                    {room.title}
                  </h3>
                  {room.visibility === 'private' ? (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
                      <Globe className="w-2.5 h-2.5" /> {room.visibility === 'public' ? 'Public' : 'Link Access'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-white/5">
                    {room.public_id}
                  </span>
                  <span>•</span>
                  <span className="capitalize">{room.default_access_mode} Mode</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(room.updated_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyLink(room.public_id)}
                    title="Copy share link"
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition border border-white/5"
                  >
                    {copiedId === room.public_id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => {
                      setEditingRoom(room);
                      setEditTitleInput(room.title);
                    }}
                    title="Rename Room"
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition border border-white/5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleCloseRoom(room)}
                    title="Close / Archive Room"
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition border border-white/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <Link
                    href={`/${room.public_id}`}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" /> Create Collaborative Room
            </h3>

            <form onSubmit={handleCreateRoom} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Room Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint Planning Session"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Language</label>
                  <select
                    value={newRoomLang}
                    onChange={(e) => setNewRoomLang(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
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
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Visibility</label>
                  <select
                    value={newRoomVisibility}
                    onChange={(e: any) => setNewRoomVisibility(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
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
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-400" /> Rename Room
            </h3>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">New Room Title</label>
              <input
                type="text"
                value={editTitleInput}
                onChange={(e) => setEditTitleInput(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingRoom(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow"
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
