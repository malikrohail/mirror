'use client';

import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/common/severity-badge';
import type { IssueOut } from '@/types';

interface IssueCardProps {
  issue: IssueOut;
  studyId?: string;
}

export function IssueCard({ issue, studyId }: IssueCardProps) {
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
        </div>
      </CardContent>
    </Card>
  );
}
