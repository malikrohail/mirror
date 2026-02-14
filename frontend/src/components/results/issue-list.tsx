'use client';

import { IssueCard } from './issue-card';
import type { IssueOut, FixSuggestionOut } from '@/types';

interface IssueListProps {
  issues: IssueOut[];
  studyId?: string;
  fixesByIssueId?: Record<string, FixSuggestionOut>;
}

export function IssueList({ issues, studyId, fixesByIssueId }: IssueListProps) {
  if (issues.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No issues found.</p>;
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => {
        const fix = fixesByIssueId?.[issue.id];
        return (
          <IssueCard
            key={issue.id}
            issue={issue}
            studyId={studyId}
            fixCode={fix?.fix_code}
            fixLanguage={fix?.fix_language}
          />
        );
      })}
    </div>
  );
}
