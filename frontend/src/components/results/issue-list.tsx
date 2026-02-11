'use client';

import { IssueCard } from './issue-card';
import type { IssueOut } from '@/types';

interface IssueListProps {
  issues: IssueOut[];
}

export function IssueList({ issues }: IssueListProps) {
  if (issues.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No issues found.</p>;
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  );
}
