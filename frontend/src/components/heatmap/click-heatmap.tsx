'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useHeatmap } from '@/hooks/use-heatmap';
import { HeatmapOverlay } from './heatmap-overlay';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { HeatmapIllustration } from '@/components/common/empty-illustrations';
import { ErrorState } from '@/components/common/error-state';
import { ImageOff } from 'lucide-react';
import { getScreenshotUrl } from '@/lib/api-client';

// ── HeatmapLegend (internal) ────────────────────────

function HeatmapLegend() {
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

// ── PageSelector (internal) ─────────────────────────

interface PageSelectorProps {
  pages: string[];
  selected: string;
  onSelect: (page: string) => void;
}

function PageSelector({ pages, selected, onSelect }: PageSelectorProps) {
  if (pages.length === 0) return null;

  return (
    <Select value={selected} onValueChange={onSelect}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a page" />
      </SelectTrigger>
      <SelectContent>
        {pages.map((page) => (
          <SelectItem key={page} value={page}>
            <span className="truncate">{page}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── ClickHeatmap ────────────────────────────────────

interface ClickHeatmapProps {
  studyId: string;
}

export function ClickHeatmap({ studyId }: ClickHeatmapProps) {
  const [selectedPage, setSelectedPage] = useState('');
  const [containerWidth, setContainerWidth] = useState(800);
  const [imgLoaded, setImgLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, error } = useHeatmap(studyId, selectedPage || undefined);

  const pages = useMemo(() => {
    if (!data?.data_points) return [];
    const urls = new Set(data.data_points.map((p) => p.page_url));
    return Array.from(urls);
  }, [data]);

  // Auto-select first page
  if (pages.length > 0 && !selectedPage) {
    setSelectedPage(pages[0]);
  }

  // Track container width for responsive overlay sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Reset image loaded state when page changes
  useEffect(() => {
    setImgLoaded(false);
  }, [selectedPage]);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load heatmap"
        message={error?.message}
      />
    );
  }

  if (!data?.data_points?.length) {
    return (
      <EmptyState
        illustration={<HeatmapIllustration />}
        title="No click data yet"
        description="Click data will appear here once personas interact with the site. Run a study to generate heatmap data."
      />
    );
  }

  const filteredPoints = data.data_points.filter(
    (p) => !selectedPage || p.page_url === selectedPage,
  );

  const screenshotPath = selectedPage ? data.page_screenshots?.[selectedPage] : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageSelector pages={pages} selected={selectedPage} onSelect={setSelectedPage} />
        <div className="flex items-center gap-4">
          <span className="tabular-nums text-[14px] font-normal text-foreground/30">
            {filteredPoints.length} clicks
          </span>
          <HeatmapLegend />
        </div>
      </div>

      <div ref={containerRef} className="relative overflow-hidden rounded-lg border bg-muted">
        {filteredPoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <HeatmapIllustration />
            <span>No clicks recorded on this page</span>
          </div>
        ) : screenshotPath ? (
          <>
            {!imgLoaded && (
              <div className="flex items-center justify-center bg-muted" style={{ height: 480 }}>
                <Skeleton className="h-full w-full" style={{ height: 480 }} />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getScreenshotUrl(screenshotPath)}
              alt={`Screenshot of ${selectedPage}`}
              className={`w-full object-contain ${imgLoaded ? 'block' : 'hidden'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
              draggable={false}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground" style={{ height: 480 }}>
            <ImageOff className="h-8 w-8" />
            <span>No page screenshot available</span>
          </div>
        )}
        {filteredPoints.length > 0 && (
          <HeatmapOverlay
            dataPoints={filteredPoints}
            width={containerWidth}
            height={containerRef.current?.clientHeight ?? 480}
          />
        )}
      </div>
    </div>
  );
}
