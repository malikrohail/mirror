'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  getScreencastClient,
  type ScreencastConnectionState,
} from '@/lib/screencast-client';

interface UseScreencastOptions {
  sessionId: string | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  enabled?: boolean;
}

interface UseScreencastResult {
  connectionState: ScreencastConnectionState;
  frameCount: number;
  hasReceivedFrame: boolean;
}

/**
 * React hook for receiving CDP screencast frames and rendering to a canvas.
 *
 * Uses createImageBitmap() for off-thread JPEG decode and drawImage()
 * for GPU-accelerated canvas rendering.
 */
export function useScreencast({
  sessionId,
  canvasRef,
  enabled = true,
}: UseScreencastOptions): UseScreencastResult {
  const [connectionState, setConnectionState] = useState<ScreencastConnectionState>('disconnected');
  const [frameCount, setFrameCount] = useState(0);
  const [hasReceivedFrame, setHasReceivedFrame] = useState(false);
  const frameCountRef = useRef(0);

  useEffect(() => {
    if (!sessionId || !enabled) return;

    const client = getScreencastClient();
    client.connect();

    const unsubState = client.onStateChange(setConnectionState);

    const unsubFrames = client.subscribe(sessionId, (blob: Blob) => {
      if (!canvasRef.current) return;

      createImageBitmap(blob)
        .then((bitmap) => {
          const canvas = canvasRef.current;
          if (!canvas) {
            bitmap.close();
            return;
          }

          // Resize canvas to match frame dimensions (only if changed)
          if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
          }

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(bitmap, 0, 0);
          }
          bitmap.close();

          frameCountRef.current++;
          if (frameCountRef.current === 1) {
            setHasReceivedFrame(true);
          }
          // Batch frame count updates (every 10 frames)
          if (frameCountRef.current % 10 === 0) {
            setFrameCount(frameCountRef.current);
          }
        })
        .catch(() => {
          // Silently ignore decode errors (e.g. truncated JPEG)
        });
    });

    return () => {
      unsubFrames();
      unsubState();
    };
  }, [sessionId, enabled, canvasRef]);

  return { connectionState, frameCount, hasReceivedFrame };
}
