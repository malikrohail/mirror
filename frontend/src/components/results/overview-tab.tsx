'use client';

import { ExecutiveSummary } from './executive-summary';
import { ScoreCardsRow } from './score-cards-row';
import { PersonaComparison } from './persona-comparison';
import { RecommendationList } from './recommendation-list';
import type { StudyOut, IssueOut, SessionOut, InsightOut, PersonaTemplateOut } from '@/types';

interface OverviewTabProps {
  study: StudyOut;
  issues: IssueOut[];
  sessions: SessionOut[];
  insights: InsightOut[];
  templates: PersonaTemplateOut[];
}

export function OverviewTab({ study, issues, sessions, insights, templates }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <ScoreCardsRow study={study} issues={issues} sessions={sessions} />
      <ExecutiveSummary summary={study.executive_summary} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PersonaComparison sessions={sessions} personas={study.personas} templates={templates} />
        <RecommendationList insights={insights} />
      </div>
    </div>
  );
}
