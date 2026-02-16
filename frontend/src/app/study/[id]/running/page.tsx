'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight, MoreVertical, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '@/lib/api-client';
import { useDeleteStudy } from '@/hooks/use-study';
import { useStudyStore } from '@/stores/study-store';
import { cn, scoreColor, scoreLabel, studyName } from '@/lib/utils';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StudyProgress } from '@/components/study/study-progress';
import { LiveStepTimeline } from '@/components/study/live-step-timeline';
import { ScreencastViewer } from '@/components/study/screencast-viewer';
import { LiveBrowserView } from '@/components/study/live-browser-view';
import { ReportPreview } from '@/components/report/report-preview';
import { ReportActions } from '@/components/report/report-actions';
import { IssuesTab } from '@/components/results/issues-tab';
import type { IssueOut, StepOut } from '@/types';
import { useSessionDetail } from '@/hooks/use-session-replay';
import type { StepHistoryEntry } from '@/stores/study-store';
import { ClickHeatmap } from '@/components/heatmap/click-heatmap';
import { BrowserIllustration, LogIllustration, StepsIllustration } from '@/components/common/empty-illustrations';
import { PageHeaderBar } from '@/components/layout/page-header-bar';
import type { HeaderChip } from '@/components/layout/page-header-bar';

function stepsToHistory(steps: StepOut[]): StepHistoryEntry[] {
  return steps.map((s) => ({
    step_number: s.step_number,
    think_aloud: s.think_aloud ?? '',
    screenshot_url: s.screenshot_path ? api.getScreenshotUrl(s.screenshot_path) : '',
    emotional_state: s.emotional_state ?? 'neutral',
    action: s.action_type ?? 'navigate',
    task_progress: s.task_progress ?? 0,
    timestamp: new Date(s.created_at).getTime(),
  }));
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(' ');
}

function RuntimeClock({
  startedAt,
  durationSeconds,
  isStopped,
}: {
  startedAt: string;
  durationSeconds?: number | null;
  isStopped: boolean;
}) {
  // If the study is complete/failed and we have a persisted duration, use it directly.
  // This prevents any drift or timezone issues.
  const fixedDuration = isStopped && durationSeconds != null ? durationSeconds : null;

  const startMs = new Date(startedAt).getTime();

  const [elapsed, setElapsed] = useState(() =>
    fixedDuration != null
      ? fixedDuration
      : Math.max(0, (Date.now() - startMs) / 1000)
  );

  useEffect(() => {
    // If we have a fixed duration (persisted), use it and stop ticking
    if (fixedDuration != null) {
      setElapsed(fixedDuration);
      return;
    }
    // If stopped but no persisted duration, calculate from timestamps
    if (isStopped) {
      setElapsed(Math.max(0, (Date.now() - startMs) / 1000));
      return;
    }
    // Otherwise, tick every second
    const interval = setInterval(() => {
      setElapsed(Math.max(0, (Date.now() - startMs) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startMs, fixedDuration, isStopped]);

  return <span className="tabular-nums">{formatDuration(elapsed)}</span>;
}

type RunningTab = 'steps' | 'browser' | 'log';
type CompleteTab = 'findings' | 'replay' | 'heatmap';

function BrowserWithSteps({
  selectedPersona,
  selectedPolled,
  selectedSessionId,
  browserStepIndex,
  setBrowserStepIndex,
  renderBrowserView,
}: {
  selectedPersona: { step_history?: { step_number: number; screenshot_url: string; think_aloud?: string; action?: string }[]; step_number?: number } | null | undefined;
  selectedPolled: api.LiveSessionState | null | undefined;
  selectedSessionId: string | null;
  browserStepIndex: number | null;
  setBrowserStepIndex: (i: number | null) => void;
  renderBrowserView: () => React.ReactNode;
}) {
  const steps = selectedPersona?.step_history ?? [];
  const totalSteps = steps.length || selectedPolled?.step_number || selectedPersona?.step_number || 0;
  const currentIndex = browserStepIndex ?? totalSteps - 1;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        {(() => {
          if (browserStepIndex != null && steps[browserStepIndex]?.screenshot_url) {
            return (
              <img
                src={steps[browserStepIndex].screenshot_url}
                alt={`Step ${steps[browserStepIndex].step_number}`}
                className="h-full w-full object-cover object-top"
              />
            );
          }
          return renderBrowserView();
        })()}
      </div>
      {/* Step navigation */}
      <TooltipProvider>
      <div className="flex items-center shrink-0 border-t border-border px-3 py-2">
        {totalSteps > 0 ? (
          <>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setBrowserStepIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex <= 0}
                className="p-0.5 rounded text-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs tabular-nums text-foreground/50 whitespace-nowrap">
                <span className="font-medium text-foreground">{currentIndex + 1}</span>{' / '}{totalSteps}
              </span>
              <button
                onClick={() => {
                  if (currentIndex >= totalSteps - 1) {
                    setBrowserStepIndex(null);
                  } else {
                    setBrowserStepIndex(currentIndex + 1);
                  }
                }}
                disabled={browserStepIndex == null}
                className="p-0.5 rounded text-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {steps[currentIndex] && (steps[currentIndex].think_aloud || steps[currentIndex].action) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="ml-3 text-xs text-foreground/40 line-clamp-4 min-w-0">
                    {steps[currentIndex].think_aloud || steps[currentIndex].action || ''}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm text-xs">
                  {steps[currentIndex].think_aloud || steps[currentIndex].action || ''}
                </TooltipContent>
              </Tooltip>
            )}
          </>
        ) : (
          <span className="text-xs text-foreground/30">No steps yet</span>
        )}
      </div>
      </TooltipProvider>
    </div>
  );
}

function ReplayWithSteps({ sessionId }: { sessionId: string }) {
  const { data: session, isLoading } = useSessionDetail(sessionId);
  const [stepIndex, setStepIndex] = useState<number>(0);

  const steps = session?.steps ?? [];
  const totalSteps = steps.length;
  const currentStep = steps[stepIndex];

  // Reset to first step when session changes
  useEffect(() => {
    setStepIndex(0);
  }, [sessionId]);

  if (isLoading || totalSteps === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <StepsIllustration />
        <p className="text-[14px] text-muted-foreground/40">
          {isLoading ? 'Loading replay' : 'No steps recorded'}
        </p>
      </div>
    );
  }

  const screenshotSrc = currentStep?.screenshot_path
    ? api.getScreenshotUrl(currentStep.screenshot_path)
    : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-hidden bg-muted/20">
        {screenshotSrc ? (
          <img
            src={screenshotSrc}
            alt={`Step ${currentStep.step_number}`}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-foreground/20">No screenshot</p>
          </div>
        )}
      </div>
      <div className="flex items-center shrink-0 border-t border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
            disabled={stepIndex <= 0}
            className="p-0.5 rounded text-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs tabular-nums text-foreground/50 whitespace-nowrap">
            <span className="font-medium text-foreground">{stepIndex + 1}</span>{' / '}{totalSteps}
          </span>
          <button
            onClick={() => setStepIndex(Math.min(totalSteps - 1, stepIndex + 1))}
            disabled={stepIndex >= totalSteps - 1}
            className="p-0.5 rounded text-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {currentStep && (currentStep.think_aloud || currentStep.action_type) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="ml-3 text-xs text-foreground/40 line-clamp-4 min-w-0">
                {currentStep.think_aloud || currentStep.action_type || ''}
              </p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm text-xs">
              {currentStep.think_aloud || currentStep.action_type || ''}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

const SEV_TEXT_COLOR: Record<string, string> = {
  critical: 'text-red-500',
  major: 'text-amber-500',
  minor: 'text-blue-400',
  enhancement: 'text-emerald-400',
};

const SEV_LABEL: Record<string, string> = {
  critical: 'Critical',
  major: 'Regular',
  minor: 'Minor',
  enhancement: 'Enhancement',
};

function GroupedIssueList({ issues }: { issues: IssueOut[] }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const groups = (['critical', 'major', 'minor', 'enhancement'] as const)
    .map((sev) => ({ severity: sev, items: issues.filter((i) => i.severity === sev) }))
    .filter((g) => g.items.length > 0);

  const toggleCollapse = (sev: string) =>
    setCollapsed((prev) => ({ ...prev, [sev]: !prev[sev] }));

  const toggleCheck = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (issues.length === 0) {
    return <p className="text-[14px] text-foreground/30 py-8 text-center">No issues found</p>;
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.severity] ?? false;
        return (
          <div key={group.severity}>
            <button
              onClick={() => toggleCollapse(group.severity)}
              className="flex items-center gap-2 mb-2"
            >
              <span className={cn('text-[14px] uppercase tracking-wider', SEV_TEXT_COLOR[group.severity])}>
                {SEV_LABEL[group.severity]}
              </span>
              <span className="text-[14px] text-foreground/20">{group.items.length}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 text-foreground/20 transition-transform', isCollapsed && '-rotate-90')} />
            </button>
            {!isCollapsed && (
              <div className="ml-4">
                {group.items.map((issue) => {
                  const isChecked = checked.has(issue.id);
                  return (
                    <div key={issue.id} className="flex items-start gap-2.5 py-[5px]">
                      <button
                        onClick={() => toggleCheck(issue.id)}
                        className={cn(
                          'mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          isChecked
                            ? 'border-foreground/30 bg-foreground/10'
                            : 'border-foreground/15 hover:border-foreground/30',
                        )}
                      >
                        {isChecked && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-foreground/50">
                            <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <p className={cn('text-[14px] text-foreground/70 leading-relaxed', isChecked && 'line-through text-foreground/30')}>
                        {issue.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StudyRunningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const deleteStudy = useDeleteStudy();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [runningTab, setRunningTab] = useState<RunningTab>('steps');
  const [browserStepIndex, setBrowserStepIndex] = useState<number | null>(null);
  const [completeTab, setCompleteTab] = useState<CompleteTab>('findings');
  const [findingsView, setFindingsView] = useState<'issues' | 'report'>('issues');


  const [browserMode, setBrowserMode] = useState<'local' | 'cloud'>('local');

  useEffect(() => {
    const stored = localStorage.getItem('miror-browser-mode');
    if (stored === 'cloud') setBrowserMode('cloud');
  }, []);

  const activeStudy = useStudyStore((s) => s.activeStudy);
  const allLogs = useStudyStore((s) => s.logs);

  // Filter logs: show global events (no session_id) + events matching selected persona
  const logs = selectedSessionId
    ? allLogs.filter((l) => !l.session_id || l.session_id === selectedSessionId)
    : allLogs;

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

  // Polling fallback: fetch steps from API when WS step_history is empty
  // but polling indicates steps have been recorded
  const wsStepCount = selectedSessionId ? (activeStudy?.personas[selectedSessionId]?.step_history?.length ?? 0) : 0;
  const polledStepNumber = selectedSessionId ? (liveState?.[selectedSessionId]?.step_number ?? 0) : 0;
  const needsStepFallback = wsStepCount === 0 && polledStepNumber > 0 && !!selectedSessionId;

  const { data: fallbackSteps } = useQuery({
    queryKey: ['fallback-steps', selectedSessionId],
    queryFn: () => api.listSteps(selectedSessionId!),
    refetchInterval: needsStepFallback ? 2000 : false,
    enabled: needsStepFallback,
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

  const { data: reportMarkdown } = useQuery({
    queryKey: ['report-md', id],
    queryFn: () => api.getReportMarkdown(id),
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
    if (!allStudies?.items) return studyName(study.url, 1);
    const normalize = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const studyNorm = normalize(study.url);
    const sameUrl = allStudies.items
      .filter((s) => normalize(s.url) === studyNorm)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const idx = sameUrl.findIndex((s) => s.id === id);
    return studyName(study.url, idx >= 0 ? idx + 1 : 1);
  })();

  // Auto-select first session
  useEffect(() => {
    if (!selectedSessionId && sessions && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  // Invalidate queries when study completes so results page gets fresh data
  useEffect(() => {
    if (study?.status === 'complete') {
      queryClient.invalidateQueries({ queryKey: ['study', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions', id] });
      queryClient.invalidateQueries({ queryKey: ['issues', id] });
      queryClient.invalidateQueries({ queryKey: ['insights', id] });
    }
  }, [study?.status, id, queryClient]);

  const isRunning = study?.status === 'running';
  const isAnalyzing = study?.status === 'analyzing';
  const isComplete = study?.status === 'complete';
  const isFailed = study?.status === 'failed';

  // Auto-switch to Log tab and inject error message when study fails
  const addLog = useStudyStore((s) => s.addLog);
  useEffect(() => {
    if (isFailed) {
      setRunningTab('log');
      const errorMsg = study?.error_message || activeStudy?.error || 'The test encountered an error and could not complete.';
      // Only add if not already present in logs
      const alreadyLogged = allLogs.some((l) => l.level === 'error' && l.message.includes(errorMsg));
      if (!alreadyLogged) {
        addLog('error', errorMsg);
      }
    }
  }, [isFailed]);

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
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/30">
        <BrowserIllustration />
        <p className="text-sm text-muted-foreground/50">
          {browserActive ? 'Loading browser' : 'Waiting to start'}
        </p>
      </div>
    );
  };

  const headerChips: HeaderChip[] = [];
  headerChips.push({
    label: 'Status',
    tooltip: 'Current test status',
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
          {isComplete ? 'Done' : isFailed ? 'Failed' : isAnalyzing ? 'Analyzing' : isRunning ? 'Running' : (() => {
            // Show granular phase during startup
            const phase = activeStudy?.phase;
            if (phase === 'provisioning_browser') return 'Launching browser...';
            if (phase === 'personas_ready') return 'Personas ready';
            if (phase === 'sitemap_ready') return 'Site mapped';
            if (phase === 'starting') return 'Starting...';
            return 'Starting...';
          })()}
        </span>
      </span>
    ),
  });
  if (isComplete && study?.updated_at) {
    const d = new Date(study.updated_at);
    const day = d.getDate();
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    headerChips.push({ label: 'Date', value: `${d.toLocaleDateString('en-US', { month: 'short' })} ${day}${suffix}, ${d.getFullYear()}`, tooltip: 'When this test completed' });
  } else {
    headerChips.push({
      label: 'Progress',
      tooltip: 'Overall test completion progress',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center gap-[3px]">
            {Array.from({ length: 10 }).map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  'inline-block w-[3px] h-[10px] rounded-full transition-colors duration-300',
                  idx < Math.round((percent / 100) * 10) ? 'bg-green-500' : 'bg-foreground/15',
                )}
              />
            ))}
          </span>
          <span>{percent}%</span>
        </span>
      ),
    });
  }
  {
    // Use started_at (when the study began running) if available, fall back to created_at
    const runtimeStart = study?.started_at ?? study?.created_at;
    if (runtimeStart) {
      headerChips.push({
        label: 'Runtime',
        value: (
          <RuntimeClock
            startedAt={runtimeStart}
            durationSeconds={study?.duration_seconds}
            isStopped={!!(isComplete || isFailed)}
          />
        ),
        tooltip: 'Elapsed time since the test started running',
      });
    }
  }
  {
    // Cost: persisted actual cost for completed studies.
    // During running: estimate from step count (~$0.02/step for LLM calls)
    // plus base overhead (~$0.10 for persona gen + synthesis + report).
    // WS cost from progress events used when available (more accurate).
    let costUsd: number;
    let costLabel: string;
    if (isComplete && study?.total_cost_usd != null) {
      costUsd = study.total_cost_usd;
      costLabel = 'Total API cost for this test';
    } else if ((activeStudy?.cost?.total_cost_usd ?? 0) > 0) {
      costUsd = activeStudy!.cost!.total_cost_usd;
      costLabel = 'Estimated cost (updates as LLM calls complete)';
    } else {
      // Estimate from step count when no WS cost data yet
      const totalSteps = Object.values(activeStudy?.personas ?? {}).reduce(
        (sum, p) => sum + (p.step_number ?? 0), 0,
      );
      const baseCost = 0.10; // persona gen + synthesis + report overhead
      const perStepCost = 0.02; // ~avg LLM cost per navigation step
      costUsd = totalSteps > 0 ? baseCost + totalSteps * perStepCost : 0;
      costLabel = totalSteps > 0
        ? `Estimated from ${totalSteps} steps (final cost calculated on completion)`
        : 'Cost will update as the test runs';
    }
    headerChips.push({
      label: 'Cost',
      value: <span className="tabular-nums">${costUsd.toFixed(2)}</span>,
      tooltip: costLabel,
    });
  }

  const headerRight = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            const params = new URLSearchParams();
            if (study?.url) params.set('url', study.url);
            if (study?.tasks && study.tasks.length > 0) {
              params.set('description', study.tasks.map((t) => t.description).join(', '));
            }
            if (study?.personas && study.personas.length > 0) {
              const templateIds = study.personas.map((p) => p.template_id).filter(Boolean) as string[];
              if (templateIds.length > 0) params.set('personas', templateIds.join(','));
            }
            router.push(`/study/new?${params.toString()}`);
          }}
        >
          <RotateCcw />
          Rerun test
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 />
          Delete test
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div>
      <PageHeaderBar
        icon={study?.url ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${new URL(study.url.startsWith('http') ? study.url : `https://${study.url}`).hostname}&sz=64`}
            alt=""
            className="h-5 w-5 rounded-sm"
          />
        ) : undefined}
        title={testName || 'Test results'}
        chips={headerChips}
        right={headerRight}
      />

      <div className="px-[100px] pt-[40px] pb-[100px]">
      {/* Study summary — big score hero + compact details */}
      <div className="flex gap-6 items-start pb-4">
        {/* Big score */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-border p-5 min-w-[100px]">
          {isComplete && study?.overall_score != null ? (
            <>
              <span className={cn('text-4xl font-bold tabular-nums', scoreColor(study.overall_score).text)}>
                {Math.round(study.overall_score)}
              </span>
              <span className={cn('text-xs font-medium uppercase tracking-wider mt-1', scoreColor(study.overall_score).text)}>
                {scoreLabel(study.overall_score)}
              </span>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 9 }).map((_, i) => {
                  const row = Math.floor(i / 3);
                  const col = i % 3;
                  return (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full bg-foreground/40"
                      style={{
                        animation: 'gridPulse 1.5s ease-in-out infinite',
                        animationDelay: `${(row + col) * 0.15}s`,
                      }}
                    />
                  );
                })}
              </div>
              <style>{`
                @keyframes gridPulse {
                  0%, 100% { transform: scale(0.5); opacity: 0.2; }
                  50% { transform: scale(1.2); opacity: 0.8; }
                }
              `}</style>
              <span className="text-xs font-medium uppercase tracking-wider mt-2 text-foreground/15">In progress</span>
            </>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 space-y-3">
          <div>
            {study?.tasks && study.tasks.length > 0 && (
              <p className="text-[16px] text-foreground">
                {study.tasks.map((task) => task.description.charAt(0).toUpperCase() + task.description.slice(1)).join(', ')}
              </p>
            )}
            {study?.url && (
              <p className="text-[14px] text-foreground/50 mt-0.5">
                {study.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </p>
            )}
          </div>

          {study?.executive_summary && (
            <p className="text-[14px] text-foreground/70 leading-relaxed">{study.executive_summary}</p>
          )}

          {isComplete && (
            <div className="flex items-center gap-3 text-[14px]">
              <span>
                <span className="text-foreground/40">Issues</span>
                <span className="font-medium text-foreground ml-1.5">{issues?.length ?? 0}</span>
              </span>
              <span className="text-foreground/20">·</span>
              <span>
                <span className="text-foreground/40">Completion</span>
                <span className="font-medium text-foreground ml-1.5">
                  {completeSessions
                    ? `${Math.round((completeSessions.filter((s) => s.task_completed).length / completeSessions.length) * 100)}%`
                    : '0%'}
                </span>
              </span>
              <span className="text-foreground/20">·</span>
              <span>
                <span className="text-foreground/40">Mood</span>
                <span className="font-medium text-foreground ml-1.5">
                  {(() => {
                    const allSessions = completeSessions ?? sessions ?? [];
                    const moods = allSessions.map((s) => {
                      if (s.emotional_arc) {
                        const entries = Object.entries(s.emotional_arc);
                        if (entries.length > 0) return entries[entries.length - 1][1];
                      }
                      if (s.status === 'gave_up') return 'frustrated';
                      if (s.status === 'failed') return 'confused';
                      if (s.status === 'complete') return 'satisfied';
                      return 'neutral';
                    });
                    if (moods.length === 0) return 'Neutral';
                    const scores: Record<string, number> = { frustrated: 1, stuck: 1, anxious: 2, confused: 2, neutral: 3, curious: 4, confident: 4, satisfied: 5, delighted: 5, excited: 5 };
                    const avg = moods.reduce((sum, m) => sum + (scores[m] ?? 3), 0) / moods.length;
                    if (avg >= 4.5) return 'Delighted';
                    if (avg >= 3.5) return 'Satisfied';
                    if (avg >= 2.5) return 'Neutral';
                    return 'Frustrated';
                  })()}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content — fixed two-column layout: persona cards + tabbed panel */}
      <div className="flex items-start gap-4 mt-1.5">
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
              <div className="border-b border-border bg-muted/30">
                <TabsList variant="line" className="px-3">
                  <TabsTrigger value="findings">Findings</TabsTrigger>
                  <TabsTrigger value="replay">Replay</TabsTrigger>
                  <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                </TabsList>
              </div>
              <div style={{ height: '460px' }}>
                <TabsContent value="findings" className="h-full m-0">
                  <div className="flex h-full flex-col">
                    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
                      <button
                        onClick={() => setFindingsView(findingsView === 'report' ? 'issues' : 'report')}
                        className="text-[14px] text-foreground/70 transition-colors hover:text-foreground/90"
                      >
                        {findingsView === 'report' ? 'See Issues' : 'See Full Report'}
                      </button>
                      <div className="flex-1" />
                      {/* Share actions */}
                      <div className="shrink-0">
                        <ReportActions studyId={id} markdownContent={reportMarkdown ?? undefined} />
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4">
                      {findingsView === 'report' ? (
                        <ReportPreview studyId={id} hideActions />
                      ) : (
                        <GroupedIssueList issues={issues ?? []} />
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="replay" className="h-full m-0">
                  {completeSessions && completeSessions.length > 0 ? (
                    <ReplayWithSteps sessionId={selectedSessionId ?? completeSessions[0].id} />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2">
                      <StepsIllustration />
                      <p className="text-[14px] text-muted-foreground/40">No sessions available</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="heatmap" className="h-full m-0">
                  <div className="h-full overflow-y-auto p-4">
                    <ClickHeatmap studyId={id} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <Tabs value={runningTab} onValueChange={(v) => setRunningTab(v as RunningTab)}>
              <div className="border-b border-border bg-muted/30">
                <TabsList variant="line" className="px-3">
                  <TabsTrigger value="steps">Steps</TabsTrigger>
                  <TabsTrigger value="browser">Browser</TabsTrigger>
                  <TabsTrigger value="log">Log</TabsTrigger>
                </TabsList>
              </div>
              <div style={{ height: '460px' }}>
                <TabsContent value="steps" className="h-full m-0">
                  <LiveStepTimeline steps={
                    (selectedPersona?.step_history?.length ?? 0) > 0
                      ? selectedPersona!.step_history
                      : fallbackSteps && fallbackSteps.length > 0
                        ? stepsToHistory(fallbackSteps)
                        : []
                  } />
                </TabsContent>
                <TabsContent value="browser" className="h-full m-0">
                  <BrowserWithSteps
                    selectedPersona={selectedPersona}
                    selectedPolled={selectedPolled}
                    selectedSessionId={selectedSessionId}
                    browserStepIndex={browserStepIndex}
                    setBrowserStepIndex={setBrowserStepIndex}
                    renderBrowserView={renderBrowserView}
                  />
                </TabsContent>
                <TabsContent value="log" className="h-full m-0">
                  <div className="h-full overflow-y-auto p-3 font-mono text-xs">
                    {logs.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2">
                        <LogIllustration />
                        <p className="text-muted-foreground/40">Waiting for logs</p>
                      </div>
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
