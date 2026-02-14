'use client';

import { useMemo } from 'react';
import { ArrowRight, GitCompareArrows, AlertTriangle, TrendingDown, Info, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { SEVERITY_COLORS } from '@/lib/constants';
import type { Severity } from '@/types';

// ---------- Types ----------

interface TransitionIssue {
  from_page: string;
  to_page: string;
  description: string;
  severity: Severity;
  heuristic: string;
  recommendation: string;
}

interface FlowAnalysisResult {
  flow_name: string;
  pages: string[];
  consistency_score: number;
  transition_issues: TransitionIssue[];
  information_loss: string[];
  strengths: string[];
  summary: string;
}

// ---------- API ----------

async function fetchFlowAnalysis(studyId: string): Promise<FlowAnalysisResult[]> {
  const res = await fetch(`/api/v1/studies/${studyId}/flow-analysis`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error('Failed to fetch flow analysis');
  return res.json();
}

// ---------- Component ----------

interface FlowIssuesTabProps {
  studyId: string;
}

export function FlowIssuesTab({ studyId }: FlowIssuesTabProps) {
  const { data: flows, isLoading } = useQuery({
    queryKey: ['flow-analysis', studyId],
    queryFn: () => fetchFlowAnalysis(studyId),
    enabled: !!studyId,
  });

  const totalIssues = useMemo(
    () => flows?.reduce((sum, f) => sum + f.transition_issues.length, 0) ?? 0,
    [flows],
  );

  const avgConsistency = useMemo(() => {
    if (!flows || flows.length === 0) return 0;
    return flows.reduce((sum, f) => sum + f.consistency_score, 0) / flows.length;
  }, [flows]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!flows || flows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <GitCompareArrows className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No flow analysis data available yet. Flow analysis is generated after a study completes when multi-page navigation is detected.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <GitCompareArrows className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{flows.length}</p>
                <p className="text-xs text-muted-foreground">
                  Flow{flows.length !== 1 ? 's' : ''} analyzed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{totalIssues}</p>
                <p className="text-xs text-muted-foreground">
                  Transition issue{totalIssues !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ConsistencyIndicator score={avgConsistency} />
              <div>
                <p className="text-2xl font-bold">{avgConsistency.toFixed(1)}/10</p>
                <p className="text-xs text-muted-foreground">Avg consistency</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flow Cards */}
      {flows.map((flow, i) => (
        <FlowCard key={i} flow={flow} />
      ))}
    </div>
  );
}

// ---------- Sub-components ----------

function ConsistencyIndicator({ score }: { score: number }) {
  const color =
    score >= 8
      ? 'text-green-500'
      : score >= 5
        ? 'text-yellow-500'
        : 'text-red-500';

  return <TrendingDown className={cn('h-8 w-8', color)} />;
}

function FlowCard({ flow }: { flow: FlowAnalysisResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4" />
            {flow.flow_name}
          </span>
          <ConsistencyBadge score={flow.consistency_score} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Flow Path */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Page Flow
          </p>
          <div className="flex flex-wrap items-center gap-1">
            {flow.pages.map((page, i) => (
              <span key={i} className="flex items-center gap-1">
                <code className="max-w-[200px] truncate rounded bg-muted px-1.5 py-0.5 text-xs">
                  {shortenUrl(page)}
                </code>
                {i < flow.pages.length - 1 && (
                  <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Consistency Score Bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Consistency Score</span>
            <span className="font-medium">{flow.consistency_score}/10</span>
          </div>
          <Progress value={flow.consistency_score * 10} />
        </div>

        {/* Summary */}
        {flow.summary && (
          <p className="text-sm leading-relaxed text-muted-foreground">{flow.summary}</p>
        )}

        {/* Transition Issues */}
        {flow.transition_issues.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Transition Issues
            </p>
            <div className="space-y-2">
              {flow.transition_issues.map((issue, i) => (
                <TransitionIssueCard key={i} issue={issue} />
              ))}
            </div>
          </div>
        )}

        {/* Information Loss */}
        {flow.information_loss.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              Information Loss
            </p>
            <div className="space-y-1.5">
              {flow.information_loss.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-900 dark:bg-orange-950"
                >
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-orange-500" />
                  <p className="text-xs text-orange-700 dark:text-orange-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {flow.strengths.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Strengths
            </p>
            <div className="space-y-1.5">
              {flow.strengths.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950"
                >
                  <Info className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                  <p className="text-xs text-green-700 dark:text-green-300">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TransitionIssueCard({ issue }: { issue: TransitionIssue }) {
  const sevCls = SEVERITY_COLORS[issue.severity] || '';

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <Badge variant="outline" className={cn('text-xs', sevCls)}>
          {issue.severity}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <code className="max-w-[120px] truncate">{shortenUrl(issue.from_page)}</code>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <code className="max-w-[120px] truncate">{shortenUrl(issue.to_page)}</code>
        </span>
      </div>
      <p className="text-sm">{issue.description}</p>
      {issue.heuristic && (
        <p className="mt-1 text-xs text-muted-foreground">Heuristic: {issue.heuristic}</p>
      )}
      {issue.recommendation && (
        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">{issue.recommendation}</p>
      )}
    </div>
  );
}

function ConsistencyBadge({ score }: { score: number }) {
  const cls =
    score >= 8
      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
      : score >= 5
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
        : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400';

  return (
    <Badge variant="outline" className={cls}>
      {score}/10 consistency
    </Badge>
  );
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname || '/';
  } catch {
    return url;
  }
}
