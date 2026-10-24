'use client';

import React from 'react';
import Link from 'next/link';
import { Code2, Heart, Shield, Terminal, Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="glass-panel border-t border-white/[0.08] mt-auto py-10 px-4 sm:px-6 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Tagline */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Code2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">Codio (CODENEST)</span>
          </div>
          <p className="text-slate-400 text-center md:text-left text-xs max-w-sm">
            High-performance browser-based collaborative code editor powered by Yjs CRDT and Supabase.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-slate-300">
          <Link href="/dashboard" className="hover:text-indigo-400 transition">
            Dashboard
          </Link>
          <Link href="/privacy" className="hover:text-indigo-400 transition">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-indigo-400 transition">
            Terms of Service
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition flex items-center gap-1.5 text-slate-400"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>GitHub</span>
          </a>
        </div>

        {/* Copyright */}
        <div className="text-center md:text-right text-slate-500">
          <p>© 2026 Codio Inc. All rights reserved.</p>
          <p className="text-[11px] mt-0.5 text-slate-600">Built with Next.js, Monaco, Supabase & Yjs</p>
        </div>
      </div>
    </footer>
  );
}
