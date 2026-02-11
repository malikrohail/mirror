'use client';

import { useState, useEffect } from 'react';
import { getReportMdUrl } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportActions } from './report-actions';

interface ReportPreviewProps {
  studyId: string;
}

export function ReportPreview({ studyId }: ReportPreviewProps) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(getReportMdUrl(studyId))
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load report');
        return res.text();
      })
      .then((text) => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [studyId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReportActions studyId={studyId} markdownContent={markdown ?? undefined} />
      <Card>
        <CardContent className="p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {markdown}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
