'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn, scoreLabel } from '@/lib/utils';
import type { StudyOut, IssueOut, SessionOut } from '@/types';

// ── ScoreCard (internal) ─────────────────────────────

interface ScoreCardProps {
  label: string;
  value: string | number;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantClasses = {
  default: '',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
};

function ScoreCard({ label, value, description, variant = 'default' }: ScoreCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn('mt-1 tabular-nums text-2xl font-semibold', variantClasses[variant])}>
          {value}
        </p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── ScoreCardsRow ────────────────────────────────────

interface ScoreCardsRowProps {
  study: StudyOut;
  issues: IssueOut[];
  sessions: SessionOut[];
}

function getScoreVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 70) return 'success';
  if (score >= 40) return 'warning';
  return 'danger';
}

export function ScoreCardsRow({ study, issues, sessions }: ScoreCardsRowProps) {
  const score = study.overall_score ?? 0;
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const completedSessions = sessions.filter((s) => s.task_completed).length;
  const totalSessions = sessions.length;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <ScoreCard
        label="Overall Score"
        value={Math.round(score)}
        description={scoreLabel(score)}
        variant={getScoreVariant(score)}
      />
      <ScoreCard
        label="Issues Found"
        value={issues.length}
        description={criticalCount > 0 ? `${criticalCount} critical` : undefined}
        variant={criticalCount > 0 ? 'danger' : 'default'}
      />
      <ScoreCard
        label="Task Completion"
        value={totalSessions > 0 ? `${Math.round((completedSessions / totalSessions) * 100)}%` : '—'}
        description={`${completedSessions}/${totalSessions} sessions`}
      />
      <ScoreCard
        label="Personas Tested"
        value={study.personas.length}
      />
    </div>
  );
}
