'use client';

import { useRef, useState, useCallback } from 'react';
import { useScreencast } from '@/hooks/use-screencast';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2 } from 'lucide-react';

interface ScreencastViewerProps {
  sessionId: string;
  browserActive: boolean;
  personaName: string;
  screenshotUrl?: string;
  currentStepNumber?: number;
  totalSteps?: number;
}

type PlaybackSpeed = 0.5 | 1 | 2;

export function ScreencastViewer({
  sessionId,
  browserActive,
  personaName,
  screenshotUrl,
  currentStepNumber,
  totalSteps,
}: ScreencastViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { hasReceivedFrame, frameCount, connectionState } = useScreencast({
    sessionId,
    canvasRef,
    enabled: browserActive && !isPaused,
  });

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => {
      if (prev === 0.5) return 1;
      if (prev === 1) return 2;
      return 0.5;
    });
  }, []);

  // Session ended
  if (!browserActive && !hasReceivedFrame && !screenshotUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-md bg-muted/30">
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
    <div ref={containerRef} className="relative overflow-hidden rounded-md group">
      {/* Canvas for screencast frames */}
      <canvas
        ref={canvasRef}
        className={`aspect-video w-full object-contain ${hasReceivedFrame ? '' : 'hidden'}`}
      />

      {/* Fallback: static screenshot until first frame arrives */}
      {!hasReceivedFrame && (
        screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt={`${personaName} – live screenshot`}
            className="aspect-video w-full object-cover object-top"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Waiting for first frame...
            </p>
          </div>
        )
      )}

      {/* LIVE indicator */}
      {browserActive && hasReceivedFrame && (
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          <span className="text-xs font-medium text-white">LIVE</span>
        </div>
      )}

      {/* Connection state indicator */}
      {browserActive && connectionState === 'connecting' && (
        <div className="absolute right-2 top-2 rounded-full bg-yellow-500/90 px-2.5 py-1">
          <span className="text-xs font-medium text-white">Connecting...</span>
        </div>
      )}

      {/* Step sync indicator (Iteration 3) */}
      {currentStepNumber !== undefined && totalSteps !== undefined && totalSteps > 0 && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1">
          <span className="text-xs font-medium text-white">
            Step {currentStepNumber}/{totalSteps}
          </span>
        </div>
      )}

      {/* Playback controls toolbar (Iteration 3) */}
      {hasReceivedFrame && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100">
          {/* Play/Pause */}
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>

          {/* Speed control */}
          <button
            onClick={cycleSpeed}
            className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
            title="Playback speed"
          >
            {playbackSpeed}x
          </button>

          {/* Frame counter */}
          <span className="text-xs text-white/70">
            {frameCount} frames
          </span>

          <div className="flex-1" />

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {/* Session ended overlay */}
      {!browserActive && hasReceivedFrame && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <p className="rounded bg-black/60 px-3 py-1 text-sm font-medium text-white">
            Session ended
          </p>
        </div>
      )}
    </div>
  );
}
