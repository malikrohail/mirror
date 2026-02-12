'use client';

import { useState, useCallback } from 'react';
import { getScreenshotUrl } from '@/lib/api-client';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

interface ScreenshotViewerProps {
  screenshotPath: string | null;
  alt?: string;
}

export function ScreenshotViewer({ screenshotPath, alt = 'Step screenshot' }: ScreenshotViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const handleLoad = useCallback(() => setLoaded(true), []);

  if (!screenshotPath) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">No screenshot available</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={screenshotPath}
        src={getScreenshotUrl(screenshotPath)}
        alt={alt}
        onLoad={handleLoad}
        className={cn(
          'h-auto w-full',
          !prefersReducedMotion && 'transition-opacity duration-200 ease-out',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
