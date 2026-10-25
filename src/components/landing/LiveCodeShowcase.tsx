'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Code2, Pause, Play, Radio, UsersRound, Zap } from 'lucide-react';

const steps = [
  {
    label: 'You start',
    note: 'Open a room and start writing.',
    activity: 'You are writing in main.ts',
    activeLine: 0,
    lines: [
      'const project = "launch-day";',
      'const nextStep = "build together";',
      '',
      'function makeItReal() {',
      '  return [project, nextStep].join(" / ");',
      '}',
    ],
    people: [{ initials: 'Y', name: 'You', color: 'violet' }],
  },
  {
    label: 'Invite a teammate',
    note: 'One link brings your teammate into the same editor.',
    activity: 'Asha joined · editing line 02',
    activeLine: 1,
    lines: [
      'const project = "launch-day";',
      'const nextStep = "make it lovely";',
      '',
      'function makeItReal() {',
      '  return [project, nextStep].join(" / ");',
      '}',
    ],
    people: [
      { initials: 'Y', name: 'You', color: 'violet' },
      { initials: 'A', name: 'Asha', color: 'cyan' },
    ],
  },
  {
    label: 'See it sync',
    note: 'Every change appears for everyone, as it happens.',
    activity: 'Both editors are in sync',
    activeLine: 4,
    lines: [
      'const project = "launch-day";',
      'const nextStep = "make it lovely";',
      '',
      'function makeItReal() {',
      '  return [project, nextStep].join(" / ");',
      '}',
    ],
    people: [
      { initials: 'Y', name: 'You', color: 'violet' },
      { initials: 'A', name: 'Asha', color: 'cyan' },
    ],
  },
] as const;

export function getNextShowcaseStep(currentIndex: number) {
  if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= steps.length) return 0;
  return (currentIndex + 1) % steps.length;
}

const highlightedTokens = /("[^\"]*"|'[^']*'|\/\/.*|\b(?:const|function|return)\b)/g;

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getReducedMotionPreference() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function colorize(line: string) {
  return line.split(highlightedTokens).filter(Boolean).map((token, index) => {
    const colorClass = token.startsWith('//')
      ? 'text-slate-500 italic'
      : token.startsWith('"') || token.startsWith("'")
        ? 'text-teal-300'
        : 'text-violet-300';
    return <span className={colorClass} key={`${token}-${index}`}>{token}</span>;
  });
}

export function LiveCodeShowcase() {
  const [activeStep, setActiveStep] = useState(0);
  const [playbackOverride, setPlaybackOverride] = useState<boolean | null>(null);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    () => true,
  );
  const step = steps[activeStep];
  const isPlaying = playbackOverride ?? !prefersReducedMotion;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setActiveStep(getNextShowcaseStep);
      }
    }, 4200);
    return () => window.clearInterval(interval);
  }, [isPlaying]);

  const chooseStep = (index: number) => {
    setActiveStep(index);
    setPlaybackOverride(false);
  };

  return (
    <section aria-label="Interactive live coding preview" className="relative mx-auto w-full max-w-[660px] pb-0 lg:mx-0 lg:pb-16">
      <div aria-hidden="true" className="showcase-aura absolute -inset-8 rounded-[2.5rem]" />
      <div className="showcase-window relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0c1020] shadow-[0_40px_120px_-40px_rgba(61,44,160,0.72)]">
        <header className="flex h-12 items-center justify-between border-b border-white/[0.07] bg-white/[0.025] px-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-rose-400/80" />
              <span className="h-2 w-2 rounded-full bg-amber-300/80" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
            </div>
            <span className="ml-1 hidden h-6 items-center gap-1.5 rounded-md bg-black/20 px-2.5 text-[10px] text-slate-400 sm:inline-flex">
              <Code2 className="h-3 w-3 text-violet-300" /> launch-day / main.ts
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[0.08] px-2.5 py-1 text-[10px] font-medium text-emerald-200">
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-300"><span className="showcase-ping absolute inset-0 rounded-full bg-emerald-300" /></span>
              LIVE PREVIEW
            </span>
            <div className="flex -space-x-1.5" aria-label={`${step.people.length} people in this room`}>
              {step.people.map((person) => (
                <span key={person.initials} title={person.name} className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0c1020] text-[9px] font-bold text-white ${person.color === 'cyan' ? 'bg-cyan-500' : 'bg-violet-500'}`}>
                  {person.initials}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="relative px-3 py-5 sm:px-6 sm:py-7">
          <div aria-hidden="true" className="showcase-grid pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative space-y-2 font-mono text-[11px] leading-7 sm:text-[13px] sm:leading-8">
            {step.lines.map((line, index) => (
              <div key={index} className={`group relative flex min-h-7 items-center rounded-md px-2 transition-colors duration-500 ${step.activeLine === index ? 'bg-violet-400/[0.09] ring-1 ring-inset ring-violet-300/10' : ''}`}>
                <span className="w-8 shrink-0 select-none text-right text-slate-600 sm:w-10">{String(index + 1).padStart(2, '0')}</span>
                <span className="ml-4 whitespace-pre text-slate-100 sm:ml-6">{colorize(line)}</span>
                {step.activeLine === index && (
                  <span className={`showcase-cursor-chip absolute -right-1 top-0 z-10 hidden items-center gap-1.5 rounded-md px-2 py-0.5 font-sans text-[9px] font-semibold text-white shadow-lg sm:inline-flex ${activeStep === 1 ? 'bg-cyan-500' : 'bg-violet-500'}`}>
                    <span className="h-1.5 w-px animate-cursor-blink bg-white" />{activeStep === 1 ? 'Asha' : activeStep === 2 ? 'You + Asha' : 'You'}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="relative mt-7 flex items-center justify-between border-t border-white/[0.07] pt-4">
            <div className="flex min-w-0 items-center gap-2 text-[10px] text-slate-400 sm:text-[11px]">
              <Radio className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <span key={step.activity} className="truncate showcase-activity-enter">{step.activity}</span>
            </div>
            <span className="ml-2 shrink-0 font-mono text-[10px] text-slate-500">TypeScript · main.ts</span>
          </div>
        </div>

        <footer className="relative flex flex-col gap-3 border-t border-white/[0.07] bg-black/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-1.5" role="group" aria-label="Demo steps">
            {steps.map((item, index) => (
              <button
                key={item.label}
                type="button"
                aria-current={activeStep === index ? 'step' : undefined}
                aria-label={`Show step ${index + 1}: ${item.label}`}
                onClick={() => chooseStep(index)}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition sm:px-3 sm:text-[11px] ${activeStep === index ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-300'}`}
              >
                <span className="mr-1.5 text-slate-500">0{index + 1}</span>{item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p key={step.note} className="min-w-0 truncate text-[10px] text-slate-500 sm:max-w-[190px]">{step.note}</p>
            <button
              type="button"
              onClick={() => setPlaybackOverride(!isPlaying)}
              aria-label={isPlaying ? 'Pause demo' : 'Play demo'}
              title={isPlaying ? 'Pause demo' : 'Play demo'}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-violet-300/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
            </button>
          </div>
        </footer>
      </div>

      <div className="showcase-float-card absolute bottom-0 right-2 hidden items-center gap-3 rounded-xl border border-white/10 bg-[#171a2c]/95 px-4 py-3 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur lg:flex lg:right-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400/20 to-cyan-300/15 text-violet-200">
          {activeStep === 2 ? <Zap className="h-4 w-4" /> : <UsersRound className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-[11px] font-semibold text-white">{activeStep === 0 ? 'Ready when you are' : activeStep === 1 ? 'Asha is in the room' : 'Changes are in sync'}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">One room. Everyone on the same line.</p>
        </div>
        <span className="ml-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
      </div>
    </section>
  );
}
