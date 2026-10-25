'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Code2, 
  Plus, 
  LayoutDashboard, 
  LogOut, 
  Settings, 
  Home
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { isRoomEditorPath } from '@/lib/rooms/route-paths';
import type { User } from '@supabase/supabase-js';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
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

  if (isRoomEditorPath(pathname)) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0b0f17]/85 backdrop-blur-xl transition-colors duration-150">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5">
        {/* Brand Logo - Clean, Minimalist, No Chaotic Neon */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
            <Code2 className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
              Codio
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
              IDE
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-white/[0.06] text-xs font-medium">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              pathname === '/'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm border border-slate-200/60 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>

          <Link
            href="/dashboard"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              pathname === '/dashboard'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm border border-slate-200/60 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/settings"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              pathname === '/settings'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm border border-slate-200/60 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Settings</span>
          </Link>
        </nav>

        {/* Right Actions: Theme Toggle, Instant Room & Auth */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle (System Default, Dark, Light) */}
          <ThemeToggle />

          {/* Instant Room CTA Button */}
          {pathname !== '/' && (
            <button
              onClick={handleInstantRoom}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-medium text-xs shadow-sm transition active:scale-95 disabled:opacity-60"
            >
              {isCreating ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Room</span>
                </>
              )}
            </button>
          )}

          {/* User Auth Info */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-white/10">
              <Link
                href="/settings"
                title={user.email}
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg text-xs text-slate-700 dark:text-slate-300 transition"
              >
                <div className="w-5 h-5 rounded-full bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  {user.email?.charAt(0) || 'U'}
                </div>
                <span className="hidden sm:inline font-medium max-w-[100px] truncate text-slate-800 dark:text-slate-200">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 pl-1">
              <Link
                href="/login"
                className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="hidden sm:inline-flex items-center text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 px-2.5 py-1.5 rounded-lg transition shadow-sm"
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
