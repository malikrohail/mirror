'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api-client';
import { PersonaProgressCard } from './persona-progress-card';
import { ErrorState } from '@/components/common/error-state';
import { PageSkeleton } from '@/components/common/page-skeleton';
import { useWebSocket } from '@/hooks/use-websocket';
import { useStudyStore } from '@/stores/study-store';
import { withResolvedPersonaAvatar } from '@/config/persona-avatars';
import type { PersonaTemplateOut, SessionOut } from '@/types';

interface StudyProgressProps {
  studyId: string;
  hideLabel?: boolean;
  selectedSessionId?: string | null;
  onSelectSession?: (id: string) => void;
}

type SessionProgress = SessionOut & {
  current_think_aloud?: string | null;
  current_emotional_state?: string | null;
  current_action?: string | null;
  current_task_progress?: number | null;
  live_view_url?: string | null;
  browser_active?: boolean | null;
};

export function StudyProgress({ studyId, hideLabel, selectedSessionId, onSelectSession }: StudyProgressProps) {
  const initStudy = useStudyStore((s) => s.initStudy);
  const activeStudy = useStudyStore((s) => s.activeStudy);


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

  // Poll sessions — every 2s while running/analyzing, once when complete
  const isActive = study?.status === 'running' || study?.status === 'analyzing';
  const { data: sessions } = useQuery({
    queryKey: ['sessions-progress', studyId],
    queryFn: async () => (await api.listSessions(studyId)) as SessionProgress[],
    refetchInterval: isActive ? 2000 : false,
    enabled: !!studyId && (isActive || study?.status === 'complete' || study?.status === 'failed'),
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
    queryFn: async () => {
      const personaTemplates = await api.listPersonaTemplates();
      return personaTemplates.map(withResolvedPersonaAvatar);
    },
  });

  const templateMap = new Map<string, PersonaTemplateOut>();
  templates?.forEach((t) => templateMap.set(t.id, t));

  const isFailed = study?.status === 'failed';
  const studyDone = study?.status === 'complete' || study?.status === 'failed';


  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="Failed to load test"
        message={error?.message}
      />
    );
  }

  return (
    <div className="space-y-3">

      {sessions && sessions.length > 0 && (
        <div className="space-y-3">
          {!hideLabel && <p className="text-[14px] uppercase text-foreground/30">Testers</p>}
          <div className="space-y-3">
            {sessions.map((session) => {
              const persona = study?.personas.find((p) => p.id === session.persona_id);
              const template = persona?.template_id ? templateMap.get(persona.template_id) : null;
              const personaName = template?.name ?? 'Tester';
              const personaAvatarUrl = template?.avatar_url ?? null;
              const personaDescription = template?.short_description ?? null;
              const personaProfile = template?.default_profile ?? null;
              const sessionComplete = session.status !== 'pending' && session.status !== 'running';
              const stepCount = session.total_steps || 0;

              // Overlay live data: polled state (reliable) > WebSocket (fast) > DB session
              // Skip live overlay when study is done — trust DB session data
              const ws = studyDone ? undefined : activeStudy?.personas[session.id];
              const polled = studyDone ? undefined : liveState?.[session.id];
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
                  personaAvatarUrl={personaAvatarUrl}
                  personaDescription={personaDescription}
                  personaProfile={personaProfile}
                  stepNumber={ws?.step_number ?? polled?.step_number ?? stepCount}
                  totalSteps={ws?.total_steps ?? polled?.total_steps ?? stepCount}
                  thinkAloud={ws?.think_aloud ?? polled?.think_aloud ?? session.current_think_aloud ?? session.summary ?? 'Starting...'}
                  screenshotUrl={ws?.screenshot_url ?? polled?.screenshot_url ?? ''}
                  emotionalState={ws?.emotional_state ?? polled?.emotional_state ?? session.current_emotional_state ?? (session.status === 'gave_up' ? 'frustrated' : session.status === 'failed' ? 'confused' : sessionComplete ? 'satisfied' : 'curious')}
                  action={ws?.action ?? polledActionStr ?? session.current_action ?? (sessionComplete ? 'done' : 'navigating')}
                  taskProgress={ws?.task_progress ?? polled?.task_progress ?? session.current_task_progress ?? (sessionComplete ? 100 : 0)}
                  completed={ws?.completed ?? polled?.completed ?? sessionComplete}
                  sessionStatus={session.status}
                  liveViewUrl={ws?.live_view_url ?? polled?.live_view_url ?? session.live_view_url ?? null}
                  browserActive={ws?.browser_active ?? polled?.browser_active ?? session.browser_active ?? !sessionComplete}
                  screencastAvailable={ws?.screencast_available ?? false}
                  sessionId={session.id}
                  selected={selectedSessionId === session.id}
                  onSelect={() => onSelectSession?.(session.id)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
