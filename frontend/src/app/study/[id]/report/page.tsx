'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportPreview } from '@/components/report/report-preview';
import { InteractiveDashboard } from '@/components/report/interactive-dashboard';
import { TERMS } from '@/lib/constants';

type ReportView = 'dashboard' | 'markdown';

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [view, setView] = useState<ReportView>('dashboard');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/study/${id}`} aria-label={`Back to ${TERMS.singular} results`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Report</h1>
        </div>

        {/* View toggle */}
        <div className="flex rounded-md border p-0.5">
          <button
            onClick={() => setView('dashboard')}
            className={`flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'dashboard'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <button
            onClick={() => setView('markdown')}
            className={`flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'markdown'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Full Report
          </button>
        </div>
      </div>

      {view === 'dashboard' ? (
        <InteractiveDashboard studyId={id} />
      ) : (
        <ReportPreview studyId={id} />
      )}
    </div>
  );
}
