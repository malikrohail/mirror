'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Shared typewriter status text ───────────────────────

const STATUS_MESSAGES = [
  'Crawling website',
  'Mapping page structure',
  'Identifying key user flows',
  'Crafting test tasks',
  'Selecting AI personas',
  'Building test plan',
];

function TypewriterStatus() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'hold' | 'exit'>('typing');

  useEffect(() => {
    const msg = STATUS_MESSAGES[msgIndex];
    let t: ReturnType<typeof setTimeout>;

    if (phase === 'typing' && charIndex < msg.length) {
      t = setTimeout(() => setCharIndex((c) => c + 1), 35);
    } else if (phase === 'typing' && charIndex === msg.length) {
      t = setTimeout(() => setPhase('hold'), 0);
    } else if (phase === 'hold') {
      t = setTimeout(() => setPhase('exit'), 2800);
    } else if (phase === 'exit') {
      t = setTimeout(() => {
        setMsgIndex((i) => (i + 1) % STATUS_MESSAGES.length);
        setCharIndex(0);
        setPhase('typing');
      }, 350);
    }

    return () => clearTimeout(t);
  }, [charIndex, phase, msgIndex]);

  const text = STATUS_MESSAGES[msgIndex].slice(0, charIndex);

  return (
    <div className="text-center h-6">
      <AnimatePresence mode="wait">
        <motion.span
          key={msgIndex}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground"
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={
            phase === 'exit'
              ? { opacity: 0, filter: 'blur(4px)' }
              : { opacity: 1, filter: 'blur(0px)' }
          }
          transition={{ duration: 0.3 }}
        >
          {text}
          <span className="relative ml-1 w-3 h-3 inline-flex items-center justify-center">
            <motion.span
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'hold' ? 1 : 0, rotate: 360 }}
              transition={{ opacity: { duration: 0.4 }, rotate: { duration: 1.5, repeat: Infinity, ease: 'linear' } }}
            >
              {[0, 1, 2, 3].map((i) => {
                const angle = (i * 90 * Math.PI) / 180;
                const x = 6 + 4.5 * Math.cos(angle);
                const y = 6 + 4.5 * Math.sin(angle);
                return (
                  <span
                    key={i}
                    className="absolute h-1 w-1 rounded-full bg-foreground"
                    style={{ left: x - 2, top: y - 2, opacity: 0.15 + (i / 4) * 0.55 }}
                  />
                );
              })}
            </motion.span>
          </span>
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ── Option 1: Lucide Spinner (current) ──────────────────
function Spinner1() {
  return (
    <svg className="h-10 w-10 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" className="opacity-20" />
      <path d="M12 2a10 10 0 0 1 10 10" className="text-foreground/70" strokeLinecap="round" />
    </svg>
  );
}

// ── Option 2: Thick Arc ─────────────────────────────────
function Spinner2() {
  return (
    <svg className="h-10 w-10 animate-spin" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" className="opacity-10" />
      <path
        d="M20 4a16 16 0 0 1 16 16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-foreground/70"
      />
    </svg>
  );
}

// ── Option 3: Double Ring ───────────────────────────────
function Spinner3() {
  return (
    <div className="relative h-10 w-10">
      <svg className="absolute inset-0 h-10 w-10 animate-spin" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" className="opacity-10" />
        <path d="M20 4a16 16 0 0 1 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-foreground/60" />
      </svg>
      <svg className="absolute inset-0 h-10 w-10 animate-spin [animation-direction:reverse] [animation-duration:1.5s]" viewBox="0 0 40 40" fill="none">
        <path d="M20 8a12 12 0 0 0-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-foreground/30" />
      </svg>
    </div>
  );
}

// ── Option 4: Dotted Circle ─────────────────────────────
function Spinner4() {
  return (
    <svg className="h-10 w-10 animate-spin [animation-duration:3s]" viewBox="0 0 40 40" fill="none">
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x = 20 + 16 * Math.cos(angle);
        const y = 20 + 16 * Math.sin(angle);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="1.8"
            fill="currentColor"
            className="text-foreground"
            style={{ opacity: 0.1 + (i / 12) * 0.7 }}
          />
        );
      })}
    </svg>
  );
}

// ── Option 5: Dashed Ring ───────────────────────────────
function Spinner5() {
  return (
    <svg className="h-10 w-10 animate-spin [animation-duration:2s]" viewBox="0 0 40 40" fill="none">
      <circle
        cx="20"
        cy="20"
        r="16"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="8 4"
        strokeLinecap="round"
        className="text-foreground/50"
      />
    </svg>
  );
}

// ── Option 6: Gradient Arc ──────────────────────────────
function Spinner6() {
  return (
    <svg className="h-10 w-10 animate-spin" viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="grad6" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" className="opacity-5" />
      <circle cx="20" cy="20" r="16" stroke="url(#grad6)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="75 25" />
      <circle cx="36" cy="20" r="2" fill="currentColor" className="text-foreground/70" />
    </svg>
  );
}

// ── Option 7: Pulse Ring ────────────────────────────────
function Spinner7() {
  return (
    <div className="relative h-10 w-10">
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-foreground/20"
        animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <svg className="relative h-10 w-10 animate-spin" viewBox="0 0 40 40" fill="none">
        <path d="M20 4a16 16 0 0 1 16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-foreground/60" />
      </svg>
    </div>
  );
}

// ── Option 8: Segmented ─────────────────────────────────
function Spinner8() {
  return (
    <svg className="h-10 w-10 animate-spin [animation-duration:1.5s]" viewBox="0 0 40 40" fill="none">
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={describeArc(20, 20, 16, i * 90 + 8, i * 90 + 72)}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ opacity: 0.15 + i * 0.22 }}
        />
      ))}
    </svg>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ── Option 9: Thin Elegant ──────────────────────────────
function Spinner9() {
  return (
    <svg className="h-10 w-10 animate-spin [animation-duration:0.8s]" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1" className="opacity-10" />
      <path d="M20 3a17 17 0 0 1 12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-foreground/70" />
    </svg>
  );
}

// ── Option 10: Three Arcs ───────────────────────────────
function Spinner10() {
  return (
    <div className="relative h-10 w-10">
      <svg className="absolute inset-0 h-10 w-10 animate-spin [animation-duration:1.2s]" viewBox="0 0 40 40" fill="none">
        <path d={describeArc(20, 20, 17, 0, 80)} stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-foreground/60" />
      </svg>
      <svg className="absolute inset-0 h-10 w-10 animate-spin [animation-duration:1.8s] [animation-direction:reverse]" viewBox="0 0 40 40" fill="none">
        <path d={describeArc(20, 20, 13, 0, 60)} stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-foreground/35" />
      </svg>
      <svg className="absolute inset-0 h-10 w-10 animate-spin [animation-duration:2.4s]" viewBox="0 0 40 40" fill="none">
        <path d={describeArc(20, 20, 9, 0, 50)} stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-foreground/20" />
      </svg>
    </div>
  );
}

// ── Demo Page ───────────────────────────────────────────

const options = [
  { name: 'Current', component: Spinner1 },
  { name: 'Thick Arc', component: Spinner2 },
  { name: 'Double Ring', component: Spinner3 },
  { name: 'Dotted Circle', component: Spinner4 },
  { name: 'Dashed Ring', component: Spinner5 },
  { name: 'Gradient Arc', component: Spinner6 },
  { name: 'Pulse Ring', component: Spinner7 },
  { name: 'Segmented', component: Spinner8 },
  { name: 'Thin Elegant', component: Spinner9 },
  { name: 'Three Arcs', component: Spinner10 },
];

// ── Badge indicator options (shown after typewriter finishes) ──

const badgeIndicators = [
  {
    name: 'Pulsing dot',
    indicator: (
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-foreground/40"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    ),
  },
  {
    name: 'Three dots wave',
    indicator: (
      <span className="inline-flex items-center gap-0.5 ml-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1 w-1 rounded-full bg-foreground/40"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </span>
    ),
  },
  {
    name: 'Tiny spinner',
    indicator: (
      <svg className="h-3 w-3 animate-spin ml-0.5" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" className="opacity-20" />
        <path d="M6 1a5 5 0 0 1 5 5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="opacity-50" />
      </svg>
    ),
  },
  {
    name: 'Breathing ring',
    indicator: (
      <motion.span
        className="h-2.5 w-2.5 rounded-full border border-foreground/30 ml-0.5"
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    ),
  },
  {
    name: 'Checkmark fade-in',
    indicator: (
      <motion.svg
        className="h-3 w-3 ml-0.5"
        viewBox="0 0 12 12"
        fill="none"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <path d="M3 6l2.5 2.5L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50" />
      </motion.svg>
    ),
  },
  {
    name: 'Horizontal bar',
    indicator: (
      <span className="relative ml-1 h-[2px] w-6 overflow-hidden rounded-full bg-foreground/10">
        <motion.span
          className="absolute inset-y-0 left-0 w-3 rounded-full bg-foreground/40"
          animate={{ x: [0, 12, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </span>
    ),
  },
  {
    name: 'Two dots bounce',
    indicator: (
      <span className="inline-flex items-center gap-0.5 ml-0.5">
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="h-1 w-1 rounded-full bg-foreground/40"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
    ),
  },
  {
    name: 'Ellipsis type',
    indicator: (
      <span className="inline-flex items-center ml-0.5 w-4">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="text-foreground/40"
            animate={{ opacity: [0, 1] }}
            transition={{ duration: 0.4, delay: i * 0.4, repeat: Infinity, repeatDelay: 0.8 }}
          >
            .
          </motion.span>
        ))}
      </span>
    ),
  },
  {
    name: 'Rotating dots',
    indicator: (
      <span className="relative ml-1 h-3 w-3">
        <motion.span className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
          {[0, 1, 2, 3].map((i) => {
            const angle = (i * 90 * Math.PI) / 180;
            const x = 6 + 4.5 * Math.cos(angle);
            const y = 6 + 4.5 * Math.sin(angle);
            return (
              <span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-foreground"
                style={{ left: x - 2, top: y - 2, opacity: 0.15 + (i / 4) * 0.55 }}
              />
            );
          })}
        </motion.span>
      </span>
    ),
  },
  {
    name: 'Fade pulse',
    indicator: (
      <motion.span
        className="ml-1 text-[10px] text-foreground/30"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ●
      </motion.span>
    ),
  },
];

export default function PlanLoaderDemo() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="px-[100px] pt-[40px] pb-[100px]">
      <p className="text-[14px] uppercase text-foreground/30 mb-6">Loading spinner options</p>

      <div className="grid grid-cols-2 gap-4">
        {options.map((opt, i) => {
          const SpinnerComp = opt.component;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`rounded-xl border bg-card overflow-hidden text-left transition-all ${
                selected === i
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-foreground/20'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-xs font-medium text-foreground/50">
                  Option {i + 1}
                </span>
                <span className="text-[11px] text-foreground/30">{opt.name}</span>
              </div>
              <div className="flex flex-col items-center gap-4 py-10">
                <SpinnerComp />
                <div className="text-center">
                  <p className="text-sm font-medium">Setting things up</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mirror is exploring your site and designing the test
                  </p>
                </div>
                <TypewriterStatus />
              </div>
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="mt-8 rounded-xl border border-primary/30 bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/30">
            <span className="text-sm font-medium">
              Selected: Option {selected + 1} — {options[selected].name}
            </span>
          </div>
          <div className="flex flex-col items-center gap-4 py-12">
            {(() => { const SpinnerComp = options[selected].component; return <SpinnerComp />; })()}
            <div className="text-center">
              <p className="text-sm font-medium">Setting things up</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mirror is exploring your site and designing the test
              </p>
            </div>
            <TypewriterStatus />
          </div>
        </div>
      )}

      {/* ── Badge indicator options ──────────────────────── */}
      <p className="text-[14px] uppercase text-foreground/30 mb-6 mt-16">Badge indicator options (after typing)</p>
      <div className="grid grid-cols-2 gap-4">
        {badgeIndicators.map((ind, i) => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-xs font-medium text-foreground/50">Option {i + 1}</span>
              <span className="text-[11px] text-foreground/30">{ind.name}</span>
            </div>
            <div className="flex items-center justify-center py-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                Crawling website
                {ind.indicator}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
