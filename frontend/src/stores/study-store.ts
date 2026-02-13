import { create } from 'zustand';
import type {
  WsServerMessage,
  WsSessionSnapshotState,
  WsSessionStep,
} from '@/types/ws';

function resolveLiveViewUrl(
  existingUrl: string | null | undefined,
  incomingUrl: string | null | undefined,
): string | null {
  if (typeof incomingUrl === 'string' && incomingUrl.trim().length > 0) {
    return incomingUrl;
  }
  return existingUrl ?? null;
}

function normalizeAction(action: unknown, fallback = 'navigating'): string {
  if (typeof action === 'string' && action.length > 0) {
    return action;
  }
  if (action && typeof action === 'object' && 'type' in action) {
    const actionType = (action as { type?: unknown }).type;
    if (typeof actionType === 'string' && actionType.length > 0) {
      return actionType;
    }
  }
  return fallback;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

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
  live_view_url: string | null;
  browser_active: boolean;
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
  logs: LogEntry[];
  addLog: (level: LogEntry['level'], message: string) => void;
  initStudy: (studyId: string) => void;
  handleWsMessage: (msg: WsServerMessage) => void;
  reset: () => void;
}

function inferStudyId(msg: WsServerMessage): string | null {
  if ('study_id' in msg && typeof msg.study_id === 'string') {
    return msg.study_id;
  }
  return null;
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  activeStudy: null,
  logs: [],

  addLog: (level, message) => {
    set((state) => ({
      logs: [...state.logs.slice(-199), { timestamp: Date.now(), level, message }],
    }));
  },

  initStudy: (studyId: string) => {
    set({
      logs: [{ timestamp: Date.now(), level: 'info', message: `Initialized study ${studyId.slice(0, 8)}…` }],
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
    let current = get().activeStudy;
    const messageStudyId = inferStudyId(msg);

    // Handle WS timing races by lazily creating state when snapshot/progress
    // arrives before initStudy() has run.
    if (!current) {
      if (!messageStudyId) return;
      current = {
        study_id: messageStudyId,
        percent: 0,
        phase: null,
        personas: {},
        error: null,
        isComplete: false,
        finalScore: null,
        issuesCount: null,
      };
      set({ activeStudy: current });
    }

    if (messageStudyId && messageStudyId !== current.study_id) {
      return;
    }

    const log = get().addLog;

    switch (msg.type) {
      case 'study:progress':
        log('info', `Study progress: ${msg.percent}% — phase: ${msg.phase}`);
        set({
          activeStudy: { ...current, percent: msg.percent, phase: msg.phase },
        });
        break;

      case 'session:step': {
        const step = msg as WsSessionStep;
        const actionStr = normalizeAction(step.action);
        log('info', `[${step.persona_name}] Step ${step.step_number}: ${actionStr} — ${step.think_aloud?.slice(0, 80)}…`);
        const existing = current.personas[step.session_id];
        const persona: PersonaProgress = {
          persona_name: step.persona_name,
          session_id: step.session_id,
          step_number: step.step_number,
          think_aloud: step.think_aloud,
          screenshot_url: step.screenshot_url,
          emotional_state: step.emotional_state,
          action: actionStr,
          task_progress: step.task_progress,
          completed: false,
          total_steps: step.step_number,
          live_view_url: resolveLiveViewUrl(existing?.live_view_url, step.live_view_url),
          browser_active: existing?.browser_active ?? true,
        };
        set({
          activeStudy: {
            ...current,
            personas: { ...current.personas, [step.session_id]: persona },
          },
        });
        break;
      }

      case 'session:complete': {
        const completedPersona = current.personas[msg.session_id]?.persona_name ?? msg.session_id.slice(0, 8);
        log('info', `[${completedPersona}] Session complete — ${msg.total_steps} steps`);
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
      }

      case 'session:live_view': {
        log('info', `[${msg.persona_name}] Browser live view connected`);
        const existing = current.personas[msg.session_id];
        const persona: PersonaProgress = {
          persona_name: msg.persona_name,
          session_id: msg.session_id,
          step_number: existing?.step_number ?? 0,
          think_aloud: existing?.think_aloud ?? 'Starting navigation...',
          screenshot_url: existing?.screenshot_url ?? '',
          emotional_state: existing?.emotional_state ?? 'curious',
          action: existing?.action ?? 'navigating',
          task_progress: existing?.task_progress ?? 0,
          completed: false,
          total_steps: existing?.total_steps ?? 0,
          live_view_url: resolveLiveViewUrl(existing?.live_view_url, msg.live_view_url),
          browser_active: true,
        };
        set({
          activeStudy: {
            ...current,
            personas: { ...current.personas, [msg.session_id]: persona },
          },
        });
        break;
      }

      case 'session:browser_closed': {
        const closedPersona = current.personas[msg.session_id]?.persona_name ?? msg.session_id.slice(0, 8);
        log('warn', `[${closedPersona}] Browser closed`);
        if (current.personas[msg.session_id]) {
          set({
            activeStudy: {
              ...current,
              personas: {
                ...current.personas,
                [msg.session_id]: {
                  ...current.personas[msg.session_id],
                  browser_active: false,
                },
              },
            },
          });
        }
        break;
      }

      case 'study:session_snapshot': {
        const mergedPersonas: Record<string, PersonaProgress> = { ...current.personas };
        for (const [sessionId, state] of Object.entries(msg.sessions)) {
          const snapshot = state as WsSessionSnapshotState;
          const existing = mergedPersonas[sessionId];
          mergedPersonas[sessionId] = {
            persona_name: snapshot.persona_name ?? existing?.persona_name ?? 'Tester',
            session_id: sessionId,
            step_number: snapshot.step_number ?? existing?.step_number ?? 0,
            think_aloud:
              snapshot.think_aloud ?? existing?.think_aloud ?? 'Starting navigation...',
            screenshot_url: snapshot.screenshot_url ?? existing?.screenshot_url ?? '',
            emotional_state:
              (snapshot.emotional_state as string | undefined)
              ?? existing?.emotional_state
              ?? 'curious',
            action: normalizeAction(snapshot.action, existing?.action ?? 'navigating'),
            task_progress: snapshot.task_progress ?? existing?.task_progress ?? 0,
            completed: snapshot.completed ?? existing?.completed ?? false,
            total_steps: snapshot.total_steps ?? existing?.total_steps ?? 0,
            live_view_url: resolveLiveViewUrl(
              existing?.live_view_url,
              snapshot.live_view_url,
            ),
            browser_active: snapshot.browser_active ?? existing?.browser_active ?? true,
          };
        }
        set({
          activeStudy: {
            ...current,
            personas: mergedPersonas,
          },
        });
        break;
      }

      case 'study:analyzing':
        log('info', `Analyzing: ${msg.phase}`);
        set({
          activeStudy: { ...current, phase: msg.phase },
        });
        break;

      case 'study:complete':
        log('info', `Study complete — score: ${msg.score}/100, ${msg.issues_count} issues`);
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
        log('error', `Error: ${msg.error}`);
        set({
          activeStudy: { ...current, error: msg.error },
        });
        break;
    }
  },

  reset: () => set({ activeStudy: null, logs: [] }),
}));
