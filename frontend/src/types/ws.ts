import type { EmotionalState, ActionType } from './index';

// Client → Server
export interface WsSubscribe {
  type: 'subscribe';
  study_id: string;
}

export interface WsUnsubscribe {
  type: 'unsubscribe';
  study_id: string;
}

export type WsClientMessage = WsSubscribe | WsUnsubscribe;

// Server → Client
export interface WsStudyProgress {
  type: 'study:progress';
  study_id: string;
  percent: number;
  phase: 'navigating' | 'analyzing' | 'synthesizing';
}

export interface WsSessionStep {
  type: 'session:step';
  session_id: string;
  persona_name: string;
  step_number: number;
  think_aloud: string;
  screenshot_url: string;
  emotional_state: EmotionalState;
  action: ActionType | string | { type?: string; description?: string; selector?: string | null };
  task_progress: number;
  live_view_url: string | null;
}

export interface WsSessionComplete {
  type: 'session:complete';
  session_id: string;
  completed: boolean;
  total_steps: number;
}

export interface WsStudyAnalyzing {
  type: 'study:analyzing';
  study_id: string;
  phase: 'synthesis' | 'report_generation' | 'heatmap_generation';
}

export interface WsStudyComplete {
  type: 'study:complete';
  study_id: string;
  score: number;
  issues_count: number;
}

export interface WsStudyError {
  type: 'study:error';
  study_id: string;
  error: string;
}

export interface WsSessionLiveView {
  type: 'session:live_view';
  session_id: string;
  persona_name: string;
  live_view_url: string;
}

export interface WsSessionBrowserClosed {
  type: 'session:browser_closed';
  session_id: string;
}

export interface WsSessionSnapshotState {
  session_id: string;
  persona_name?: string;
  step_number?: number;
  think_aloud?: string;
  screenshot_url?: string;
  emotional_state?: EmotionalState | string;
  action?: ActionType | string | { type?: string; description?: string; selector?: string | null };
  task_progress?: number;
  completed?: boolean;
  total_steps?: number;
  live_view_url?: string | null;
  browser_active?: boolean;
}

export interface WsStudySessionSnapshot {
  type: 'study:session_snapshot';
  study_id: string;
  sessions: Record<string, WsSessionSnapshotState>;
}

export type WsServerMessage =
  | WsStudyProgress
  | WsSessionStep
  | WsSessionComplete
  | WsSessionLiveView
  | WsSessionBrowserClosed
  | WsStudySessionSnapshot
  | WsStudyAnalyzing
  | WsStudyComplete
  | WsStudyError;
