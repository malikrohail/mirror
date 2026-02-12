import { create } from 'zustand';
import type { WsSessionStep, WsServerMessage } from '@/types/ws';

interface PersonaProgress {
  persona_name: string;
  session_id: string;
  step_number: number;
  think_aloud: string;
  screenshot_url: string;
  emotional_state: string;
  action: string;
  task_progress: number;
  completed: boolean;
  total_steps: number;
}

interface StudyProgress {
  study_id: string;
  percent: number;
  phase: string | null;
  personas: Record<string, PersonaProgress>;
  error: string | null;
  isComplete: boolean;
  finalScore: number | null;
  issuesCount: number | null;
}

interface StudyStore {
  activeStudy: StudyProgress | null;
  initStudy: (studyId: string) => void;
  handleWsMessage: (msg: WsServerMessage) => void;
  reset: () => void;
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  activeStudy: null,

  initStudy: (studyId: string) => {
    set({
      activeStudy: {
        study_id: studyId,
        percent: 0,
        phase: null,
        personas: {},
        error: null,
        isComplete: false,
        finalScore: null,
        issuesCount: null,
      },
    });
  },

  handleWsMessage: (msg: WsServerMessage) => {
    const current = get().activeStudy;
    if (!current) return;

    switch (msg.type) {
      case 'study:progress':
        set({
          activeStudy: { ...current, percent: msg.percent, phase: msg.phase },
        });
        break;

      case 'session:step': {
        const step = msg as WsSessionStep;
        const persona: PersonaProgress = {
          persona_name: step.persona_name,
          session_id: step.session_id,
          step_number: step.step_number,
          think_aloud: step.think_aloud,
          screenshot_url: step.screenshot_url,
          emotional_state: step.emotional_state,
          action: step.action,
          task_progress: step.task_progress,
          completed: false,
          total_steps: step.step_number,
        };
        set({
          activeStudy: {
            ...current,
            personas: { ...current.personas, [step.session_id]: persona },
          },
        });
        break;
      }

      case 'session:complete':
        if (current.personas[msg.session_id]) {
          const updated = {
            ...current.personas[msg.session_id],
            completed: true,
            total_steps: msg.total_steps,
          };
          set({
            activeStudy: {
              ...current,
              personas: { ...current.personas, [msg.session_id]: updated },
            },
          });
        }
        break;

      case 'study:analyzing':
        set({
          activeStudy: { ...current, phase: msg.phase },
        });
        break;

      case 'study:complete':
        set({
          activeStudy: {
            ...current,
            isComplete: true,
            percent: 100,
            finalScore: msg.score,
            issuesCount: msg.issues_count,
          },
        });
        break;

      case 'study:error':
        set({
          activeStudy: { ...current, error: msg.error },
        });
        break;
    }
  },

  reset: () => set({ activeStudy: null }),
}));
