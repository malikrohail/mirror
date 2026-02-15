'use client';

import { ScoreCard } from './score-card';
import { scoreLabel } from '@/lib/utils';
import type { StudyOut, IssueOut, SessionOut } from '@/types';

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
