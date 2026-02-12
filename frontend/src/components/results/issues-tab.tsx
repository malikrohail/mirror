'use client';

import { useState, useMemo } from 'react';
import { useIssues } from '@/hooks/use-study';
import { IssueList } from './issue-list';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SEVERITIES } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

interface IssuesTabProps {
  studyId: string;
}

export function IssuesTab({ studyId }: IssuesTabProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const { data: issues, isLoading } = useIssues(studyId);

  const filtered = useMemo(() => {
    if (!issues) return [];
    if (severityFilter === 'all') return issues;
    return issues.filter((i) => i.severity === severityFilter);
  }, [issues, severityFilter]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {SEVERITIES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="tabular-nums text-sm text-muted-foreground">
          {filtered.length} issue{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>
      <IssueList issues={filtered} studyId={studyId} />
    </div>
  );
}
