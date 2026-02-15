'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { PersonaProgressCard } from '@/components/study/persona-progress-card';
import { LiveStepTimeline } from '@/components/study/live-step-timeline';
import { cn, scoreColor, scoreLabel } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { StepHistoryEntry } from '@/stores/study-store';

const MOCK_STEPS: Omit<StepHistoryEntry, 'timestamp'>[] = [
  { step_number: 1, think_aloud: 'Starting navigation...', screenshot_url: 'https://placehold.co/1280x800/fafafa/ccc?text=Loading...', emotional_state: 'curious', action: 'start', task_progress: 0 },
  { step_number: 2, think_aloud: "Alright, I'm on the homepage. There's a big hero section with a headline about AI-powered testing. Let me look for a way to sign up or start a test.", screenshot_url: 'https://placehold.co/1280x800/f8fafc/94a3b8?text=Homepage+%E2%80%94+Hero+Section', emotional_state: 'curious', action: 'navigate', task_progress: 5 },
  { step_number: 3, think_aloud: "I see a 'Get Started' button in the top right corner. That seems like the most logical place to begin. Let me click it.", screenshot_url: 'https://placehold.co/1280x800/f0f9ff/3b82f6?text=Homepage+%E2%80%94+Get+Started+Button', emotional_state: 'confident', action: 'click', task_progress: 10 },
  { step_number: 4, think_aloud: "OK, this brought me to a sign-up form. It wants my email and password. Pretty standard. Let me type in my email address first.", screenshot_url: 'https://placehold.co/1280x800/fefce8/ca8a04?text=Sign+Up+Form+%E2%80%94+Email+Field', emotional_state: 'neutral', action: 'type', task_progress: 15 },
  { step_number: 5, think_aloud: "Now filling in the password field. The password requirements aren't shown upfront — I have to guess what they want. That's a bit frustrating.", screenshot_url: 'https://placehold.co/1280x800/fef2f2/ef4444?text=Sign+Up+Form+%E2%80%94+Password+Field', emotional_state: 'frustrated', action: 'type', task_progress: 20 },
  { step_number: 6, think_aloud: "Submitting the registration form now. Hoping the password I chose meets their requirements...", screenshot_url: 'https://placehold.co/1280x800/fff7ed/f97316?text=Sign+Up+Form+%E2%80%94+Submitting', emotional_state: 'anxious', action: 'submit', task_progress: 30 },
  { step_number: 7, think_aloud: "Great, it worked! I'm now on a dashboard. There's a prompt to create my first test. The UI looks clean but I'm not sure what 'study' means in this context — is it the same as a test?", screenshot_url: 'https://placehold.co/1280x800/f0fdf4/22c55e?text=Dashboard+%E2%80%94+Welcome+Screen', emotional_state: 'confused', action: 'navigate', task_progress: 40 },
  { step_number: 8, think_aloud: "I see a URL input field and a button that says 'New Test'. Let me paste in the website URL I want to test.", screenshot_url: 'https://placehold.co/1280x800/eff6ff/3b82f6?text=Dashboard+%E2%80%94+New+Test+Button', emotional_state: 'curious', action: 'click', task_progress: 45 },
  { step_number: 9, think_aloud: "Typing the URL of the site I want to evaluate. The input field has a nice placeholder showing the expected format.", screenshot_url: 'https://placehold.co/1280x800/faf5ff/a855f7?text=Test+Setup+%E2%80%94+URL+Input', emotional_state: 'confident', action: 'type', task_progress: 50 },
  { step_number: 10, think_aloud: "Now I need to scroll down to see the task definition area. The page is longer than I expected.", screenshot_url: 'https://placehold.co/1280x800/f5f5f4/a8a29e?text=Test+Setup+%E2%80%94+Scrolling+Down', emotional_state: 'neutral', action: 'scroll', task_progress: 55 },
  { step_number: 11, think_aloud: "Found the task input. I'll describe what I want the AI personas to do: 'Find the pricing page and compare the available plans.'", screenshot_url: 'https://placehold.co/1280x800/ecfdf5/10b981?text=Test+Setup+%E2%80%94+Task+Input', emotional_state: 'confident', action: 'type', task_progress: 65 },
  { step_number: 12, think_aloud: "Now selecting personas. There are pre-built options like 'Tech-Savvy Developer' and 'Senior Citizen'. I'll pick a couple that seem relevant.", screenshot_url: 'https://placehold.co/1280x800/fdf4ff/d946ef?text=Test+Setup+%E2%80%94+Persona+Selection', emotional_state: 'delighted', action: 'click', task_progress: 75 },
  { step_number: 13, think_aloud: "Everything looks good. Let me click 'Run Test' to start the study. Excited to see the results!", screenshot_url: 'https://placehold.co/1280x800/fff1f2/f43f5e?text=Test+Setup+%E2%80%94+Run+Test', emotional_state: 'excited', action: 'submit', task_progress: 90 },
  { step_number: 14, think_aloud: "Done! I've completed all the tasks. The site was mostly easy to use, though the password requirements could be shown upfront.", screenshot_url: 'https://placehold.co/1280x800/f0fdf4/22c55e?text=Session+Complete', emotional_state: 'satisfied', action: 'complete', task_progress: 100 },
];


function RuntimeClock({ startedAt, stopped }: { startedAt: string; stopped?: boolean }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  );

  useEffect(() => {
    if (stopped) return;
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, stopped]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return <span className="tabular-nums">{parts.join(' ')}</span>;
}

const LOG_MESSAGES = [
  'Initialized study d0feff36...',
  'Connecting to browser pool...',
  'Browser session created for Sarah Chen',
  'Browser session created for James Okonkwo',
  'Sarah Chen: navigating to https://example.com',
  'James Okonkwo: navigating to https://example.com',
  'Sarah Chen: page loaded (2.3s)',
  'Sarah Chen: screenshot captured',
  'Sarah Chen: LLM decision — click "Get Started"',
  'James Okonkwo: page loaded (3.1s)',
  'James Okonkwo: screenshot captured',
  'Sarah Chen: form submitted',
  'Sarah Chen: analyzing screenshot...',
  'James Okonkwo: scrolling to find navigation',
];

type PersonaKey = 'sarah' | 'james';
type RunningTab = 'steps' | 'browser' | 'log';
type CompleteTab = 'issues' | 'replay' | 'heatmap' | 'report';

export default function TimelineDemoPage() {
  const [steps, setSteps] = useState<StepHistoryEntry[]>([]);
  const [logs, setLogs] = useState<{ timestamp: string; level: string; message: string }[]>([]);
  const [playing, setPlaying] = useState(false);
  const indexRef = useRef(0);
  const [addedCount, setAddedCount] = useState(0);
  const [startedAt] = useState(() => new Date().toISOString());
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<PersonaKey>('sarah');
  const [runningTab, setRunningTab] = useState<RunningTab>('browser');
  const [completeTab, setCompleteTab] = useState<CompleteTab>('issues');

  const addNextStep = useCallback(() => {
    const idx = indexRef.current;
    if (idx >= MOCK_STEPS.length) return;
    const entry: StepHistoryEntry = { ...MOCK_STEPS[idx], timestamp: Date.now() };
    indexRef.current = idx + 1;
    setSteps((s) => [...s, entry]);
    setAddedCount(indexRef.current);
    if (idx < LOG_MESSAGES.length) {
      setLogs((l) => [...l, { timestamp: new Date().toISOString(), level: 'info', message: LOG_MESSAGES[idx] }]);
    }
  }, []);

  useEffect(() => {
    if (!playing || indexRef.current >= MOCK_STEPS.length) {
      if (indexRef.current >= MOCK_STEPS.length) {
        setPlaying(false);
        setCompletedAt((prev) => prev ?? new Date());
      }
      return;
    }
    const timer = setTimeout(addNextStep, 1500);
    return () => clearTimeout(timer);
  }, [playing, addedCount, addNextStep]);

  const reset = () => {
    setSteps([]);
    setLogs([]);
    indexRef.current = 0;
    setAddedCount(0);
    setPlaying(false);
    setCompletedAt(null);
  };

  const addAll = () => {
    const now = Date.now();
    const all = MOCK_STEPS.map((s, i) => ({ ...s, timestamp: now - (MOCK_STEPS.length - i) * 5000 }));
    setSteps(all);
    indexRef.current = MOCK_STEPS.length;
    setAddedCount(MOCK_STEPS.length);
    setPlaying(false);
    setCompletedAt(new Date());
    setLogs(LOG_MESSAGES.map((msg, i) => ({
      timestamp: new Date(now - (LOG_MESSAGES.length - i) * 3000).toISOString(),
      level: 'info',
      message: msg,
    })));
  };

  const isComplete = addedCount >= MOCK_STEPS.length;

  const formatCompletedDate = (date: Date) => {
    const day = date.getDate();
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${month} ${day}${suffix}, ${year}`;
  };
  const percent = addedCount === 0 ? 0 : isComplete ? 100 : Math.round((addedCount / MOCK_STEPS.length) * 80);
  const cost = (addedCount * 0.0023).toFixed(2);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 pl-3 pr-6 text-[14px] bg-[#F9F9FC]">
          <span className="text-foreground/30 py-2.5">Test</span>
          <span className="-ml-2 font-normal text-foreground py-2.5">example-1</span>
          <div className="self-stretch w-px bg-foreground/15" />
          <span className="text-foreground/30 py-2.5">Website</span>
          <span className="-ml-2 font-normal text-foreground truncate py-2.5">example.com</span>
          <div className="self-stretch w-px bg-foreground/15" />
          <span className="text-foreground/30 py-2.5">Testers</span>
          <span className="-ml-2 font-normal text-foreground py-2.5">2</span>
          <div className="self-stretch w-px bg-foreground/15" />
          <span className="text-foreground/30 py-2.5">Status</span>
          <span className="-ml-2 inline-flex items-center gap-1 py-2.5">
            {addedCount > 0 && addedCount < MOCK_STEPS.length ? (
              <span className="relative inline-flex h-1 w-1">
                <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-green-400 opacity-50" />
                <span className="relative inline-flex h-1 w-1 rounded-full bg-green-500" />
              </span>
            ) : addedCount >= MOCK_STEPS.length ? (
              <span className="text-green-500 text-xs leading-none">&#10003;</span>
            ) : (
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
            )}
            <span className="font-normal text-foreground">
              {addedCount > 0 && addedCount < MOCK_STEPS.length ? 'Running' : isComplete ? 'Done' : 'Starting'}
            </span>
          </span>
          {isComplete && completedAt ? (
            <>
              <div className="self-stretch w-px bg-foreground/15" />
              <span className="text-foreground/30 py-2.5">Date</span>
              <span className="-ml-2 font-normal text-foreground py-2.5">{formatCompletedDate(completedAt)}</span>
            </>
          ) : (
            <>
              <div className="self-stretch w-px bg-foreground/15" />
              <span className="text-foreground/30 py-2.5">Progress</span>
              <div className="-ml-1 flex items-center gap-0.5">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 w-2.5 rounded-sm transition-colors duration-300 ${
                      idx < Math.round((percent / 100) * 10) ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <span className="-ml-1 font-normal text-foreground py-2.5">{percent}%</span>
            </>
          )}
          <div className="self-stretch w-px bg-foreground/15" />
          <span className="text-foreground/30 py-2.5">Runtime</span>
          <span className="-ml-2 font-normal text-foreground py-2.5">
            <RuntimeClock startedAt={startedAt} stopped={addedCount >= MOCK_STEPS.length} />
          </span>
          <div className="self-stretch w-px bg-foreground/15" />
          <span className="text-foreground/30 py-2.5">Cost</span>
          <span className="-ml-2 font-normal text-foreground tabular-nums py-2.5">${cost}</span>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1">
                  Demo
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setPlaying((p) => !p)}
                  disabled={addedCount >= MOCK_STEPS.length}
                >
                  {playing ? 'Pause' : 'Autoplay'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={addNextStep}
                  disabled={addedCount >= MOCK_STEPS.length}
                >
                  Add step
                </DropdownMenuItem>
                <DropdownMenuItem onClick={addAll}>
                  All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={reset}>
                  Reset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </div>
      <div className="border-b border-border" />

      {/* Goals */}
      <div className="px-6 pt-3 pb-4">
        <p className="text-[14px] uppercase text-foreground/30 mb-1.5">Tasks</p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md border border-border px-2.5 py-1 text-[13px] text-foreground">
            Find the pricing page and compare plans
          </span>
          <span className="inline-flex items-center rounded-md border border-border px-2.5 py-1 text-[13px] text-foreground">
            Sign up for a free trial
          </span>
        </div>
      </div>

      {/* Overview — only when complete */}
      {isComplete && (
        <div className="px-6 pb-4">
          <p className="text-[14px] uppercase text-foreground/30 mb-1.5">Overview</p>
          <p className="text-[14px] text-foreground/70 leading-relaxed">The site was mostly easy to navigate, though the sign-up flow has a notable friction point: password requirements are not displayed upfront, causing users to guess and retry. The pricing page was easy to find but plan comparison could be clearer. Both personas completed all tasks successfully.</p>
        </div>
      )}

      {/* Summary cards — only when complete */}
      {isComplete && (
        <div className="px-6 pb-4">
          <p className="text-[14px] uppercase text-foreground/30 mb-1.5">Metrics</p>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-[13px] text-muted-foreground/60">Overall score</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={cn('text-2xl font-semibold tabular-nums', scoreColor(72).text)}>72</span>
              <span className={cn('text-sm font-medium uppercase tracking-wide opacity-60', scoreColor(72).text)}>{scoreLabel(72)}</span>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-[13px] text-muted-foreground/60">Issues found</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">8</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-[13px] text-muted-foreground/60">Task completion</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">100%</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-[13px] text-muted-foreground/60">Average mood</p>
            <p className="mt-1 text-2xl font-semibold">Satisfied</p>
          </div>
        </div>
        </div>
      )}

      {/* Content — fixed two-column layout */}
      <div className="flex items-start gap-4 px-6 pb-6 mt-1.5">
        {/* Left: persona cards */}
        <div className="w-[720px] shrink-0">
          <p className="text-[14px] uppercase text-foreground/30 mb-1.5">Testers</p>
          <div className="space-y-3">
            <PersonaProgressCard
              personaName="Sarah Chen"
              personaAvatarUrl="https://api.dicebear.com/9.x/notionists/svg?seed=Sarah"
              personaDescription="32-year-old product manager who values efficiency and clean design. Moderate tech literacy."
              personaProfile={{
                age: 32,
                occupation: 'Product Manager',
                device_preference: 'desktop',
                tech_literacy: 'moderate',
                patience_level: 'medium',
                frustration_triggers: ['slow loading', 'confusing navigation', 'hidden pricing'],
              }}
              stepNumber={steps.length > 0 ? steps[steps.length - 1].step_number : 0}
              totalSteps={MOCK_STEPS.length}
              thinkAloud={steps.length > 0 ? steps[steps.length - 1].think_aloud : 'Waiting to start...'}
              screenshotUrl=""
              emotionalState={steps.length > 0 ? steps[steps.length - 1].emotional_state : 'curious'}
              action={steps.length > 0 ? steps[steps.length - 1].action : 'navigating'}
              taskProgress={steps.length > 0 ? steps[steps.length - 1].task_progress : 0}
              completed={addedCount >= MOCK_STEPS.length}
              sessionStatus={isComplete ? 'complete' : 'running'}
              selected={selectedPersona === 'sarah'}
              onSelect={() => setSelectedPersona('sarah')}
            />
            <PersonaProgressCard
              personaName="James Okonkwo"
              personaAvatarUrl="https://api.dicebear.com/9.x/notionists/svg?seed=James"
              personaDescription="68-year-old retired teacher with low tech literacy. Patient but easily confused by jargon."
              personaProfile={{
                age: 68,
                occupation: 'Retired Teacher',
                device_preference: 'tablet',
                tech_literacy: 'low',
                patience_level: 'high',
                frustration_triggers: ['small text', 'technical jargon', 'too many options'],
                accessibility_needs: ['large text', 'high contrast'],
              }}
              stepNumber={0}
              totalSteps={0}
              thinkAloud="Waiting to start..."
              screenshotUrl=""
              emotionalState="curious"
              action="navigating"
              taskProgress={0}
              completed={false}
              selected={selectedPersona === 'james'}
              onSelect={() => setSelectedPersona('james')}
            />
          </div>
        </div>

        {/* Right: tabbed panel */}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] uppercase text-foreground/30 mb-1.5">Feed</p>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
          {isComplete ? (
            <Tabs value={completeTab} onValueChange={(v) => setCompleteTab(v as CompleteTab)}>
              <div className="border-b border-border">
                <TabsList variant="line" className="px-3">
                  <TabsTrigger value="issues">Issues</TabsTrigger>
                  <TabsTrigger value="replay">Replay</TabsTrigger>
                  <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                  <TabsTrigger value="report">Report</TabsTrigger>
                </TabsList>
              </div>
              <div style={{ height: '460px' }}>
                <TabsContent value="issues" className="h-full m-0">
                  <div className="flex h-full items-center justify-center bg-muted/30">
                    <p className="text-sm text-muted-foreground/50">
                      Issues not available in demo mode
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="replay" className="h-full m-0">
                  <div className="flex h-full items-center justify-center bg-muted/30">
                    <p className="text-sm text-muted-foreground/50">
                      Replay not available in demo mode
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="heatmap" className="h-full m-0">
                  <div className="flex h-full items-center justify-center bg-muted/30">
                    <p className="text-sm text-muted-foreground/50">
                      Heatmap not available in demo mode
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="report" className="h-full m-0">
                  <div className="flex h-full items-center justify-center bg-muted/30">
                    <p className="text-sm text-muted-foreground/50">
                      Report not available in demo mode
                    </p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <Tabs value={runningTab} onValueChange={(v) => setRunningTab(v as RunningTab)}>
              <div className="border-b border-border">
                <TabsList variant="line" className="px-3">
                  <TabsTrigger value="steps">Steps</TabsTrigger>
                  <TabsTrigger value="browser">Browser</TabsTrigger>
                  <TabsTrigger value="log">Log</TabsTrigger>
                </TabsList>
              </div>
              <div style={{ height: '460px' }}>
                <TabsContent value="steps" className="h-full m-0">
                  <LiveStepTimeline steps={selectedPersona === 'sarah' ? steps : []} />
                </TabsContent>
                <TabsContent value="browser" className="h-full m-0">
                  <div className="flex h-full items-center justify-center bg-muted/30">
                    <p className="text-sm text-muted-foreground/50">
                      Browser not available in demo mode
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="log" className="h-full m-0">
                  <div className="h-full overflow-y-auto p-3 font-mono text-xs">
                    {logs.length === 0 ? (
                      <p className="text-muted-foreground/40">Waiting for logs...</p>
                    ) : (
                      logs.map((entry, i) => (
                        <div key={i} className="flex gap-2 py-0.5">
                          <span className="shrink-0 tabular-nums text-muted-foreground/30">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={cn(
                            entry.level === 'error' ? 'text-red-500' :
                            entry.level === 'warn' ? 'text-yellow-500' :
                            'text-muted-foreground/70'
                          )}>
                            {entry.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
