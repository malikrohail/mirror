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
  ChevronRight,
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

function TypewriterText({ text, speed = 20, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const textRef = useRef(text);
  const calledComplete = useRef(false);

  useEffect(() => {
    if (text !== textRef.current) {
      textRef.current = text;
      calledComplete.current = false;
      setDisplayed('');
    }

    if (displayed.length >= text.length) {
      if (!calledComplete.current) {
        calledComplete.current = true;
        onComplete?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(timer);
  }, [text, displayed, speed, onComplete]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[14px] ml-0.5 align-middle bg-muted-foreground/40 animate-pulse" />
      )}
    </span>
  );
}

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

  // Track which steps have already played the typewriter effect
  const animatedSteps = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (steps.length > prevStepCount.current) {
      setExpandedIndex(steps.length - 1);
      prevStepCount.current = steps.length;
      // Newest on top — scroll to top when new step arrives
      if (!userScrolledUp.current && scrollRef.current) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
    }
  }, [steps.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Newest on top — "scrolled away" means scrolled down
    const atTop = el.scrollTop < 40;
    userScrolledUp.current = !atTop;
  }, []);

  if (steps.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-[14px] text-muted-foreground/40">Waiting for steps...</p>
      </div>
    );
  }

  // Display newest step first
  const reversed = [...steps].reverse();

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto p-3"
    >
      <div className="relative">
        {/* Continuous dashed line behind all icons */}
        {reversed.length > 1 && (
          <div
            className="absolute"
            style={{
              left: '17px',
              top: '22px',
              bottom: '22px',
              width: '2px',
              backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 3px, var(--color-muted-foreground) 3px, var(--color-muted-foreground) 9px, transparent 9px, transparent 12px)',
              opacity: 0.15,
            }}
          />
        )}
        {reversed.map((entry, ri) => {
          const i = steps.length - 1 - ri; // original index
          const config = ACTION_CONFIG[entry.action] ?? DEFAULT_CONFIG;
          const Icon = config.icon;
          const isExpanded = expandedIndex === i;
          const isLatest = i === steps.length - 1;
          const isLast = ri === reversed.length - 1;
          const mood = MOOD_EMOJI[entry.emotional_state] ?? '🤔';

          return (
            <div key={entry.step_number} className={`relative flex gap-3 ${isLast ? '' : 'pb-2'}`}>
              {/* Timeline column — icon */}
              <div className="flex flex-col items-center pt-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center cursor-default rounded-full bg-background">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${config.color}`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        {isLatest && entry.action !== 'complete' && (
                          <span className={`absolute inset-[3px] animate-ping rounded-full ${config.color} opacity-20`} />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">{config.label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Step content card */}
              <div className="min-w-0 flex-1 rounded-lg bg-muted/40 p-2">
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  {/* Label + mood */}
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[14px] font-medium text-foreground/80">
                    <span className="text-muted-foreground/20">#{entry.step_number}</span>
                    <span className="truncate">{config.label}</span>
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
                  </span>

                  {/* Timestamp */}
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground/40">
                    {formatRelativeTime(entry.timestamp)}
                  </span>

                  {/* Chevron */}
                  {entry.think_aloud && (
                    isExpanded
                      ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                </button>

                {/* Expanded think-aloud body */}
                {isExpanded && entry.think_aloud && (
                  <div className="mt-2 rounded-lg bg-muted/60 px-3 py-2.5">
                    <p className="text-[14px] leading-relaxed text-muted-foreground">
                      {isLatest && !animatedSteps.current.has(entry.step_number) ? (
                        <TypewriterText
                          text={entry.think_aloud}
                          onComplete={() => animatedSteps.current.add(entry.step_number)}
                        />
                      ) : (
                        entry.think_aloud
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
