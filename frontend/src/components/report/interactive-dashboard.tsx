'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  Lightbulb,
  TrendingUp,
  Users,
  Share2,
  Download,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SEVERITY_COLORS, EMOTION_ICONS } from '@/lib/constants';
import { getReportPdfUrl, getReportMdUrl } from '@/lib/api-client';
import { useStudy, useSessions, useIssues, useInsights } from '@/hooks/use-study';
import { usePersonaTemplates } from '@/hooks/use-personas';
import { cn } from '@/lib/utils';
import type {
  StudyOut,
  SessionOut,
  IssueOut,
  InsightOut,
  PersonaOut,
  PersonaTemplateOut,
  EmotionalState,
  Severity,
} from '@/types';

// ── Helpers ──────────────────────────────────────────

function getLetterGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getGradeColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

function getGradeDescription(score: number): string {
  if (score >= 90) return 'Excellent usability. Minor polish needed.';
  if (score >= 80) return 'Good usability with a few notable issues.';
  if (score >= 70) return 'Acceptable but several areas need improvement.';
  if (score >= 60) return 'Below average. Multiple issues impacting users.';
  if (score >= 40) return 'Poor usability. Significant barriers to task completion.';
  return 'Critical usability problems. Requires major redesign.';
}

const SEVERITY_CHART_COLORS: Record<Severity, string> = {
  critical: '#ef4444',
  major: '#f97316',
  minor: '#eab308',
  enhancement: '#3b82f6',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
  enhancement: 'Enhancement',
};

const EMOTION_COLORS: Record<EmotionalState, string> = {
  curious: '#6366f1',
  confused: '#f59e0b',
  frustrated: '#ef4444',
  satisfied: '#22c55e',
  stuck: '#a855f7',
};

// ── Animated Score Counter ───────────────────────────

function AnimatedScore({ target, duration = 1.5 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const startTime = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return <span>{current}</span>;
}

// ── Donut Chart (SVG) ────────────────────────────────

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ segments, size = 180 }: { segments: DonutSegment[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const radius = 60;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox="0 0 160 160" className="shrink-0">
        {segments
          .filter((s) => s.value > 0)
          .map((segment, i) => {
            const pct = segment.value / total;
            const dashLength = pct * circumference;
            const dashOffset = cumulativeOffset;
            cumulativeOffset += dashLength;

            return (
              <circle
                key={i}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={-dashOffset}
                transform="rotate(-90 80 80)"
                className="transition-all duration-700"
              />
            );
          })}
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-foreground text-2xl font-bold"
          fontSize="28"
        >
          {total}
        </text>
        <text
          x="80"
          y="96"
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
          fontSize="12"
        >
          issues
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-medium">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Emotional Arc SVG ────────────────────────────────

function EmotionalArc({
  arc,
  personaName,
}: {
  arc: Record<string, EmotionalState>;
  personaName: string;
}) {
  const entries = Object.entries(arc);
  if (entries.length === 0) return null;

  const emotionToY: Record<EmotionalState, number> = {
    satisfied: 10,
    curious: 30,
    confused: 50,
    stuck: 70,
    frustrated: 90,
  };

  const width = 280;
  const height = 100;
  const padding = 10;
  const innerWidth = width - padding * 2;

  const points = entries.map(([, emotion], i) => {
    const x = padding + (entries.length > 1 ? (i / (entries.length - 1)) * innerWidth : innerWidth / 2);
    const y = emotionToY[emotion] ?? 50;
    return { x, y, emotion };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-foreground/70">{personaName}</p>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid lines */}
        {[10, 30, 50, 70, 90].map((y) => (
          <line
            key={y}
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeDasharray="4 4"
          />
        ))}
        {/* Path */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#emotionGradient)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={EMOTION_COLORS[p.emotion]} />
            <title>{`Step ${i + 1}: ${p.emotion}`}</title>
          </g>
        ))}
        {/* Gradient definition */}
        <defs>
          <linearGradient id="emotionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={EMOTION_COLORS[points[0]?.emotion ?? 'curious']} />
            <stop offset="100%" stopColor={EMOTION_COLORS[points[points.length - 1]?.emotion ?? 'curious']} />
          </linearGradient>
        </defs>
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>Start</span>
        <div className="flex gap-2">
          {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
            <span key={emotion} className="flex items-center gap-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              {emotion}
            </span>
          ))}
        </div>
        <span>End</span>
      </div>
    </div>
  );
}

// ── Expandable Insight Card ──────────────────────────

function InsightCard({ insight }: { insight: InsightOut }) {
  const [expanded, setExpanded] = useState(false);

  const typeIcon: Record<string, typeof Info> = {
    universal: AlertCircle,
    persona_specific: Users,
    comparative: TrendingUp,
    recommendation: Lightbulb,
  };
  const Icon = typeIcon[insight.type] ?? Info;

  return (
    <motion.div
      layout
      className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{insight.title}</p>
            {!expanded && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {insight.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {insight.severity && (
            <Badge
              variant="outline"
              className={cn('text-[10px]', SEVERITY_COLORS[insight.severity] ?? '')}
            >
              {insight.severity}
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 ml-7 space-y-2"
        >
          <p className="text-sm text-foreground/80">{insight.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {insight.impact && (
              <Badge variant="outline" className="text-[10px]">
                Impact: {insight.impact}
              </Badge>
            )}
            {insight.effort && (
              <Badge variant="outline" className="text-[10px]">
                Effort: {insight.effort}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {insight.type.replace('_', ' ')}
            </Badge>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Main Interactive Dashboard ───────────────────────

interface InteractiveDashboardProps {
  studyId: string;
}

export function InteractiveDashboard({ studyId }: InteractiveDashboardProps) {
  const { data: study, isLoading: studyLoading } = useStudy(studyId);
  const { data: sessions } = useSessions(studyId);
  const { data: issues } = useIssues(studyId);
  const { data: insights } = useInsights(studyId);
  const { data: templates } = usePersonaTemplates();
  const [urlCopied, setUrlCopied] = useState(false);

  if (studyLoading) {
    return <DashboardSkeleton />;
  }

  if (!study) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">No report data available.</p>
      </div>
    );
  }

  const score = study.overall_score ?? 0;
  const grade = getLetterGrade(score);
  const gradeColor = getGradeColor(score);
  const gradeDescription = getGradeDescription(score);

  const issueList = issues ?? [];
  const sessionList = sessions ?? [];
  const insightList = insights ?? [];
  const templateMap = new Map((templates ?? []).map((t) => [t.id, t]));

  const severityCounts: Record<Severity, number> = {
    critical: 0,
    major: 0,
    minor: 0,
    enhancement: 0,
  };
  for (const issue of issueList) {
    if (issue.severity in severityCounts) {
      severityCounts[issue.severity]++;
    }
  }

  const donutSegments: DonutSegment[] = [
    { label: SEVERITY_LABELS.critical, value: severityCounts.critical, color: SEVERITY_CHART_COLORS.critical },
    { label: SEVERITY_LABELS.major, value: severityCounts.major, color: SEVERITY_CHART_COLORS.major },
    { label: SEVERITY_LABELS.minor, value: severityCounts.minor, color: SEVERITY_CHART_COLORS.minor },
    { label: SEVERITY_LABELS.enhancement, value: severityCounts.enhancement, color: SEVERITY_CHART_COLORS.enhancement },
  ];

  const recommendations = insightList
    .filter((i) => i.type === 'recommendation')
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  const keyInsights = insightList
    .filter((i) => i.type !== 'recommendation')
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setUrlCopied(true);
      toast.success('Report URL copied to clipboard');
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Hero: UX Score ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-8">
              {/* Score Circle */}
              <div className="relative flex shrink-0 items-center justify-center">
                <svg width="160" height="160" viewBox="0 0 160 160">
                  {/* Background ring */}
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    strokeWidth="12"
                  />
                  {/* Score ring */}
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="64"
                    fill="none"
                    stroke={score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 64}`}
                    strokeDashoffset={2 * Math.PI * 64}
                    animate={{
                      strokeDashoffset: 2 * Math.PI * 64 * (1 - score / 100),
                    }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-4xl font-bold tabular-nums', gradeColor)}>
                    <AnimatedScore target={score} />
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>

              {/* Grade + Description */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center gap-3 md:justify-start">
                  <span className={cn('text-5xl font-extrabold', gradeColor)}>
                    {grade}
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold">UX Score</h2>
                    <p className="text-sm text-muted-foreground">{study.url}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-foreground/70">
                  {gradeDescription}
                </p>
                {study.executive_summary && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                    {study.executive_summary}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge variant="outline" className="gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    {issueList.length} issue{issueList.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="gap-1.5">
                    <Users className="h-3 w-3" />
                    {study.personas.length} persona{study.personas.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="gap-1.5">
                    {sessionList.filter((s) => s.task_completed).length}/{sessionList.length} tasks completed
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Issue Severity Breakdown ──────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue Severity Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {issueList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No issues found. Great job!
              </p>
            ) : (
              <DonutChart segments={donutSegments} />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Persona Comparison ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Persona Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No sessions recorded.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {sessionList.map((session, i) => {
                  const persona = study.personas.find((p) => p.id === session.persona_id);
                  const template = persona?.template_id
                    ? templateMap.get(persona.template_id)
                    : null;

                  const sessionIssues = issueList.filter(
                    (iss) => iss.session_id === session.id,
                  );

                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{template?.emoji ?? '👤'}</span>
                          <div>
                            <p className="text-sm font-semibold">
                              {template?.name ?? 'Persona'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {template?.short_description ?? ''}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={session.task_completed ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {session.task_completed
                            ? 'Completed'
                            : session.status === 'gave_up'
                              ? 'Gave up'
                              : 'Failed'}
                        </Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-md bg-muted/50 px-2 py-1.5">
                          <p className="text-lg font-bold tabular-nums">
                            {session.total_steps}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Steps</p>
                        </div>
                        <div className="rounded-md bg-muted/50 px-2 py-1.5">
                          <p className="text-lg font-bold tabular-nums">
                            {sessionIssues.length}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Issues</p>
                        </div>
                        <div className="rounded-md bg-muted/50 px-2 py-1.5">
                          <p className="text-lg font-bold">
                            {session.emotional_arc
                              ? (() => {
                                  const entries = Object.values(session.emotional_arc);
                                  const last = entries[entries.length - 1] as EmotionalState | undefined;
                                  return last ? EMOTION_ICONS[last] ?? '--' : '--';
                                })()
                              : '--'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Final mood</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Emotional Journey ─────────────────────────── */}
      {sessionList.some((s) => s.emotional_arc && Object.keys(s.emotional_arc).length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emotional Journey</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sessionList
                  .filter((s) => s.emotional_arc && Object.keys(s.emotional_arc).length > 0)
                  .map((session) => {
                    const persona = study.personas.find((p) => p.id === session.persona_id);
                    const template = persona?.template_id
                      ? templateMap.get(persona.template_id)
                      : null;

                    return (
                      <EmotionalArc
                        key={session.id}
                        arc={session.emotional_arc as Record<string, EmotionalState>}
                        personaName={`${template?.emoji ?? '👤'} ${template?.name ?? 'Persona'}`}
                      />
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Key Insights ──────────────────────────────── */}
      {keyInsights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {keyInsights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Recommendations ───────────────────────────── */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex gap-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{rec.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {rec.description}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {rec.impact && (
                          <Badge variant="outline" className="text-[10px]">
                            Impact: {rec.impact}
                          </Badge>
                        )}
                        {rec.effort && (
                          <Badge variant="outline" className="text-[10px]">
                            Effort: {rec.effort}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Share & Export ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Share this report</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                {urlCopied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {urlCopied ? 'Copied!' : 'Copy URL'}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={getReportPdfUrl(studyId)} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={getReportMdUrl(studyId)} download>
                  <FileText className="mr-2 h-4 w-4" />
                  Download Markdown
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
            <Skeleton className="h-40 w-40 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <Skeleton className="h-44 w-44 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-36 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
