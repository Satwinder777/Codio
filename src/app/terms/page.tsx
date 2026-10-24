import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Codio (CODENEST)',
  description: 'Terms of Service for Codio collaborative code editor.',
};

export default function TermsPage() {
  return (
    <div className="flex-1 bg-[#090d16] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" /> Return to Codio Home
      </Link>

      <div className="space-y-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <FileText className="w-5 h-5" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Terms of Service</h1>
        <p className="text-xs text-slate-400">Last updated: October 2026</p>
      </div>

      <div className="glass-panel p-8 rounded-2xl border border-white/[0.08] space-y-6 text-xs text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Codio (CODENEST), you agree to comply with and be bound by these terms. If you do not agree, do not use the application.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">2. Permitted Use & Code Ownership</h2>
          <p>
            You retain all intellectual property rights to the code you create or edit in Codio rooms. Codio does not claim ownership over any user code.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">3. Acceptable Use Policy</h2>
          <p>
            Users agree not to use Codio to distribute malicious software, violate copyright, engage in harassment, or disrupt the reliability of collaborative channels.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">4. No Arbitrary Remote Execution Guarantee</h2>
          <p>
            Codio is a collaborative editing tool and does not execute untrusted user code on its primary production servers without dedicated sandboxing.
          </p>
        </section>
      </div>
    </div>
  );
}
