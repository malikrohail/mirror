'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  CheckCircle,
  MousePointer,
  Keyboard,
  ChevronsUpDown,
  Send,
  Compass,
  Clock,
  ChevronUp,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { StepHistoryEntry } from '@/stores/study-store';

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  start:    { icon: Play,            color: 'bg-green-500',  label: 'Session started' },
  complete: { icon: CheckCircle,     color: 'bg-green-500',  label: 'Session completed' },
  click:    { icon: MousePointer,    color: 'bg-blue-500',   label: 'Clicked element' },
  type:     { icon: Keyboard,        color: 'bg-purple-500', label: 'Typed input' },
  scroll:   { icon: ChevronsUpDown,  color: 'bg-gray-400',   label: 'Scrolled page' },
  submit:   { icon: Send,            color: 'bg-orange-500', label: 'Submitted form' },
  navigate: { icon: Compass,         color: 'bg-cyan-500',   label: 'Navigated to page' },
  wait:     { icon: Clock,           color: 'bg-yellow-500', label: 'Waiting' },
  look:     { icon: Eye,             color: 'bg-indigo-500', label: 'Observing page' },
};

const DEFAULT_CONFIG = { icon: Compass, color: 'bg-gray-400', label: 'Action' };

const MOOD_EMOJI: Record<string, string> = {
  curious: '🤔',
  confused: '😕',
  frustrated: '😤',
  satisfied: '😊',
  stuck: '😩',
  neutral: '😐',
  confident: '💪',
  anxious: '😰',
  delighted: '😄',
  excited: '🤩',
};

function formatRelativeTime(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

interface LiveStepTimelineProps {
  steps: StepHistoryEntry[];
}

export function LiveStepTimeline({ steps }: LiveStepTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const prevStepCount = useRef(steps.length);

  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    steps.length > 0 ? steps.length - 1 : null,
  );

  useEffect(() => {
    if (steps.length > prevStepCount.current) {
      setExpandedIndex(steps.length - 1);
      prevStepCount.current = steps.length;
      if (!userScrolledUp.current && scrollRef.current) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        });
      }
    }
  }, [steps.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolledUp.current = !atBottom;
  }, []);

  if (steps.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-[14px] text-muted-foreground/40">Waiting for steps...</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto p-3"
    >
      <div className="space-y-2">
        {steps.map((entry, i) => {
          const config = ACTION_CONFIG[entry.action] ?? DEFAULT_CONFIG;
          const Icon = config.icon;
          const isExpanded = expandedIndex === i;
          const isLatest = i === steps.length - 1;
          const mood = MOOD_EMOJI[entry.emotional_state] ?? '🤔';

          return (
            <div
              key={entry.step_number}
              className="rounded-lg bg-muted/40 p-2"
            >
              {/* Header row */}
              <button
                type="button"
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                className="flex w-full items-center gap-2 text-left"
              >
                {/* Action icon */}
                <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${config.color}`}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  {isLatest && entry.action !== 'complete' && (
                    <span className={`absolute inset-0 animate-ping rounded-full ${config.color} opacity-30`} />
                  )}
                </div>

                {/* Label */}
                <span className="flex-1 truncate text-[14px] font-medium text-foreground/80">
                  {entry.action !== 'start' && entry.action !== 'complete' && (
                    <span className="text-muted-foreground/20 mr-1">#{entry.step_number}</span>
                  )}
                  {config.label}
                </span>

                {/* Mood */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="shrink-0 text-base cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {mood}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {entry.emotional_state.charAt(0).toUpperCase() + entry.emotional_state.slice(1)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Timestamp */}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground/40">
                  {formatRelativeTime(entry.timestamp)}
                </span>

                {/* Chevron */}
                {entry.think_aloud && (
                  isExpanded
                    ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
              </button>

              {/* Expanded think-aloud body */}
              {isExpanded && entry.think_aloud && (
                <div className="mt-2 rounded-lg bg-muted/60 px-3 py-2.5">
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    {entry.think_aloud}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
