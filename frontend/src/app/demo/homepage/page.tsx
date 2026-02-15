'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Globe,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  ExternalLink,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// ── Mock Data ────────────────────────────────────────────

const MOCK_TESTS = [
  { id: '1', url: 'https://google.com', hostname: 'google.com', score: 95, status: 'complete' as const, date: '14h ago', personas: 3, issues: 7 },
  { id: '2', url: 'https://google.com', hostname: 'google.com', score: 95, status: 'complete' as const, date: '14h ago', personas: 4, issues: 5 },
  { id: '3', url: 'https://google.com', hostname: 'google.com', score: null, status: 'failed' as const, date: '16h ago', personas: 3, issues: 0 },
  { id: '4', url: 'https://google.com', hostname: 'google.com', score: null, status: 'failed' as const, date: '16h ago', personas: 3, issues: 0 },
  { id: '5', url: 'https://google.com', hostname: 'google.com', score: null, status: 'failed' as const, date: '17h ago', personas: 2, issues: 0 },
  { id: '6', url: 'https://app.hord.fi', hostname: 'app.hord.fi', score: null, status: 'running' as const, date: 'yesterday', personas: 3, issues: 0, progress: 60 },
];

const MOCK_TEAM = [
  { id: '1', name: 'Sarah Chen', emoji: '👩‍💻', role: 'Tech-savvy developer', age: 28, device: 'Desktop', techLevel: 5 },
  { id: '2', name: 'Robert Miller', emoji: '👴', role: 'Retired teacher', age: 72, device: 'Tablet', techLevel: 2 },
  { id: '3', name: 'Alex Rivera', emoji: '🧑‍🦯', role: 'Screen reader user', age: 34, device: 'Desktop', techLevel: 4 },
  { id: '4', name: 'Priya Sharma', emoji: '👩‍🎓', role: 'College student', age: 20, device: 'Mobile', techLevel: 4 },
  { id: '5', name: 'James Wright', emoji: '👨‍💼', role: 'Busy executive', age: 45, device: 'Mobile', techLevel: 3 },
];

// ── Shared Sub-components ────────────────────────────────

function StatusDot({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
      </span>
    );
  }
  if (status === 'analyzing') {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-purple-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
      </span>
    );
  }
  if (status === 'failed') return <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />;
  return <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />;
}

function ScoreBadge({ score, size = 'sm' }: { score: number | null; size?: 'sm' | 'md' | 'lg' }) {
  if (score === null) return <span className="text-xs text-muted-foreground">--</span>;
  const color = score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
  const sizes = { sm: 'text-sm', md: 'text-base font-semibold', lg: 'text-2xl font-bold' };
  return <span className={cn(sizes[size], color, 'tabular-nums')}>{score}</span>;
}

function NewTestForm({ compact = false, showTeam = false }: { compact?: boolean; showTeam?: boolean }) {
  const [url, setUrl] = useState('');
  const [task, setTask] = useState('');
  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="url"
          placeholder="example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10"
        />
      </div>
      {compact ? (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Describe what you want to test..."
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className="h-10 flex-1 rounded-lg border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10"
          />
          <button className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90">
            <Sparkles className="h-3.5 w-3.5" />
            Generate Plan
          </button>
        </div>
      ) : (
        <>
          <textarea
            placeholder="e.g. I want to test if new users can easily find the pricing page, understand the different plans, and successfully sign up for a free trial."
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={compact ? 2 : 4}
            className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10"
          />
          <p className="text-xs text-muted-foreground">Be specific about goals, user flows, or pain points you suspect.</p>
          {showTeam && (
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground mr-1">Team:</span>
              {MOCK_TEAM.slice(0, 3).map((p) => (
                <span key={p.id} className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5 text-sm" title={p.name}>
                  {p.emoji}
                </span>
              ))}
              <button className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}
          <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90">
            <Sparkles className="h-3.5 w-3.5" />
            Generate Plan
          </button>
        </>
      )}
    </div>
  );
}

function TestRow({ test, showIssues = false }: { test: typeof MOCK_TESTS[0]; showIssues?: boolean }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-foreground/[0.03] cursor-pointer">
      <StatusDot status={test.status} />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="truncate text-sm font-medium">{test.hostname}</span>
        {test.score !== null && <ScoreBadge score={test.score} />}
      </div>
      {showIssues && test.issues > 0 && (
        <span className="text-xs text-muted-foreground">{test.issues} issues</span>
      )}
      {test.status === 'running' ? (
        <span className="text-xs text-muted-foreground">Running...</span>
      ) : test.status === 'failed' ? (
        <span className="text-xs text-red-500">Failed</span>
      ) : null}
      <span className="text-xs text-foreground/30">{test.date}</span>
    </div>
  );
}

function TeamMember({ person, compact = false }: { person: typeof MOCK_TEAM[0]; compact?: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-foreground/[0.03] cursor-pointer',
      compact && 'px-2 py-1.5',
    )}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-base shrink-0">
        {person.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{person.name}</p>
        {!compact && <p className="text-xs text-muted-foreground truncate">{person.role}</p>}
      </div>
      {!compact && (
        <span className="text-xs text-muted-foreground shrink-0">{person.device}</span>
      )}
    </div>
  );
}

function SectionCard({ title, count, action, actionLabel = 'View all', children, className }: {
  title: string;
  count?: number;
  action?: string;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-background', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {count !== undefined && (
            <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{count}</span>
          )}
        </div>
        {action && (
          <button className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
            {actionLabel}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="p-1">
        {children}
      </div>
    </div>
  );
}

// ── Option 1: Command Center ─────────────────────────────

function Option1() {
  return (
    <div className="flex h-full gap-4 p-6">
      {/* Left: New Test Form */}
      <div className="flex w-[50%] flex-col">
        <div className="rounded-xl border border-border bg-background p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-foreground/60" />
              <h2 className="text-base font-semibold">Quick Start</h2>
            </div>
            <p className="text-sm text-muted-foreground">Describe what you want to test and we&apos;ll generate a plan for you.</p>
          </div>
          <NewTestForm showTeam />
        </div>
      </div>

      {/* Right: Recent Tests + Team */}
      <div className="flex flex-1 flex-col gap-4">
        <SectionCard title="Recent Tests" count={MOCK_TESTS.length} action="/tests">
          {MOCK_TESTS.slice(0, 5).map((test) => (
            <TestRow key={test.id} test={test} />
          ))}
        </SectionCard>

        <SectionCard title="Your Team" count={MOCK_TEAM.length} action="/personas" actionLabel="Manage">
          <div className="flex flex-wrap gap-2 p-3">
            {MOCK_TEAM.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5 text-sm transition-colors hover:bg-foreground/10 cursor-pointer">
                <span>{p.emoji}</span>
                <span className="font-medium">{p.name.split(' ')[0]}</span>
              </div>
            ))}
            <button className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ── Option 2: Feed ───────────────────────────────────────

function Option2() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      {/* Inline new test */}
      <div className="rounded-xl border border-border bg-background p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-foreground/60" />
          <h2 className="text-sm font-semibold">New Test</h2>
        </div>
        <NewTestForm compact />
      </div>

      {/* Recent Tests */}
      <SectionCard title="Recent Tests" count={MOCK_TESTS.length} action="/tests">
        {MOCK_TESTS.map((test) => (
          <TestRow key={test.id} test={test} showIssues />
        ))}
      </SectionCard>

      {/* Team */}
      <SectionCard title="Your Team" count={MOCK_TEAM.length} action="/personas" actionLabel="Manage">
        <div className="divide-y divide-border/50">
          {MOCK_TEAM.map((p) => (
            <TeamMember key={p.id} person={p} />
          ))}
        </div>
        <div className="p-3 pt-1">
          <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
            <Plus className="h-3.5 w-3.5" />
            Add tester
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Option 3: Hero + Grid ────────────────────────────────

function Option3() {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Hero: Big CTA */}
      <div className="rounded-xl border border-border bg-background p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">What do you want to test?</h1>
        <p className="text-sm text-muted-foreground mb-6">Describe your goals and we&apos;ll create a test plan with AI personas.</p>
        <div className="mx-auto max-w-lg">
          <NewTestForm />
        </div>
      </div>

      {/* Two cards */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Recent Tests" count={MOCK_TESTS.length} action="/tests">
          {MOCK_TESTS.slice(0, 4).map((test) => (
            <TestRow key={test.id} test={test} />
          ))}
        </SectionCard>

        <SectionCard title="Your Team" count={MOCK_TEAM.length} action="/personas" actionLabel="Manage">
          {MOCK_TEAM.map((p) => (
            <TeamMember key={p.id} person={p} compact />
          ))}
          <div className="px-3 pb-2 pt-1">
            <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
              <Plus className="h-3.5 w-3.5" />
              Add tester
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ── Option 4: Sidebar Detail ─────────────────────────────

function Option4() {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const selected = MOCK_TESTS.find((t) => t.id === selectedTest);

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-[320px] shrink-0 border-r border-border overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-2">Recent Tests</h3>
          <div className="space-y-0.5">
            {MOCK_TESTS.map((test) => (
              <div
                key={test.id}
                onClick={() => setSelectedTest(test.id)}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors cursor-pointer',
                  selectedTest === test.id ? 'bg-foreground/[0.06]' : 'hover:bg-foreground/[0.03]',
                )}
              >
                <StatusDot status={test.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{test.hostname}</p>
                  <p className="text-xs text-muted-foreground">{test.date}</p>
                </div>
                <ScoreBadge score={test.score} />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border p-4">
          <h3 className="text-sm font-semibold mb-2">Your Team</h3>
          {MOCK_TEAM.map((p) => (
            <TeamMember key={p.id} person={p} compact />
          ))}
          <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
            <Plus className="h-3.5 w-3.5" />
            Add tester
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 p-6">
        {selected && selected.status === 'complete' ? (
          <div className="mx-auto max-w-lg space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selected.hostname}</h2>
                <p className="text-sm text-muted-foreground">{selected.date} &middot; {selected.personas} testers</p>
              </div>
              <ScoreBadge score={selected.score} size="lg" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{selected.issues}</p>
                <p className="text-xs text-muted-foreground mt-1">Issues found</p>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{selected.personas}</p>
                <p className="text-xs text-muted-foreground mt-1">Testers</p>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold tabular-nums">$0.{(selected.personas * 40).toString().padStart(2, '0')}</p>
                <p className="text-xs text-muted-foreground mt-1">Cost</p>
              </div>
            </div>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium transition-colors hover:bg-foreground/[0.03]">
              <ExternalLink className="h-3.5 w-3.5" />
              View Full Results
            </button>
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-3">Run another test</p>
              <NewTestForm compact />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-lg">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-foreground/60" />
                <h2 className="text-base font-semibold">New Test</h2>
              </div>
              <p className="text-sm text-muted-foreground">Describe what you want to test and we&apos;ll generate a plan.</p>
            </div>
            <NewTestForm showTeam />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Option 5: Kanban Glance ──────────────────────────────

function Option5() {
  const running = MOCK_TESTS.filter((t) => t.status === 'running');
  const complete = MOCK_TESTS.filter((t) => t.status === 'complete');
  const failed = MOCK_TESTS.filter((t) => t.status === 'failed');

  return (
    <div className="flex h-full gap-4 p-6">
      {/* Column 1: Create */}
      <div className="flex w-1/3 flex-col">
        <div className="rounded-xl border border-border bg-background flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Start a Test</h3>
          </div>
          <div className="p-4 flex-1">
            <NewTestForm showTeam />
          </div>
        </div>
      </div>

      {/* Column 2: Running */}
      <div className="flex w-1/3 flex-col">
        <div className="rounded-xl border border-border bg-background flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
            <h3 className="text-sm font-semibold">Running</h3>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs tabular-nums text-blue-600 dark:text-blue-400">{running.length}</span>
          </div>
          <div className="p-2 flex-1">
            {running.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-foreground/5 p-3 mb-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No tests running</p>
              </div>
            ) : (
              <div className="space-y-2">
                {running.map((test) => (
                  <div key={test.id} className="rounded-lg border border-border p-4 transition-colors hover:bg-foreground/[0.02] cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">{test.hostname}</span>
                      <span className="text-xs text-muted-foreground">{test.personas} testers</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${test.progress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 tabular-nums">{test.progress}% complete</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column 3: Complete */}
      <div className="flex w-1/3 flex-col">
        <div className="rounded-xl border border-border bg-background flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <h3 className="text-sm font-semibold">Complete</h3>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs tabular-nums text-emerald-600 dark:text-emerald-400">{complete.length}</span>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            <div className="space-y-2">
              {complete.map((test) => (
                <div key={test.id} className="group rounded-lg border border-border p-4 transition-colors hover:bg-foreground/[0.02] cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{test.hostname}</span>
                    <ScoreBadge score={test.score} size="md" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{test.issues} issues &middot; {test.personas} testers</span>
                    <span className="text-xs text-muted-foreground">{test.date}</span>
                  </div>
                </div>
              ))}
              {failed.map((test) => (
                <div key={test.id} className="group rounded-lg border border-red-200 dark:border-red-900/50 p-4 transition-colors hover:bg-red-50/50 dark:hover:bg-red-950/20 cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{test.hostname}</span>
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  </div>
                  <span className="text-xs text-red-600 dark:text-red-400">Failed &middot; {test.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Demo Page ───────────────────────────────────────

const OPTIONS = [
  { id: 1, label: 'Command Center', desc: 'Three-column, everything at a glance' },
  { id: 2, label: 'Feed', desc: 'Single column, stacked cards' },
  { id: 3, label: 'Hero + Grid', desc: 'Big CTA top, cards below' },
  { id: 4, label: 'Sidebar Detail', desc: 'List left, detail right' },
  { id: 5, label: 'Kanban', desc: 'Swim lanes by status' },
];

export default function HomepageDemoPage() {
  const [active, setActive] = useState(1);

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center gap-1 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground mr-3">Homepage Options</span>
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActive(opt.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active === opt.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground',
              )}
            >
              {opt.id}. {opt.label}
            </button>
          ))}
        </div>
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground">
            {OPTIONS.find((o) => o.id === active)?.desc}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-auto bg-background">
        {active === 1 && <Option1 />}
        {active === 2 && <Option2 />}
        {active === 3 && <Option3 />}
        {active === 4 && <Option4 />}
        {active === 5 && <Option5 />}
      </div>
    </div>
  );
}
