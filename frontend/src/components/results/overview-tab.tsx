'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { ExecutiveSummary } from './executive-summary';
import { ScoreCardsRow } from './score-cards-row';
import { PersonaComparison } from './persona-comparison';
import { RecommendationList } from './recommendation-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StudyOut, IssueOut, SessionOut, InsightOut, PersonaTemplateOut } from '@/types';

interface OverviewTabProps {
  study: StudyOut;
  issues: IssueOut[];
  sessions: SessionOut[];
  insights: InsightOut[];
  templates: PersonaTemplateOut[];
}

export function OverviewTab({ study, issues, sessions, insights, templates }: OverviewTabProps) {
  const insightsWithReasoning = insights.filter(
    (i) => i.reasoning_trace && i.reasoning_trace.trim().length > 0,
  );

  return (
    <div className="space-y-6">
      <ScoreCardsRow study={study} issues={issues} sessions={sessions} />
      <ExecutiveSummary summary={study.executive_summary} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PersonaComparison sessions={sessions} personas={study.personas} templates={templates} />
        <RecommendationList insights={insights} />
      </div>

      {insightsWithReasoning.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4" />
              AI Reasoning Traces
              <Badge variant="secondary" className="ml-1">
                {insightsWithReasoning.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insightsWithReasoning.map((insight) => (
              <ReasoningTracePanel key={insight.id} insight={insight} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReasoningTracePanel({ insight }: { insight: InsightOut }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Brain className="h-4 w-4 shrink-0 text-purple-500" />
          <span className="truncate text-sm font-medium">{insight.title}</span>
          {insight.type && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {insight.type.replace('_', ' ')}
            </Badge>
          )}
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">
            How Opus reasoned about this
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="border-t px-4 py-3">
          <p className="mb-2 text-sm text-muted-foreground">{insight.description}</p>
          <div className="rounded-md bg-purple-50 p-3 dark:bg-purple-950/30">
            <p className="mb-1 text-xs font-medium text-purple-700 dark:text-purple-300">
              Opus Reasoning Trace
            </p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-purple-900 dark:text-purple-200">
              {insight.reasoning_trace}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
