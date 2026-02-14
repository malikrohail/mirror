'use client';

import { useState, useMemo } from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Play, Loader2, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { SEVERITY_COLORS } from '@/lib/constants';
import type { Severity } from '@/types';

// ---------- Types for accessibility audit data ----------

interface VisualAccessibilityIssue {
  description: string;
  wcag_criterion: string;
  measured_value: string | null;
  required_value: string | null;
  element_description: string;
  severity: Severity;
  screenshot_region: Record<string, number>;
}

interface WCAGCriterionResult {
  criterion: string;
  level: string;
  status: 'pass' | 'fail' | 'not_applicable';
  evidence: string;
}

interface AccessibilityAuditResult {
  page_url: string;
  wcag_level: string;
  pass_count: number;
  fail_count: number;
  compliance_percentage: number;
  criteria: WCAGCriterionResult[];
  visual_issues: VisualAccessibilityIssue[];
  summary: string;
}

// ---------- API functions ----------

async function fetchAccessibilityAudit(studyId: string): Promise<AccessibilityAuditResult | null> {
  const res = await fetch(`/api/v1/studies/${studyId}/accessibility`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch accessibility audit');
  return res.json();
}

async function runAccessibilityAudit(studyId: string): Promise<AccessibilityAuditResult> {
  const res = await fetch(`/api/v1/studies/${studyId}/accessibility/audit`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to run accessibility audit');
  return res.json();
}

// ---------- Component ----------

interface AccessibilityTabProps {
  studyId: string;
}

export function AccessibilityTab({ studyId }: AccessibilityTabProps) {
  const qc = useQueryClient();
  const [criteriaFilter, setCriteriaFilter] = useState<'all' | 'pass' | 'fail'>('all');

  const { data: audit, isLoading } = useQuery({
    queryKey: ['accessibility-audit', studyId],
    queryFn: () => fetchAccessibilityAudit(studyId),
    enabled: !!studyId,
  });

  const runAudit = useMutation({
    mutationFn: () => runAccessibilityAudit(studyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accessibility-audit', studyId] }),
  });

  const filteredCriteria = useMemo(() => {
    if (!audit?.criteria) return [];
    if (criteriaFilter === 'all') return audit.criteria;
    return audit.criteria.filter((c) => c.status === criteriaFilter);
  }, [audit?.criteria, criteriaFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            WCAG Accessibility Audit
          </CardTitle>
          <Button
            onClick={() => runAudit.mutate()}
            disabled={runAudit.isPending}
            size="sm"
          >
            {runAudit.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {audit ? 'Re-run Audit' : 'Run Audit'}
          </Button>
        </CardHeader>
        <CardContent>
          {!audit ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <ShieldAlert className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Run an accessibility audit to check WCAG compliance with AI-powered visual analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Compliance Badge & Score */}
              <div className="flex items-center gap-4">
                <ComplianceBadge percentage={audit.compliance_percentage} />
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      WCAG {audit.wcag_level} Compliance
                    </span>
                    <span className="tabular-nums text-sm text-muted-foreground">
                      {audit.compliance_percentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={audit.compliance_percentage} />
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {audit.pass_count} passed
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      {audit.fail_count} failed
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {audit.summary && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {audit.summary}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual Accessibility Issues */}
      {audit && audit.visual_issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldX className="h-4 w-4 text-red-500" />
              Visual Accessibility Issues
              <Badge variant="secondary" className="ml-auto">
                {audit.visual_issues.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audit.visual_issues.map((issue, i) => (
                <VisualIssueCard key={i} issue={issue} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WCAG Criteria Checklist */}
      {audit && audit.criteria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              WCAG Criteria Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2">
              {(['all', 'pass', 'fail'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={criteriaFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCriteriaFilter(filter)}
                >
                  {filter === 'all' ? 'All' : filter === 'pass' ? 'Passed' : 'Failed'}
                  {filter !== 'all' && (
                    <Badge variant="secondary" className="ml-1.5">
                      {audit.criteria.filter((c) =>
                        filter === 'pass' ? c.status === 'pass' : c.status === 'fail',
                      ).length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              {filteredCriteria.map((criterion, i) => (
                <CriterionRow key={i} criterion={criterion} />
              ))}
              {filteredCriteria.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No criteria match the current filter.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------- Sub-components ----------

function ComplianceBadge({ percentage }: { percentage: number }) {
  const color =
    percentage >= 90
      ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
      : percentage >= 70
        ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800'
        : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800';

  return (
    <div
      className={cn(
        'flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold',
        color,
      )}
    >
      {percentage.toFixed(0)}%
    </div>
  );
}

function VisualIssueCard({ issue }: { issue: VisualAccessibilityIssue }) {
  const sevCls = SEVERITY_COLORS[issue.severity] || '';

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className={cn('text-xs', sevCls)}>
          {issue.severity}
        </Badge>
        <Badge variant="outline" className="text-xs">
          WCAG {issue.wcag_criterion}
        </Badge>
      </div>
      <p className="text-sm font-medium">{issue.description}</p>
      <p className="mt-1 text-xs text-muted-foreground">{issue.element_description}</p>
      {(issue.measured_value || issue.required_value) && (
        <div className="mt-2 flex gap-4 text-xs">
          {issue.measured_value && (
            <span className="text-red-600 dark:text-red-400">
              Measured: {issue.measured_value}
            </span>
          )}
          {issue.required_value && (
            <span className="text-green-600 dark:text-green-400">
              Required: {issue.required_value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function CriterionRow({ criterion }: { criterion: WCAGCriterionResult }) {
  const icon =
    criterion.status === 'pass' ? (
      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
    ) : criterion.status === 'fail' ? (
      <XCircle className="h-4 w-4 shrink-0 text-red-500" />
    ) : (
      <MinusCircle className="h-4 w-4 shrink-0 text-gray-400" />
    );

  return (
    <div className="flex items-start gap-3 rounded-md border px-3 py-2">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{criterion.criterion}</span>
          <Badge variant="outline" className="text-[10px]">
            Level {criterion.level}
          </Badge>
        </div>
        {criterion.evidence && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {criterion.evidence}
          </p>
        )}
      </div>
    </div>
  );
}
