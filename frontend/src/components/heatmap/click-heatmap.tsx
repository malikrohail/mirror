'use client';

import { useState, useMemo, useRef } from 'react';
import { useHeatmap } from '@/hooks/use-heatmap';
import { HeatmapOverlay } from './heatmap-overlay';
import { HeatmapLegend } from './heatmap-legend';
import { PageSelector } from './page-selector';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { MousePointer } from 'lucide-react';

interface ClickHeatmapProps {
  studyId: string;
}

export function ClickHeatmap({ studyId }: ClickHeatmapProps) {
  const [selectedPage, setSelectedPage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useHeatmap(studyId, selectedPage || undefined);

  const pages = useMemo(() => {
    if (!data?.data_points) return [];
    const urls = new Set(data.data_points.map((p) => p.page_url));
    return Array.from(urls);
  }, [data]);

  // Auto-select first page
  if (pages.length > 0 && !selectedPage) {
    setSelectedPage(pages[0]);
  }

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!data?.data_points.length) {
    return (
      <EmptyState
        icon={<MousePointer className="h-12 w-12" />}
        title="No click data"
        description="No click data is available for this test yet."
      />
    );
  }

  const filteredPoints = data.data_points.filter(
    (p) => !selectedPage || p.page_url === selectedPage,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageSelector pages={pages} selected={selectedPage} onSelect={setSelectedPage} />
        <div className="flex items-center gap-4">
          <span className="tabular-nums text-sm text-muted-foreground">
            {filteredPoints.length} clicks
          </span>
          <HeatmapLegend />
        </div>
      </div>

      <div ref={containerRef} className="relative overflow-hidden rounded-lg border bg-muted" style={{ minHeight: 480 }}>
        <div className="flex items-center justify-center p-8 text-sm text-muted-foreground" style={{ height: 480 }}>
          Page preview area
        </div>
        <HeatmapOverlay
          dataPoints={filteredPoints}
          width={containerRef.current?.clientWidth ?? 800}
          height={480}
        />
      </div>
    </div>
  );
}
