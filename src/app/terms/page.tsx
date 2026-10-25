import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Codio',
  description: 'Terms of Service for Codio collaborative code editor.',
};

export default function TermsPage() {
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
          <FileText className="w-4 h-4" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Terms of Service</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Last updated: October 2026</p>
      </div>

      <div className="bg-white dark:bg-[#111622] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Codio, you agree to comply with and be bound by these terms. If you do not agree, do not use the application.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white">2. Permitted Use & Code Ownership</h2>
          <p>
            You retain all intellectual property rights to the code you create or edit in Codio rooms. Codio does not claim ownership over any user code.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white">3. Acceptable Use Policy</h2>
          <p>
            Users agree not to use Codio to distribute malicious software, violate copyright, engage in harassment, or disrupt the reliability of collaborative channels.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white">4. No Arbitrary Remote Execution Guarantee</h2>
          <p>
            Codio is a collaborative editing tool and does not execute untrusted user code on its primary production servers without dedicated sandboxing.
          </p>
        </section>
      </div>
    </div>
  );
}
