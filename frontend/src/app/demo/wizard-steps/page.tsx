'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Settings, ArrowRight, Users, ClipboardEdit } from 'lucide-react';

// ── Two steps ────────────────────────────────────────────

const STEPS = ['Describe', 'Testers'] as const;

// ── Shared step content ──────────────────────────────────

function StepContent({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/25 mb-1.5">
            your website
          </label>
          <input
            type="text"
            placeholder="example.com"
            className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/70 outline-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/25 mb-1.5">
            tester&apos;s task
          </label>
          <textarea
            placeholder="e.g. Sign up for a free trial"
            className="w-full min-h-20 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none resize-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring"
          />
        </div>
        <button className="w-full rounded-lg bg-foreground text-background h-12 text-sm font-medium hover:bg-foreground/90">
          Continue With Plan
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground/40">Pick your testers</p>
      <div className="space-y-1.5">
        {[
          { emoji: '👩‍💻', name: 'Tech-Savvy Millennial', desc: 'Fast, impatient, keyboard-first' },
          { emoji: '👴', name: 'Senior User', desc: 'Careful, reads everything' },
          { emoji: '🧑‍🦯', name: 'Screen Reader User', desc: 'Keyboard nav, relies on ARIA' },
        ].map((p, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
            <span className="text-lg">{p.emoji}</span>
            <div>
              <p className="text-sm font-medium text-foreground/80">{p.name}</p>
              <p className="text-xs text-foreground/40">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full rounded-lg bg-foreground text-background h-12 text-sm font-medium hover:bg-foreground/90">
        Submit Plan
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 1 — Segmented Control
// iOS-style segmented control with sliding background.
// ═══════════════════════════════════════════════════════════

function Option1() {
  const [current, setCurrent] = useState(0);
  return (
    <Card>
      <div className="px-4 pt-3 pb-1">
        <div className="relative flex rounded-lg bg-muted p-0.5">
          <div
            className="absolute top-0.5 bottom-0.5 rounded-md bg-background shadow-sm transition-all duration-200"
            style={{ width: '50%', left: current === 0 ? '2px' : 'calc(50% - 2px)' }}
          />
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => setCurrent(i)}
              className={cn(
                'relative z-10 flex-1 py-1.5 text-xs text-center font-medium transition-colors',
                i === current ? 'text-foreground' : 'text-foreground/35',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4"><StepContent step={current} /></div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 2 — Two Dots
// Minimal: two dots, active one larger. Label below.
// ═══════════════════════════════════════════════════════════

function Option2() {
  const [current, setCurrent] = useState(0);
  return (
    <Card>
      <div className="flex flex-col items-center gap-1 pt-3 pb-1">
        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                'rounded-full transition-all',
                i === current ? 'h-2.5 w-2.5 bg-foreground' : 'h-2 w-2 bg-foreground/15',
              )}
            />
          ))}
        </div>
        <span className="text-[10px] text-foreground/30">{STEPS[current]}</span>
      </div>
      <div className="p-4"><StepContent step={current} /></div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 3 — Split Bar
// Two segments of a thin bar. Active fills.
// ═══════════════════════════════════════════════════════════

function Option3() {
  const [current, setCurrent] = useState(0);
  return (
    <Card>
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-1">
          {STEPS.map((label, i) => (
            <button key={label} onClick={() => setCurrent(i)} className="flex-1">
              <div className={cn('h-1 rounded-full transition-all', i <= current ? 'bg-foreground' : 'bg-foreground/10')} />
              <span className={cn('block text-[10px] mt-1.5 text-center', i === current ? 'text-foreground/60 font-medium' : 'text-foreground/20')}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4"><StepContent step={current} /></div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 4 — Slash Divider
// "Describe / Testers" with active one bold.
// ═══════════════════════════════════════════════════════════

function Option4() {
  const [current, setCurrent] = useState(0);
  return (
    <Card>
      <div className="flex items-center justify-center gap-2 pt-3 pb-1">
        <button onClick={() => setCurrent(0)} className={cn('text-xs transition-colors', current === 0 ? 'text-foreground font-medium' : 'text-foreground/25 hover:text-foreground/40')}>
          Describe
        </button>
        <span className="text-foreground/15 text-xs">/</span>
        <button onClick={() => setCurrent(1)} className={cn('text-xs transition-colors', current === 1 ? 'text-foreground font-medium' : 'text-foreground/25 hover:text-foreground/40')}>
          Testers
        </button>
      </div>
      <div className="p-4"><StepContent step={current} /></div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 5 — Arrow Flow
// "Describe → Testers" with active highlighted.
// ═══════════════════════════════════════════════════════════

function Option5() {
  const [current, setCurrent] = useState(0);
  return (
    <Card>
      <div className="flex items-center justify-center gap-1.5 pt-3 pb-1">
        <button
          onClick={() => setCurrent(0)}
          className={cn(
            'rounded-full px-3 py-1 text-xs transition-all',
            current === 0 ? 'bg-foreground text-background font-medium' : 'text-foreground/30 hover:text-foreground/50',
          )}
        >
          Describe
        </button>
        <ArrowRight className="h-3 w-3 text-foreground/15" />
        <button
          onClick={() => setCurrent(1)}
          className={cn(
            'rounded-full px-3 py-1 text-xs transition-all',
            current === 1 ? 'bg-foreground text-background font-medium' : 'text-foreground/30 hover:text-foreground/50',
          )}
        >
          Testers
        </button>
      </div>
      <div className="p-4"><StepContent step={current} /></div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 6 — Underline Tabs
// Two tabs with underline on active.
// ═══════════════════════════════════════════════════════════

function Option6() {
  const [current, setCurrent] = useState(0);
  return (
    <Card>
      <div className="border-b border-border">
        <div className="flex">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => setCurrent(i)}
              className={cn(
                'relative flex-1 py-2.5 text-xs text-center transition-colors',
                i === current ? 'text-foreground font-medium' : 'text-foreground/25',
              )}
            >
              {label}
              {i === current && <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-foreground rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4"><StepContent step={current} /></div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 7 — Header Badge
// Step indicator lives inside the header bar.
// ═══════════════════════════════════════════════════════════

function Option7() {
  const [current, setCurrent] = useState(0);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex h-[42px] items-center justify-between px-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] uppercase text-foreground/30">Run a test</h3>
          <div className="flex items-center gap-0.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium transition-all',
                  i === current ? 'bg-foreground text-background' : i < current ? 'bg-foreground/15 text-foreground/50' : 'text-foreground/15',
                )}
              >
                {i < current ? <Check className="h-2.5 w-2.5" /> : i + 1}
              </button>
            ))}
          </div>
        </div>
        <span className="text-[11px] text-foreground/25">{STEPS[current]}</span>
      </div>
      <div className="p-4"><StepContent step={current} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 8 — Connected Circles
// Two circles with a line between. Classic stepper, 2-step.
// ═══════════════════════════════════════════════════════════

function Option8() {
  const [current, setCurrent] = useState(0);
  return (
    <Card>
      <div className="px-8 pt-4 pb-2">
        <div className="flex items-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <button onClick={() => setCurrent(i)} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all',
                  i < current ? 'bg-foreground text-background' : i === current ? 'bg-foreground text-background ring-4 ring-foreground/10' : 'bg-muted text-foreground/30',
                )}>
                  {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn('text-[11px]', i === current ? 'text-foreground/70 font-medium' : 'text-foreground/30')}>{label}</span>
              </button>
              {i === 0 && (
                <div className={cn('flex-1 h-[1px] mx-3 mb-5', current > 0 ? 'bg-foreground' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 pt-2"><StepContent step={current} /></div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 9 — Icon Pills
// Two pills with icons. Active one filled.
// ═══════════════════════════════════════════════════════════

function Option9() {
  const [current, setCurrent] = useState(0);
  const icons = [ClipboardEdit, Users];
  return (
    <Card>
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        {STEPS.map((label, i) => {
          const Icon = icons[i];
          return (
            <button
              key={label}
              onClick={() => setCurrent(i)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all',
                i === current ? 'bg-foreground text-background font-medium' : 'text-foreground/25 hover:text-foreground/40',
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          );
        })}
      </div>
      <div className="p-4"><StepContent step={current} /></div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 10 — Progress Line
// Thin line that fills halfway or fully. Label + fraction.
// ═══════════════════════════════════════════════════════════

function Option10() {
  const [current, setCurrent] = useState(0);
  return (
    <Card>
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-foreground/60">{STEPS[current]}</span>
          <span className="text-[11px] text-foreground/25">{current + 1}/2</span>
        </div>
        <div className="h-1 rounded-full bg-foreground/10 overflow-hidden cursor-pointer" onClick={() => setCurrent((c) => (c === 0 ? 1 : 0))}>
          <div
            className="h-full rounded-full bg-foreground transition-all duration-300"
            style={{ width: current === 0 ? '50%' : '100%' }}
          />
        </div>
      </div>
      <div className="p-4"><StepContent step={current} /></div>
    </Card>
  );
}

// ── Shared card shell ────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex h-[42px] items-center justify-between px-4 border-b border-border bg-muted/30">
        <h3 className="text-[14px] uppercase text-foreground/30">Run a test</h3>
        <button className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/20 hover:bg-muted hover:text-foreground/50">
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

// ── Demo page ────────────────────────────────────────────

const OPTIONS = [
  { label: 'Segmented Control', component: Option1 },
  { label: 'Two Dots', component: Option2 },
  { label: 'Split Bar', component: Option3 },
  { label: 'Slash Divider', component: Option4 },
  { label: 'Arrow Flow', component: Option5 },
  { label: 'Underline Tabs', component: Option6 },
  { label: 'Header Badge', component: Option7 },
  { label: 'Connected Circles', component: Option8 },
  { label: 'Icon Pills', component: Option9 },
  { label: 'Progress Line', component: Option10 },
];

export default function WizardStepsDemoPage() {
  const [active, setActive] = useState(0);
  const ActiveComponent = OPTIONS[active].component;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-medium tracking-tight mb-1">2-Step Wizard Indicators</h1>
        <p className="text-sm text-foreground/40 mb-6">
          10 options for <span className="text-foreground/60">Describe</span> &rarr; <span className="text-foreground/60">Testers</span>. Click steps inside each option to toggle.
        </p>

        <div className="flex items-center gap-1 mb-8 flex-wrap">
          {OPTIONS.map((opt, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm transition-all',
                active === i
                  ? 'bg-foreground text-background font-medium'
                  : 'text-foreground/50 hover:text-foreground/80 hover:bg-foreground/5',
              )}
            >
              {i + 1}. {opt.label}
            </button>
          ))}
        </div>

        <div className="max-w-[480px]">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
