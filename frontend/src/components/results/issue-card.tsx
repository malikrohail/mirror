'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/common/severity-badge';
import { FixPreview } from './fix-preview';
import type { IssueOut } from '@/types';

interface IssueCardProps {
  issue: IssueOut;
  studyId?: string;
  fixCode?: string | null;
  fixLanguage?: string | null;
}

export function IssueCard({ issue, studyId, fixCode, fixLanguage }: IssueCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{issue.description}</p>
          <SeverityBadge severity={issue.severity} />
        </div>
        {issue.recommendation && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Fix: </span>
            {issue.recommendation}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {issue.heuristic && <span>Heuristic: {issue.heuristic}</span>}
          {issue.wcag_criterion && <span>WCAG: {issue.wcag_criterion}</span>}
          {issue.page_url && (
            <span className="truncate max-w-xs">{issue.page_url}</span>
          )}
          {studyId && issue.session_id && issue.step_number != null && (
            <Button variant="ghost" size="sm" className="h-auto px-2 py-0.5 text-xs" asChild>
              <Link href={`/study/${studyId}/session/${issue.session_id}?step=${issue.step_number}`}>
                <Eye className="mr-1 h-3 w-3" />
                View in Replay
              </Link>
            </Button>
          )}
          {studyId && fixCode && issue.page_url && !showPreview && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-0.5 text-xs"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="mr-1 h-3 w-3" />
              Preview Fix
            </Button>
          )}
        </div>
        {showPreview && studyId && fixCode && issue.page_url && (
          <FixPreview
            issueId={issue.id}
            studyId={studyId}
            fixCode={fixCode}
            fixLanguage={fixLanguage || 'css'}
            pageUrl={issue.page_url}
          />
        )}
      </CardContent>
    </Card>
  );
}
