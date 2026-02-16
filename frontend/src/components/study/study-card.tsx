'use client';

import Link from 'next/link';
import { formatDistanceToNow, scoreColor, scoreLabel } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/status-badge';
import type { StudySummary } from '@/types';

interface StudyCardProps {
  study: StudySummary;
}

export function StudyCard({ study }: StudyCardProps) {
  const href = `/study/${study.id}/running`;

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
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span className={`font-semibold ${scoreColor(study.overall_score).text}`}>
                  {Math.round(study.overall_score)}
                </span>
                <span className={`text-[10px] font-medium uppercase tracking-wide opacity-60 ${scoreColor(study.overall_score).text}`}>
                  {scoreLabel(study.overall_score)}
                </span>
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
