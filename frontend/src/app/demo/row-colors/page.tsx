'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, Users } from 'lucide-react';

// ── Mock data ──────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Great';
  if (score >= 60) return 'Okay';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

const statusColor = (s: string) =>
  s === 'complete' ? 'text-green-600' : s === 'running' ? 'text-blue-500' : 'text-red-500';

interface MockStudy {
  name: string;
  task: string;
  status: 'complete' | 'running' | 'failed';
  personas: number;
  score: number | null;
  date: string;
}

interface MockGroup {
  url: string;
  favicon: string;
  studies: MockStudy[];
}

const GROUPS: MockGroup[] = [
  {
    url: 'google.com',
    favicon: 'https://www.google.com/s2/favicons?domain=google.com&sz=32',
    studies: [
      { name: 'google2', task: 'find out lebrons age', status: 'complete', personas: 1, score: 95, date: 'Feb 14' },
      { name: 'google1', task: 'search for bread', status: 'complete', personas: 1, score: 95, date: 'Feb 14' },
    ],
  },
  {
    url: 'claude.com/pricing',
    favicon: 'https://www.google.com/s2/favicons?domain=claude.com&sz=32',
    studies: [
      { name: 'claude3', task: 'Open a pro account', status: 'complete', personas: 3, score: 12, date: 'Feb 13' },
      { name: 'claude2', task: 'Open a pro account', status: 'running', personas: 4, score: null, date: 'Feb 13' },
      { name: 'claude1', task: 'Open a pro account', status: 'complete', personas: 3, score: 14, date: 'Feb 13' },
    ],
  },
];

// ── Shared components ──────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
      </span>
    );
  }
  if (status === 'complete') return <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />;
  return <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />;
}

function StripHeader({ group }: { group: MockGroup }) {
  return (
    <div className="flex items-center gap-3 border border-border bg-muted/40 px-4 py-2.5 rounded-t-lg">
      <img src={group.favicon} alt="" className="h-4 w-4 rounded-sm" />
      <span className="text-[14px] text-foreground">{group.url}</span>
      <span className="text-[13px] text-foreground/30">{group.studies.length} {group.studies.length === 1 ? 'test' : 'tests'}</span>
      <ChevronRight className="ml-auto h-3.5 w-3.5 text-foreground/30 -rotate-90" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CURRENT — What you have now (for comparison)
// ═══════════════════════════════════════════════════════════

function Current() {
  return (
    <div className="space-y-2.5">
      {GROUPS.map((group) => (
        <div key={group.url}>
          <StripHeader group={group} />
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
            {group.studies.map((s) => (
              <div
                key={s.name}
                className="group/row border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center pl-10 py-2.5 text-[13px]">
                  <div className="grid flex-1 items-center" style={{ gridTemplateColumns: '80px 1fr 100px 50px 80px 60px' }}>
                    <span className="text-foreground/30">{s.name}</span>
                    <span className="text-foreground/40 truncate pr-4">{s.task}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot status={s.status} />
                      <span className={cn('capitalize', statusColor(s.status))}>{s.status}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-foreground/40">
                      <Users className="h-3 w-3" />{s.personas}
                    </span>
                    <span className="tabular-nums">
                      {s.score != null && s.score > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('font-semibold', scoreColor(s.score))}>{s.score}</span>
                          <span className={cn('text-[10px] font-medium uppercase tracking-wide opacity-60', scoreColor(s.score))}>{scoreLabel(s.score)}</span>
                        </span>
                      ) : <span className="text-foreground/20">&mdash;</span>}
                    </span>
                    <span className="text-right text-foreground/30">{s.date}</span>
                  </div>
                  <ChevronRight className="mx-4 h-3.5 w-3.5 shrink-0 text-foreground/15 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 1 — Bold name, stronger task text
// Name is the anchor — make it stand out clearly
// ═══════════════════════════════════════════════════════════

function Option1() {
  return (
    <div className="space-y-2.5">
      {GROUPS.map((group) => (
        <div key={group.url}>
          <StripHeader group={group} />
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
            {group.studies.map((s) => (
              <div
                key={s.name}
                className="group/row border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center pl-10 py-2.5 text-[13px]">
                  <div className="grid flex-1 items-center" style={{ gridTemplateColumns: '80px 1fr 100px 50px 80px 60px' }}>
                    <span className="font-medium text-foreground/70">{s.name}</span>
                    <span className="text-foreground/50 truncate pr-4">{s.task}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot status={s.status} />
                      <span className={cn('capitalize', statusColor(s.status))}>{s.status}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-foreground/40">
                      <Users className="h-3 w-3" />{s.personas}
                    </span>
                    <span className="tabular-nums">
                      {s.score != null && s.score > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('font-semibold', scoreColor(s.score))}>{s.score}</span>
                          <span className={cn('text-[10px] font-medium uppercase tracking-wide opacity-60', scoreColor(s.score))}>{scoreLabel(s.score)}</span>
                        </span>
                      ) : <span className="text-foreground/20">&mdash;</span>}
                    </span>
                    <span className="text-right text-foreground/30">{s.date}</span>
                  </div>
                  <ChevronRight className="mx-4 h-3.5 w-3.5 shrink-0 text-foreground/15 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 2 — Task is the hero, name stays quiet
// Task is what you care about — make it the most readable
// ═══════════════════════════════════════════════════════════

function Option2() {
  return (
    <div className="space-y-2.5">
      {GROUPS.map((group) => (
        <div key={group.url}>
          <StripHeader group={group} />
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
            {group.studies.map((s) => (
              <div
                key={s.name}
                className="group/row border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center pl-10 py-2.5 text-[13px]">
                  <div className="grid flex-1 items-center" style={{ gridTemplateColumns: '80px 1fr 100px 50px 80px 60px' }}>
                    <span className="text-foreground/30">{s.name}</span>
                    <span className="text-foreground/70 truncate pr-4">{s.task}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot status={s.status} />
                      <span className={cn('capitalize', statusColor(s.status))}>{s.status}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-foreground/40">
                      <Users className="h-3 w-3" />{s.personas}
                    </span>
                    <span className="tabular-nums">
                      {s.score != null && s.score > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('font-semibold', scoreColor(s.score))}>{s.score}</span>
                          <span className={cn('text-[10px] font-medium uppercase tracking-wide opacity-60', scoreColor(s.score))}>{scoreLabel(s.score)}</span>
                        </span>
                      ) : <span className="text-foreground/20">&mdash;</span>}
                    </span>
                    <span className="text-right text-foreground/30">{s.date}</span>
                  </div>
                  <ChevronRight className="mx-4 h-3.5 w-3.5 shrink-0 text-foreground/15 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 3 — Both name + task prominent, metadata faded
// Clear left-to-right reading: identity → what → results
// ═══════════════════════════════════════════════════════════

function Option3() {
  return (
    <div className="space-y-2.5">
      {GROUPS.map((group) => (
        <div key={group.url}>
          <StripHeader group={group} />
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
            {group.studies.map((s) => (
              <div
                key={s.name}
                className="group/row border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center pl-10 py-2.5 text-[13px]">
                  <div className="grid flex-1 items-center" style={{ gridTemplateColumns: '80px 1fr 100px 50px 80px 60px' }}>
                    <span className="font-medium text-foreground/60">{s.name}</span>
                    <span className="text-foreground/60 truncate pr-4">{s.task}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot status={s.status} />
                      <span className={cn('capitalize', statusColor(s.status))}>{s.status}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-foreground/30">
                      <Users className="h-3 w-3" />{s.personas}
                    </span>
                    <span className="tabular-nums">
                      {s.score != null && s.score > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('font-semibold', scoreColor(s.score))}>{s.score}</span>
                          <span className={cn('text-[10px] font-medium uppercase tracking-wide opacity-60', scoreColor(s.score))}>{scoreLabel(s.score)}</span>
                        </span>
                      ) : <span className="text-foreground/20">&mdash;</span>}
                    </span>
                    <span className="text-right text-foreground/25">{s.date}</span>
                  </div>
                  <ChevronRight className="mx-4 h-3.5 w-3.5 shrink-0 text-foreground/15 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 4 — High contrast: name + score pop, rest is quiet
// Eyes jump to name (what) and score (result)
// ═══════════════════════════════════════════════════════════

function Option4() {
  return (
    <div className="space-y-2.5">
      {GROUPS.map((group) => (
        <div key={group.url}>
          <StripHeader group={group} />
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
            {group.studies.map((s) => (
              <div
                key={s.name}
                className="group/row border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center pl-10 py-2.5 text-[13px]">
                  <div className="grid flex-1 items-center" style={{ gridTemplateColumns: '80px 1fr 100px 50px 80px 60px' }}>
                    <span className="font-semibold text-foreground/80">{s.name}</span>
                    <span className="text-foreground/35 truncate pr-4">{s.task}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot status={s.status} />
                      <span className={cn('capitalize', statusColor(s.status))}>{s.status}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-foreground/30">
                      <Users className="h-3 w-3" />{s.personas}
                    </span>
                    <span className="tabular-nums">
                      {s.score != null && s.score > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('font-bold text-[14px]', scoreColor(s.score))}>{s.score}</span>
                          <span className={cn('text-[10px] font-medium uppercase tracking-wide opacity-60', scoreColor(s.score))}>{scoreLabel(s.score)}</span>
                        </span>
                      ) : <span className="text-foreground/20">&mdash;</span>}
                    </span>
                    <span className="text-right text-foreground/25">{s.date}</span>
                  </div>
                  <ChevronRight className="mx-4 h-3.5 w-3.5 shrink-0 text-foreground/15 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 5 — Everything lifted: nothing below 40%
// Uniformly more readable, less "ghostly"
// ═══════════════════════════════════════════════════════════

function Option5() {
  return (
    <div className="space-y-2.5">
      {GROUPS.map((group) => (
        <div key={group.url}>
          <StripHeader group={group} />
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
            {group.studies.map((s) => (
              <div
                key={s.name}
                className="group/row border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center pl-10 py-2.5 text-[13px]">
                  <div className="grid flex-1 items-center" style={{ gridTemplateColumns: '80px 1fr 100px 50px 80px 60px' }}>
                    <span className="font-medium text-foreground/50">{s.name}</span>
                    <span className="text-foreground/55 truncate pr-4">{s.task}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot status={s.status} />
                      <span className={cn('capitalize', statusColor(s.status))}>{s.status}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-foreground/45">
                      <Users className="h-3 w-3" />{s.personas}
                    </span>
                    <span className="tabular-nums">
                      {s.score != null && s.score > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('font-semibold', scoreColor(s.score))}>{s.score}</span>
                          <span className={cn('text-[10px] font-medium uppercase tracking-wide opacity-70', scoreColor(s.score))}>{scoreLabel(s.score)}</span>
                        </span>
                      ) : <span className="text-foreground/20">&mdash;</span>}
                    </span>
                    <span className="text-right text-foreground/40">{s.date}</span>
                  </div>
                  <ChevronRight className="mx-4 h-3.5 w-3.5 shrink-0 text-foreground/15 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Demo page
// ═══════════════════════════════════════════════════════════

const OPTIONS = [
  { id: 'current', label: 'Current', desc: 'Name 30%, task 40%, testers 40%, date 30%', component: Current },
  { id: '1', label: '1 — Bold name', desc: 'Name is medium weight at 70%, task at 50%', component: Option1 },
  { id: '2', label: '2 — Task hero', desc: 'Task at 70% is most readable, name stays 30%', component: Option2 },
  { id: '3', label: '3 — Both prominent', desc: 'Name + task both at 60%, metadata faded further', component: Option3 },
  { id: '4', label: '4 — Name + score pop', desc: 'Name 80% semibold, score larger, rest faded', component: Option4 },
  { id: '5', label: '5 — Everything lifted', desc: 'Nothing below 40%, uniformly more readable', component: Option5 },
];

export default function RowColorsDemo() {
  const [active, setActive] = useState('current');
  const opt = OPTIONS.find((o) => o.id === active)!;
  const ActiveComponent = opt.component;

  return (
    <div className="min-h-screen p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Test Row Text Colors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Same columns, same order — 5 different text coloring strategies. Click each tab to compare.
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => setActive(o.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
              active === o.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="mb-4 text-sm text-muted-foreground">{opt.desc}</p>

      {/* Active option */}
      <ActiveComponent />
    </div>
  );
}
