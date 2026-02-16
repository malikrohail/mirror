'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Clock,
  DollarSign,
  ChevronDown,
  Lightbulb,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { cn, scoreColor, scoreLabel } from '@/lib/utils';
import { getShowcaseStudy } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SEVERITY_COLORS, ISSUE_TYPE_LABELS, ISSUE_TYPE_COLORS } from '@/lib/constants';
import { PageHeaderBar } from '@/components/layout/page-header-bar';
import type {
  StudyOut,
  SessionOut,
  IssueOut,
  InsightOut,
  Severity,
} from '@/types';

// ── Helpers ──────────────────────────────────────────

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

const SEV_ORDER: Severity[] = ['critical', 'major', 'minor', 'enhancement'];

const SEV_LABEL: Record<string, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
  enhancement: 'Enhancement',
};

const SEV_TEXT_COLOR: Record<string, string> = {
  critical: 'text-red-500',
  major: 'text-amber-500',
  minor: 'text-blue-400',
  enhancement: 'text-emerald-400',
};

// ── Issue Card ───────────────────────────────────────

function IssueCard({ issue }: { issue: IssueOut }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Badge variant="outline" className={cn('text-xs shrink-0', SEVERITY_COLORS[issue.severity] ?? '')}>
          {issue.severity}
        </Badge>
        {issue.issue_type && (
          <Badge variant="outline" className={cn('text-xs shrink-0', ISSUE_TYPE_COLORS[issue.issue_type] ?? '')}>
            {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
          </Badge>
        )}
        {issue.wcag_criterion && (
          <Badge variant="outline" className="text-xs shrink-0">
            WCAG {issue.wcag_criterion}
          </Badge>
        )}
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{issue.description}</p>
      {(issue.element || issue.recommendation || issue.page_url) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Less' : 'More details'}
        </button>
      )}
      {expanded && (
        <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-2">
          {issue.element && (
            <p>
              <span className="font-medium text-foreground/50">Element:</span>{' '}
              <code className="rounded bg-muted px-1 py-0.5">{issue.element}</code>
            </p>
          )}
          {issue.page_url && (
            <p>
              <span className="font-medium text-foreground/50">Page:</span>{' '}
              <code className="rounded bg-muted px-1 py-0.5">{issue.page_url}</code>
            </p>
          )}
          {issue.recommendation && (
            <p>
              <span className="font-medium text-foreground/50">Recommendation:</span>{' '}
              {issue.recommendation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Grouped Issues ───────────────────────────────────

function GroupedIssues({ issues }: { issues: IssueOut[] }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = SEV_ORDER
    .map((sev) => ({ severity: sev, items: issues.filter((i) => i.severity === sev) }))
    .filter((g) => g.items.length > 0);

  if (issues.length === 0) {
    return <p className="text-sm text-foreground/30 py-8 text-center">No issues found</p>;
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.severity] ?? false;
        return (
          <div key={group.severity}>
            <button
              onClick={() => setCollapsed((prev) => ({ ...prev, [group.severity]: !prev[group.severity] }))}
              className="flex items-center gap-2 mb-2"
            >
              <span className={cn('text-sm font-medium', SEV_TEXT_COLOR[group.severity])}>
                {SEV_LABEL[group.severity]}
              </span>
              <span className="text-sm text-foreground/20">{group.items.length}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 text-foreground/20 transition-transform', isCollapsed && '-rotate-90')} />
            </button>
            {!isCollapsed && (
              <div className="space-y-2 ml-1">
                {group.items.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Insight Card ─────────────────────────────────────

function InsightCard({ insight }: { insight: InsightOut }) {
  const typeIcons: Record<string, React.ReactNode> = {
    universal: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    comparative: <Eye className="h-4 w-4 text-blue-500" />,
    recommendation: <Lightbulb className="h-4 w-4 text-emerald-500" />,
    persona_specific: <TrendingUp className="h-4 w-4 text-purple-500" />,
  };

  const typeLabels: Record<string, string> = {
    universal: 'Universal Finding',
    comparative: 'Comparative',
    recommendation: 'Recommendation',
    persona_specific: 'Persona-Specific',
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-center gap-2">
        {typeIcons[insight.type] ?? null}
        <Badge variant="outline" className="text-xs">
          {typeLabels[insight.type] ?? insight.type}
        </Badge>
        {insight.impact && (
          <Badge variant="outline" className="text-xs">
            Impact: {insight.impact}
          </Badge>
        )}
        {insight.effort && (
          <Badge variant="outline" className="text-xs">
            Effort: {insight.effort}
          </Badge>
        )}
      </div>
      <h4 className="text-sm font-medium text-foreground">{insight.title}</h4>
      <p className="text-sm text-foreground/70 leading-relaxed">{insight.description}</p>
      {insight.personas_affected && typeof insight.personas_affected === 'object' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Affects:</span>
          {Object.keys(insight.personas_affected).map((name) => (
            <Badge key={name} variant="secondary" className="text-xs">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Session Card ─────────────────────────────────────

function SessionCard({
  session,
  personaName,
  personaEmoji,
  taskDescription,
}: {
  session: SessionOut;
  personaName: string;
  personaEmoji: string;
  taskDescription: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-base">{personaEmoji}</span>
        <span className="text-sm font-medium text-foreground">{personaName}</span>
        <Badge
          variant="outline"
          className={cn(
            'ml-auto text-xs',
            session.status === 'complete' ? 'text-green-600 border-green-200 dark:text-green-400 dark:border-green-800' :
            session.status === 'gave_up' ? 'text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800' :
            'text-red-600 border-red-200 dark:text-red-400 dark:border-red-800',
          )}
        >
          {session.status === 'complete' ? 'Completed' : session.status === 'gave_up' ? 'Gave up' : session.status}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">Task: {taskDescription}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{session.total_steps} steps</span>
        {session.task_completed ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" /> Task completed
          </span>
        ) : (
          <span className="flex items-center gap-1 text-red-500">
            <XCircle className="h-3 w-3" /> Not completed
          </span>
        )}
      </div>
      {session.summary && (
        <p className="text-xs text-foreground/60 leading-relaxed">{session.summary}</p>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────

export default function ShowcasePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['showcase-study'],
    queryFn: getShowcaseStudy,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  if (isLoading) {
    return (
      <div className="px-[100px] pt-[40px] pb-[100px] space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="px-[100px] pt-[40px] pb-[100px]">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">Failed to load showcase</p>
          <p className="text-xs text-muted-foreground">The demo study data could not be loaded.</p>
          <Link href="/" className="text-sm text-primary hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const study = data.study as StudyOut;
  const sessions = data.sessions as SessionOut[];
  const issues = data.issues as IssueOut[];
  const insights = data.insights as InsightOut[];

  // Build lookup maps
  const personaMap = new Map(study.personas.map((p) => [p.id, p]));
  const taskMap = new Map(study.tasks.map((t) => [t.id, t]));

  const completedSessions = sessions.filter((s) => s.task_completed).length;
  const completionRate = sessions.length > 0 ? Math.round((completedSessions / sessions.length) * 100) : 0;

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const majorCount = issues.filter((i) => i.severity === 'major').length;

  return (
    <div>
      <PageHeaderBar
        icon={
          <img
            src="https://www.google.com/s2/favicons?domain=demo-store.example.com&sz=64"
            alt=""
            className="h-5 w-5 rounded-sm"
          />
        }
        title="Case study: Demo Store"
        chips={[
          { label: 'Score', value: String(study.overall_score ?? '--'), tooltip: 'Overall usability score' },
          { label: 'Issues', value: String(issues.length), tooltip: 'Total issues found' },
          { label: 'Runtime', value: formatDuration(study.duration_seconds ?? 0), tooltip: 'How long the test took' },
          { label: 'Cost', value: `$${(study.total_cost_usd ?? 0).toFixed(2)}`, tooltip: 'Total API cost' },
        ]}
        right={
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        }
      />

      <div className="px-[100px] pt-[40px] pb-[100px]">
        {/* Banner */}
        <div className="rounded-xl border border-border bg-gradient-to-r from-primary/5 to-transparent p-6 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">Demo</Badge>
            <span className="text-xs text-muted-foreground">This is sample data showing what Mirror produces</span>
          </div>
          <p className="text-sm text-foreground/70 leading-relaxed max-w-3xl">
            This showcase demonstrates a complete Mirror usability test. Three AI personas tested a demo e-commerce store
            across two tasks. The results below show exactly what you would get from running your own test.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-primary hover:underline"
          >
            Run a test on your own site
            <TrendingUp className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Score Hero + Summary */}
        <div className="flex gap-6 items-start mb-8">
          <div className="flex flex-col items-center justify-center rounded-xl border border-border p-5 min-w-[100px]">
            <span className={cn('text-4xl font-bold tabular-nums', scoreColor(study.overall_score ?? 0).text)}>
              {Math.round(study.overall_score ?? 0)}
            </span>
            <span className={cn('text-xs font-medium uppercase tracking-wider mt-1', scoreColor(study.overall_score ?? 0).text)}>
              {scoreLabel(study.overall_score ?? 0)}
            </span>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-base text-foreground">
                {study.tasks.map((t) => t.description).join(', ')}
              </p>
              <p className="text-sm text-foreground/50 mt-0.5">
                {study.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </p>
            </div>
            {study.executive_summary && (
              <p className="text-sm text-foreground/70 leading-relaxed">{study.executive_summary}</p>
            )}
            <div className="flex items-center gap-3 text-sm">
              <span>
                <span className="text-foreground/40">Issues</span>
                <span className="font-medium text-foreground ml-1.5">{issues.length}</span>
              </span>
              <span className="text-foreground/20">|</span>
              <span>
                <span className="text-foreground/40">Completion</span>
                <span className="font-medium text-foreground ml-1.5">{completionRate}%</span>
              </span>
              <span className="text-foreground/20">|</span>
              <span>
                <span className="text-foreground/40">Critical</span>
                <span className="font-medium text-red-500 ml-1.5">{criticalCount}</span>
              </span>
              <span className="text-foreground/20">|</span>
              <span>
                <span className="text-foreground/40">Major</span>
                <span className="font-medium text-amber-500 ml-1.5">{majorCount}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Personas</span>
            </div>
            <p className="text-2xl font-semibold">{study.personas.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {study.personas.map((p) => (p.profile as Record<string, string>).name || 'Tester').join(', ')}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Sessions</span>
            </div>
            <p className="text-2xl font-semibold">{sessions.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedSessions} completed, {sessions.length - completedSessions} incomplete
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Runtime</span>
            </div>
            <p className="text-2xl font-semibold">{formatDuration(study.duration_seconds ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sessions.reduce((sum, s) => sum + s.total_steps, 0)} total steps
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Cost</span>
            </div>
            <p className="text-2xl font-semibold">${(study.total_cost_usd ?? 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {study.llm_api_calls ?? 0} API calls
            </p>
          </div>
        </div>

        {/* Tabbed content */}
        <Tabs defaultValue="issues" className="space-y-4">
          <TabsList>
            <TabsTrigger value="issues">Issues ({issues.length})</TabsTrigger>
            <TabsTrigger value="insights">Insights ({insights.length})</TabsTrigger>
            <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="issues" className="space-y-4">
            <GroupedIssues issues={issues} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-3">
            {insights.length === 0 ? (
              <p className="text-sm text-foreground/30 py-8 text-center">No insights available</p>
            ) : (
              insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))
            )}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-3">
            {sessions.map((session) => {
              const persona = personaMap.get(session.persona_id);
              const task = taskMap.get(session.task_id);
              const profile = persona?.profile as Record<string, string> | undefined;
              return (
                <SessionCard
                  key={session.id}
                  session={session}
                  personaName={profile?.name ?? 'Tester'}
                  personaEmoji={profile?.emoji ?? '?'}
                  taskDescription={task?.description ?? 'Unknown task'}
                />
              );
            })}
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <div className="mt-12 rounded-xl border border-border bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Ready to test your own site?</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
            Mirror runs AI-powered usability tests in minutes, not weeks. Paste a URL, pick your personas, and get
            actionable insights like the ones above.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start a test
            <TrendingUp className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
