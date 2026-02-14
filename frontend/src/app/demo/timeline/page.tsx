'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PersonaProgressCard } from '@/components/study/persona-progress-card';
import { Button } from '@/components/ui/button';
import type { StepHistoryEntry } from '@/stores/study-store';

const MOCK_STEPS: Omit<StepHistoryEntry, 'timestamp'>[] = [
  { step_number: 0, think_aloud: 'Starting navigation...', screenshot_url: '', emotional_state: 'curious', action: 'start', task_progress: 0 },
  { step_number: 1, think_aloud: "Alright, I'm on the homepage. There's a big hero section with a headline about AI-powered testing. Let me look for a way to sign up or start a test.", screenshot_url: '', emotional_state: 'curious', action: 'navigate', task_progress: 5 },
  { step_number: 2, think_aloud: "I see a 'Get Started' button in the top right corner. That seems like the most logical place to begin. Let me click it.", screenshot_url: '', emotional_state: 'confident', action: 'click', task_progress: 10 },
  { step_number: 3, think_aloud: "OK, this brought me to a sign-up form. It wants my email and password. Pretty standard. Let me type in my email address first.", screenshot_url: '', emotional_state: 'neutral', action: 'type', task_progress: 15 },
  { step_number: 4, think_aloud: "Now filling in the password field. The password requirements aren't shown upfront — I have to guess what they want. That's a bit frustrating.", screenshot_url: '', emotional_state: 'frustrated', action: 'type', task_progress: 20 },
  { step_number: 5, think_aloud: "Submitting the registration form now. Hoping the password I chose meets their requirements...", screenshot_url: '', emotional_state: 'anxious', action: 'submit', task_progress: 30 },
  { step_number: 6, think_aloud: "Great, it worked! I'm now on a dashboard. There's a prompt to create my first test. The UI looks clean but I'm not sure what 'study' means in this context — is it the same as a test?", screenshot_url: '', emotional_state: 'confused', action: 'navigate', task_progress: 40 },
  { step_number: 7, think_aloud: "I see a URL input field and a button that says 'New Test'. Let me paste in the website URL I want to test.", screenshot_url: '', emotional_state: 'curious', action: 'click', task_progress: 45 },
  { step_number: 8, think_aloud: "Typing the URL of the site I want to evaluate. The input field has a nice placeholder showing the expected format.", screenshot_url: '', emotional_state: 'confident', action: 'type', task_progress: 50 },
  { step_number: 9, think_aloud: "Now I need to scroll down to see the task definition area. The page is longer than I expected.", screenshot_url: '', emotional_state: 'neutral', action: 'scroll', task_progress: 55 },
  { step_number: 10, think_aloud: "Found the task input. I'll describe what I want the AI personas to do: 'Find the pricing page and compare the available plans.'", screenshot_url: '', emotional_state: 'confident', action: 'type', task_progress: 65 },
  { step_number: 11, think_aloud: "Now selecting personas. There are pre-built options like 'Tech-Savvy Developer' and 'Senior Citizen'. I'll pick a couple that seem relevant.", screenshot_url: '', emotional_state: 'delighted', action: 'click', task_progress: 75 },
  { step_number: 12, think_aloud: "Everything looks good. Let me click 'Run Test' to start the study. Excited to see the results!", screenshot_url: '', emotional_state: 'excited', action: 'submit', task_progress: 90 },
  { step_number: 13, think_aloud: "The test is now running! I can see a progress indicator. This is really cool — watching AI personas navigate in real time.", screenshot_url: '', emotional_state: 'delighted', action: 'wait', task_progress: 95 },
];

export default function TimelineDemoPage() {
  const [steps, setSteps] = useState<StepHistoryEntry[]>([]);
  const [playing, setPlaying] = useState(false);
  const indexRef = useRef(0);
  // Display-only counter to trigger re-renders
  const [addedCount, setAddedCount] = useState(0);

  const addNextStep = useCallback(() => {
    const idx = indexRef.current;
    if (idx >= MOCK_STEPS.length) return;
    const entry: StepHistoryEntry = { ...MOCK_STEPS[idx], timestamp: Date.now() };
    indexRef.current = idx + 1;
    setSteps((s) => [...s, entry]);
    setAddedCount(indexRef.current);
  }, []);

  // Auto-play: add a step every 1.5s
  useEffect(() => {
    if (!playing || indexRef.current >= MOCK_STEPS.length) {
      if (indexRef.current >= MOCK_STEPS.length) setPlaying(false);
      return;
    }
    const timer = setTimeout(addNextStep, 1500);
    return () => clearTimeout(timer);
  }, [playing, addedCount, addNextStep]);

  const reset = () => {
    setSteps([]);
    indexRef.current = 0;
    setAddedCount(0);
    setPlaying(false);
  };

  const addAll = () => {
    const now = Date.now();
    const all = MOCK_STEPS.map((s, i) => ({ ...s, timestamp: now - (MOCK_STEPS.length - i) * 5000 }));
    setSteps(all);
    indexRef.current = MOCK_STEPS.length;
    setAddedCount(MOCK_STEPS.length);
    setPlaying(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Live Step Timeline — Demo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mock data — no backend required. Steps arrive one at a time to simulate real-time WebSocket updates.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setPlaying((p) => !p)} disabled={addedCount >= MOCK_STEPS.length}>
          {playing ? 'Pause' : addedCount === 0 ? 'Auto-play' : 'Resume'}
        </Button>
        <Button size="sm" variant="outline" onClick={addNextStep} disabled={addedCount >= MOCK_STEPS.length}>
          Add step ({addedCount}/{MOCK_STEPS.length})
        </Button>
        <Button size="sm" variant="outline" onClick={addAll}>
          Add all
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>

      <PersonaProgressCard
        personaName="Sarah Chen"
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
        completed={false}
        stepHistory={steps}
      />

      {/* Second persona for comparison */}
      <PersonaProgressCard
        personaName="James Okonkwo"
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
        stepHistory={[]}
      />
    </div>
  );
}
