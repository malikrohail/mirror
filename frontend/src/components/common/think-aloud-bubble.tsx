'use client';

import { cn } from '@/lib/utils';
import { EMOTION_ICONS } from '@/lib/constants';
import type { EmotionalState } from '@/types';

interface ThinkAloudBubbleProps {
  text: string;
  emotionalState?: EmotionalState | null;
  className?: string;
}

export function ThinkAloudBubble({ text, emotionalState, className }: ThinkAloudBubbleProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg border bg-card p-3 text-sm text-card-foreground',
        className,
      )}
    >
      {emotionalState && (
        <span className="mb-1 mr-2 inline-block text-base" aria-label={emotionalState}>
          {EMOTION_ICONS[emotionalState]}
        </span>
      )}
      <span className="italic">&ldquo;{text}&rdquo;</span>
    </div>
  );
}
