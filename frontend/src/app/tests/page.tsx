'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Plus, Search, ChevronRight, ListFilter,
  CircleDot, X, Calendar, Play, Pause, Trash2, Copy,
  ExternalLink, Clock, Globe, Zap, RefreshCw,
  GitCompare, CheckCircle, AlertCircle, MinusCircle,
  TrendingUp, TrendingDown, Loader2, Users,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useSchedules, useCreateSchedule, useUpdateSchedule, useDeleteSchedule, useTriggerSchedule } from '@/hooks/use-schedules';
import { usePersonaTemplates } from '@/hooks/use-personas';
import { useCompareStudies } from '@/hooks/use-comparison';
import { DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageSkeleton } from '@/components/common/page-skeleton';
import { PageHeaderBar } from '@/components/layout/page-header-bar';
import { formatDistanceToNow } from '@/lib/format';
import { API_BASE, SEVERITY_COLORS, TERMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { StudySummary, StudyStatus, ScheduleOut, IssueDiff } from '@/types';

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
  if (s.status === 'complete' || s.status === 'failed') return `/study/${s.id}`;
  return `/study/${s.id}/running`;
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

// ── URL Group (strip header + test rows) ────────────────

function UrlGroup({
  url,
  studies,
  collapsed,
  onToggleCollapse,
  compareMode,
  selectedStudyIds,
  onToggleStudy,
}: {
  url: string;
  studies: StudySummary[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  compareMode: boolean;
  selectedStudyIds: Set<string>;
  onToggleStudy: (id: string) => void;
}) {
  return (
    <div>
      {/* URL strip header */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          'flex w-full items-center gap-3 border border-border bg-muted/40 px-4 py-2.5',
          collapsed ? 'rounded-lg' : 'rounded-t-lg',
        )}
      >
        <Globe className="h-4 w-4 text-foreground/30" />
        <span className="text-[14px] font-medium text-foreground">{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
        <span className="text-[13px] text-foreground/30">{studies.length} {studies.length === 1 ? 'test' : 'tests'}</span>
        <ChevronRight className={cn('ml-auto h-3.5 w-3.5 text-foreground/30 transition-transform', collapsed ? 'rotate-90' : '-rotate-90')} />
      </button>
      {/* Test rows */}
      {!collapsed && (
      <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
        {studies.map((study, i) => {
          const isComplete = study.status === 'complete';
          const isSelected = selectedStudyIds.has(study.id);
          const showCheckbox = isComplete && (compareMode || selectedStudyIds.size > 0);
          const checkDisabled = !isSelected && selectedStudyIds.size >= 2;

          return (
            <div key={study.id} className="group/row relative border-b border-border/50 last:border-b-0">
              {isComplete && (
                <div
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStudy(study.id); }}
                  className={cn(
                    'absolute left-3 top-1/2 z-10 -translate-y-1/2 flex items-center justify-center transition-opacity cursor-pointer',
                    showCheckbox || isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100',
                    checkDisabled && 'cursor-not-allowed opacity-30 pointer-events-none',
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={checkDisabled}
                    tabIndex={-1}
                  />
                </div>
              )}
              <Link
                href={studyHref(study)}
                className="flex items-center gap-4 pl-10 pr-4 py-2.5 text-[13px] hover:bg-muted/20 transition-colors"
              >
                <span className="w-6 shrink-0 text-center text-foreground/20 tabular-nums">#{i + 1}</span>
                <span className="inline-flex items-center gap-1.5">
                  {study.status === 'running' ? (
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                    </span>
                  ) : study.status === 'analyzing' ? (
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-yellow-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
                    </span>
                  ) : study.status === 'complete' ? (
                    <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                  ) : (
                    <span className="inline-flex h-2 w-2 rounded-full bg-red-400" />
                  )}
                  <span className={cn('capitalize', statusColor(study.status))}>{study.status}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-foreground/40">
                  <Users className="h-3 w-3" />
                  {study.persona_count ?? study.personas?.length ?? 0}
                </span>
                <div className="tabular-nums">
                  {study.overall_score != null && study.overall_score > 0
                    ? <span className="font-medium text-foreground">{Math.round(study.overall_score)}/100</span>
                    : <span className="text-foreground/20">—</span>}
                </div>
                <span className="ml-auto text-foreground/30">{fmtShort(study.created_at)}</span>
                <ChevronRight className="h-3.5 w-3.5 -mr-1 text-foreground/30 opacity-0 group-hover/row:opacity-100 transition-opacity" />
              </Link>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

// ── Schedules Panel ────────────────────────────────────

function fmtScheduleDate(d: string | null) {
  if (!d) return '--';
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const scheduleStatusColors: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900',
  paused: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900',
};

function ScheduleCard({ s }: { s: ScheduleOut }) {
  const update = useUpdateSchedule();
  const del_ = useDeleteSchedule();
  const trigger = useTriggerSchedule();
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className="rounded-lg border border-border p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-semibold">{s.name}</span>
        <Badge variant="outline" className={scheduleStatusColors[s.status] ?? ''}>{s.status}</Badge>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Globe className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{s.url}</span>
      </div>
      {s.cron_expression && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">{s.cron_expression}</code>
        </div>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>Runs: <span className="font-medium text-foreground">{s.run_count}</span></span>
        <span>Next: <span className="font-medium text-foreground">{fmtScheduleDate(s.next_run_at)}</span></span>
      </div>
      <div className="flex items-center gap-1 pt-1">
        {s.last_study_id && (
          <Link href={`/study/${s.last_study_id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Last results <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={update.isPending} onClick={() => update.mutate({ id: s.id, data: { status: s.status === 'active' ? 'paused' : 'active' } })} title={s.status === 'active' ? 'Pause' : 'Resume'}>
          {s.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={trigger.isPending || s.status !== 'active'} onClick={() => trigger.mutate(s.id, { onSuccess: (r) => toast.success(`${TERMS.singularCap} triggered`) })} title="Trigger now">
          {trigger.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
        </Button>
        <Dialog open={confirmDel} onOpenChange={setConfirmDel}>
          <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete schedule</DialogTitle><DialogDescription>Delete &quot;{s.name}&quot;? Existing {TERMS.plural} will not be affected.</DialogDescription></DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDel(false)}>Cancel</Button>
              <Button variant="destructive" disabled={del_.isPending} onClick={() => del_.mutate(s.id, { onSuccess: () => setConfirmDel(false) })}>{del_.isPending ? 'Deleting...' : 'Delete'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function CreateScheduleDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateSchedule();
  const { data: templates } = usePersonaTemplates();
  const [form, setForm] = useState({ name: '', url: '', task: '', cron: '', personaIds: [] as string[] });
  const canSubmit = form.name.trim() && form.url.trim() && form.task.trim() && form.personaIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />New</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Schedule</DialogTitle><DialogDescription>Set up a recurring or webhook-triggered test.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Schedule name</Label><Input placeholder="e.g. Weekly checkout test" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Website URL</Label><Input placeholder="https://example.com" value={form.url} onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Task for testers</Label><Input placeholder="Complete a purchase" value={form.task} onChange={(e) => setForm(f => ({ ...f, task: e.target.value }))} /></div>
          <div className="space-y-2">
            <Label>Cron expression <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="0 9 * * 1 (every Monday 9am)" value={form.cron} onChange={(e) => setForm(f => ({ ...f, cron: e.target.value }))} className="font-mono" />
            <p className="text-sm text-muted-foreground">Leave empty for webhook-only triggers.</p>
          </div>
          <div className="space-y-2">
            <Label>Testers ({form.personaIds.length} selected)</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border p-2">
              {templates?.map(t => (
                <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, personaIds: f.personaIds.includes(t.id) ? f.personaIds.filter(p => p !== t.id) : [...f.personaIds, t.id] }))}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-colors ${form.personaIds.includes(t.id) ? 'border-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:border-border'}`}>
                  <span className="text-base">{t.emoji}</span><span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!canSubmit || create.isPending} onClick={() => create.mutate(
            { name: form.name, url: form.url, tasks: [{ description: form.task }], persona_template_ids: form.personaIds, cron_expression: form.cron || undefined },
            { onSuccess: () => { setOpen(false); setForm({ name: '', url: '', task: '', cron: '', personaIds: [] }); toast.success('Schedule created'); } }
          )}>{create.isPending ? 'Creating...' : 'Create Schedule'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SchedulesPanel() {
  const { data, isLoading } = useSchedules();
  const schedules = data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[14px] uppercase text-foreground/30">Upcoming tests</p>
        <CreateScheduleDialog />
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : schedules.length > 0 ? (
        <div className="space-y-2">
          {schedules.map(s => <ScheduleCard key={s.id} s={s} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No schedules yet</p>
          <CreateScheduleDialog />
        </div>
      )}
    </div>
  );
}

// ── Issue Diff Row (for comparison sheet) ──────────────

function IssueDiffRow({ issue }: { issue: IssueDiff }) {
  const statusIcons: Record<string, React.ReactNode> = {
    fixed: <CheckCircle className="h-4 w-4 text-green-500" />,
    new: <AlertCircle className="h-4 w-4 text-red-500" />,
    persisting: <MinusCircle className="h-4 w-4 text-yellow-500" />,
    improved: <TrendingUp className="h-4 w-4 text-green-500" />,
    regressed: <TrendingDown className="h-4 w-4 text-red-500" />,
  };
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      {statusIcons[issue.status] ?? null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={SEVERITY_COLORS[issue.severity] ?? ''}>{issue.severity}</Badge>
          {issue.element && <code className="text-sm text-muted-foreground">{issue.element}</code>}
        </div>
        <p className="text-sm">{issue.description}</p>
        {issue.page_url && <p className="mt-1 text-sm text-muted-foreground">{issue.page_url}</p>}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────

export default function DashboardPage() {
  const [page] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StudyStatus | null>(null);
  const [urlFilter, setUrlFilter] = useState<string | null>(null);
  const [showFailed, setShowFailed] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedStudyIds, setSelectedStudyIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);
  const compare = useCompareStudies();
  const { data, isLoading, isError, error, refetch } = useStudies(page, 50);

  const toggleStudySelection = (id: string) => {
    setSelectedStudyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedStudyIds(new Set());
    compare.reset();
  };

  const runComparison = () => {
    const ids = [...selectedStudyIds];
    if (ids.length !== 2) return;
    setCompareSheetOpen(true);
    compare.mutate({ baselineId: ids[0], comparisonId: ids[1] });
  };

  const allStudies = data?.items ?? [];
  const failedCount = allStudies.filter((s) => s.status === 'failed').length;
  const studies = allStudies.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (urlFilter && s.url !== urlFilter) return false;
    if (!showFailed && s.status === 'failed') return false;
    return true;
  });
  const grouped = useMemo(() => groupByUrl(studies), [studies]);

  const hasFilters = statusFilter !== null || urlFilter !== null || showFailed;

  const urlOptions = useMemo(() => {
    const urls = Array.from(new Set(allStudies.map((s) => s.url))).sort();
    return urls.map((u) => {
      try { return { value: u, label: new URL(u).hostname }; } catch { return { value: u, label: u }; }
    });
  }, [allStudies]);

  const uniqueUrls = useMemo(() => {
    if (!allStudies.length) return 0;
    return new Set(allStudies.map((s) => s.url)).size;
  }, [allStudies]);

  const latestStudy = allStudies[0];

  const headerChips = allStudies.length > 0
    ? [
        { label: 'Tests', value: data?.total ?? allStudies.length },
        { label: 'Websites', value: uniqueUrls },
        ...(latestStudy
          ? [{ label: 'Last run', value: formatDistanceToNow(latestStudy.created_at) }]
          : []),
      ]
    : [];

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
    <div>
      {headerChips.length > 0 && (
        <PageHeaderBar
          chips={headerChips}
          right={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-[30px] text-sm">
                  New Test
                  <ChevronRight className="ml-1.5 h-3 w-3 rotate-90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/">Now</Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="opacity-50 cursor-default" title="Coming soon">
                  Schedule
                  <span className="ml-auto text-[10px] text-muted-foreground">Coming soon</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      )}
    <div className="flex gap-6 p-6">
      {/* Left — Test history */}
      <div className="min-w-0 flex-1 basis-1/2 space-y-4">
        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <p className="text-[14px] uppercase text-foreground/30">Test history</p>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'flex h-[30px] items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors',
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
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe className="mr-2 h-4 w-4" />
                  URL
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  <DropdownMenuItem onClick={() => setUrlFilter(null)}>
                    <span className={urlFilter === null ? 'font-medium' : ''}>All</span>
                  </DropdownMenuItem>
                  {urlOptions.map((opt) => (
                    <DropdownMenuItem key={opt.value} onClick={() => setUrlFilter(opt.value)}>
                      <span className={urlFilter === opt.value ? 'font-medium' : ''}>{opt.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowFailed((v) => !v)}>
                <Checkbox checked={showFailed} className="pointer-events-none mr-2" />
                Show Failed
              </DropdownMenuItem>
              {hasFilters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setStatusFilter(null); setUrlFilter(null); setShowFailed(false); }}>
                    <X className="mr-2 h-4 w-4" />
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={compareMode ? 'default' : 'outline'}
            size="sm"
            className="h-[30px] text-sm"
            onClick={() => compareMode ? exitCompareMode() : setCompareMode(true)}
          >
            <GitCompare className="mr-1.5 h-3.5 w-3.5" />
            {compareMode ? 'Exit Compare' : 'Compare'}
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
          {urlFilter && (
            <button
              onClick={() => setUrlFilter(null)}
              className="flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-sm text-muted-foreground hover:text-foreground"
            >
              {urlOptions.find((o) => o.value === urlFilter)?.label ?? urlFilter}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Grouped — strip headers + test rows */}
        {grouped.length > 0 ? (
          <div className="space-y-4">
            {grouped.map(([url, groupStudies]) => (
              <UrlGroup
                key={url}
                url={url}
                studies={groupStudies}
                collapsed={collapsed.has(url)}
                onToggleCollapse={() => setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(url)) next.delete(url);
                  else next.add(url);
                  return next;
                })}
                compareMode={compareMode}
                selectedStudyIds={selectedStudyIds}
                onToggleStudy={toggleStudySelection}
              />
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No tests match this filter</p>
        )}

        {!statusFilter && failedCount > 0 && (
          <button
            onClick={() => setShowFailed((v) => !v)}
            className="text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
          >
            {showFailed ? `Hide ${failedCount} failed` : `Show ${failedCount} failed`}
          </button>
        )}
      </div>


      {/* Floating compare action bar */}
      {selectedStudyIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm font-medium text-muted-foreground">
              {selectedStudyIds.size} of 2 selected
            </span>
            <Button
              size="sm"
              disabled={selectedStudyIds.size !== 2}
              onClick={runComparison}
              className="rounded-full"
            >
              <GitCompare className="mr-1.5 h-3.5 w-3.5" />
              Compare
            </Button>
            <button
              onClick={exitCompareMode}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Comparison results Sheet */}
      <Sheet open={compareSheetOpen} onOpenChange={(open) => {
        setCompareSheetOpen(open);
        if (!open) compare.reset();
      }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Comparison Results</SheetTitle>
          </SheetHeader>

          {compare.isPending && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Comparing studies...</p>
            </div>
          )}

          {compare.isError && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium">Comparison failed</p>
              <p className="text-sm text-muted-foreground">{compare.error?.message ?? 'Unknown error'}</p>
            </div>
          )}

          {compare.data && (() => {
            const result = compare.data;
            return (
              <div className="space-y-4 pt-4">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-sm text-muted-foreground">Score Delta</p>
                    <p className={cn(
                      'text-2xl font-bold',
                      result.score_improved ? 'text-green-600 dark:text-green-400' : result.score_delta < 0 ? 'text-red-600 dark:text-red-400' : '',
                    )}>
                      {result.score_delta > 0 ? '+' : ''}{result.score_delta.toFixed(0)}
                    </p>
                    <p className="text-sm text-muted-foreground">{result.baseline_score?.toFixed(0)} → {result.comparison_score?.toFixed(0)}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-sm text-muted-foreground">Fixed</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.issues_fixed.length}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-sm text-muted-foreground">New Issues</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.issues_new.length}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-sm text-muted-foreground">Persisting</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{result.issues_persisting.length}</p>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="rounded-lg border p-3">
                  <p className="text-sm">{result.summary}</p>
                </div>

                {/* Issue tabs */}
                <Tabs defaultValue="fixed">
                  <TabsList className="w-full">
                    <TabsTrigger value="fixed" className="flex-1">Fixed ({result.issues_fixed.length})</TabsTrigger>
                    <TabsTrigger value="new" className="flex-1">New ({result.issues_new.length})</TabsTrigger>
                    <TabsTrigger value="persisting" className="flex-1">Persisting ({result.issues_persisting.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="fixed" className="space-y-2 pt-3">
                    {result.issues_fixed.length ? result.issues_fixed.map((d, i) => <IssueDiffRow key={i} issue={d} />) : <p className="py-6 text-center text-sm text-muted-foreground">No fixed issues</p>}
                  </TabsContent>
                  <TabsContent value="new" className="space-y-2 pt-3">
                    {result.issues_new.length ? result.issues_new.map((d, i) => <IssueDiffRow key={i} issue={d} />) : <p className="py-6 text-center text-sm text-muted-foreground">No new issues</p>}
                  </TabsContent>
                  <TabsContent value="persisting" className="space-y-2 pt-3">
                    {result.issues_persisting.length ? result.issues_persisting.map((d, i) => <IssueDiffRow key={i} issue={d} />) : <p className="py-6 text-center text-sm text-muted-foreground">No persisting issues</p>}
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
    </div>
  );
}
