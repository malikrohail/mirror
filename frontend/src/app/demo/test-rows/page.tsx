'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, Globe, Users } from 'lucide-react';

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
    url: 'app.hord.fi',
    favicon: 'https://www.google.com/s2/favicons?domain=app.hord.fi&sz=32',
    studies: [
      { name: 'hord1', task: 'stake eth', status: 'running', personas: 3, score: null, date: 'Feb 13' },
    ],
  },
  {
    url: 'claude.com/pricing',
    favicon: 'https://www.google.com/s2/favicons?domain=claude.com&sz=32',
    studies: [
      { name: 'claude3', task: 'Open a pro account', status: 'complete', personas: 3, score: 12, date: 'Feb 13' },
      { name: 'claude2', task: 'Open a pro account', status: 'complete', personas: 4, score: null, date: 'Feb 13' },
      { name: 'claude1', task: 'Open a pro account', status: 'complete', personas: 3, score: 14, date: 'Feb 13' },
    ],
  },
];

// ── Shared status dot ──────────────────────────────────────

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

function ScoreDisplay({ score }: { score: number | null }) {
  if (score == null || score <= 0) return <span className="text-foreground/20">&mdash;</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('font-semibold', scoreColor(score))}>{Math.round(score)}</span>
      <span className={cn('text-[10px] font-medium uppercase tracking-wide opacity-60', scoreColor(score))}>
        {scoreLabel(score)}
      </span>
    </span>
  );
}

// ── Strip header (shared across all options) ───────────────

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
// OPTION A — Table with column headers
// ═══════════════════════════════════════════════════════════

function OptionA() {
  return (
    <div className="space-y-2.5">
      {GROUPS.map((group) => (
        <div key={group.url}>
          <StripHeader group={group} />
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border/50 text-left text-[11px] uppercase tracking-wider text-foreground/25">
                  <th className="py-1.5 pl-4 pr-2 font-medium">Name</th>
                  <th className="px-2 py-1.5 font-medium">Task</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                  <th className="px-2 py-1.5 font-medium">Testers</th>
                  <th className="px-2 py-1.5 font-medium">Score</th>
                  <th className="px-2 py-1.5 pr-4 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {group.studies.map((s) => (
                  <tr key={s.name} className="border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="py-2.5 pl-4 pr-2 text-foreground/30">{s.name}</td>
                    <td className="px-2 py-2.5 text-foreground/40 truncate max-w-[200px]">{s.task}</td>
                    <td className="px-2 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot status={s.status} />
                        <span className={cn('capitalize', statusColor(s.status))}>{s.status}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="inline-flex items-center gap-1 text-foreground/40">
                        <Users className="h-3 w-3" />{s.personas}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 tabular-nums"><ScoreDisplay score={s.score} /></td>
                    <td className="px-2 py-2.5 pr-4 text-right text-foreground/30">{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION B — CSS Grid (fixed columns, no headers, aligned)
// ═══════════════════════════════════════════════════════════

function OptionB() {
  return (
    <div className="space-y-2.5">
      {GROUPS.map((group) => (
        <div key={group.url}>
          <StripHeader group={group} />
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
            {group.studies.map((s) => (
              <div
                key={s.name}
                className="grid border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer px-4 py-2.5 text-[13px]"
                style={{ gridTemplateColumns: '80px 1fr 100px 50px 80px 60px' }}
              >
                <span className="text-foreground/30">{s.name}</span>
                <span className="text-foreground/40 truncate pr-4">{s.task}</span>
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot status={s.status} />
                  <span className={cn('capitalize', statusColor(s.status))}>{s.status}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-foreground/40">
                  <Users className="h-3 w-3" />{s.personas}
                </span>
                <span className="tabular-nums"><ScoreDisplay score={s.score} /></span>
                <span className="text-right text-foreground/30">{s.date}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION C — Two-line rows (name+task top, metadata bottom)
// ═══════════════════════════════════════════════════════════

function OptionC() {
  return (
    <div className="space-y-2.5">
      {GROUPS.map((group) => (
        <div key={group.url}>
          <StripHeader group={group} />
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
            {group.studies.map((s) => (
              <div
                key={s.name}
                className="border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-foreground">{s.name}</span>
                  <span className="text-[13px] text-foreground/30">{s.task}</span>
                  <span className="ml-auto text-[12px] text-foreground/25">{s.date}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[12px]">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot status={s.status} />
                    <span className={cn('capitalize', statusColor(s.status))}>{s.status}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-foreground/40">
                    <Users className="h-3 w-3" />{s.personas} testers
                  </span>
                  <span className="tabular-nums"><ScoreDisplay score={s.score} /></span>
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
// OPTION D — Name left, right-aligned metadata with separators
// ═══════════════════════════════════════════════════════════

function OptionD() {
  return (
    <div className="space-y-2.5">
      {GROUPS.map((group) => (
        <div key={group.url}>
          <StripHeader group={group} />
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
            {group.studies.map((s) => (
              <div
                key={s.name}
                className="flex items-center border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer px-4 py-2.5 text-[13px]"
              >
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-medium text-foreground shrink-0">{s.name}</span>
                  <span className="text-foreground/30 truncate">{s.task}</span>
                </div>
                <div className="ml-auto flex items-center shrink-0 divide-x divide-border">
                  <span className="inline-flex items-center gap-1.5 px-3">
                    <StatusDot status={s.status} />
                    <span className={cn('capitalize', statusColor(s.status))}>{s.status}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 text-foreground/40">
                    <Users className="h-3 w-3" />{s.personas}
                  </span>
                  <span className="px-3 tabular-nums min-w-[70px]"><ScoreDisplay score={s.score} /></span>
                  <span className="pl-3 text-foreground/30">{s.date}</span>
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
// OPTION E — Flat table (no URL grouping, single table)
// ═══════════════════════════════════════════════════════════

function OptionE() {
  const allStudies = GROUPS.flatMap((g) =>
    g.studies.map((s) => ({ ...s, url: g.url, favicon: g.favicon })),
  );
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-foreground/25">
            <th className="py-2 pl-4 pr-2 font-medium">Name</th>
            <th className="px-2 py-2 font-medium">Website</th>
            <th className="px-2 py-2 font-medium">Task</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-2 py-2 font-medium">Testers</th>
            <th className="px-2 py-2 font-medium">Score</th>
            <th className="px-2 py-2 pr-4 text-right font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {allStudies.map((s) => (
            <tr key={s.name} className="border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer">
              <td className="py-2.5 pl-4 pr-2 font-medium text-foreground">{s.name}</td>
              <td className="px-2 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-foreground/40">
                  <img src={s.favicon} alt="" className="h-3.5 w-3.5 rounded-sm" />
                  {s.url}
                </span>
              </td>
              <td className="px-2 py-2.5 text-foreground/40 truncate max-w-[180px]">{s.task}</td>
              <td className="px-2 py-2.5">
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot status={s.status} />
                  <span className={cn('capitalize', statusColor(s.status))}>{s.status}</span>
                </span>
              </td>
              <td className="px-2 py-2.5 text-center text-foreground/40">{s.personas}</td>
              <td className="px-2 py-2.5 tabular-nums"><ScoreDisplay score={s.score} /></td>
              <td className="px-2 py-2.5 pr-4 text-right text-foreground/30">{s.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Demo page
// ═══════════════════════════════════════════════════════════

const OPTIONS = [
  { id: 'a', label: 'A — Table with headers', component: OptionA },
  { id: 'b', label: 'B — Grid (aligned, no headers)', component: OptionB },
  { id: 'c', label: 'C — Two-line rows', component: OptionC },
  { id: 'd', label: 'D — Left name, right metadata', component: OptionD },
  { id: 'e', label: 'E — Flat table (no groups)', component: OptionE },
];

export default function TestRowsDemo() {
  const [active, setActive] = useState('a');
  const ActiveComponent = OPTIONS.find((o) => o.id === active)!.component;

  return (
    <div className="min-h-screen p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Test Row Layouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          5 options for displaying test rows. Click each tab to compare.
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setActive(opt.id)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
              active === opt.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Active option */}
      <ActiveComponent />
    </div>
  );
}
