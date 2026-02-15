'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Mouse, RefreshCw } from 'lucide-react';

// ── Shared toggle logic ─────────────────────────────────

function useToggle() {
  const [isAI, setIsAI] = useState(true);
  const autoStep = useRef(0);
  const userActed = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userActed.current || autoStep.current >= 2) return;
    timeoutRef.current = setTimeout(() => {
      if (userActed.current) return;
      if (autoStep.current === 0) {
        autoStep.current = 1;
        setIsAI(false);
      } else if (autoStep.current === 1) {
        autoStep.current = 2;
        setIsAI(true);
      }
    }, 8000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isAI]);

  const interact = useCallback(() => {
    userActed.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsAI((v) => !v);
  }, []);

  return { isAI, interact };
}

// Shared blur morph helpers
const blurIn = (delay = 0) => ({
  initial: { opacity: 0, filter: 'blur(6px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(6px)' },
  transition: { duration: 0.3, delay },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25, delay },
});

// ── Current (no cost) ───────────────────────────────────

function Current() {
  const { isAI, interact } = useToggle();
  return (
    <h2 className="group/h2 mt-1 inline cursor-pointer text-lg text-foreground/70" onClick={interact}>
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'ai' : 'qa'} className="font-medium text-foreground" {...blurIn()}>
          {isAI ? <><Code2 className="inline h-4 w-4 mr-1 -translate-y-[1px]" />AI testers</> : <><Mouse className="inline h-4 w-4 mr-1 -translate-y-[1px]" />QA</>}
        </motion.span>
      </AnimatePresence>
      {' '}find{' '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'every' : 'most'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-red-400/25' : 'border-orange-400/25')} {...blurIn(0.05)}>
          {isAI ? 'every issue' : 'most issues'}
        </motion.span>
      </AnimatePresence>
      {' '}in{' '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'min' : 'hr'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-emerald-500/30' : 'border-amber-500/25')} {...blurIn(0.1)}>
          {isAI ? 'minutes' : 'hours'}
        </motion.span>
      </AnimatePresence>
      {', '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'before' : 'along'} {...fadeIn(0.15)}>
          {isAI ? 'before your users do' : 'along with your users'}
        </motion.span>
      </AnimatePresence>
      {'  '}<RefreshCw className="inline h-3.5 w-3.5 text-foreground/30 transition-all group-hover/h2:text-foreground/70 group-hover/h2:scale-110 ml-1" />
    </h2>
  );
}

// ── Option A: cost appended at end ──────────────────────
// "...before your users do — for $0" vs "...along with your users — for ~$12K"

function OptionA() {
  const { isAI, interact } = useToggle();
  return (
    <h2 className="group/h2 mt-1 inline cursor-pointer text-lg text-foreground/70" onClick={interact}>
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'ai' : 'qa'} className="font-medium text-foreground" {...blurIn()}>
          {isAI ? <><Code2 className="inline h-4 w-4 mr-1 -translate-y-[1px]" />AI testers</> : <><Mouse className="inline h-4 w-4 mr-1 -translate-y-[1px]" />QA</>}
        </motion.span>
      </AnimatePresence>
      {' '}find{' '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'every' : 'most'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-red-400/25' : 'border-orange-400/25')} {...blurIn(0.05)}>
          {isAI ? 'every issue' : 'most issues'}
        </motion.span>
      </AnimatePresence>
      {' '}in{' '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'min' : 'hr'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-emerald-500/30' : 'border-amber-500/25')} {...blurIn(0.1)}>
          {isAI ? 'minutes' : 'hours'}
        </motion.span>
      </AnimatePresence>
      {', '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'before' : 'along'} {...fadeIn(0.15)}>
          {isAI ? 'before your users do' : 'along with your users'}
        </motion.span>
      </AnimatePresence>
      {' — for '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? '$0' : '$12k'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-emerald-500/30' : 'border-red-400/25')} {...blurIn(0.2)}>
          {isAI ? '$0' : '~$12K'}
        </motion.span>
      </AnimatePresence>
      {'  '}<RefreshCw className="inline h-3.5 w-3.5 text-foreground/30 transition-all group-hover/h2:text-foreground/70 group-hover/h2:scale-110 ml-1" />
    </h2>
  );
}

// ── Option B: time and cost together ────────────────────
// "...in minutes, not hours or $12K" vs "...in hours and ~$12K, not minutes"

function OptionB() {
  const { isAI, interact } = useToggle();
  return (
    <h2 className="group/h2 mt-1 inline cursor-pointer text-lg text-foreground/70" onClick={interact}>
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'ai' : 'qa'} className="font-medium text-foreground" {...blurIn()}>
          {isAI ? <><Code2 className="inline h-4 w-4 mr-1 -translate-y-[1px]" />AI testers</> : <><Mouse className="inline h-4 w-4 mr-1 -translate-y-[1px]" />QA</>}
        </motion.span>
      </AnimatePresence>
      {' '}find{' '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'every' : 'most'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-red-400/25' : 'border-orange-400/25')} {...blurIn(0.05)}>
          {isAI ? 'every issue' : 'most issues'}
        </motion.span>
      </AnimatePresence>
      {' '}in{' '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'min' : 'hr'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-emerald-500/30' : 'border-amber-500/25')} {...blurIn(0.1)}>
          {isAI ? 'minutes' : 'hours'}
        </motion.span>
      </AnimatePresence>
      {', not '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'not-hr' : 'not-min'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-foreground/10' : 'border-foreground/10')} {...blurIn(0.15)}>
          {isAI ? 'hours or $12K' : 'minutes'}
        </motion.span>
      </AnimatePresence>
      {'  '}<RefreshCw className="inline h-3.5 w-3.5 text-foreground/30 transition-all group-hover/h2:text-foreground/70 group-hover/h2:scale-110 ml-1" />
    </h2>
  );
}

// ── Option C: second line with cost ─────────────────────
// Line 1: same as current. Line 2: "$0 per test" vs "~$12K per round"

function OptionC() {
  const { isAI, interact } = useToggle();
  return (
    <div className="group/h2 mt-1 inline-block cursor-pointer" onClick={interact}>
      <h2 className="text-lg text-foreground/70">
        <AnimatePresence mode="wait">
          <motion.span key={isAI ? 'ai' : 'qa'} className="font-medium text-foreground" {...blurIn()}>
            {isAI ? <><Code2 className="inline h-4 w-4 mr-1 -translate-y-[1px]" />AI testers</> : <><Mouse className="inline h-4 w-4 mr-1 -translate-y-[1px]" />QA</>}
          </motion.span>
        </AnimatePresence>
        {' '}find{' '}
        <AnimatePresence mode="wait">
          <motion.span key={isAI ? 'every' : 'most'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-red-400/25' : 'border-orange-400/25')} {...blurIn(0.05)}>
            {isAI ? 'every issue' : 'most issues'}
          </motion.span>
        </AnimatePresence>
        {' '}in{' '}
        <AnimatePresence mode="wait">
          <motion.span key={isAI ? 'min' : 'hr'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-emerald-500/30' : 'border-amber-500/25')} {...blurIn(0.1)}>
            {isAI ? 'minutes' : 'hours'}
          </motion.span>
        </AnimatePresence>
        {' '}for{' '}
        <AnimatePresence mode="wait">
          <motion.span key={isAI ? '$0' : '$12k'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-emerald-500/30' : 'border-red-400/25')} {...blurIn(0.15)}>
            {isAI ? '$0' : '~$12K'}
          </motion.span>
        </AnimatePresence>
        {', '}
        <AnimatePresence mode="wait">
          <motion.span key={isAI ? 'before' : 'along'} {...fadeIn(0.2)}>
            {isAI ? 'before your users do' : 'along with your users'}
          </motion.span>
        </AnimatePresence>
        {'  '}<RefreshCw className="inline h-3.5 w-3.5 text-foreground/30 transition-all group-hover/h2:text-foreground/70 group-hover/h2:scale-110 ml-1" />
      </h2>
    </div>
  );
}

// ── Option D: cost as parenthetical ─────────────────────
// "...in minutes ($0) ..." vs "...in hours (~$12K) ..."

function OptionD() {
  const { isAI, interact } = useToggle();
  return (
    <h2 className="group/h2 mt-1 inline cursor-pointer text-lg text-foreground/70" onClick={interact}>
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'ai' : 'qa'} className="font-medium text-foreground" {...blurIn()}>
          {isAI ? <><Code2 className="inline h-4 w-4 mr-1 -translate-y-[1px]" />AI testers</> : <><Mouse className="inline h-4 w-4 mr-1 -translate-y-[1px]" />QA</>}
        </motion.span>
      </AnimatePresence>
      {' '}find{' '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'every' : 'most'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-red-400/25' : 'border-orange-400/25')} {...blurIn(0.05)}>
          {isAI ? 'every issue' : 'most issues'}
        </motion.span>
      </AnimatePresence>
      {' '}in{' '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'min' : 'hr'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-emerald-500/30' : 'border-amber-500/25')} {...blurIn(0.1)}>
          {isAI ? 'minutes' : 'hours'}
        </motion.span>
      </AnimatePresence>
      {' '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'cost-ai' : 'cost-qa'} className={cn('text-sm', isAI ? 'text-emerald-500/60' : 'text-red-400/60')} {...blurIn(0.15)}>
          {isAI ? '($0)' : '(~$12K)'}
        </motion.span>
      </AnimatePresence>
      {', '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'before' : 'along'} {...fadeIn(0.2)}>
          {isAI ? 'before your users do' : 'along with your users'}
        </motion.span>
      </AnimatePresence>
      {'  '}<RefreshCw className="inline h-3.5 w-3.5 text-foreground/30 transition-all group-hover/h2:text-foreground/70 group-hover/h2:scale-110 ml-1" />
    </h2>
  );
}

// ── Option E: cost replaces the tail ────────────────────
// "...in minutes, for free" vs "...in hours, for ~$12K per round"

function OptionE() {
  const { isAI, interact } = useToggle();
  return (
    <h2 className="group/h2 mt-1 inline cursor-pointer text-lg text-foreground/70" onClick={interact}>
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'ai' : 'qa'} className="font-medium text-foreground" {...blurIn()}>
          {isAI ? <><Code2 className="inline h-4 w-4 mr-1 -translate-y-[1px]" />AI testers</> : <><Mouse className="inline h-4 w-4 mr-1 -translate-y-[1px]" />QA</>}
        </motion.span>
      </AnimatePresence>
      {' '}find{' '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'every' : 'most'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-red-400/25' : 'border-orange-400/25')} {...blurIn(0.05)}>
          {isAI ? 'every issue' : 'most issues'}
        </motion.span>
      </AnimatePresence>
      {' '}in{' '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'min' : 'hr'} className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-emerald-500/30' : 'border-amber-500/25')} {...blurIn(0.1)}>
          {isAI ? 'minutes' : 'hours'}
        </motion.span>
      </AnimatePresence>
      {', '}
      <AnimatePresence mode="wait">
        <motion.span key={isAI ? 'tail-ai' : 'tail-qa'} {...fadeIn(0.15)}>
          {isAI ? <>for <span className="border-b-2 border-emerald-500/30 pb-0.5 font-medium text-foreground">free</span></> : <>for <span className="border-b-2 border-red-400/25 pb-0.5 font-medium text-foreground">~$12K</span> per round</>}
        </motion.span>
      </AnimatePresence>
      {'  '}<RefreshCw className="inline h-3.5 w-3.5 text-foreground/30 transition-all group-hover/h2:text-foreground/70 group-hover/h2:scale-110 ml-1" />
    </h2>
  );
}

// ── Options config ──────────────────────────────────────

const OPTIONS = [
  { id: 'current', label: 'Current (no cost)', component: Current },
  { id: 'A', label: 'Cost appended: "— for $0"', component: OptionA },
  { id: 'B', label: 'Not hours or $12K', component: OptionB },
  { id: 'C', label: 'Inline: "in minutes for $0"', component: OptionC },
  { id: 'D', label: 'Parenthetical: "minutes ($0)"', component: OptionD },
  { id: 'E', label: 'Tail swap: "for free" / "for ~$12K"', component: OptionE },
];

export default function H2CostDemo() {
  const [selected, setSelected] = useState('current');
  const SelectedComp = OPTIONS.find((o) => o.id === selected)?.component ?? Current;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-3">
        <p className="text-sm font-medium text-foreground/50">H2 Cost Variations — click each tagline to toggle AI/QA</p>
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-10">
        {/* Selector */}
        <div className="flex flex-wrap gap-2 mb-8">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm transition-colors',
                selected === opt.id
                  ? 'border-foreground/20 bg-foreground/5 text-foreground'
                  : 'border-border text-foreground/40 hover:text-foreground/70',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Active preview */}
        <div className="rounded-xl border border-border p-8 mb-10" key={selected}>
          <h1 className="text-3xl font-bold tracking-tight">miror</h1>
          <SelectedComp />
        </div>

        {/* All at a glance */}
        <div className="grid gap-3 pb-16">
          {OPTIONS.map(({ id, label, component: Comp }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={cn(
                'rounded-lg border p-6 text-left transition-colors',
                selected === id ? 'border-foreground/20 bg-foreground/[0.02]' : 'border-border hover:border-foreground/10',
              )}
            >
              <p className="mb-2 text-[10px] font-medium text-foreground/25 uppercase">{label}</p>
              <h1 className="text-2xl font-bold tracking-tight">miror</h1>
              <Comp />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
