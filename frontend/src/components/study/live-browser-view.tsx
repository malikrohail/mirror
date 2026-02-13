'use client';

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

  // Show live screenshot with optional "Watch Live" link
  return (
    <div className="relative overflow-hidden rounded-md border">
      {screenshotUrl ? (
        <img
          src={screenshotUrl}
          alt={`${personaName} – live screenshot`}
          className="aspect-video w-full object-cover object-top"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-muted/20">
          <p className="text-xs text-muted-foreground">Waiting for first screenshot...</p>
        </div>
      )}
      {browserActive && (
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          <span className="text-xs font-medium text-white">LIVE</span>
        </div>
      )}
      {liveViewUrl && browserActive && (
        <a
          href={liveViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-black/80"
        >
          Watch Live
        </a>
      )}
    </div>
  );
}
