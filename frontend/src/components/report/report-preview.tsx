'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getReportMdUrl } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportActions } from './report-actions';

interface ReportPreviewProps {
  studyId: string;
  hideActions?: boolean;
}

export function ReportPreview({ studyId, hideActions }: ReportPreviewProps) {
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
    <div>
      {!hideActions && (
        <>
          <div className="flex items-center gap-2 px-4 py-1.5">
            <ReportActions studyId={studyId} markdownContent={markdown ?? undefined} />
          </div>
          <div className="border-t border-border" />
        </>
      )}
      <div className={hideActions ? 'prose prose-sm dark:prose-invert max-w-none break-words' : 'p-4 prose prose-sm dark:prose-invert max-w-none break-words'}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown ?? ''}</ReactMarkdown>
      </div>
    </div>
  );
}
