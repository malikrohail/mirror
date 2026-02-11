'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: `${clamped}%`,
            transitionProperty: 'width',
            transitionDuration: '500ms',
            transitionTimingFunction: 'ease-out',
          }}
        />
      </div>
      {showLabel && (
        <span className="tabular-nums text-sm font-medium text-muted-foreground">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
