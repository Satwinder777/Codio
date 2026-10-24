import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Codio (CODENEST)',
  description: 'Privacy Policy and data protection terms for Codio collaborative code editor.',
};

export default function PrivacyPage() {
  return (
    <div className="flex-1 bg-[#090d16] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" /> Return to Codio Home
      </Link>

      <div className="space-y-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Shield className="w-5 h-5" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-slate-400">Last updated: October 2026</p>
      </div>

      <div className="glass-panel p-8 rounded-2xl border border-white/[0.08] space-y-6 text-xs text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">1. Data Collection & Purpose</h2>
          <p>
            Codio collects minimal data necessary to facilitate browser-based real-time collaborative code editing. We do not sell your personal data or source code.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">2. Room Document Data & CRDT Updates</h2>
          <p>
            When you create an unlisted or public room, document content is stored in secure PostgreSQL databases with Row-Level Security. Real-time updates are broadcast ephemerally using Yjs CRDT protocols.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">3. Security & Access</h2>
          <p>
            Service-role administrative credentials are never shipped to browser clients. Access to private rooms is strictly enforced through server-verified authentication tokens.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">4. Account Deletion & Data Retention</h2>
          <p>
            Users can delete their rooms and account data at any time via the dashboard. Associated document revisions and presence records will be purged accordingly.
          </p>
        </section>
      </div>
    </div>
  );
}
