'use client';

import { ChevronLeft, ChevronRight, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepControlsProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFirst: () => void;
  onLast: () => void;
  onTogglePlay: () => void;
}

export function StepControls({
  currentStep,
  totalSteps,
  isPlaying,
  onPrev,
  onNext,
  onFirst,
  onLast,
  onTogglePlay,
}: StepControlsProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onFirst}
        disabled={currentStep <= 1}
        aria-label="First step"
      >
        <SkipBack className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        disabled={currentStep <= 1}
        aria-label="Previous step"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Pause autoplay' : 'Start autoplay'}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={currentStep >= totalSteps}
        aria-label="Next step"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onLast}
        disabled={currentStep >= totalSteps}
        aria-label="Last step"
      >
        <SkipForward className="h-4 w-4" />
      </Button>
      <span className="ml-2 tabular-nums text-sm text-muted-foreground">
        {currentStep} / {totalSteps}
      </span>
    </div>
  );
}
