'use client';

import { Card, CardContent } from '@/components/ui/card';
import { SeverityBadge } from '@/components/common/severity-badge';
import type { IssueOut } from '@/types';

interface IssueCardProps {
  issue: IssueOut;
}

export function IssueCard({ issue }: IssueCardProps) {
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
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {issue.heuristic && <span>Heuristic: {issue.heuristic}</span>}
          {issue.wcag_criterion && <span>WCAG: {issue.wcag_criterion}</span>}
          {issue.page_url && (
            <span className="truncate max-w-xs">{issue.page_url}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
