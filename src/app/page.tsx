'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Code2, ShieldCheck, UsersRound, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { LiveCodeShowcase } from '@/components/landing/LiveCodeShowcase';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';
import { extractRoomError, extractRoomPath, MAX_ROOM_TITLE_LENGTH, normalizeRoomTitle } from '@/lib/rooms/client-input';

const benefits = [
  {
    icon: UsersRound,
    eyebrow: '01 / Together',
    title: 'Two minds, one editor',
    description: 'Watch each other work, move through the same code, and stay in the flow.',
  },
  {
    icon: Code2,
    eyebrow: '02 / Familiar',
    title: 'Feels like your editor',
    description: 'A fast Monaco workspace with the highlighting and shortcuts developers expect.',
  },
  {
    icon: ShieldCheck,
    eyebrow: '03 / Yours',
    title: 'Share on your terms',
    description: 'Start with a private room and choose who can join and make changes.',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [roomTitle, setRoomTitle] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('typescript');
  const [isCreating, setIsCreating] = useState(false);
  const submissionInProgress = useRef(false);

  const handleCreateRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInProgress.current) return;

    submissionInProgress.current = true;
    setIsCreating(true);

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: normalizeRoomTitle(roomTitle),
          language: selectedLanguage,
          visibility: 'unlisted',
          defaultAccessMode: 'editor',
        }),
      });

      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(extractRoomError(result) ?? 'Could not create the room. Please try again.');
        return;
      }

      const roomPath = extractRoomPath(result);
      if (!roomPath) {
        toast.error('The room was created, but its link could not be loaded. Please try again.');
        return;
      }

      toast.success('Your room is ready.');
      router.push(roomPath);
    } catch {
      toast.error('Could not reach Codio. Check your connection and try again.');
    } finally {
      submissionInProgress.current = false;
      setIsCreating(false);
    }
  };

  return (
    <div className="landing-page relative isolate flex-1 overflow-hidden text-slate-900 transition-colors dark:text-slate-100">
      <div aria-hidden="true" className="landing-mesh pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="landing-glow pointer-events-none absolute -top-64 left-[68%] -z-10 h-[42rem] w-[52rem] -translate-x-1/2 rounded-full bg-violet-500/15 blur-[120px] dark:bg-violet-500/20" />
      <div aria-hidden="true" className="landing-orbit landing-orbit-one pointer-events-none absolute right-[7%] top-24 -z-10 hidden h-80 w-80 rounded-full border border-violet-400/[0.12] lg:block" />
      <div aria-hidden="true" className="landing-orbit landing-orbit-two pointer-events-none absolute right-[12%] top-36 -z-10 hidden h-64 w-64 rounded-full border border-cyan-300/[0.12] lg:block" />

      <div className="mx-auto w-full max-w-[1380px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-10 lg:pb-20 lg:pt-20">
        <section className="grid items-center gap-14 lg:min-h-[610px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="landing-enter relative z-10 mx-auto w-full max-w-[580px] lg:mx-0">
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-violet-300/30 bg-white/65 px-3.5 py-2 text-[11px] font-semibold tracking-[0.02em] text-violet-800 shadow-sm backdrop-blur dark:border-violet-300/15 dark:bg-white/[0.045] dark:text-violet-100">
              <span className="relative flex h-2 w-2"><span className="landing-status-ring absolute inset-0 rounded-full bg-emerald-400" /><span className="relative h-2 w-2 rounded-full bg-emerald-400" /></span>
              THE ROOM WHERE IDEAS CLICK
              <span className="text-violet-400">✳</span>
            </div>

            <h1 className="max-w-[620px] text-[2.85rem] font-semibold leading-[1.01] tracking-[-0.065em] text-slate-950 dark:text-white sm:text-6xl lg:text-[4.6rem]">
              The best ideas
              <br />
              happen <span className="landing-gradient-text">together.</span>
            </h1>
            <p className="mt-6 max-w-[470px] text-[15px] leading-7 text-slate-600 dark:text-slate-300 sm:text-base sm:leading-8">
              A shared coding room that feels a little like leaning over your teammate’s shoulder—only you’re both in the driver’s seat.
            </p>

            <form onSubmit={handleCreateRoom} className="landing-form-card mt-8 max-w-[530px] rounded-2xl border border-violet-300/25 bg-white/75 p-3 shadow-[0_18px_60px_-35px_rgba(76,55,175,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-[#101426]/75 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <label htmlFor="room-title" className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300"><Zap className="h-3.5 w-3.5" /></span>
                  Start a room
                </label>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">No account needed</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                <input
                  id="room-title"
                  name="title"
                  type="text"
                  autoComplete="off"
                  maxLength={MAX_ROOM_TITLE_LENGTH}
                  value={roomTitle}
                  onChange={(event) => setRoomTitle(event.target.value)}
                  placeholder="Name your room (optional)"
                  aria-label="Room name, optional"
                  className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white/80 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-white/20 dark:focus:border-violet-400"
                />
                <label className="sr-only" htmlFor="room-language">Programming language</label>
                <select
                  id="room-language"
                  name="language"
                  value={selectedLanguage}
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                  className="min-h-11 cursor-pointer rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-800 outline-none transition hover:border-violet-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#171a2b] dark:text-slate-100 dark:hover:border-white/20 dark:focus:border-violet-400"
                >
                  {SUPPORTED_LANGUAGES.map((language) => (
                    <option key={language.id} value={language.id}>{language.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="landing-create-button group mt-2.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(96,74,220,0.8)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_17px_36px_-12px_rgba(99,102,241,0.8)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/30 active:translate-y-0 disabled:cursor-wait disabled:opacity-70"
              >
                {isCreating ? (
                  <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <>Create your room <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" /></>
                )}
              </button>
              <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-3 w-3 text-emerald-500" /> Private by default <span className="mx-1 text-slate-300 dark:text-slate-700">·</span> Ready in seconds
              </div>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2" aria-hidden="true">
                <span className="landing-avatar bg-amber-400">M</span>
                <span className="landing-avatar bg-cyan-500">A</span>
                <span className="landing-avatar bg-fuchsia-500">J</span>
              </div>
              <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">A better kind of pairing.</span>
                <br className="sm:hidden" /> Just send a link and start creating.
              </p>
            </div>

            <Link href="/dashboard" className="group mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-200">
              Go to your rooms <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="landing-enter landing-delay-1 relative mx-auto w-full max-w-[690px] lg:mx-0 lg:justify-self-end">
            <LiveCodeShowcase />
            <div className="mt-9 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.17em] text-slate-400 dark:text-slate-500 sm:text-[11px]">
              <span>Watch the room come to life</span><ArrowDown className="h-3 w-3 animate-bounce text-violet-400" />
            </div>
          </div>
        </section>

        <section aria-label="Why teams code with Codio" className="landing-enter landing-delay-2 mx-auto mt-20 max-w-6xl border-t border-slate-200/70 pt-8 dark:border-white/[0.08] lg:mt-24">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Less setup. More flow.</p>
              <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Everything you need to get in sync.</h2>
            </div>
            <span className="hidden font-mono text-[10px] text-slate-400 dark:text-slate-500 sm:inline">DESIGNED FOR THE MOMENT IT CLICKS</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {benefits.map(({ icon: Icon, eyebrow, title, description }, index) => (
              <article key={title} style={{ animationDelay: `${index * 90}ms` }} className="landing-feature group rounded-2xl border border-slate-200/75 bg-white/55 p-4 transition duration-300 hover:-translate-y-1 hover:border-violet-300/50 hover:bg-white/90 hover:shadow-[0_18px_40px_-28px_rgba(79,70,229,0.6)] dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:border-violet-300/20 dark:hover:bg-white/[0.05] sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-semibold tracking-[0.15em] text-slate-400 dark:text-slate-500">{eyebrow}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 transition duration-300 group-hover:rotate-[-6deg] group-hover:scale-110 dark:text-violet-300"><Icon className="h-4 w-4" /></span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
