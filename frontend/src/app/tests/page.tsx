'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus, Search, ChevronRight, ListFilter,
  CircleDot, X,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useStudies } from '@/hooks/use-study';
import { useScoreHistory } from '@/hooks/use-score-history';
import { DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageSkeleton } from '@/components/common/page-skeleton';
import { formatDistanceToNow } from '@/lib/format';
import { TERMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { StudySummary, StudyStatus } from '@/types';

// ── Helpers ────────────────────────────────────────────

function getFullUrl(studies: StudySummary[]): string {
  return studies[0]?.url ?? '';
}

function groupByUrl(studies: StudySummary[]) {
  const groups = new Map<string, StudySummary[]>();
  for (const study of studies) {
    const existing = groups.get(study.url) ?? [];
    existing.push(study);
    groups.set(study.url, existing);
  }
  return [...groups.entries()].sort((a, b) => {
    const latestA = a[1][0]?.created_at ?? '';
    const latestB = b[1][0]?.created_at ?? '';
    return latestB.localeCompare(latestA);
  });
}

const statusColor = (status: string) =>
  status === 'complete' ? 'text-green-600' :
  status === 'failed' ? 'text-red-500' :
  status === 'running' ? 'text-blue-500' :
  'text-muted-foreground';

function studyHref(s: StudySummary) {
  return s.status === 'running' ? `/study/${s.id}/running` : `/study/${s.id}`;
}

const STATUS_OPTIONS: { value: StudyStatus; label: string }[] = [
  { value: 'complete', label: 'Complete' },
  { value: 'running', label: 'Running' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'failed', label: 'Failed' },
  { value: 'setup', label: 'Setup' },
];

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ExpandedScoreChart({ url }: { url: string }) {
  const { data, isLoading } = useScoreHistory(url);

  if (isLoading) return <Skeleton className="h-full w-full rounded" />;
  if (!data?.data_points?.length) return null;

  const points = data.data_points.filter(p => p.score !== null);
  if (points.length < 2) return null;

  const chartData = points.map(p => ({
    date: fmtShort(p.created_at),
    score: p.score,
    full: fmtDate(p.created_at),
  }));

  return (
    <div className="flex h-full min-h-[200px] flex-col">
      <p className="mb-2 text-sm font-medium text-muted-foreground">Score trend</p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`sge-${url}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 14, fill: 'currentColor', opacity: 0.2, fontWeight: 400 }} tickLine={false} axisLine={false} dy={6} padding={{ right: 20 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 14, fill: 'currentColor', opacity: 0.2, fontWeight: 400 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { score: number; full: string };
              return (
                <div className="rounded-md border bg-background px-2 py-1 text-sm shadow-md">
                  <p className="font-medium">Score: {d.score}</p>
                  <p className="text-muted-foreground">{d.full}</p>
                </div>
              );
            }} />
            <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={1.5} fill={`url(#sge-${url})`} dot={{ fill: '#10b981', strokeWidth: 1, r: 2.5 }} activeDot={{ r: 3.5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── URL Group Row ──────────────────────────────────────

function UrlGroupRow({
  url,
  studies,
  expanded,
  onToggle,
}: {
  url: string;
  studies: StudySummary[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const latest = studies[0];
  const latestScore = studies.find(s => s.overall_score != null && s.overall_score > 0);

  // Find score delta: compare two most recent studies that have scores
  const scoreDelta = (() => {
    const withScores = studies.filter(s => s.overall_score != null && s.overall_score > 0);
    if (withScores.length < 2) return null;
    return Math.round(withScores[0].overall_score!) - Math.round(withScores[1].overall_score!);
  })();

  return (
    <div>
      {/* URL summary row */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 border-b border-border px-3 py-2.5 text-[14px] transition-colors hover:bg-muted/50"
      >
        <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        <span className="min-w-0 flex-1 truncate text-left text-foreground">{url}</span>
        <span className="shrink-0 w-16 text-right tabular-nums text-muted-foreground">
          {studies.length} {studies.length === 1 ? 'test' : 'tests'}
        </span>
        <span className="shrink-0 w-32 text-right tabular-nums text-muted-foreground">
          {latestScore?.overall_score != null ? (
            <span className="inline-flex items-center gap-1.5">
              <span>{Math.round(latestScore.overall_score)}/100</span>
              {scoreDelta !== null && (
                <span className={scoreDelta > 0 ? 'text-green-600' : scoreDelta < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                  {scoreDelta > 0 ? '+' : ''}{scoreDelta}
                </span>
              )}
            </span>
          ) : (
            <span className="text-foreground/30">—</span>
          )}
        </span>
        <span className="shrink-0 w-16 text-right text-foreground/30">
          {formatDistanceToNow(latest.created_at)}
        </span>
      </button>

      {/* Expanded: test list on left, chart on right */}
      {expanded && (
        <div className="flex border-b border-border bg-muted/10">
          {/* Test rows — left side */}
          <div className="min-w-0 flex-1">
            {/* Sub-header */}
            <div className="flex items-center border-b border-border/50 px-3 py-1.5 pl-10 text-sm font-medium text-foreground/30">
              <span className="shrink-0 w-14">Date</span>
              <span className="shrink-0 w-[1px] self-stretch bg-border/40 mx-2" />
              <span className="shrink-0 w-[68px]">Status</span>
              <span className="shrink-0 w-[1px] self-stretch bg-border/40 mx-2" />
              <span className="shrink-0 w-12 text-right">Tasks</span>
              <span className="shrink-0 w-[1px] self-stretch bg-border/40 mx-2" />
              <span className="shrink-0 w-12 text-right">Personas</span>
              <span className="shrink-0 w-[1px] self-stretch bg-border/40 mx-2" />
              <span className="shrink-0 w-14 text-right">Score</span>
            </div>
            {studies.map((study) => (
              <Link
                key={study.id}
                href={studyHref(study)}
                className="flex items-center border-b border-border/50 px-3 py-1.5 pl-10 text-sm transition-colors hover:bg-muted/40 last:border-b-0"
              >
                <span className="shrink-0 w-14 text-muted-foreground">
                  {formatDistanceToNow(study.created_at)}
                </span>
                <span className="shrink-0 w-[1px] self-stretch bg-border/40 mx-2" />
                <span className={cn('shrink-0 w-[68px] capitalize', statusColor(study.status))}>
                  {study.status}
                </span>
                <span className="shrink-0 w-[1px] self-stretch bg-border/40 mx-2" />
                <span className="shrink-0 tabular-nums text-muted-foreground w-12 text-right">
                  {study.task_count ?? study.tasks?.length ?? 0}
                </span>
                <span className="shrink-0 w-[1px] self-stretch bg-border/40 mx-2" />
                <span className="shrink-0 tabular-nums text-muted-foreground w-12 text-right">
                  {study.persona_count ?? study.personas?.length ?? 0}
                </span>
                <span className="shrink-0 w-[1px] self-stretch bg-border/40 mx-2" />
                <span className="shrink-0 tabular-nums text-muted-foreground w-14 text-right">
                  {study.overall_score != null && study.overall_score > 0
                    ? `${Math.round(study.overall_score)}/100`
                    : <span className="text-foreground/30">—</span>}
                </span>
              </Link>
            ))}
          </div>
          {/* Score chart — right side, 50% width */}
          {studies.length > 1 && (
            <div className="hidden w-1/2 shrink-0 border-l border-border/50 p-4 lg:block">
              <ExpandedScoreChart url={url} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────

export default function DashboardPage() {
  const [page] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StudyStatus | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { data, isLoading, isError, error, refetch } = useStudies(page, 50);

  const allStudies = data?.items ?? [];
  const studies = statusFilter
    ? allStudies.filter((s) => s.status === statusFilter)
    : allStudies;
  const grouped = useMemo(() => groupByUrl(studies), [studies]);

  const hasFilters = statusFilter !== null;

  const toggleGroup = (url: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <ErrorState
          title="Failed to load tests"
          message={error?.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (allStudies.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="No tests yet"
          description="Run your first test to get started."
          action={
            <Button asChild>
              <Link href="/">
                <Plus className="mr-2 h-4 w-4" />
                New Test
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Test history</span>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors',
              hasFilters
                ? 'border-foreground/20 bg-foreground/5 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}>
              <ListFilter className="h-3.5 w-3.5" />
              Filter
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <CircleDot className="mr-2 h-4 w-4" />
                Status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-36">
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                  <span className={statusFilter === null ? 'font-medium' : ''}>All</span>
                </DropdownMenuItem>
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => setStatusFilter(opt.value)}>
                    <span className={statusFilter === opt.value ? 'font-medium' : ''}>{opt.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {hasFilters && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                  <X className="mr-2 h-4 w-4" />
                  Clear filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button asChild size="sm" className="h-[30px] text-sm">
          <Link href="/">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Test
          </Link>
        </Button>

        {statusFilter && (
          <button
            onClick={() => setStatusFilter(null)}
            className="flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Status: {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Grouped table */}
      <div className="overflow-hidden rounded-lg border border-border">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground/30">
          <span className="w-3.5 shrink-0" />
          <span className="min-w-0 flex-1">URL</span>
          <span className="shrink-0 w-16 text-right">Tests</span>
          <span className="shrink-0 w-32 text-right">Latest score</span>
          <span className="shrink-0 w-16 text-right">Latest</span>
        </div>

        {grouped.length > 0 ? (
          grouped.map(([url, groupStudies]) => (
            <UrlGroupRow
              key={url}
              url={url}
              studies={groupStudies}
              expanded={expanded.has(url)}
              onToggle={() => toggleGroup(url)}
            />
          ))
        ) : (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No tests match this filter</p>
        )}
      </div>
    </div>
  );
}
