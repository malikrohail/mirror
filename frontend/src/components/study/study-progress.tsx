'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api-client';
import { ProgressBar } from '@/components/common/progress-bar';
import { PersonaProgressCard } from './persona-progress-card';
import { ErrorState } from '@/components/common/error-state';
import { PageSkeleton } from '@/components/common/page-skeleton';
import type { PersonaTemplateOut } from '@/types';

interface StudyProgressProps {
  studyId: string;
}

export function StudyProgress({ studyId }: StudyProgressProps) {
  const router = useRouter();
  const redirected = useRef(false);

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
    queryFn: () => api.listSessions(studyId),
    refetchInterval: 2000,
    enabled: !!studyId && (study?.status === 'running' || study?.status === 'analyzing'),
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

  // Calculate progress from sessions
  const totalSessions = sessions?.length ?? 0;
  const completedSessions = sessions?.filter((s) => s.status === 'complete' || s.status === 'failed').length ?? 0;
  const percent = isComplete
    ? 100
    : isAnalyzing
      ? 90
      : totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 80)
        : 0;

  // Redirect on complete
  useEffect(() => {
    if ((isComplete || isFailed) && !redirected.current) {
      redirected.current = true;
      const timer = setTimeout(() => {
        router.push(`/study/${studyId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, isFailed, studyId, router]);

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
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        <div>
          <h2 className="text-lg font-semibold">
            {isComplete ? 'Test Complete!' : isAnalyzing ? 'Analyzing Results...' : 'Running Test...'}
          </h2>
          {phase && (
            <p className="text-sm capitalize text-muted-foreground">
              Phase: {phase}
            </p>
          )}
        </div>
      </div>

      <ProgressBar value={percent} showLabel />

      {isComplete && study && (
        <div className="rounded-lg border bg-green-50 p-4 dark:bg-green-950">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Score: {study.overall_score != null ? Math.round(study.overall_score) : '—'}/100
          </p>
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
            {sessions.map((session: any) => {
              const persona = study?.personas.find((p) => p.id === session.persona_id);
              const template = persona ? templateMap.get(persona.template_id) : null;
              const personaName = template?.name ?? 'Tester';
              const sessionComplete = session.status === 'complete' || session.status === 'failed';
              const stepCount = session.total_steps || 0;

              return (
                <PersonaProgressCard
                  key={session.id}
                  personaName={personaName}
                  stepNumber={stepCount}
                  totalSteps={stepCount}
                  thinkAloud={session.current_think_aloud ?? session.summary ?? 'Starting...'}
                  screenshotUrl=""
                  emotionalState={session.current_emotional_state ?? (sessionComplete ? 'satisfied' : 'curious')}
                  action={session.current_action ?? (sessionComplete ? 'done' : 'navigating')}
                  taskProgress={session.current_task_progress ?? (sessionComplete ? 100 : 0)}
                  completed={sessionComplete}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
