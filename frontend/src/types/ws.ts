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
  action: ActionType;
  task_progress: number;
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

export type WsServerMessage =
  | WsStudyProgress
  | WsSessionStep
  | WsSessionComplete
  | WsStudyAnalyzing
  | WsStudyComplete
  | WsStudyError;
