'use client';

import { cn } from '@/lib/utils';
import { EMOTION_ICONS } from '@/lib/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { StepOut, EmotionalState } from '@/types';

interface StepTimelineProps {
  steps: StepOut[];
  currentStep: number;
  onStepClick: (stepNumber: number) => void;
}

export function StepTimeline({ steps, currentStep, onStepClick }: StepTimelineProps) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-1 pr-4">
        {steps.map((step) => (
          <button
            key={step.step_number}
            onClick={() => onStepClick(step.step_number)}
            className={cn(
              'flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm',
              'hover:bg-accent',
              currentStep === step.step_number && 'bg-accent',
            )}
          >
            <span className="tabular-nums shrink-0 text-xs text-muted-foreground">
              {step.step_number}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                {step.emotional_state && (
                  <span className="text-xs">
                    {EMOTION_ICONS[step.emotional_state as EmotionalState]}
                  </span>
                )}
                <span className="truncate text-xs font-medium capitalize">
                  {step.action_type ?? 'action'}
                </span>
              </div>
              {step.think_aloud && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {step.think_aloud}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
