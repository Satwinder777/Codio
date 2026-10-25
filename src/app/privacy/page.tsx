import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Codio',
  description: 'Privacy Policy and data protection terms for Codio collaborative code editor.',
};

export default function PrivacyPage() {
  return (
    <div className="flex-1 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full space-y-6 transition-colors">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Return to Codio Home
      </Link>

      <div className="space-y-2">
        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <Shield className="w-4 h-4" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Last updated: October 2026</p>
      </div>

      <div className="bg-white dark:bg-[#111622] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white">1. Data Collection & Purpose</h2>
          <p>
            Codio collects minimal data necessary to facilitate browser-based real-time collaborative code editing. We do not sell your personal data or source code.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white">2. Room Document Data & CRDT Updates</h2>
          <p>
            When you create an unlisted or public room, document content is stored in secure databases with Row-Level Security. Real-time updates are broadcast ephemerally using Yjs CRDT protocols.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white">3. Security & Access</h2>
          <p>
            Service-role administrative credentials are never shipped to browser clients. Access to private rooms is strictly enforced through server-verified authentication tokens.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white">4. Account Deletion & Data Retention</h2>
          <p>
            Users can delete their rooms and account data at any time via the dashboard. Associated document revisions and presence records will be purged accordingly.
          </p>
        </section>
      </div>
    </div>
  );
}
