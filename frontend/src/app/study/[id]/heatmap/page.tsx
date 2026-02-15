'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClickHeatmap } from '@/components/heatmap/click-heatmap';
import { TERMS } from '@/lib/constants';

export default function HeatmapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="space-y-6 px-[100px] pt-[40px] pb-[100px]">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/study/${id}`} aria-label={`Back to ${TERMS.singular} results`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Click Heatmap</h1>
      </div>
      <ClickHeatmap studyId={id} />
    </div>
  );
}
