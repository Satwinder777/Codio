'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SUPPORTED_LANGUAGES, getLanguageById } from '@/lib/languages';
import { 
  Code2, 
  Sparkles, 
  Share2, 
  Users, 
  ShieldCheck, 
  Zap, 
  Terminal, 
  ArrowRight, 
  Lock, 
  Globe, 
  Layers, 
  CheckCircle2, 
  Cpu, 
  ChevronDown, 
  Play,
  Copy,
  Laptop
} from 'lucide-react';
import { toast } from 'sonner';

// Lightweight Monaco preview for landing page hero
const MonacoPreview = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] flex items-center justify-center bg-[#090d16] text-slate-500 text-xs">
      Loading interactive editor preview...
    </div>
  ),
});

export default function HomePage() {
  const router = useRouter();

  // Instant room creation form state
  const [roomTitle, setRoomTitle] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('typescript');
  const [accessMode, setAccessMode] = useState<'editor' | 'viewer'>('editor');
  const [isCreating, setIsCreating] = useState(false);

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCreateRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsCreating(true);
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: roomTitle.trim() || 'Untitled Session',
          language: selectedLanguage,
          visibility: 'unlisted',
          defaultAccessMode: accessMode,
        }),
      });

      const data = await res.json();
      if (data.url) {
        toast.success('Room created! Redirecting...');
        router.push(data.url);
      } else {
        toast.error('Failed to create room');
      }
    } catch {
      toast.error('Network error creating room');
    } finally {
      setIsCreating(false);
    }
  };

  const previewCode = `// Welcome to Codio (CODENEST) Real-time Pair Session
// Seamless CRDT synchronization powered by Yjs & Supabase

interface Collaborator {
  name: string;
  avatarColor: string;
  cursor: { line: number; col: number };
}

const activeSession = {
  room: "codio-pair-session-alpha",
  collaborators: [
    { name: "Alex (Lead)", avatarColor: "#6366f1", cursor: { line: 12, col: 4 } },
    { name: "Priya (Reviewer)", avatarColor: "#06b6d4", cursor: { line: 15, col: 20 } }
  ]
};

function startCollaboration(session: typeof activeSession) {
  console.log("⚡ Zero lag synchronization active across 2+ peers!");
  return session.collaborators.map(c => \`\${c.name} is editing concurrently\`);
}

startCollaboration(activeSession);
`;

  const faqs = [
    {
      q: 'How does real-time collaboration work in Codio?',
      a: 'Codio uses Yjs, a battle-tested Conflict-free Replicated Data Type (CRDT) engine. Edits are synchronized concurrently across peer clients and converge deterministically without whole-document overwriting or data loss.',
    },
    {
      q: 'Do collaborators need to create an account to edit?',
      a: 'No! By default, rooms can be created as Unlisted with a shareable URL. Anyone with the URL can join immediately as a guest editor or viewer, with zero signup friction.',
    },
    {
      q: 'How are document snapshots persisted?',
      a: 'Snapshots are saved to PostgreSQL with intelligent debouncing and monotonic revision control. Out-of-order or delayed writes cannot overwrite newer revisions.',
    },
    {
      q: 'Can I set rooms to read-only for interviews or presentations?',
      a: 'Yes! You can toggle default room access between Editor and Viewer mode, and owners can update permissions dynamically at any time.',
    },
    {
      q: 'What languages does Codio support?',
      a: 'Codio supports TypeScript, JavaScript, Python, Rust, Go, C++, C#, Java, HTML, CSS, SQL, JSON, Markdown, Dart, Swift, Kotlin, and PHP with syntax highlighting and indentation rules.',
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Background Decorative Radial Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-indigo-500/15 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-96 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Next-Generation Collaborative Code Editor</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-slate-400 font-normal">v1.0 Ready</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Code Together in Real Time.{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-300 bg-clip-text text-transparent">
              Zero Friction.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            Create a room, share a link, and write code concurrently in Monaco with full syntax highlighting, CRDT conflict convergence, and real-time presence.
          </p>

          {/* Instant Room Creation Card */}
          <div className="w-full max-w-2xl mt-4">
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/[0.12] shadow-2xl relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500 -z-10" />
              
              <form onSubmit={handleCreateRoom} className="space-y-4 text-left">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Session Title <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Python Algorithm Interview"
                      value={roomTitle}
                      onChange={(e) => setRoomTitle(e.target.value)}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Language
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.id} value={lang.id} className="bg-slate-900 text-white">
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Popular Language Quick Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400 mr-1 font-medium">Quick pick:</span>
                  {['typescript', 'python', 'rust', 'go', 'javascript', 'cpp', 'html'].map((langId) => (
                    <button
                      key={langId}
                      type="button"
                      onClick={() => setSelectedLanguage(langId)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                        selectedLanguage === langId
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:border-white/15'
                      }`}
                    >
                      {getLanguageById(langId).name}
                    </button>
                  ))}
                </div>

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white shadow-xl shadow-indigo-500/25 transition-all duration-200 active:scale-[0.99]"
                  >
                    {isCreating ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-white" />
                        <span>Create Collaborative Room Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Live Monaco Code Preview Mockup */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Top Bar of the Mock Editor */}
            <div className="bg-[#0f172a] px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  codio-session.ts
                </span>
              </div>

              {/* Live Mock Collaborators */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  2 Collaborators Live
                </span>
                <div className="flex -space-x-1.5">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 border border-slate-900 flex items-center justify-center text-[10px] font-bold text-white">
                    A
                  </div>
                  <div className="w-6 h-6 rounded-full bg-cyan-500 border border-slate-900 flex items-center justify-center text-[10px] font-bold text-white">
                    P
                  </div>
                </div>
              </div>
            </div>

            {/* Monaco Sandbox */}
            <div className="h-[340px]">
              <MonacoPreview
                height="100%"
                language="typescript"
                theme="vs-dark"
                value={previewCode}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: 'on',
                  padding: { top: 12, bottom: 12 },
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs uppercase tracking-widest font-bold text-indigo-400">
            Engineered For High-Performance Collaboration
          </h2>
          <p className="text-3xl font-extrabold text-white tracking-tight">
            Everything you need for seamless pair programming
          </p>
          <p className="text-xs sm:text-sm text-slate-400">
            Built from first principles with CRDTs, real-time presence, and enterprise-grade Row-Level Security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="glass-card p-6 rounded-2xl space-y-3 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Yjs CRDT Synchronization</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Edits converge instantly without conflict or silent overwrites, even when multiple developers type on the same line at the same time.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-6 rounded-2xl space-y-3 transition">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Full Monaco IDE Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The exact code editor engine that powers VS Code: multi-cursor, bracket matching, syntax highlighting, format document, and custom dark themes.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-6 rounded-2xl space-y-3 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Instant Shareable Links</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No mandatory signup or setup required. Create a room and copy the link to collaborate instantly with interviewers or teammates.
            </p>
          </div>

          {/* Card 4 */}
          <div className="glass-card p-6 rounded-2xl space-y-3 transition">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Live Presence & Cursors</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track who is currently active in the room with colored avatar pills and synchronized cursor position tooltips.
            </p>
          </div>

          {/* Card 5 */}
          <div className="glass-card p-6 rounded-2xl space-y-3 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Monotonic Snapshot Persistence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Debounced server-side snapshots with sequential revision tracking ensure that delayed writes never overwrite newer document updates.
            </p>
          </div>

          {/* Card 6 */}
          <div className="glass-card p-6 rounded-2xl space-y-3 transition">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Granular Access Control</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Switch rooms between public, unlisted, and private. Enforce read-only viewer mode for technical demos or interviews.
            </p>
          </div>
        </div>
      </section>

      {/* Target Use-Cases */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs uppercase tracking-widest font-bold text-cyan-400">
            Tailored For Modern Workflows
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Built for developers, educators, and teams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Pair Programming</h4>
            <p className="text-xs text-slate-400">
              Review code and solve tough bugs side-by-side with your colleagues.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Laptop className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Technical Interviews</h4>
            <p className="text-xs text-slate-400">
              Run smooth live coding interviews with syntax highlighting and read-only toggle.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Code2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Classrooms & Demos</h4>
            <p className="text-xs text-slate-400">
              Demonstrate algorithms live to dozens of students concurrently.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Terminal className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Rapid Prototyping</h4>
            <p className="text-xs text-slate-400">
              Quickly test snippets in any of 17 supported programming languages.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-white/[0.06]">
        <div className="text-center mb-12">
          <h2 className="text-xs uppercase tracking-widest font-bold text-indigo-400">
            Frequently Asked Questions
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Answers to technical questions
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden transition"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left text-sm font-semibold text-white hover:text-indigo-300 transition"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    openFaq === idx ? 'rotate-180 text-indigo-400' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-4 pt-1 text-xs text-slate-400 leading-relaxed border-t border-white/[0.04]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="relative glass-card p-8 sm:p-12 rounded-3xl text-center space-y-6 overflow-hidden border border-indigo-500/20 glow-primary">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Ready to start coding collaboratively?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              No credit card. No installation. Launch an instant room right now.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleCreateRoom}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition"
            >
              Launch Room Now
            </button>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 transition"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
