'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus, Search, ChevronRight, ListFilter, ClipboardList,
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
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { TestsIllustration, ScheduleIllustration } from '@/components/common/empty-illustrations';
import { ErrorState } from '@/components/common/error-state';
import { PageSkeleton } from '@/components/common/page-skeleton';
import { PageHeaderBar } from '@/components/layout/page-header-bar';
import { formatDistanceToNow } from '@/lib/utils';
import { SEVERITY_COLORS, TERMS } from '@/lib/constants';
import { cn, scoreColor, scoreLabel, studyName } from '@/lib/utils';
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

// ── Favicon with globe fallback ──────────────────────────

function SiteFavicon({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  let hostname: string;
  try { hostname = new URL(url).hostname; } catch { return <Globe className={cn('h-4 w-4 text-foreground/30', className)} />; }

  if (failed) return <Globe className={cn('h-4 w-4 text-foreground/30', className)} />;

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
      alt=""
      className={cn('h-4 w-4 rounded-sm', className)}
      onError={() => setFailed(true)}
    />
  );
}

// ── Shared row cells ─────────────────────────────────────

function StatusDotInline({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
      </span>
    );
  }
  if (status === 'analyzing') {
    return (
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-yellow-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-500" />
      </span>
    );
  }
  if (status === 'complete') return <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />;
  return <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />;
}

function ScoreCell({ score }: { score: number | null | undefined }) {
  if (score == null || score <= 0) return <span className="text-foreground/20">&mdash;</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('font-semibold', scoreColor(score).text)}>{Math.round(score)}</span>
      <span className={cn('text-[10px] font-medium uppercase tracking-wide opacity-60', scoreColor(score).text)}>
        {scoreLabel(score)}
      </span>
    </span>
  );
}

// ── URL Group (grid rows, Option B) ─────────────────────

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
        <SiteFavicon url={url} />
        <span className="text-[14px] text-foreground">{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
        <span className="text-[13px] text-foreground/30">{studies.length} {studies.length === 1 ? 'test' : 'tests'}</span>
        <ChevronRight className={cn('ml-auto h-3.5 w-3.5 text-foreground/30 transition-transform', collapsed ? 'rotate-90' : '-rotate-90')} />
      </button>
      {/* Test rows — CSS grid */}
      {!collapsed && (
      <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
        {studies.map((study, i) => {
          const isComplete = study.status === 'complete';
          const isSelected = selectedStudyIds.has(study.id);
          const showCheckbox = isComplete && (compareMode || selectedStudyIds.size > 0);
          const checkDisabled = !isSelected && selectedStudyIds.size >= 2;

          return (
            <div key={study.id} className="group/row relative border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
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
                className="flex items-center pl-10 py-2.5 text-[13px]"
              >
                <div className="grid flex-1 items-center" style={{ gridTemplateColumns: '80px 1fr 100px 50px 80px 60px' }}>
                  <span className="text-foreground/30">{studyName(study.url, studies.length - i)}</span>
                  <span className="text-foreground/70 truncate pr-4">{study.first_task ?? ''}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDotInline status={study.status} />
                    <span className={cn('capitalize', statusColor(study.status))}>{study.status}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-foreground/40">
                    <Users className="h-3 w-3" />
                    {study.persona_count ?? study.personas?.length ?? 0}
                  </span>
                  <span className="tabular-nums"><ScoreCell score={study.overall_score} /></span>
                  <span className="text-right text-foreground/30">{fmtShort(study.created_at)}</span>
                </div>
                <ChevronRight className="mx-4 h-3.5 w-3.5 shrink-0 text-foreground/15 opacity-0 group-hover/row:opacity-100 transition-opacity" />
              </Link>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

// ── Flat table view (Option E) ──────────────────────────

function FlatTable({
  studies,
  selectedStudyIds,
  onToggleStudy,
}: {
  studies: StudySummary[];
  selectedStudyIds: Set<string>;
  onToggleStudy: (id: string) => void;
}) {
  // Compute sequential index per URL
  const withIndex = useMemo(() => {
    const counts = new Map<string, number>();
    // Sort oldest first to assign sequential numbers
    const sorted = [...studies].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const indexMap = new Map<string, number>();
    for (const s of sorted) {
      const n = (counts.get(s.url) ?? 0) + 1;
      counts.set(s.url, n);
      indexMap.set(s.id, n);
    }
    // Return in original order (newest first) with the index
    return studies.map((s) => ({ study: s, idx: indexMap.get(s.id) ?? 1 }));
  }, [studies]);

  const router = useRouter();

  if (studies.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No tests match this filter</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-foreground/30">
            <th className="py-2 pl-10 pr-2 font-medium">Website</th>
            <th className="px-2 py-2 font-medium">Test</th>
            <th className="px-2 py-2 font-medium">Task</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-2 py-2 pr-6 text-right font-medium">Testers</th>
            <th className="pl-6 pr-2 py-2 font-medium">Score</th>
            <th className="px-2 py-2 text-right font-medium">Date</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {withIndex.map(({ study, idx }) => {
            const isComplete = study.status === 'complete';
            const isSelected = selectedStudyIds.has(study.id);
            const checkDisabled = !isSelected && selectedStudyIds.size >= 2;
            let hostname: string;
            try { hostname = new URL(study.url).hostname.replace(/^www\./, ''); } catch { hostname = study.url; }

            return (
              <tr
                key={study.id}
                onClick={() => router.push(studyHref(study))}
                className="group/row cursor-pointer border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors"
              >
                <td className="py-2.5 pl-4 pr-2">
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <div
                        onClick={(e) => { e.stopPropagation(); onToggleStudy(study.id); }}
                        className={cn(
                          'flex items-center justify-center transition-opacity cursor-pointer',
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100',
                          checkDisabled && 'cursor-not-allowed opacity-30 pointer-events-none',
                        )}
                      >
                        <Checkbox checked={isSelected} disabled={checkDisabled} tabIndex={-1} />
                      </div>
                    ) : (
                      <TooltipProvider delayDuration={0}>
                        <ShadTooltip>
                          <TooltipTrigger asChild>
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
                            >
                              <Checkbox disabled tabIndex={-1} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">Test must be complete to compare</TooltipContent>
                        </ShadTooltip>
                      </TooltipProvider>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-foreground/30">
                      <SiteFavicon url={study.url} className="h-3.5 w-3.5" />
                      {hostname}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-foreground/30">{studyName(study.url, idx)}</td>
                <td className="px-2 py-2.5 text-foreground/70 truncate max-w-[180px]">{study.first_task ?? ''}</td>
                <td className="px-2 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDotInline status={study.status} />
                    <span className={cn('capitalize', statusColor(study.status))}>{study.status}</span>
                  </span>
                </td>
                <td className="px-2 pr-6 py-2.5 text-right text-foreground/40">{study.persona_count ?? study.personas?.length ?? 0}</td>
                <td className="pl-6 pr-2 py-2.5 tabular-nums"><ScoreCell score={study.overall_score} /></td>
                <td className="px-2 py-2.5 text-right text-foreground/30">{fmtShort(study.created_at)}</td>
                <td className="py-2.5 px-2 pr-4">
                  <ChevronRight className="h-3.5 w-3.5 text-foreground/15 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-8 text-center">
          <ScheduleIllustration />
          <div>
            <p className="text-sm font-medium">No schedules yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Set up recurring tests to monitor your site</p>
          </div>
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
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
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
        { label: 'Tests', value: data?.total ?? allStudies.length, tooltip: 'Total number of usability tests run' },
        { label: 'Websites', value: uniqueUrls, tooltip: 'Unique websites tested' },
        ...(latestStudy
          ? [{ label: 'Last run', value: formatDistanceToNow(latestStudy.created_at), tooltip: 'Time since your most recent test' }]
          : []),
      ]
    : [];

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-[100px] pt-[40px] pb-[100px]">
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
      <div className="space-y-6 px-[100px] pt-[40px] pb-[100px]">
        <EmptyState
          illustration={<TestsIllustration />}
          title="No tests yet"
          description="Run your first test to get started."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Run your first test
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
          icon={ClipboardList}
          title="My tests"
          chips={headerChips}
          right={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-[30px] text-sm">
                  New Test
                  <ChevronRight className="ml-0.5 h-3 w-3 rotate-90" />
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
    <div className="flex gap-6 px-[100px] pt-[40px] pb-[100px]">
      {/* Left — Test history */}
      <div className="min-w-0 flex-1 basis-1/2 space-y-2.5">
        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <p className="text-[14px] uppercase text-foreground/30">Test history</p>
          <div className="flex-1" />

          {/* Group by URL chip */}
          <button
            onClick={() => setViewMode(viewMode === 'grouped' ? 'flat' : 'grouped')}
            className={cn(
              'flex h-[30px] items-center gap-1.5 rounded-md border px-2.5 text-[14px] transition-colors',
              viewMode === 'grouped'
                ? 'border-foreground/20 bg-foreground/5 text-foreground/70'
                : 'border-border text-foreground/70 hover:text-foreground',
            )}
          >
            {viewMode === 'grouped' ? 'Grouped by URL' : 'Group by URL'}
            {viewMode === 'grouped' && <X className="h-3 w-3" />}
          </button>

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
            <DropdownMenuContent align="end" sideOffset={4} className="w-48">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CircleDot className="mr-2 h-4 w-4" />
                  Status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent sideOffset={2} alignOffset={-4} className="w-36">
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
                <DropdownMenuSubContent sideOffset={2} alignOffset={-4} className="w-48">
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
                Show failed
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

          <TooltipProvider delayDuration={0}>
            <ShadTooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-[30px] text-sm pointer-events-none opacity-50"
                    disabled
                  >
                    <GitCompare className="mr-1.5 h-3.5 w-3.5" />
                    Compare
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </ShadTooltip>
          </TooltipProvider>

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

        {/* Test rows — grouped (B) or flat table (E) */}
        {viewMode === 'grouped' ? (
          grouped.length > 0 ? (
            <div className="space-y-2.5">
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
          )
        ) : (
          <FlatTable
            studies={studies}
            selectedStudyIds={selectedStudyIds}
            onToggleStudy={toggleStudySelection}
          />
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
            <span className="text-sm font-medium text-foreground/50">
              {selectedStudyIds.size} of 2 selected
            </span>
            <TooltipProvider delayDuration={0}>
              <ShadTooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      size="sm"
                      disabled
                      className="rounded-full pointer-events-none opacity-50"
                    >
                      <GitCompare className="mr-1.5 h-3.5 w-3.5" />
                      Compare
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </ShadTooltip>
            </TooltipProvider>
            <button
              onClick={exitCompareMode}
              className="rounded-full p-1 text-foreground/50 transition-colors hover:text-foreground"
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
