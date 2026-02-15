'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ── Shared hook: auto-cycle + hover/click ───────────

function useMorphToggle(aiDuration = 6000, qaDuration = 2500) {
  const [isAI, setIsAI] = useState(true);
  const [paused, setPaused] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const schedule = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsAI((v) => !v);
    }, isAI ? aiDuration : qaDuration);
  }, [isAI, aiDuration, qaDuration]);

  useEffect(() => {
    if (paused) return;
    schedule();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isAI, paused, schedule]);

  const interact = useCallback(() => {
    setIsAI((v) => !v);
    // Briefly pause auto-cycle so user can read
    setPaused(true);
    setTimeout(() => setPaused(false), 4000);
  }, []);

  return { isAI, interact };
}

// ── Shared underlined keywords ──────────────────────

function Keywords({ isAI }: { isAI: boolean }) {
  return (
    <>
      <span className={cn(
        'border-b-2 pb-0.5 font-medium text-foreground transition-colors duration-500',
        isAI ? 'border-red-400/25' : 'border-orange-400/25',
      )}>
        {isAI ? 'every issue' : 'most issues'}
      </span>
      {' '}in{' '}
      <span className={cn(
        'border-b-2 pb-0.5 font-medium text-foreground transition-colors duration-500',
        isAI ? 'border-emerald-500/30' : 'border-amber-500/25',
      )}>
        {isAI ? 'minutes' : 'hours'}
      </span>
    </>
  );
}

// ── Option 1: Blur morph ────────────────────────────

function Option1() {
  const { isAI, interact } = useMorphToggle();
  return (
    <h2
      className="mt-1 cursor-pointer text-lg text-foreground/70"
      onClick={interact}
      onMouseEnter={interact}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={isAI ? 'ai' : 'qa'}
          className="inline-block font-medium text-foreground"
          initial={{ opacity: 0, filter: 'blur(8px)', y: 2 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          exit={{ opacity: 0, filter: 'blur(8px)', y: -2 }}
          transition={{ duration: 0.35 }}
        >
          {isAI ? 'AI testers' : 'QA'}
        </motion.span>
      </AnimatePresence>
      {' '}find{' '}
      <AnimatePresence mode="wait">
        <motion.span
          key={isAI ? 'every' : 'most'}
          className={cn(
            'inline-block border-b-2 pb-0.5 font-medium text-foreground',
            isAI ? 'border-red-400/25' : 'border-orange-400/25',
          )}
          initial={{ opacity: 0, filter: 'blur(6px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          {isAI ? 'every issue' : 'most issues'}
        </motion.span>
      </AnimatePresence>
      {' '}in{' '}
      <AnimatePresence mode="wait">
        <motion.span
          key={isAI ? 'min' : 'hr'}
          className={cn(
            'inline-block border-b-2 pb-0.5 font-medium text-foreground',
            isAI ? 'border-emerald-500/30' : 'border-amber-500/25',
          )}
          initial={{ opacity: 0, filter: 'blur(6px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {isAI ? 'minutes' : 'hours'}
        </motion.span>
      </AnimatePresence>
      {', '}
      <AnimatePresence mode="wait">
        <motion.span
          key={isAI ? 'before' : 'along'}
          className="inline-block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
        >
          {isAI ? 'before your users do' : 'along with your users'}
        </motion.span>
      </AnimatePresence>
    </h2>
  );
}

// ── Option 2: Slide up / down ───────────────────────

function Option2() {
  const { isAI, interact } = useMorphToggle();
  return (
    <h2
      className="mt-1 cursor-pointer text-lg text-foreground/70"
      onClick={interact}
      onMouseEnter={interact}
    >
      <span className="inline-flex overflow-hidden align-bottom" style={{ height: '1.5em' }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={isAI ? 'ai' : 'qa'}
            className="inline-block font-medium text-foreground"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {isAI ? 'AI testers' : 'QA'}
          </motion.span>
        </AnimatePresence>
      </span>
      {' '}find{' '}
      <span className="inline-flex overflow-hidden align-bottom" style={{ height: '1.5em' }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={isAI ? 'every' : 'most'}
            className={cn(
              'inline-block border-b-2 pb-0.5 font-medium text-foreground',
              isAI ? 'border-red-400/25' : 'border-orange-400/25',
            )}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.04, ease: [0.4, 0, 0.2, 1] }}
          >
            {isAI ? 'every issue' : 'most issues'}
          </motion.span>
        </AnimatePresence>
      </span>
      {' '}in{' '}
      <span className="inline-flex overflow-hidden align-bottom" style={{ height: '1.5em' }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={isAI ? 'min' : 'hr'}
            className={cn(
              'inline-block border-b-2 pb-0.5 font-medium text-foreground',
              isAI ? 'border-emerald-500/30' : 'border-amber-500/25',
            )}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}
          >
            {isAI ? 'minutes' : 'hours'}
          </motion.span>
        </AnimatePresence>
      </span>
      {', '}
      <span className="inline-flex overflow-hidden align-bottom" style={{ height: '1.5em' }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={isAI ? 'before' : 'along'}
            className="inline-block"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.12, ease: [0.4, 0, 0.2, 1] }}
          >
            {isAI ? 'before your users do' : 'along with your users'}
          </motion.span>
        </AnimatePresence>
      </span>
    </h2>
  );
}

// ── Option 3: Typewriter erase + retype ─────────────

function Option3() {
  const { isAI, interact } = useMorphToggle(6000, 3000);
  const text = isAI
    ? 'AI testers find every issue in minutes, before your users do'
    : 'QA find most issues in hours, along with your users';

  return (
    <h2
      className="mt-1 cursor-pointer text-lg text-foreground/70"
      onClick={interact}
      onMouseEnter={interact}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={isAI ? 'ai' : 'qa'}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.015 } },
            exit: { transition: { staggerChildren: 0.008, staggerDirection: -1 } },
          }}
        >
          {text.split('').map((char, i) => {
            // Determine if this char is part of a keyword
            const aiKeywords = ['AI testers', 'every issue', 'minutes'];
            const qaKeywords = ['QA', 'most issues', 'hours'];
            const keywords = isAI ? aiKeywords : qaKeywords;
            let isKeyword = false;
            let pos = 0;
            for (const kw of keywords) {
              const idx = text.indexOf(kw, pos);
              if (idx !== -1 && i >= idx && i < idx + kw.length) {
                isKeyword = true;
                break;
              }
            }

            return (
              <motion.span
                key={`${i}-${char}`}
                className={isKeyword ? 'font-medium text-foreground' : ''}
                variants={{
                  hidden: { opacity: 0, y: 4 },
                  visible: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: -4 },
                }}
                transition={{ duration: 0.08 }}
              >
                {char}
              </motion.span>
            );
          })}
        </motion.span>
      </AnimatePresence>
    </h2>
  );
}

// ── Option 4: Crossfade with scale ──────────────────

function Option4() {
  const { isAI, interact } = useMorphToggle();

  const Segment = ({ aiText, qaText, delay = 0, className = '' }: { aiText: string; qaText: string; delay?: number; className?: string }) => (
    <span className="relative inline-flex">
      <AnimatePresence mode="wait">
        <motion.span
          key={isAI ? aiText : qaText}
          className={cn('inline-block', className)}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.3, delay, ease: 'easeOut' }}
        >
          {isAI ? aiText : qaText}
        </motion.span>
      </AnimatePresence>
    </span>
  );

  return (
    <h2
      className="mt-1 cursor-pointer text-lg text-foreground/70"
      onClick={interact}
      onMouseEnter={interact}
    >
      <Segment aiText="AI testers" qaText="QA" className="font-medium text-foreground" />
      {' '}find{' '}
      <Segment
        aiText="every issue"
        qaText="most issues"
        delay={0.05}
        className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-red-400/25' : 'border-orange-400/25')}
      />
      {' '}in{' '}
      <Segment
        aiText="minutes"
        qaText="hours"
        delay={0.1}
        className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-emerald-500/30' : 'border-amber-500/25')}
      />
      {', '}
      <Segment aiText="before your users do" qaText="along with your users" delay={0.15} />
    </h2>
  );
}

// ── Option 5: Flip + staggered cascade ──────────────

function Option5() {
  const { isAI, interact } = useMorphToggle();

  const Flip = ({ aiText, qaText, delay = 0, className = '' }: { aiText: string; qaText: string; delay?: number; className?: string }) => (
    <span className="inline-flex overflow-hidden align-bottom" style={{ height: '1.5em', perspective: '200px' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={isAI ? aiText : qaText}
          className={cn('inline-block', className)}
          initial={{ rotateX: 90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: -90, opacity: 0 }}
          transition={{ duration: 0.35, delay, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformOrigin: 'center bottom' }}
        >
          {isAI ? aiText : qaText}
        </motion.span>
      </AnimatePresence>
    </span>
  );

  return (
    <h2
      className="mt-1 cursor-pointer text-lg text-foreground/70"
      onClick={interact}
      onMouseEnter={interact}
    >
      <Flip aiText="AI testers" qaText="QA" className="font-medium text-foreground" />
      {' '}find{' '}
      <Flip
        aiText="every issue"
        qaText="most issues"
        delay={0.06}
        className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-red-400/25' : 'border-orange-400/25')}
      />
      {' '}in{' '}
      <Flip
        aiText="minutes"
        qaText="hours"
        delay={0.12}
        className={cn('border-b-2 pb-0.5 font-medium text-foreground', isAI ? 'border-emerald-500/30' : 'border-amber-500/25')}
      />
      {', '}
      <Flip aiText="before your users do" qaText="along with your users" delay={0.18} />
    </h2>
  );
}

// ── Demo page ───────────────────────────────────────

const OPTIONS = [
  { id: '1', label: 'Blur morph', desc: 'Words blur out and blur in with staggered timing', component: Option1 },
  { id: '2', label: 'Slide up', desc: 'Words slide up and out, new ones slide up from below', component: Option2 },
  { id: '3', label: 'Typewriter', desc: 'Characters dissolve and re-appear letter by letter', component: Option3 },
  { id: '4', label: 'Crossfade scale', desc: 'Words scale slightly and crossfade with cascade', component: Option4 },
  { id: '5', label: 'Flip cascade', desc: 'Words flip in 3D one after another', component: Option5 },
];

export default function ToggleStylesDemo() {
  const [selected, setSelected] = useState('1');
  const SelectedComp = OPTIONS.find(o => o.id === selected)?.component ?? Option1;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-3">
        <p className="text-sm font-medium text-foreground/50">Auto-morphing h2 — cycles automatically, hover or click to trigger</p>
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-10">
        {/* Picker */}
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
              {opt.id}: {opt.label}
            </button>
          ))}
        </div>

        {/* Active preview */}
        <div className="rounded-xl border border-border p-8 mb-10" key={selected}>
          <h1 className="text-3xl font-bold tracking-tight">miror</h1>
          <SelectedComp />
          <p className="mt-4 text-xs text-foreground/20">Auto-cycles every few seconds. Hover or click to trigger.</p>
        </div>

        {/* All at a glance */}
        <p className="text-xs font-medium text-foreground/30 uppercase tracking-wider mb-4">All options</p>
        <div className="grid gap-3 pb-16">
          {OPTIONS.map(({ id, label, desc, component: Comp }) => (
            <div
              key={id}
              onClick={() => setSelected(id)}
              className={cn(
                'cursor-pointer rounded-lg border p-6 text-left transition-colors',
                selected === id ? 'border-foreground/20 bg-foreground/[0.02]' : 'border-border hover:border-foreground/10',
              )}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-[10px] font-medium text-foreground/25 uppercase">{id}: {label}</p>
                <p className="text-[10px] text-foreground/15">{desc}</p>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">miror</h1>
              <Comp />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
