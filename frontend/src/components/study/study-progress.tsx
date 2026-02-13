'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/common/progress-bar';
import { PersonaProgressCard } from './persona-progress-card';
import { ErrorState } from '@/components/common/error-state';
import { PageSkeleton } from '@/components/common/page-skeleton';
import { useWebSocket } from '@/hooks/use-websocket';
import { useStudyStore } from '@/stores/study-store';
import type { LogEntry } from '@/stores/study-store';
import type { PersonaTemplateOut, SessionOut } from '@/types';

interface StudyProgressProps {
  studyId: string;
}

type SessionProgress = SessionOut & {
  current_think_aloud?: string | null;
  current_emotional_state?: string | null;
  current_action?: string | null;
  current_task_progress?: number | null;
  live_view_url?: string | null;
  browser_active?: boolean | null;
};

export function StudyProgress({ studyId }: StudyProgressProps) {
  const router = useRouter();
  const redirected = useRef(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const initStudy = useStudyStore((s) => s.initStudy);
  const activeStudy = useStudyStore((s) => s.activeStudy);
  const logs = useStudyStore((s) => s.logs);

  useEffect(() => {
    initStudy(studyId);
  }, [studyId, initStudy]);

  // Connect WebSocket and subscribe to live updates
  useWebSocket(studyId);

  // Poll study every 2s
  const { data: study, isLoading, isError, error } = useQuery({
    queryKey: ['study-progress', studyId],
    queryFn: () => api.getStudy(studyId),
    refetchInterval: 2000,
    enabled: !!studyId,
  });

  // Poll sessions every 2s while running or analyzing
  const { data: sessions } = useQuery({
    queryKey: ['sessions-progress', studyId],
    queryFn: async () => (await api.listSessions(studyId)) as SessionProgress[],
    refetchInterval: 2000,
    enabled: !!studyId && (study?.status === 'running' || study?.status === 'analyzing'),
  });

  // Poll live state every 1.5s — reliable fallback for WebSocket
  const { data: liveState } = useQuery({
    queryKey: ['live-state', studyId],
    queryFn: () => api.getLiveState(studyId),
    refetchInterval: 1500,
    enabled: !!studyId && study?.status === 'running',
  });

  // Get persona templates for names
  const { data: templates } = useQuery({
    queryKey: ['persona-templates'],
    queryFn: () => api.listPersonaTemplates(),
  });

  const templateMap = new Map<string, PersonaTemplateOut>();
  templates?.forEach((t) => templateMap.set(t.id, t));

  const isComplete = study?.status === 'complete';
  const isFailed = study?.status === 'failed';
  const isAnalyzing = study?.status === 'analyzing';
  const isRunning = study?.status === 'running';

  // Calculate progress from sessions (factor in per-session step progress)
  const totalSessions = sessions?.length ?? 0;
  const completedSessions = sessions?.filter((s) => s.status === 'complete' || s.status === 'failed').length ?? 0;
  const maxSteps = 30; // MAX_STEPS_PER_SESSION
  const sessionProgress = sessions?.reduce((sum, s) => {
    if (s.status === 'complete' || s.status === 'failed') return sum + 1;
    const ws = activeStudy?.personas[s.id];
    const polled = liveState?.[s.id];
    const step = ws?.step_number ?? polled?.step_number ?? s.total_steps ?? 0;
    return sum + Math.min(step / maxSteps, 0.95);
  }, 0) ?? 0;
  const percent = isComplete
    ? 100
    : isAnalyzing
      ? 90
      : totalSessions > 0
        ? Math.round((sessionProgress / totalSessions) * 80)
        : 0;

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logsOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, logsOpen]);

  // Redirect on complete (not on failure — keep logs visible)
  useEffect(() => {
    if (isComplete && !isFailed && !redirected.current) {
      redirected.current = true;
      const timer = setTimeout(() => {
        router.push(`/study/${studyId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, isFailed, studyId, router]);

  // Auto-expand logs on failure
  useEffect(() => {
    if (isFailed) {
      setLogsOpen(true);
    }
  }, [isFailed]);

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="Failed to load test"
        message={error?.message}
        onRetry={() => router.push(`/study/${studyId}`)}
      />
    );
  }

  const phase = isAnalyzing ? 'analyzing' : isRunning ? 'navigating' : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {isComplete && !isFailed ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : isFailed ? (
          <XCircle className="h-5 w-5 text-red-500" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        <div>
          <h2 className="text-lg font-semibold">
            {isFailed ? 'Test Failed' : isComplete ? 'Test Complete!' : isAnalyzing ? 'Analyzing Results...' : 'Running Test...'}
          </h2>
          {isFailed ? (
            <p className="text-sm text-red-500">
              Something went wrong — check the log below for details
            </p>
          ) : phase ? (
            <p className="text-sm capitalize text-muted-foreground">
              Phase: {phase}
            </p>
          ) : null}
        </div>
      </div>

      <ProgressBar value={percent} showLabel />

      {isFailed && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            {activeStudy?.error || 'The test encountered an error and could not complete.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto shrink-0"
            onClick={() => router.push('/tests')}
          >
            Back to tests
          </Button>
        </div>
      )}

      {isComplete && !isFailed && study && (
        <div className="rounded-lg border bg-green-50 p-4 dark:bg-green-950">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Score: {study.overall_score != null ? Math.round(study.overall_score) : '—'}/100
            </p>
            {/* Cost breakdown (Iteration 4) */}
            {activeStudy?.cost && (
              <div className="flex items-center gap-3 text-xs text-green-600 dark:text-green-400">
                <span>Cost: ${activeStudy.cost.total_cost_usd.toFixed(4)}</span>
                <span>({activeStudy.cost.llm_api_calls} API calls)</span>
                {activeStudy.cost.savings_vs_cloud_usd > 0 && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900 dark:text-green-300">
                    Saved ${activeStudy.cost.savings_vs_cloud_usd.toFixed(4)} vs cloud
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            Redirecting to results...
          </p>
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Tester Progress ({completedSessions}/{totalSessions})
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {sessions.map((session) => {
              const persona = study?.personas.find((p) => p.id === session.persona_id);
              const template = persona?.template_id ? templateMap.get(persona.template_id) : null;
              const personaName = template?.name ?? 'Tester';
              const sessionComplete = session.status === 'complete' || session.status === 'failed';
              const stepCount = session.total_steps || 0;

              // Overlay live data: polled state (reliable) > WebSocket (fast) > DB session
              const ws = activeStudy?.personas[session.id];
              const polled = liveState?.[session.id];
              // Polled action may be object or string
              const polledAction = polled?.action;
              const polledActionStr =
                typeof polledAction === 'string'
                  ? polledAction
                  : (polledAction as Record<string, string>)?.type ?? undefined;

              return (
                <PersonaProgressCard
                  key={session.id}
                  personaName={ws?.persona_name || polled?.persona_name || personaName}
                  stepNumber={ws?.step_number ?? polled?.step_number ?? stepCount}
                  totalSteps={ws?.total_steps ?? polled?.total_steps ?? stepCount}
                  thinkAloud={ws?.think_aloud ?? polled?.think_aloud ?? session.current_think_aloud ?? session.summary ?? 'Starting...'}
                  screenshotUrl={ws?.screenshot_url ?? polled?.screenshot_url ?? ''}
                  emotionalState={ws?.emotional_state ?? polled?.emotional_state ?? session.current_emotional_state ?? (sessionComplete ? 'satisfied' : 'curious')}
                  action={ws?.action ?? polledActionStr ?? session.current_action ?? (sessionComplete ? 'done' : 'navigating')}
                  taskProgress={ws?.task_progress ?? polled?.task_progress ?? session.current_task_progress ?? (sessionComplete ? 100 : 0)}
                  completed={ws?.completed ?? polled?.completed ?? sessionComplete}
                  liveViewUrl={ws?.live_view_url ?? polled?.live_view_url ?? session.live_view_url ?? null}
                  browserActive={ws?.browser_active ?? polled?.browser_active ?? session.browser_active ?? !sessionComplete}
                  screencastAvailable={ws?.screencast_available ?? false}
                  sessionId={session.id}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Technical Log */}
      <div className="rounded-lg border border-border bg-card">
        <button
          type="button"
          onClick={() => setLogsOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Terminal className="h-4 w-4" />
          <span>Log</span>
          <span className="ml-1 text-xs tabular-nums text-muted-foreground/60">({logs.length})</span>
          {logsOpen ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
        </button>
        {logsOpen && (
          <div className="max-h-64 overflow-y-auto border-t border-border bg-zinc-950 px-4 py-2 font-mono text-xs">
            {logs.length === 0 && (
              <p className="py-2 text-zinc-500">Waiting for events…</p>
            )}
            {logs.map((entry, i) => (
              <div key={i} className="flex gap-2 py-0.5 leading-5">
                <span className="shrink-0 text-zinc-500">
                  {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={
                  entry.level === 'error' ? 'text-red-400' :
                  entry.level === 'warn' ? 'text-yellow-400' :
                  'text-zinc-300'
                }>
                  {entry.message}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
