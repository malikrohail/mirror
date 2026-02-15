'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIssues } from '@/hooks/use-study';
import { IssueList } from './issue-list';
import { FixPanel } from './fix-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SEVERITIES, ISSUE_TYPES, ISSUE_TYPE_LABELS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import * as api from '@/lib/api-client';
import type { FixSuggestionOut } from '@/types';

interface IssuesTabProps {
  studyId: string;
  hideSeverityFilter?: boolean;
  severityOverride?: string | null;
}

export function IssuesTab({ studyId, hideSeverityFilter, severityOverride }: IssuesTabProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { data: issues, isLoading } = useIssues(studyId);
  const { data: fixes } = useQuery({
    queryKey: ['fixes', studyId],
    queryFn: () => api.listFixes(studyId),
  });

  const fixesByIssueId = useMemo(() => {
    if (!fixes) return {};
    const map: Record<string, FixSuggestionOut> = {};
    for (const fix of fixes) {
      map[fix.issue_id] = fix;
    }
    return map;
  }, [fixes]);

  const activeSeverity = severityOverride ?? (severityFilter !== 'all' ? severityFilter : null);

  const filtered = useMemo(() => {
    let result = issues ?? [];
    if (activeSeverity) result = result.filter((i) => i.severity === activeSeverity);
    if (typeFilter !== 'all') result = result.filter((i) => i.issue_type === typeFilter);
    return result;
  }, [issues, activeSeverity, typeFilter]);

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
      {!hideSeverityFilter && (
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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ISSUE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ISSUE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="tabular-nums text-sm text-muted-foreground">
            {filtered.length} issue{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      {hideSeverityFilter && (
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ISSUE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ISSUE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="tabular-nums text-sm text-muted-foreground">
            {filtered.length} issue{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      <IssueList issues={filtered} studyId={studyId} fixesByIssueId={fixesByIssueId} />
      <FixPanel studyId={studyId} />
    </div>
  );
}
