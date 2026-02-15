'use client';

import { getScreenshotUrl } from '@/lib/api-client';

interface LiveScreenshotProps {
  screenshotUrl: string | null;
  alt?: string;
}

export function LiveScreenshot({ screenshotUrl, alt = 'Live screenshot' }: LiveScreenshotProps) {
  if (!screenshotUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">Waiting for screenshot</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getScreenshotUrl(screenshotUrl)}
        alt={alt}
        className="h-auto w-full"
        loading="lazy"
      />
    </div>
  );
}
