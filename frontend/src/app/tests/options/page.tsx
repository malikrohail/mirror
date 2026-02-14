'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  ChevronRight, Globe, Clock, Users, CheckCircle2, XCircle,
  Loader2, ArrowUpRight, BarChart3, TrendingUp, TrendingDown,
} from 'lucide-react';

// ── Mock data ──────────────────────────────────────────

type MockTest = {
  id: string;
  url: string;
  status: 'complete' | 'running' | 'failed' | 'analyzing';
  score: number | null;
  tasks: number;
  personas: number;
  date: string;
  ago: string;
};

const MOCK: MockTest[] = [
  { id: '1', url: 'https://claude.com/pricing', status: 'complete', score: 78, tasks: 2, personas: 4, date: 'Feb 12', ago: '2d ago' },
  { id: '2', url: 'https://claude.com/pricing', status: 'complete', score: 72, tasks: 2, personas: 3, date: 'Feb 10', ago: '4d ago' },
  { id: '3', url: 'https://claude.com/pricing', status: 'failed', score: null, tasks: 1, personas: 2, date: 'Feb 8', ago: '6d ago' },
  { id: '4', url: 'https://app.hord.fi', status: 'running', score: null, tasks: 1, personas: 3, date: 'Feb 14', ago: '2h ago' },
  { id: '5', url: 'https://linear.app/settings', status: 'complete', score: 85, tasks: 3, personas: 5, date: 'Feb 13', ago: '1d ago' },
  { id: '6', url: 'https://linear.app/settings', status: 'complete', score: 81, tasks: 3, personas: 4, date: 'Feb 11', ago: '3d ago' },
  { id: '7', url: 'https://vercel.com/dashboard', status: 'complete', score: 91, tasks: 2, personas: 3, date: 'Feb 9', ago: '5d ago' },
  { id: '8', url: 'https://stripe.com/checkout', status: 'analyzing', score: null, tasks: 1, personas: 4, date: 'Feb 14', ago: '30m ago' },
];

function groupByUrl(tests: MockTest[]) {
  const groups = new Map<string, MockTest[]>();
  for (const t of tests) {
    const g = groups.get(t.url) ?? [];
    g.push(t);
    groups.set(t.url, g);
  }
  return [...groups.entries()];
}

const grouped = groupByUrl(MOCK);

function hostname(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function StatusDot({ status }: { status: MockTest['status'] }) {
  if (status === 'running') return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
    </span>
  );
  if (status === 'analyzing') return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-yellow-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
    </span>
  );
  if (status === 'complete') return <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />;
  return <span className="inline-flex h-2 w-2 rounded-full bg-red-400" />;
}

function StatusLabel({ status }: { status: MockTest['status'] }) {
  const colors = {
    complete: 'text-green-600',
    running: 'text-blue-500',
    analyzing: 'text-yellow-600',
    failed: 'text-red-500',
  };
  return <span className={cn('capitalize text-[13px]', colors[status])}>{status}</span>;
}

function ScoreBadge({ score, prev }: { score: number | null; prev?: number | null }) {
  if (score === null) return <span className="text-foreground/20">—</span>;
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-500';
  const delta = prev != null && prev > 0 ? score - prev : null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('font-semibold tabular-nums', color)}>{score}</span>
      <span className="text-foreground/20 font-normal">/100</span>
      {delta !== null && delta !== 0 && (
        <span className={cn('text-xs tabular-nums', delta > 0 ? 'text-green-600' : 'text-red-500')}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      )}
    </span>
  );
}

// ── Option A: Section cards ─────────────────────────────
// Each URL is a card. Latest test is shown prominently at top.
// Older tests are compact rows below.

function OptionA() {
  return (
    <div className="space-y-4">
      {grouped.map(([url, tests]) => {
        const latest = tests[0];
        const older = tests.slice(1);
        const prevScore = older.find(t => t.score !== null)?.score ?? null;
        return (
          <div key={url} className="overflow-hidden rounded-xl border border-border">
            {/* Latest test — hero row */}
            <div className="flex items-center gap-4 px-4 py-3.5 bg-card">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-foreground truncate">{hostname(url)}</p>
                <div className="flex items-center gap-3 mt-0.5 text-[13px] text-foreground/40">
                  <span className="inline-flex items-center gap-1"><StatusDot status={latest.status} /> <StatusLabel status={latest.status} /></span>
                  <span>{latest.personas} testers</span>
                  <span>{latest.ago}</span>
                </div>
              </div>
              <div className="text-right">
                <ScoreBadge score={latest.score} prev={prevScore} />
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground/20" />
            </div>

            {/* Older tests */}
            {older.length > 0 && (
              <div className="border-t border-border bg-muted/20">
                {older.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 px-4 py-2 text-[13px] border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="w-9 shrink-0" />
                    <StatusDot status={t.status} />
                    <span className="text-foreground/50">{t.date}</span>
                    <span className="text-foreground/40">{t.tasks} tasks &middot; {t.personas} testers</span>
                    <div className="ml-auto">
                      <ScoreBadge score={t.score} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Option B: Flat table with inline URL badges ─────────
// Every test is its own row. URL shown as a subtle badge.
// No grouping — sorted by date, scannable.

function OptionB() {
  const flat = [...MOCK].sort((a, b) => MOCK.indexOf(a) - MOCK.indexOf(b));
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-[1fr_100px_80px_80px_90px_70px] gap-2 px-4 py-2 text-[12px] uppercase text-foreground/30 border-b border-border bg-muted/30">
        <span>Website</span>
        <span>Status</span>
        <span className="text-right">Score</span>
        <span className="text-right">Tasks</span>
        <span className="text-right">Testers</span>
        <span className="text-right">When</span>
      </div>
      {flat.map((t) => (
        <div key={t.id} className="grid grid-cols-[1fr_100px_80px_80px_90px_70px] gap-2 items-center px-4 py-2.5 text-[13px] border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-3.5 w-3.5 shrink-0 text-foreground/20" />
            <span className="truncate text-foreground">{hostname(t.url)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusDot status={t.status} />
            <StatusLabel status={t.status} />
          </div>
          <div className="text-right">
            <ScoreBadge score={t.score} />
          </div>
          <span className="text-right tabular-nums text-foreground/50">{t.tasks}</span>
          <span className="text-right tabular-nums text-foreground/50">{t.personas}</span>
          <span className="text-right text-foreground/40">{t.ago}</span>
        </div>
      ))}
    </div>
  );
}

// ── Option C: URL header strips + test rows ─────────────
// URL is a full-width colored strip. Tests listed beneath.
// No expand/collapse — everything visible.

function OptionC() {
  return (
    <div className="space-y-6">
      {grouped.map(([url, tests]) => {
        const latestScore = tests.find(t => t.score !== null)?.score ?? null;
        return (
          <div key={url}>
            {/* URL strip */}
            <div className="flex items-center gap-3 rounded-t-lg border border-border bg-muted/40 px-4 py-2.5">
              <Globe className="h-4 w-4 text-foreground/30" />
              <span className="text-[14px] font-medium text-foreground">{hostname(url)}</span>
              <span className="text-[13px] text-foreground/30">{tests.length} {tests.length === 1 ? 'test' : 'tests'}</span>
              <div className="ml-auto">
                {latestScore !== null && (
                  <span className="text-[13px] text-foreground/40">Best: <span className="font-medium text-foreground">{latestScore}/100</span></span>
                )}
              </div>
            </div>
            {/* Test rows */}
            <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
              {tests.map((t, i) => (
                <div key={t.id} className="flex items-center gap-4 px-4 py-2.5 text-[13px] border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer">
                  <span className="w-6 shrink-0 text-center text-foreground/20 tabular-nums">#{i + 1}</span>
                  <StatusDot status={t.status} />
                  <StatusLabel status={t.status} />
                  <div className="flex items-center gap-1 text-foreground/40">
                    <Clock className="h-3 w-3" />
                    {t.date}
                  </div>
                  <div className="flex items-center gap-1 text-foreground/40">
                    <Users className="h-3 w-3" />
                    {t.personas}
                  </div>
                  <div className="ml-auto">
                    <ScoreBadge score={t.score} />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-foreground/15" />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Option D: Cards grid — one card per test ────────────
// No grouping. Each test is a standalone card.
// Good for scanning scores at a glance.

function OptionD() {
  const flat = [...MOCK];
  return (
    <div className="grid grid-cols-2 gap-3">
      {flat.map((t) => {
        const scoreColor = t.score === null ? 'text-foreground/20' : t.score >= 80 ? 'text-green-600' : t.score >= 60 ? 'text-amber-600' : 'text-red-500';
        const scoreBg = t.score === null ? 'bg-muted' : t.score >= 80 ? 'bg-green-50' : t.score >= 60 ? 'bg-amber-50' : 'bg-red-50';
        return (
          <div key={t.id} className="group rounded-xl border border-border p-4 hover:border-foreground/20 transition-colors cursor-pointer">
            <div className="flex items-start gap-3">
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', scoreBg)}>
                <span className={cn('text-lg font-bold tabular-nums', scoreColor)}>
                  {t.score ?? '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-foreground truncate">{hostname(t.url)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusDot status={t.status} />
                  <StatusLabel status={t.status} />
                  <span className="text-[12px] text-foreground/30">&middot;</span>
                  <span className="text-[12px] text-foreground/30">{t.ago}</span>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground/10 group-hover:text-foreground/30 transition-colors" />
            </div>
            <div className="mt-3 flex items-center gap-3 text-[12px] text-foreground/40">
              <span>{t.tasks} {t.tasks === 1 ? 'task' : 'tasks'}</span>
              <span>&middot;</span>
              <span>{t.personas} testers</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Option E: Compact timeline ──────────────────────────
// Vertical timeline grouped by URL. Each test is a node.
// Score shown as inline badge. Very compact and scannable.

function OptionE() {
  return (
    <div className="space-y-8">
      {grouped.map(([url, tests]) => (
        <div key={url}>
          {/* URL heading */}
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-3.5 w-3.5 text-foreground/30" />
            <span className="text-[14px] font-medium text-foreground">{hostname(url)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-foreground/40">{tests.length}</span>
          </div>
          {/* Timeline */}
          <div className="relative ml-[7px] border-l border-border/60 pl-5 space-y-0">
            {tests.map((t, i) => {
              const isLast = i === tests.length - 1;
              return (
                <div key={t.id} className="relative pb-4 last:pb-0 group cursor-pointer">
                  {/* Node dot */}
                  <div className="absolute -left-[23.5px] top-[5px]">
                    {t.status === 'running' || t.status === 'analyzing' ? (
                      <span className="relative inline-flex h-3 w-3">
                        <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', t.status === 'running' ? 'bg-blue-400' : 'bg-yellow-400')} />
                        <span className={cn('relative inline-flex h-3 w-3 rounded-full border-2 border-background', t.status === 'running' ? 'bg-blue-500' : 'bg-yellow-500')} />
                      </span>
                    ) : (
                      <span className={cn(
                        'inline-flex h-3 w-3 rounded-full border-2 border-background',
                        t.status === 'complete' ? 'bg-green-500' : 'bg-red-400',
                      )} />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex items-center gap-3 rounded-lg px-3 py-2 -ml-1 group-hover:bg-muted/40 transition-colors">
                    <span className="text-[13px] text-foreground/40 w-16 shrink-0">{t.ago}</span>
                    <StatusLabel status={t.status} />
                    <span className="text-[13px] text-foreground/40">{t.personas} testers</span>
                    <div className="ml-auto">
                      <ScoreBadge score={t.score} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────

const OPTIONS = [
  { id: 'a', label: 'A — Section Cards', desc: 'Each URL is a card with latest test hero + older rows below', component: OptionA },
  { id: 'b', label: 'B — Flat Table', desc: 'Every test is its own row, no grouping, sorted by date', component: OptionB },
  { id: 'c', label: 'C — Strip Headers', desc: 'URL as a colored strip header, tests listed beneath', component: OptionC },
  { id: 'd', label: 'D — Cards Grid', desc: 'One card per test in a grid, score prominently displayed', component: OptionD },
  { id: 'e', label: 'E — Timeline', desc: 'Vertical timeline grouped by URL, compact and scannable', component: OptionE },
];

export default function TestLayoutOptionsPage() {
  const [active, setActive] = useState('a');
  const ActiveComponent = OPTIONS.find(o => o.id === active)!.component;

  return (
    <div>
      {/* Option picker */}
      <div className="sticky top-0 z-10 border-b border-border bg-[#F9F9FC]">
        <div className="flex items-center gap-1 px-4 py-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActive(opt.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                active === opt.id
                  ? 'bg-foreground text-background'
                  : 'text-foreground/40 hover:text-foreground hover:bg-muted',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="px-4 pb-2 text-[12px] text-foreground/30">
          {OPTIONS.find(o => o.id === active)!.desc}
        </p>
      </div>

      {/* Active layout */}
      <div className="p-6 max-w-4xl">
        <ActiveComponent />
      </div>
    </div>
  );
}
