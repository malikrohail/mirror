'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MoreVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '@/lib/api-client';
import { useDeleteStudy } from '@/hooks/use-study';
import { useStudyStore } from '@/stores/study-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StudyProgress } from '@/components/study/study-progress';
import { LiveStepTimeline } from '@/components/study/live-step-timeline';
import { ScreencastViewer } from '@/components/study/screencast-viewer';
import { LiveBrowserView } from '@/components/study/live-browser-view';
import { ReportPreview } from '@/components/report/report-preview';
import { PageHeaderBar } from '@/components/layout/page-header-bar';
import type { HeaderChip } from '@/components/layout/page-header-bar';

function RuntimeClock({ startedAt, stoppedAt }: { startedAt: string; stoppedAt?: string | null }) {
  const startMs = new Date(startedAt).getTime();
  const endMs = stoppedAt ? new Date(stoppedAt).getTime() : null;

  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor(((endMs ?? Date.now()) - startMs) / 1000))
  );

  useEffect(() => {
    if (endMs) return;
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startMs, endMs]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return <span className="tabular-nums">{parts.join(' ')}</span>;
}

type RunningTab = 'steps' | 'browser' | 'log';
type CompleteTab = 'issues' | 'replay' | 'heatmap' | 'report';

export default function StudyRunningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const deleteStudy = useDeleteStudy();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [runningTab, setRunningTab] = useState<RunningTab>('browser');
  const [completeTab, setCompleteTab] = useState<CompleteTab>('issues');

  const [browserMode, setBrowserMode] = useState<'local' | 'cloud'>('local');

  useEffect(() => {
    const stored = localStorage.getItem('mirror-browser-mode');
    if (stored === 'cloud') setBrowserMode('cloud');
  }, []);

  const activeStudy = useStudyStore((s) => s.activeStudy);
  const logs = useStudyStore((s) => s.logs);

  const { data: study } = useQuery({
    queryKey: ['study-header', id],
    queryFn: () => api.getStudy(id),
    refetchInterval: 3000,
    enabled: !!id,
  });

  const isActive = study?.status === 'running' || study?.status === 'analyzing';
  const { data: sessions } = useQuery({
    queryKey: ['sessions-progress', id],
    queryFn: () => api.listSessions(id),
    refetchInterval: isActive ? 2000 : false,
    enabled: !!id,
  });

  const { data: liveState } = useQuery({
    queryKey: ['live-state', id],
    queryFn: () => api.getLiveState(id),
    refetchInterval: 1500,
    enabled: !!id && study?.status === 'running',
  });

  // Fetch sessions and issues once complete
  const { data: completeSessions } = useQuery({
    queryKey: ['sessions-complete', id],
    queryFn: () => api.listSessions(id),
    enabled: !!id && study?.status === 'complete',
  });

  const { data: issues } = useQuery({
    queryKey: ['issues', id],
    queryFn: () => api.listIssues(id),
    enabled: !!id && study?.status === 'complete',
  });

  // Fetch all studies to compute test name (e.g. "Claude4")
  const { data: allStudies } = useQuery({
    queryKey: ['studies-all'],
    queryFn: () => api.listStudies(1, 250),
    enabled: !!study?.url,
  });

  const testName = (() => {
    if (!study?.url) return null;
    const hostname = study.url.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
    const label = hostname.toLowerCase();
    if (!allStudies?.items) return `${label}-1`;
    const normalize = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const studyNorm = normalize(study.url);
    const sameUrl = allStudies.items
      .filter((s) => normalize(s.url) === studyNorm)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const idx = sameUrl.findIndex((s) => s.id === id);
    return `${label}-${idx >= 0 ? idx + 1 : 1}`;
  })();

  // Auto-select first session
  useEffect(() => {
    if (!selectedSessionId && sessions && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const isRunning = study?.status === 'running';
  const isAnalyzing = study?.status === 'analyzing';
  const isComplete = study?.status === 'complete';
  const isFailed = study?.status === 'failed';

  // Calculate progress
  const maxSteps = 30;
  const totalSessions = sessions?.length ?? 0;
  const sessionProgress = sessions?.reduce((sum, s) => {
    if (s.status === 'complete' || s.status === 'failed') return sum + 1;
    const ws = activeStudy?.personas[s.id];
    const polled = liveState?.[s.id];
    const step = ws?.step_number ?? polled?.step_number ?? s.total_steps ?? 0;
    return sum + Math.min(step / maxSteps, 0.95);
  }, 0) ?? 0;
  const percent = isComplete
    ? 100
    : isFailed
      ? 0
      : isAnalyzing
        ? 90
        : totalSessions > 0
          ? Math.round((sessionProgress / totalSessions) * 80)
          : 0;

  // Get selected persona's data for the right panel
  const selectedPersona = selectedSessionId ? activeStudy?.personas[selectedSessionId] : null;
  const selectedPolled = selectedSessionId ? liveState?.[selectedSessionId] : null;
  const selectedSession = sessions?.find((s) => s.id === selectedSessionId);

  const handleDelete = () => {
    deleteStudy.mutate(id, {
      onSuccess: () => {
        toast.success('Test deleted');
        router.push('/tests');
      },
      onError: () => {
        toast.error('Failed to delete test');
      },
    });
  };

  // Browser view for selected persona
  const hasScreencast = selectedPersona?.screencast_available && selectedSessionId;
  const hasLiveView = selectedPersona?.live_view_url != null || selectedPolled?.live_view_url != null;
  const browserActive = selectedPersona?.browser_active ?? selectedPolled?.browser_active ?? !(selectedSession?.status === 'complete' || selectedSession?.status === 'failed');
  const screenshotUrl = selectedPersona?.screenshot_url ?? selectedPolled?.screenshot_url ?? '';
  const liveViewUrl = selectedPersona?.live_view_url ?? selectedPolled?.live_view_url ?? null;
  const personaName = selectedPersona?.persona_name ?? 'Tester';

  const renderBrowserView = () => {
    if (hasScreencast && selectedSessionId && (browserActive || !hasLiveView)) {
      return (
        <ScreencastViewer
          sessionId={selectedSessionId}
          browserActive={browserActive}
          personaName={personaName}
          screenshotUrl={screenshotUrl}
        />
      );
    }

    if (hasLiveView && liveViewUrl) {
      return (
        <LiveBrowserView
          liveViewUrl={liveViewUrl}
          browserActive={browserActive}
          personaName={personaName}
          screenshotUrl={screenshotUrl}
        />
      );
    }

    if (screenshotUrl) {
      return (
        <img
          src={screenshotUrl}
          alt={`${personaName} latest`}
          className="h-full w-full object-cover object-top"
        />
      );
    }

    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground/50">
          {browserActive ? 'Loading browser...' : 'Waiting to start...'}
        </p>
      </div>
    );
  };

  const headerChips: HeaderChip[] = [];
  if (testName) headerChips.push({ label: 'Test', value: testName });
  if (study?.url) headerChips.push({ label: 'Website', value: <span className="truncate">{study.url.replace(/^https?:\/\//, '')}</span> });
  if (sessions && sessions.length > 0) {
    headerChips.push({
      label: 'Testers',
      value: isComplete || isFailed
        ? sessions.length
        : sessions.filter((s) => s.status === 'running' || s.status === 'pending').length,
    });
  }
  headerChips.push({
    label: 'Status',
    value: (
      <span className="inline-flex items-center gap-1">
        {isRunning ? (
          <span className="relative inline-flex h-1 w-1">
            <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-green-400 opacity-50" />
            <span className="relative inline-flex h-1 w-1 rounded-full bg-green-500" />
          </span>
        ) : isComplete ? (
          <span className="text-green-500 text-xs leading-none">&#10003;</span>
        ) : isFailed ? (
          <span className="text-red-500 text-xs leading-none">&#10005;</span>
        ) : isAnalyzing ? (
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-500" />
          </span>
        ) : (
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        )}
        <span className="font-normal text-foreground capitalize">
          {isRunning ? 'Running' : isAnalyzing ? 'Analyzing' : isComplete ? 'Done' : isFailed ? 'Failed' : 'Starting'}
        </span>
      </span>
    ),
  });
  if (isComplete && study?.updated_at) {
    const d = new Date(study.updated_at);
    const day = d.getDate();
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    headerChips.push({ label: 'Date', value: `${d.toLocaleDateString('en-US', { month: 'long' })} ${day}${suffix}, ${d.getFullYear()}` });
  } else {
    headerChips.push({
      label: 'Progress',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5">
            {Array.from({ length: 10 }).map((_, idx) => (
              <span
                key={idx}
                className={`inline-block h-1.5 w-2.5 rounded-sm transition-colors duration-300 ${
                  idx < Math.round((percent / 100) * 10) ? 'bg-green-500' : 'bg-muted'
                }`}
              />
            ))}
          </span>
          <span>{percent}%</span>
        </span>
      ),
    });
  }
  if (study?.created_at) {
    headerChips.push({
      label: 'Runtime',
      value: <RuntimeClock startedAt={study.created_at} stoppedAt={(isComplete || isFailed) ? study.updated_at : null} />,
    });
  }
  headerChips.push({
    label: 'Cost',
    value: <span className="tabular-nums">${(activeStudy?.cost?.total_cost_usd ?? 0).toFixed(2)}</span>,
  });

  const headerRight = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setConfirmDelete(true)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete test
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div>
      <PageHeaderBar chips={headerChips} right={headerRight} />

      {/* Goals */}
      {study?.tasks && study.tasks.length > 0 && (
        <div className="px-6 pt-3 pb-4">
          <p className="text-[14px] uppercase text-foreground/30 mb-1.5">Tasks</p>
          <div className="flex flex-wrap gap-2">
            {study.tasks.map((task, i) => (
              <span key={i} className="inline-flex items-center rounded-md border border-border px-2.5 py-1 text-[13px] text-foreground">
                {task.description.charAt(0).toUpperCase() + task.description.slice(1)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Overview — only when complete */}
      {isComplete && study?.executive_summary && (
        <div className="px-6 pb-4">
          <p className="text-[14px] uppercase text-foreground/30 mb-1.5">Overview</p>
          <p className="text-[14px] text-foreground/70 leading-relaxed">{study.executive_summary}</p>
        </div>
      )}

      {/* Summary cards — only when complete */}
      {isComplete && (
        <div className="px-6 pb-4">
          <p className="text-[14px] uppercase text-foreground/30 mb-1.5">Metrics</p>
        <div className="grid grid-cols-4 gap-3">
          {/* Overall score */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-[13px] text-muted-foreground/60">Overall score</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {study?.overall_score != null ? Math.round(study.overall_score) : '—'}
              <span className="text-sm font-normal text-muted-foreground/40">/100</span>
            </p>
          </div>
          {/* Issues found */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-[13px] text-muted-foreground/60">Issues found</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {issues?.length ?? '—'}
            </p>
          </div>
          {/* Task completion */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-[13px] text-muted-foreground/60">Task completion</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {completeSessions
                ? `${Math.round((completeSessions.filter((s) => s.task_completed).length / completeSessions.length) * 100)}%`
                : '—'}
            </p>
          </div>
          {/* Average mood */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-[13px] text-muted-foreground/60">Average mood</p>
            <p className="mt-1 text-2xl font-semibold">
              {(() => {
                // Derive mood from emotional_arc, then session status as fallback
                const allSessions = completeSessions ?? sessions ?? [];
                const moods = allSessions.map((s) => {
                  if (s.emotional_arc) {
                    const entries = Object.entries(s.emotional_arc);
                    if (entries.length > 0) return entries[entries.length - 1][1];
                  }
                  // Fallback: infer from session status
                  if (s.status === 'gave_up') return 'frustrated';
                  if (s.status === 'failed') return 'confused';
                  if (s.status === 'complete') return 'satisfied';
                  return 'neutral';
                });
                if (moods.length === 0) return '—';
                const scores: Record<string, number> = { frustrated: 1, stuck: 1, anxious: 2, confused: 2, neutral: 3, curious: 4, confident: 4, satisfied: 5, delighted: 5, excited: 5 };
                const avg = moods.reduce((sum, m) => sum + (scores[m] ?? 3), 0) / moods.length;
                if (avg >= 4.5) return 'Delighted';
                if (avg >= 3.5) return 'Satisfied';
                if (avg >= 2.5) return 'Neutral';
                return 'Frustrated';
              })()}
            </p>
          </div>
        </div>
        </div>
      )}

      {/* Content — fixed two-column layout: persona cards + tabbed panel */}
      <div className="flex items-start gap-4 px-6 pb-6 mt-1.5">
        {/* Left: persona cards */}
        <div className="w-[720px] shrink-0">
          <p className="text-[14px] uppercase text-foreground/30 mb-1.5">Testers</p>
          <StudyProgress
            studyId={id}
            hideLabel
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
          />
        </div>

        {/* Right: tabbed panel */}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] uppercase text-foreground/30 mb-1.5">Feed</p>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
          {isComplete ? (
            <Tabs value={completeTab} onValueChange={(v) => setCompleteTab(v as CompleteTab)}>
              <div className="border-b border-border">
                <TabsList variant="line" className="px-3">
                  <TabsTrigger value="issues">Issues</TabsTrigger>
                  <TabsTrigger value="replay">Replay</TabsTrigger>
                  <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                  <TabsTrigger value="report">Report</TabsTrigger>
                </TabsList>
              </div>
              <div style={{ height: '460px' }}>
                <TabsContent value="issues" className="h-full m-0">
                  <div className="h-full overflow-y-auto p-4">
                    {!issues || issues.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-muted-foreground/50">No issues found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {issues.map((issue) => (
                          <div key={issue.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-start gap-2">
                              <span className={cn(
                                'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium',
                                issue.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                                issue.severity === 'major' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' :
                                issue.severity === 'minor' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                              )}>
                                {issue.severity}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] text-foreground">{issue.description}</p>
                                {issue.recommendation && (
                                  <p className="mt-1 text-[12px] text-muted-foreground/60">{issue.recommendation}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="replay" className="h-full m-0">
                  <div className="h-full overflow-hidden">
                    {renderBrowserView()}
                  </div>
                </TabsContent>
                <TabsContent value="heatmap" className="h-full m-0">
                  <div className="flex h-full items-center justify-center bg-muted/30">
                    <p className="text-sm text-muted-foreground/50">
                      Heatmap will appear here after analysis
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="report" className="h-full m-0">
                  <div className="h-full overflow-y-auto p-4">
                    <ReportPreview studyId={id} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <Tabs value={runningTab} onValueChange={(v) => setRunningTab(v as RunningTab)}>
              <div className="border-b border-border">
                <TabsList variant="line" className="px-3">
                  <TabsTrigger value="steps">Steps</TabsTrigger>
                  <TabsTrigger value="browser">Browser</TabsTrigger>
                  <TabsTrigger value="log">Log</TabsTrigger>
                </TabsList>
              </div>
              <div style={{ height: '460px' }}>
                <TabsContent value="steps" className="h-full m-0">
                  <LiveStepTimeline steps={selectedPersona?.step_history ?? []} />
                </TabsContent>
                <TabsContent value="browser" className="h-full m-0">
                  <div className="h-full overflow-hidden">
                    {renderBrowserView()}
                  </div>
                </TabsContent>
                <TabsContent value="log" className="h-full m-0">
                  <div className="h-full overflow-y-auto p-3 font-mono text-xs">
                    {logs.length === 0 ? (
                      <p className="text-muted-foreground/40">Waiting for logs...</p>
                    ) : (
                      logs.map((entry, i) => (
                        <div key={i} className="flex gap-2 py-0.5">
                          <span className="shrink-0 tabular-nums text-muted-foreground/30">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={cn(
                            entry.level === 'error' ? 'text-red-500' :
                            entry.level === 'warn' ? 'text-yellow-500' :
                            'text-muted-foreground/70'
                          )}>
                            {entry.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete test</DialogTitle>
            <DialogDescription>
              This will permanently delete this test and all its data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteStudy.isPending}
              onClick={handleDelete}
            >
              {deleteStudy.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
