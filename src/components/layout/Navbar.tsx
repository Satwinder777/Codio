'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Code2, 
  Plus, 
  LayoutDashboard, 
  User, 
  LogOut, 
  Sparkles, 
  Settings, 
  Home, 
  ChevronRight,
  Zap
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
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
          title: 'Pair Programming Session',
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
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#07090e]/85 backdrop-blur-2xl transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 opacity-70 blur group-hover:opacity-100 transition duration-300" />
            <div className="relative w-9 h-9 rounded-xl bg-[#0c1017] border border-white/20 p-0.5 shadow-xl flex items-center justify-center">
              <Code2 className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Codio
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                CODENEST
              </span>
            </div>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/[0.06] text-xs font-medium">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              pathname === '/'
                ? 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>

          <Link
            href="/dashboard"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              pathname === '/dashboard'
                ? 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/settings"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              pathname === '/settings'
                ? 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </Link>
        </nav>

        {/* Right CTA & Auth */}
        <div className="flex items-center gap-2.5">
          {/* Instant Room CTA Button */}
          <button
            onClick={handleInstantRoom}
            disabled={isCreating}
            className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 p-[1px] font-semibold text-xs text-white shadow-lg shadow-indigo-500/25 active:scale-95 transition-all hover:shadow-indigo-500/40"
          >
            <span className="flex items-center gap-1.5 rounded-[11px] bg-[#0c1017]/90 px-3.5 py-1.5 transition-all group-hover:bg-opacity-0">
              {isCreating ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="font-bold tracking-wide">New Room</span>
                </>
              )}
            </span>
          </button>

          {/* User Auth Info */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <Link
                href="/settings"
                title={user.email}
                className="flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 border border-white/10 px-2.5 py-1 rounded-xl text-xs text-slate-200 transition"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow">
                  {user.email?.charAt(0) || 'U'}
                </div>
                <span className="hidden sm:inline font-medium max-w-[100px] truncate text-slate-300">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="hidden sm:inline-flex items-center text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-white/15 px-3 py-1.5 rounded-xl transition shadow"
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
