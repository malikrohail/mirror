'use client';

import { useState } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LiveBrowserView } from './live-browser-view';
import { ScreencastViewer } from './screencast-viewer';
import { LiveStepTimeline } from './live-step-timeline';
import { EMOTION_ICONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import type { EmotionalState } from '@/types';
import type { StepHistoryEntry } from '@/stores/study-store';

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-3 w-3" />,
  mobile: <Smartphone className="h-3 w-3" />,
  tablet: <Tablet className="h-3 w-3" />,
};

const LITERACY_LEVEL: Record<string, number> = {
  low: 1,
  moderate: 3,
  high: 5,
};

const PATIENCE_LEVEL: Record<string, number> = {
  low: 1,
  medium: 3,
  high: 5,
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function LevelBars({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`inline-block h-[10px] w-[3px] rounded-full ${
            i <= level ? 'bg-foreground/60' : 'bg-foreground/10'
          }`}
        />
      ))}
    </span>
  );
}

interface PersonaProgressCardProps {
  personaName: string;
  personaAvatarUrl?: string | null;
  personaDescription?: string | null;
  personaProfile?: Record<string, unknown> | null;
  stepNumber: number;
  totalSteps: number;
  thinkAloud: string;
  screenshotUrl: string;
  emotionalState: string;
  action: string;
  taskProgress: number;
  completed: boolean;
  liveViewUrl?: string | null;
  browserActive?: boolean;
  screencastAvailable?: boolean;
  sessionId?: string;
  confidence?: number | null;
  stepHistory?: StepHistoryEntry[];
}

export function PersonaProgressCard({
  personaName,
  personaAvatarUrl,
  personaDescription,
  personaProfile,
  stepNumber,
  totalSteps,
  thinkAloud,
  screenshotUrl,
  emotionalState,
  action,
  taskProgress,
  completed,
  liveViewUrl,
  browserActive,
  screencastAvailable,
  sessionId,
  confidence,
  stepHistory,
}: PersonaProgressCardProps) {
  const [activeTab, setActiveTab] = useState<'steps' | 'browser'>('steps');
  const hasLiveView = liveViewUrl !== undefined && liveViewUrl !== null;
  const hasScreencast = screencastAvailable && sessionId;

  const profile = personaProfile ?? {};
  const age = profile.age as number | undefined;
  const occupation = profile.occupation as string | undefined;
  const device = profile.device_preference as string | undefined;
  const techLit = profile.tech_literacy as string | undefined;
  const patience = profile.patience_level as string | undefined;
  const triggers = Array.isArray(profile.frustration_triggers)
    ? (profile.frustration_triggers as string[])
    : [];
  const a11y = Array.isArray(profile.accessibility_needs)
    ? (profile.accessibility_needs as string[])
    : [];

  const hasBrowserContent = hasScreencast || hasLiveView || screenshotUrl;

  const renderBrowserView = () => {
    if (hasScreencast && (browserActive || !hasLiveView)) {
      return (
        <ScreencastViewer
          sessionId={sessionId}
          browserActive={browserActive ?? false}
          personaName={personaName}
          screenshotUrl={screenshotUrl}
        />
      );
    }

    if (hasLiveView) {
      return (
        <LiveBrowserView
          liveViewUrl={liveViewUrl}
          browserActive={browserActive ?? false}
          personaName={personaName}
          screenshotUrl={screenshotUrl}
        />
      );
    }

    if (screenshotUrl) {
      return (
        <img
          src={screenshotUrl}
          alt={`${personaName} – step ${stepNumber}`}
          className="h-full w-full object-cover object-top"
        />
      );
    }

    return null;
  };

  const stepCount = stepHistory?.length ?? 0;

  return (
    <Card className={`py-0 gap-0 text-[14px] ${completed ? 'opacity-75' : ''}`}>
      <CardContent className="p-0">
        <div className="flex">
          {/* Left: persona info */}
          <div className="flex w-[35%] shrink-0 flex-col p-4">
            {/* Name + avatar row */}
            <div className="flex items-center gap-3">
              {personaAvatarUrl ? (
                <img
                  src={personaAvatarUrl}
                  alt={personaName}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                  {EMOTION_ICONS[emotionalState as EmotionalState] ?? '🤔'}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-tight truncate">{personaName}</p>
                <p className="text-[12px] text-muted-foreground/60 truncate">
                  {[occupation, age ? `${age}yo` : null].filter(Boolean).join(', ')}
                </p>
              </div>
              {completed && (
                <Badge variant="secondary" className="shrink-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[11px] px-2 py-0.5">
                  Done
                </Badge>
              )}
            </div>

            {/* Tech Adaptability */}
            {(techLit || patience || device) && (
              <div className="mt-3">
                <p className="text-[11px] font-medium text-muted-foreground/40 mb-1.5">Overview</p>
                <div className="flex flex-wrap gap-1">
                  {techLit && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground/70">
                      Tech <LevelBars level={LITERACY_LEVEL[techLit] ?? 3} />
                    </span>
                  )}
                  {patience && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground/70">
                      Patience <LevelBars level={PATIENCE_LEVEL[patience] ?? 3} />
                    </span>
                  )}
                  {device && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground/70">
                      {DEVICE_ICONS[device] ?? null} {capitalize(device)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Frustrated by */}
            {triggers.length > 0 && (
              <div className="mt-2.5">
                <p className="text-[11px] font-medium text-muted-foreground/40 mb-1.5">Frustrated by</p>
                <div className="flex flex-wrap gap-1">
                  {triggers.map((t) => (
                    <span key={t} className="rounded-full border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground/70">
                      {capitalize(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Accessibility */}
            {a11y.length > 0 && (
              <div className="mt-2.5">
                <p className="text-[11px] font-medium text-muted-foreground/40 mb-1.5">Accessibility</p>
                <div className="flex flex-wrap gap-1">
                  {a11y.map((n) => (
                    <span key={n} className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400">
                      {capitalize(n)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: tabbed steps / browser */}
          <div className="flex min-w-0 flex-1 flex-col border-l border-border">
            {/* Tab bar */}
            <div className="flex h-9 items-center border-b border-border">
              <button
                type="button"
                onClick={() => setActiveTab('steps')}
                className={`flex h-full items-center gap-1.5 px-3 text-xs font-medium uppercase tracking-wider transition-colors ${
                  activeTab === 'steps'
                    ? 'border-b-2 border-foreground text-foreground'
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                }`}
              >
                Steps
                {stepCount > 0 && (
                  <Badge variant="secondary" className="text-[11px] px-1.5 py-0 tabular-nums">
                    {stepCount}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('browser')}
                className={`flex h-full items-center px-3 text-xs font-medium uppercase tracking-wider transition-colors ${
                  activeTab === 'browser'
                    ? 'border-b-2 border-foreground text-foreground'
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                }`}
              >
                Browser
              </button>
              {/* Progress — right-aligned */}
              <div className="ml-auto flex items-center gap-2 px-3">
                <span className="text-xs tabular-nums text-muted-foreground">
                  Step {stepNumber}/{totalSteps || '—'}
                </span>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(taskProgress, 100)}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums font-medium">{taskProgress}%</span>
              </div>
            </div>

            {/* Tab content */}
            {activeTab === 'steps' ? (
              <div className="flex-1 overflow-hidden" style={{ maxHeight: '360px' }}>
                <LiveStepTimeline steps={stepHistory ?? []} />
              </div>
            ) : (
              <div className="relative flex-1">
                {hasBrowserContent ? (
                  <div className="h-full overflow-hidden">
                    {renderBrowserView()}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[180px] items-center justify-center bg-muted/20">
                    <div className="text-center">
                      <div className="mx-auto mb-2 h-8 w-12 rounded border border-dashed border-border/60" />
                      <p className="text-sm text-muted-foreground/40">
                        {browserActive ? 'Loading browser...' : 'Waiting to start...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
