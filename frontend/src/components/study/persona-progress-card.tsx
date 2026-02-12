'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/common/progress-bar';
import { ThinkAloudBubble } from '@/components/common/think-aloud-bubble';
import { EMOTION_ICONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import type { EmotionalState } from '@/types';

interface PersonaProgressCardProps {
  personaName: string;
  stepNumber: number;
  totalSteps: number;
  thinkAloud: string;
  screenshotUrl: string;
  emotionalState: string;
  action: string;
  taskProgress: number;
  completed: boolean;
}

export function PersonaProgressCard({
  personaName,
  stepNumber,
  thinkAloud,
  emotionalState,
  action,
  taskProgress,
  completed,
}: PersonaProgressCardProps) {
  return (
    <Card className={completed ? 'opacity-75' : ''}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {EMOTION_ICONS[emotionalState as EmotionalState] ?? '🤔'}
            </span>
            <span className="text-sm font-medium">{personaName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {action}
            </Badge>
            <span className="tabular-nums text-xs text-muted-foreground">
              Step {stepNumber}
            </span>
          </div>
        </div>

        <ProgressBar value={taskProgress} showLabel />

        {thinkAloud && (
          <ThinkAloudBubble
            text={thinkAloud}
            emotionalState={emotionalState as EmotionalState}
          />
        )}

        {completed && (
          <p className="text-xs font-medium text-green-600 dark:text-green-400">
            Completed
          </p>
        )}
      </CardContent>
    </Card>
  );
}
