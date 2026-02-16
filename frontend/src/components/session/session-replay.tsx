'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useSessionDetail } from '@/hooks/use-session-replay';
import { usePersonaTemplates } from '@/hooks/use-personas';
import { useNarrationStatus, useGenerateNarration } from '@/hooks/use-narration';
import { getNarrationAudioUrl } from '@/lib/api-client';
import { ScreenshotViewer } from './screenshot-viewer';
import { StepControls } from './step-controls';
import { StepTimeline } from './step-timeline';
import { StepMetadata } from './step-metadata';
import { PersonaInfoPanel } from './persona-info-panel';
import { ThinkAloudBubble } from '@/components/common/think-aloud-bubble';
import { PageSkeleton } from '@/components/common/page-skeleton';
import { ErrorState } from '@/components/common/error-state';
import { EmptyState } from '@/components/common/empty-state';
import { StepsIllustration } from '@/components/common/empty-illustrations';
import { Button } from '@/components/ui/button';
import { AUTOPLAY_INTERVAL } from '@/lib/constants';
import type { EmotionalState } from '@/types';

interface SessionReplayProps {
  sessionId: string;
  initialStepNumber?: number;
}

export function SessionReplay({ sessionId, initialStepNumber }: SessionReplayProps) {
  const { data: session, isLoading, isError, error } = useSessionDetail(sessionId);
  const { data: templates } = usePersonaTemplates();
  const { data: narrationStatus } = useNarrationStatus(sessionId);
  const generateNarration = useGenerateNarration();
  const [currentStep, setCurrentStep] = useState(initialStepNumber ?? 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [narrationEnabled, setNarrationEnabled] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const totalSteps = session?.steps.length ?? 0;
  const step = session?.steps.find((s) => s.step_number === currentStep);
  // Template matching will need persona data from parent; pass first template as fallback
  const personaTemplate = templates?.[0] ?? null;

  const narrationReady = narrationStatus?.status === 'complete';
  const narrationGenerating = narrationStatus?.status === 'generating';

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

  const toggleNarration = useCallback(() => {
    if (!narrationReady && !narrationGenerating) {
      // Generate narration first, then enable
      generateNarration.mutate(sessionId);
      setNarrationEnabled(true);
      return;
    }
    setNarrationEnabled((prev) => !prev);
  }, [narrationReady, narrationGenerating, sessionId, generateNarration]);

  // Play narration audio when step changes and narration is enabled
  useEffect(() => {
    if (!narrationEnabled || !narrationReady) {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setIsAudioPlaying(false);
      }
      return;
    }

    // Stop previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsAudioPlaying(false);
    }

    // Only play if the current step has think-aloud text
    if (!step?.think_aloud) return;

    const audioUrl = getNarrationAudioUrl(sessionId, currentStep);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('playing', () => setIsAudioPlaying(true));
    audio.addEventListener('ended', () => {
      setIsAudioPlaying(false);
      // If autoplay is on, advance to next step when audio ends
      if (isPlaying && currentStep < totalSteps) {
        setCurrentStep((prev) => prev + 1);
      }
    });
    audio.addEventListener('error', () => {
      setIsAudioPlaying(false);
    });

    audio.play().catch(() => {
      // Browser may block autoplay without user interaction
      setIsAudioPlaying(false);
    });

    return () => {
      audio.pause();
      audio.removeEventListener('playing', () => setIsAudioPlaying(true));
      audio.removeEventListener('ended', () => setIsAudioPlaying(false));
      audio.removeEventListener('error', () => setIsAudioPlaying(false));
    };
  }, [currentStep, narrationEnabled, narrationReady, sessionId, step?.think_aloud]);

  // Autoplay — when narration is enabled and playing, let audio 'ended' event drive step advancement.
  // When narration is disabled or not ready, use the timer-based autoplay.
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // If narration is active, audio 'ended' callback handles advancement
    if (narrationEnabled && narrationReady) {
      // Don't use interval — audio end event drives progression
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, AUTOPLAY_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalSteps, narrationEnabled, narrationReady]);

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
        case 'n':
          e.preventDefault();
          toggleNarration();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, togglePlay, first, last, toggleNarration]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (isLoading) return <PageSkeleton />;
  if (isError || !session) {
    return <ErrorState title="Failed to load session" message={error?.message} />;
  }

  if (totalSteps === 0) {
    return (
      <EmptyState
        illustration={<StepsIllustration />}
        title="No steps recorded"
        description="This session has no navigation steps yet. Steps will appear here once the persona starts navigating."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <ScreenshotViewer screenshotPath={step?.screenshot_path ?? null} />
        <div className="flex items-center justify-center gap-2">
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
          <NarrationToggle
            narrationEnabled={narrationEnabled}
            narrationReady={narrationReady}
            narrationGenerating={narrationGenerating || generateNarration.isPending}
            isAudioPlaying={isAudioPlaying}
            onToggle={toggleNarration}
          />
        </div>
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

// ── Narration Toggle Button ────────────────────────────

interface NarrationToggleProps {
  narrationEnabled: boolean;
  narrationReady: boolean;
  narrationGenerating: boolean;
  isAudioPlaying: boolean;
  onToggle: () => void;
}

function NarrationToggle({
  narrationEnabled,
  narrationReady,
  narrationGenerating,
  isAudioPlaying,
  onToggle,
}: NarrationToggleProps) {
  const getLabel = () => {
    if (narrationGenerating) return 'Generating voice...';
    if (narrationEnabled && narrationReady) return 'Narration on';
    if (narrationEnabled && !narrationReady) return 'Waiting for narration...';
    return 'Enable narration';
  };

  const getIcon = () => {
    if (narrationGenerating) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (narrationEnabled && narrationReady) {
      return isAudioPlaying
        ? <Volume2 className="h-4 w-4 text-blue-500" />
        : <Volume2 className="h-4 w-4" />;
    }
    if (narrationEnabled) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return <VolumeX className="h-4 w-4" />;
  };

  return (
    <Button
      variant={narrationEnabled && narrationReady ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      disabled={narrationGenerating}
      title={`${getLabel()} (N)`}
      className="ml-2 gap-1.5"
    >
      {getIcon()}
      <span className="hidden sm:inline">{narrationEnabled && narrationReady ? 'Narration' : 'Narrate'}</span>
    </Button>
  );
}
