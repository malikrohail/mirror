'use client';

import { useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface LiveBrowserViewProps {
  liveViewUrl: string | null;
  browserActive: boolean;
  personaName: string;
  screenshotUrl?: string;
}

export function LiveBrowserView({
  liveViewUrl,
  browserActive,
  personaName,
  screenshotUrl,
}: LiveBrowserViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const prevSrcRef = useRef<string>('');

  // Preload new screenshot before swapping — prevents white flash between frames
  useEffect(() => {
    if (!screenshotUrl || screenshotUrl === prevSrcRef.current) return;
    const img = new Image();
    img.onload = () => {
      if (imgRef.current) {
        imgRef.current.src = screenshotUrl;
        prevSrcRef.current = screenshotUrl;
      }
    };
    img.src = screenshotUrl;
  }, [screenshotUrl]);

  // Browser session ended
  if (!browserActive && !screenshotUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-md border bg-muted/30">
        <div className="text-center">
          <p className="text-sm font-medium">Session ended</p>
          <p className="text-xs text-muted-foreground">
            {personaName} has finished navigating
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-md border">
      {screenshotUrl ? (
        <img
          ref={imgRef}
          src={prevSrcRef.current || screenshotUrl}
          alt={`${personaName} – live screenshot`}
          className="aspect-video w-full object-cover object-top"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-muted/20">
          <p className="text-xs text-muted-foreground">Waiting for first screenshot...</p>
        </div>
      )}

      {/* LIVE badge */}
      {browserActive && (
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          <span className="text-xs font-medium text-white">LIVE</span>
        </div>
      )}

      {/* Watch Live link — opens BB live view in new tab */}
      {liveViewUrl && browserActive && (
        <a
          href={liveViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-black/80"
        >
          <ExternalLink className="h-3 w-3" />
          Watch Live
        </a>
      )}
    </div>
  );
}
