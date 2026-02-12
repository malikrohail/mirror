'use client';

import Link from 'next/link';
import { formatDistanceToNow } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/status-badge';
import type { StudySummary } from '@/types';

interface StudyCardProps {
  study: StudySummary;
}

export function StudyCard({ study }: StudyCardProps) {
  const href =
    study.status === 'running'
      ? `/study/${study.id}/running`
      : `/study/${study.id}`;

  return (
    <Link href={href} className="block">
      <Card className="group border hover:shadow-md" style={{ transitionProperty: 'box-shadow', transitionDuration: '200ms' }}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="line-clamp-1 text-sm font-medium">
            {study.url}
          </CardTitle>
          <StatusBadge status={study.status} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {(study.tasks?.length ?? 0)} task{(study.tasks?.length ?? 0) !== 1 ? 's' : ''},{' '}
              {(study.personas?.length ?? 0)} persona{(study.personas?.length ?? 0) !== 1 ? 's' : ''}
            </span>
            {study.overall_score !== null && (
              <span className="tabular-nums font-medium text-foreground">
                Score: {Math.round(study.overall_score)}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatDistanceToNow(study.created_at)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
