'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Code2, Plus, LayoutDashboard, User, LogOut, Sparkles, Terminal } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const handleInstantRoom = async () => {
    try {
      setIsCreating(true);
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Quick Pair Session',
          language: 'typescript',
          visibility: 'unlisted',
          defaultAccessMode: 'editor',
        }),
      });

      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      }
    } catch (err) {
      console.error('Failed to create instant room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
    }
  };

  return (
    <header className="glass-panel border-b border-white/[0.08] sticky top-0 z-40 px-4 sm:px-6 py-3.5 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
            <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
              <Code2 className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Codio
              </span>
              <span className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                CODENEST
              </span>
            </div>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <Link href="/" className="hover:text-white transition">
            Home
          </Link>
          <Link href="/dashboard" className="hover:text-white transition flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
            Dashboard
          </Link>
          <Link href="/settings" className="hover:text-white transition">
            Settings
          </Link>
        </nav>

        {/* Right CTA & Auth */}
        <div className="flex items-center gap-3">
          {/* Instant Room CTA */}
          <button
            onClick={handleInstantRoom}
            disabled={isCreating}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            {isCreating ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>New Room</span>
          </button>

          {/* User Auth Info */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <Link
                href="/settings"
                title={user.email}
                className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-indigo-300 hover:border-indigo-500 transition"
              >
                {user.email?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
              </Link>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/60 transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="hidden sm:inline-block text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-white/10 px-3 py-2 rounded-lg transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
