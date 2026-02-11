'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { HeatmapDataPoint } from '@/types';

interface HeatmapOverlayProps {
  dataPoints: HeatmapDataPoint[];
  width: number;
  height: number;
}

export function HeatmapOverlay({ dataPoints, width, height }: HeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    // Draw each click as a radial gradient
    dataPoints.forEach((point) => {
      const scaleX = width / (point.viewport_width || width);
      const scaleY = height / (point.viewport_height || height);
      const x = point.click_x * scaleX;
      const y = point.click_y * scaleY;
      const radius = 30;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.4)');
      gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    });

    // Apply gaussian-like blur via multiple passes
    ctx.filter = 'blur(8px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
  }, [dataPoints, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      style={{ width, height }}
    />
  );
}
