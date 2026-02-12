'use client';

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span>Low</span>
      <div
        className="h-3 w-24 rounded-full"
        style={{
          background: 'linear-gradient(to right, rgba(255,255,0,0.3), rgba(255,165,0,0.6), rgba(255,0,0,0.9))',
        }}
      />
      <span>High</span>
    </div>
  );
}
