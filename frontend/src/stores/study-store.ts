import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  session_id?: string;
}

export interface StepHistoryEntry {
  step_number: number;
  think_aloud: string;
  screenshot_url: string;
  emotional_state: string;
  action: string;
  task_progress: number;
  timestamp: number;
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
  screencast_available: boolean;
  step_history: StepHistoryEntry[];
}

interface StudyCost {
  llm_cost_usd: number;
  browser_cost_usd: number;
  total_cost_usd: number;
  savings_vs_cloud_usd: number;
  browser_mode: string;
  llm_api_calls: number;
  llm_total_tokens: number;
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
  cost: StudyCost | null;
}

interface StudyStore {
  activeStudy: StudyProgress | null;
  logs: LogEntry[];
  addLog: (level: LogEntry['level'], message: string, sessionId?: string) => void;
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

export const useStudyStore = create<StudyStore>()(
  persist(
    (set, get) => ({
  activeStudy: null,
  logs: [],

  addLog: (level, message, sessionId?) => {
    set((state) => ({
      logs: [...state.logs.slice(-199), { timestamp: Date.now(), level, message, session_id: sessionId }],
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
        cost: null,
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
        cost: null,
      };
      set({ activeStudy: current });
    }

    if (messageStudyId && messageStudyId !== current.study_id) {
      return;
    }

    const log = get().addLog;

    switch (msg.type) {
      case 'study:progress': {
        log('info', `Study progress: ${msg.percent}% — phase: ${msg.phase}`);
        const progressCost = msg.cost
          ? {
              llm_cost_usd: msg.cost.total_cost_usd,
              browser_cost_usd: 0,
              total_cost_usd: msg.cost.total_cost_usd,
              savings_vs_cloud_usd: 0,
              browser_mode: current.cost?.browser_mode ?? 'unknown',
              llm_api_calls: msg.cost.llm_api_calls,
              llm_total_tokens: msg.cost.llm_total_tokens,
            }
          : current.cost;
        set({
          activeStudy: {
            ...current,
            percent: msg.percent,
            phase: msg.phase,
            cost: progressCost,
          },
        });
        break;
      }

      case 'session:step': {
        const step = msg as WsSessionStep;
        const actionStr = normalizeAction(step.action);
        log('info', `[${step.persona_name}] Step ${step.step_number}: ${actionStr} — ${step.think_aloud?.slice(0, 80)}…`, step.session_id);
        const existing = current.personas[step.session_id];

        // Build step history — inject synthetic "start" on first step
        const prevHistory = existing?.step_history ?? [];
        const newEntry: StepHistoryEntry = {
          step_number: step.step_number,
          think_aloud: step.think_aloud,
          screenshot_url: step.screenshot_url,
          emotional_state: step.emotional_state,
          action: actionStr,
          task_progress: step.task_progress,
          timestamp: Date.now(),
        };
        let history = prevHistory;
        if (prevHistory.length === 0) {
          // Inject synthetic "start" entry
          history = [{ step_number: 0, think_aloud: 'Starting navigation...', screenshot_url: '', emotional_state: 'curious', action: 'start', task_progress: 0, timestamp: Date.now() - 1 }];
        }
        // Deduplicate by step_number, then append
        if (!history.some((e) => e.step_number === newEntry.step_number)) {
          history = [...history, newEntry].slice(-50);
        }

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
          screencast_available: existing?.screencast_available ?? false,
          step_history: history,
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
        log('info', `[${completedPersona}] Session complete — ${msg.total_steps} steps`, msg.session_id);
        if (current.personas[msg.session_id]) {
          const prevHistory = current.personas[msg.session_id].step_history ?? [];
          const completeEntry: StepHistoryEntry = {
            step_number: msg.total_steps + 1,
            think_aloud: 'Session completed successfully.',
            screenshot_url: '',
            emotional_state: 'satisfied',
            action: 'complete',
            task_progress: 100,
            timestamp: Date.now(),
          };
          const updated = {
            ...current.personas[msg.session_id],
            completed: true,
            total_steps: msg.total_steps,
            step_history: [...prevHistory, completeEntry].slice(-50),
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
        log('info', `[${msg.persona_name}] Browser live view connected`, msg.session_id);
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
          screencast_available: existing?.screencast_available ?? false,
          step_history: existing?.step_history ?? [],
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
        log('warn', `[${closedPersona}] Browser closed`, msg.session_id);
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

      case 'session:screencast_started': {
        log('info', `[${msg.persona_name}] Screencast started`, msg.session_id);
        const existing = current.personas[msg.session_id];
        set({
          activeStudy: {
            ...current,
            personas: {
              ...current.personas,
              [msg.session_id]: {
                ...(existing ?? {
                  persona_name: msg.persona_name,
                  session_id: msg.session_id,
                  step_number: 0,
                  think_aloud: 'Starting navigation...',
                  screenshot_url: '',
                  emotional_state: 'curious',
                  action: 'navigating',
                  task_progress: 0,
                  completed: false,
                  total_steps: 0,
                  live_view_url: null,
                  browser_active: true,
                  step_history: [],
                }),
                screencast_available: true,
              },
            },
          },
        });
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
            screencast_available: snapshot.screencast_available ?? existing?.screencast_available ?? false,
            step_history: existing?.step_history ?? [],
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

      case 'session:browser_failover': {
        const failoverMsg = msg as { session_id: string; persona_name: string; message: string };
        log('warn', `[${failoverMsg.persona_name}] Browser failover: ${failoverMsg.message}`, failoverMsg.session_id);
        break;
      }

      case 'study:analyzing':
        log('info', `Analyzing: ${msg.phase}`);
        set({
          activeStudy: { ...current, phase: msg.phase },
        });
        break;

      case 'study:complete': {
        const costInfo = msg.cost
          ? ` — cost: $${msg.cost.total_cost_usd.toFixed(4)}${msg.cost.savings_vs_cloud_usd > 0 ? ` (saved $${msg.cost.savings_vs_cloud_usd.toFixed(4)})` : ''}`
          : '';
        log('info', `Study complete — score: ${msg.score}/100, ${msg.issues_count} issues${costInfo}`);
        set({
          activeStudy: {
            ...current,
            isComplete: true,
            percent: 100,
            finalScore: msg.score,
            issuesCount: msg.issues_count,
            cost: msg.cost ?? null,
          },
        });
        break;
      }

      case 'study:error':
        log('error', `Error: ${msg.error}`);
        set({
          activeStudy: { ...current, error: msg.error },
        });
        break;
    }
  },

  reset: () => set({ activeStudy: null, logs: [] }),
    }),
    {
      name: 'miror-study-progress',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
