'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Code2 } from 'lucide-react';
import { isRoomEditorPath } from '@/lib/rooms/route-paths';

export function Footer() {
  const pathname = usePathname();
  if (isRoomEditorPath(pathname)) return null;

  return (
    <footer className="border-t border-slate-200 dark:border-white/[0.08] bg-white/50 dark:bg-[#0b0f17]/50 mt-auto py-8 px-4 sm:px-6 text-slate-500 dark:text-slate-400 text-xs transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Tagline */}
        <div className="flex flex-col items-center md:items-start gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center font-bold">
              <Code2 className="w-3 h-3" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white text-xs tracking-tight">Codio IDE</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-center md:text-left text-xs max-w-sm">
            Fast, browser-based collaborative code editor powered by Monaco, Yjs CRDTs, and real-time synchronization.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 dark:text-slate-300">
          <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-white transition">
            Dashboard
          </Link>
          <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition">
            Terms of Service
          </Link>
          <Link href="/settings" className="hover:text-slate-900 dark:hover:text-white transition">
            Settings
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-center md:text-right text-slate-400 dark:text-slate-500">
          <p>© 2026 Codio. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
