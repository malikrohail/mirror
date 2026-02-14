'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, AlertTriangle, GripVertical, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { API_BASE } from '@/lib/constants';

interface FixPreviewProps {
  issueId: string;
  studyId: string;
  fixCode: string;
  fixLanguage: string;
  pageUrl: string;
}

interface FixPreviewResponse {
  success: boolean;
  before_url: string | null;
  after_url: string | null;
  diff_url: string | null;
  before_base64: string | null;
  after_base64: string | null;
  diff_base64: string | null;
  error: string | null;
}

async function requestPreviewFix(
  studyId: string,
  issueId: string,
): Promise<FixPreviewResponse> {
  const res = await fetch(`${API_BASE}/studies/${studyId}/issues/${issueId}/preview-fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => 'Unknown error');
    throw new Error(body);
  }
  return res.json();
}

function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
}: {
  beforeSrc: string;
  afterSrc: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState({ before: false, after: false });

  const updatePosition = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percent);
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      updatePosition(e.touches[0].clientX);
    },
    [updatePosition],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updatePosition(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      updatePosition(e.touches[0].clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, updatePosition]);

  const allLoaded = imagesLoaded.before && imagesLoaded.after;

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={cn(
          'relative select-none overflow-hidden rounded-lg border bg-muted',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="slider"
        aria-label="Before and after comparison slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(sliderPosition)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            setSliderPosition((prev) => Math.max(0, prev - 2));
          } else if (e.key === 'ArrowRight') {
            setSliderPosition((prev) => Math.min(100, prev + 2));
          }
        }}
      >
        {/* Loading overlay while images are loading */}
        {!allLoaded && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* After image (full width, sits behind) */}
        <img
          src={afterSrc}
          alt="After fix applied"
          className="block w-full"
          draggable={false}
          onLoad={() => setImagesLoaded((prev) => ({ ...prev, after: true }))}
        />

        {/* Before image (clipped from the left) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={beforeSrc}
            alt="Before fix"
            className="block w-full"
            style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%' }}
            draggable={false}
            onLoad={() => setImagesLoaded((prev) => ({ ...prev, before: true }))}
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          {/* Drag handle */}
          <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-zinc-800/80 shadow-lg backdrop-blur-sm">
            <GripVertical className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 z-10 rounded-md bg-zinc-900/75 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          Before
        </div>
        <div className="absolute top-3 right-3 z-10 rounded-md bg-zinc-900/75 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          After
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Drag the slider to compare before and after the fix
      </p>
    </div>
  );
}

export function FixPreview({
  issueId,
  studyId,
  fixCode,
  fixLanguage,
  pageUrl,
}: FixPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  const preview = useMutation({
    mutationFn: () => requestPreviewFix(studyId, issueId),
  });

  const handlePreview = () => {
    setIsOpen(true);
    preview.mutate();
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreview}
        className="gap-1.5"
      >
        <Eye className="h-3.5 w-3.5" />
        Preview Fix
      </Button>
    );
  }

  const beforeSrc = preview.data?.before_base64
    ? `data:image/png;base64,${preview.data.before_base64}`
    : null;
  const afterSrc = preview.data?.after_base64
    ? `data:image/png;base64,${preview.data.after_base64}`
    : null;

  return (
    <Card className="mt-3">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4" />
          Fix Preview
        </CardTitle>
        <div className="flex items-center gap-2">
          {preview.isIdle || preview.isPending ? null : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => preview.mutate()}
              disabled={preview.isPending}
              className="h-7 text-xs"
            >
              Retry
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false);
              preview.reset();
            }}
            className="h-7 text-xs"
          >
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading State */}
        {preview.isPending && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Generating preview...</p>
              <p className="text-xs text-muted-foreground">
                Opening browser, applying fix, and capturing screenshots
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {preview.isError && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 py-8">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="text-center">
              <p className="text-sm font-medium">Preview unavailable</p>
              <p className="text-xs text-muted-foreground">
                {preview.error?.message || 'Fix requires server-side changes'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => preview.mutate()}
              className="mt-1"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* API returned success: false */}
        {preview.isSuccess && !preview.data.success && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 py-8">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="text-center">
              <p className="text-sm font-medium">Preview unavailable</p>
              <p className="text-xs text-muted-foreground">
                {preview.data.error || 'Fix requires server-side changes'}
              </p>
            </div>
          </div>
        )}

        {/* Success State — Before/After Slider */}
        {preview.isSuccess && preview.data.success && beforeSrc && afterSrc && (
          <BeforeAfterSlider beforeSrc={beforeSrc} afterSrc={afterSrc} />
        )}

        {/* Fix Code Block */}
        <div>
          <div className="flex items-center justify-between rounded-t-md bg-zinc-800 px-3 py-1.5 dark:bg-zinc-900">
            <span className="text-xs text-zinc-400">{fixLanguage || 'code'}</span>
            <span className="text-xs text-zinc-500">{pageUrl}</span>
          </div>
          <pre className="max-h-60 overflow-auto rounded-b-md bg-zinc-900 p-3 text-sm text-zinc-100 dark:bg-zinc-950">
            <code className={`language-${fixLanguage}`}>{fixCode}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
