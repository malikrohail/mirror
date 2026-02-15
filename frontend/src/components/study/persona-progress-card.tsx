'use client';

import { useState } from 'react';
import { Monitor, Smartphone, Tablet, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EMOTION_ICONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EmotionalState } from '@/types';

const MOOD_LABELS: Record<string, string> = {
  curious: 'Curious',
  confused: 'Confused',
  frustrated: 'Frustrated',
  satisfied: 'Satisfied',
  stuck: 'Stuck',
  neutral: 'Neutral',
  confident: 'Confident',
  anxious: 'Anxious',
  delighted: 'Delighted',
  excited: 'Excited',
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  complete:  { text: 'Completed', color: 'text-green-600 dark:text-green-400' },
  failed:    { text: 'Failed',    color: 'text-red-600 dark:text-red-400' },
  gave_up:   { text: 'Gave up',   color: 'text-amber-600 dark:text-amber-400' },
};

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
  sessionStatus?: string;
  selected?: boolean;
  onSelect?: () => void;
}

export function PersonaProgressCard({
  personaName,
  personaAvatarUrl,
  personaDescription,
  personaProfile,
  stepNumber,
  totalSteps,
  thinkAloud,
  emotionalState,
  taskProgress,
  completed,
  sessionStatus,
  selected,
  onSelect,
}: PersonaProgressCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  return (
    <Card
      className={cn(
        'py-0 gap-0 text-[14px] transition-shadow cursor-pointer',
        completed && 'opacity-75',
        selected && 'ring-1 ring-foreground/10 bg-foreground/[0.02]',
      )}
      onClick={onSelect}
    >
      <CardContent className="p-0">
        {/* Persona info */}
        <div className="overflow-y-auto text-[14px]">
          {/* Name + avatar + overview badges */}
          <div className="flex items-start gap-3 px-4 py-4">
            {personaAvatarUrl ? (
              <img
                src={personaAvatarUrl}
                alt={personaName}
                className="h-10 w-10 shrink-0 rounded-full object-cover mt-0.5"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg mt-0.5">
                {EMOTION_ICONS[emotionalState as EmotionalState] ?? '🤔'}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold leading-tight truncate">{personaName}</p>
                {/* Progress indicator — inline with name */}
                {completed ? (
                  <span className="text-[13px] text-foreground/70">
                    {STATUS_LABELS[sessionStatus ?? 'complete']?.text ?? 'Completed'}
                    {' · '}
                    {EMOTION_ICONS[emotionalState as EmotionalState] ?? '🤔'}{' '}
                    {MOOD_LABELS[emotionalState] ?? capitalize(emotionalState)}
                  </span>
                ) : stepNumber === 0 && !totalSteps ? (
                  <span className="text-[13px] text-foreground/30">Waiting</span>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 10 }).map((_, idx) => {
                        const filled = totalSteps > 0 ? idx < Math.round((stepNumber / totalSteps) * 10) : 0;
                        return (
                          <div
                            key={idx}
                            className={`h-1.5 w-2 rounded-sm transition-colors duration-300 ${
                              filled ? 'bg-primary' : 'bg-muted'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[13px] tabular-nums text-foreground/30">{taskProgress}%</span>
                  </div>
                )}
              </div>
              <p className="text-[13px] text-muted-foreground/60 truncate">
                {[occupation, age ? `${age}yo` : null].filter(Boolean).join(', ')}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {techLit && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2 py-0.5 text-[12px] text-muted-foreground/70">
                    Tech savvy <LevelBars level={LITERACY_LEVEL[techLit] ?? 3} />
                  </span>
                )}
                {patience && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2 py-0.5 text-[12px] text-muted-foreground/70">
                    Patience <LevelBars level={PATIENCE_LEVEL[patience] ?? 3} />
                  </span>
                )}
                {device && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 text-[12px] text-muted-foreground/70">
                    {DEVICE_ICONS[device] ?? null} Uses {device}
                  </span>
                )}
              </div>
            </div>
            {(triggers.length > 0 || a11y.length > 0 || personaDescription) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailsOpen((o) => !o);
                }}
                className="shrink-0 inline-flex items-center gap-1 text-[13px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
              >
                <span>{detailsOpen ? 'Hide details' : 'Show details'}</span>
                {detailsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>

          {detailsOpen && (
            <div className="border-t border-border/40" />
          )}
          {detailsOpen && (
            <div className="px-4 pb-3 text-[14px]">
              {/* Description */}
              {personaDescription && (
                <div className="mt-2">
                  <p className="text-foreground/30 mb-1.5">About</p>
                  <p className="text-foreground/70">{personaDescription}</p>
                </div>
              )}

              {/* Accessibility */}
              {a11y.length > 0 && (
                <div className="mt-3">
                  <p className="text-foreground/30 mb-1.5">Accessibility</p>
                  <div className="flex flex-wrap gap-1.5">
                    {a11y.map((n) => (
                      <span key={n} className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400">
                        {capitalize(n.replace(/_/g, ' '))}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Frustrations */}
              {triggers.length > 0 && (
                <div className="mt-3">
                  <p className="text-foreground/30 mb-1.5">Frustrations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {triggers.map((t) => (
                      <span key={t} className="rounded-full border border-border/50 px-2.5 py-0.5 text-foreground/70">
                        {capitalize(t)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Model */}
              <div className="mt-3">
                <p className="text-foreground/30 mb-1.5">Model</p>
                <p className="text-foreground/70">Claude Opus 4.6 <span className="text-foreground/30">({totalSteps} completed tests)</span></p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
