'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSessionDetail } from '@/hooks/use-session-replay';
import { usePersonaTemplates } from '@/hooks/use-personas';
import { ScreenshotViewer } from './screenshot-viewer';
import { StepControls } from './step-controls';
import { StepTimeline } from './step-timeline';
import { StepMetadata } from './step-metadata';
import { PersonaInfoPanel } from './persona-info-panel';
import { ThinkAloudBubble } from '@/components/common/think-aloud-bubble';
import { PageSkeleton } from '@/components/common/page-skeleton';
import { ErrorState } from '@/components/common/error-state';
import { AUTOPLAY_INTERVAL } from '@/lib/constants';
import type { EmotionalState } from '@/types';

interface SessionReplayProps {
  sessionId: string;
  initialStepNumber?: number;
}

export function SessionReplay({ sessionId, initialStepNumber }: SessionReplayProps) {
  const { data: session, isLoading, isError, error } = useSessionDetail(sessionId);
  const { data: templates } = usePersonaTemplates();
  const [currentStep, setCurrentStep] = useState(initialStepNumber ?? 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSteps = session?.steps.length ?? 0;
  const step = session?.steps.find((s) => s.step_number === currentStep);
  // Template matching will need persona data from parent; pass first template as fallback
  const personaTemplate = templates?.[0] ?? null;

  const goTo = useCallback((n: number) => {
    setCurrentStep(Math.max(1, Math.min(n, totalSteps)));
  }, [totalSteps]);

  const next = useCallback(() => goTo(currentStep + 1), [currentStep, goTo]);
  const prev = useCallback(() => goTo(currentStep - 1), [currentStep, goTo]);
  const first = useCallback(() => goTo(1), [goTo]);
  const last = useCallback(() => goTo(totalSteps), [goTo, totalSteps]);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  // Autoplay
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= totalSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, AUTOPLAY_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalSteps]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          prev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          next();
          break;
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'Home':
          e.preventDefault();
          first();
          break;
        case 'End':
          e.preventDefault();
          last();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, togglePlay, first, last]);

  if (isLoading) return <PageSkeleton />;
  if (isError || !session) {
    return <ErrorState title="Failed to load session" message={error?.message} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <ScreenshotViewer screenshotPath={step?.screenshot_path ?? null} />
        <StepControls
          currentStep={currentStep}
          totalSteps={totalSteps}
          isPlaying={isPlaying}
          onPrev={prev}
          onNext={next}
          onFirst={first}
          onLast={last}
          onTogglePlay={togglePlay}
        />
        {step?.think_aloud && (
          <ThinkAloudBubble
            text={step.think_aloud}
            emotionalState={step.emotional_state as EmotionalState}
          />
        )}
      </div>

      <div className="space-y-4">
        <PersonaInfoPanel session={session} template={personaTemplate} />
        {step && <StepMetadata step={step} />}
        <StepTimeline
          steps={session.steps}
          currentStep={currentStep}
          onStepClick={goTo}
        />
      </div>
    </div>
  );
}
