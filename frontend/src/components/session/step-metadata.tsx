'use client';

import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/common/progress-bar';
import type { StepOut } from '@/types';

interface StepMetadataProps {
  step: StepOut;
}

export function StepMetadata({ step }: StepMetadataProps) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        {step.action_type && (
          <Badge variant="outline" className="capitalize">{step.action_type}</Badge>
        )}
        {step.emotional_state && (
          <Badge variant="outline" className="capitalize">{step.emotional_state}</Badge>
        )}
      </div>

      {step.page_url && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Page</p>
          <p className="truncate text-xs">{step.page_url}</p>
        </div>
      )}

      {step.page_title && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Title</p>
          <p className="truncate text-xs">{step.page_title}</p>
        </div>
      )}

      {step.task_progress !== null && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Task Progress</p>
          <ProgressBar value={step.task_progress} showLabel className="mt-1" />
        </div>
      )}

      {step.confidence !== null && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Confidence</p>
          <p className="tabular-nums text-xs">{Math.round(step.confidence * 100)}%</p>
        </div>
      )}
    </div>
  );
}
