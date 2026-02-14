// ── Study ──────────────────────────────────────────────

export type StudyStatus = 'setup' | 'running' | 'analyzing' | 'complete' | 'failed';

export interface TaskCreate {
  description: string;
  order_index?: number;
}

export interface StudyCreate {
  url: string;
  starting_path?: string;
  tasks: TaskCreate[];
  persona_template_ids: string[];
}

export interface TaskOut {
  id: string;
  study_id: string;
  description: string;
  order_index: number;
  created_at: string;
}

export interface PersonaOut {
  id: string;
  study_id: string;
  template_id: string | null;
  profile: Record<string, unknown>;
  is_custom: boolean;
  created_at: string;
}

export interface StudyOut {
  id: string;
  url: string;
  starting_path: string;
  status: StudyStatus;
  overall_score: number | null;
  executive_summary: string | null;
  created_at: string;
  updated_at: string;
  tasks: TaskOut[];
  personas: PersonaOut[];

  // Cost tracking
  llm_input_tokens: number | null;
  llm_output_tokens: number | null;
  llm_total_tokens: number | null;
  llm_api_calls: number | null;
  llm_cost_usd: number | null;
  browser_mode: string | null;
  browser_cost_usd: number | null;
  total_cost_usd: number | null;
}

export interface StudySummary {
  id: string;
  url: string;
  status: StudyStatus;
  overall_score: number | null;
  created_at: string;
  updated_at?: string;
  tasks?: TaskOut[];
  personas?: PersonaOut[];
  task_count?: number;
  persona_count?: number;
}

export interface StudyListResponse {
  items: StudySummary[];
  total: number;
  page: number;
  limit: number;
}

export interface StudyRunResponse {
  study_id: string;
  job_id: string;
  status: string;
}

export interface StudyStatusResponse {
  study_id: string;
  status: StudyStatus;
  percent: number;
  phase: 'navigating' | 'analyzing' | 'synthesizing' | null;
}

// ── Session ───────────────────────────────────────────

export type SessionStatus = 'pending' | 'running' | 'complete' | 'failed' | 'gave_up';
export type EmotionalState = 'curious' | 'confused' | 'frustrated' | 'satisfied' | 'stuck';
export type ActionType = 'click' | 'type' | 'scroll' | 'submit' | 'navigate' | 'wait';

export interface SessionOut {
  id: string;
  study_id: string;
  persona_id: string;
  task_id: string;
  status: SessionStatus;
  total_steps: number;
  task_completed: boolean;
  summary: string | null;
  emotional_arc: Record<string, EmotionalState> | null;
  live_view_url?: string | null;
  browser_active?: boolean | null;
  created_at: string;
}

export interface StepOut {
  id: string;
  session_id: string;
  step_number: number;
  page_url: string | null;
  page_title: string | null;
  screenshot_path: string | null;
  think_aloud: string | null;
  action_type: ActionType | null;
  action_selector: string | null;
  action_value: string | null;
  confidence: number | null;
  task_progress: number | null;
  emotional_state: EmotionalState | null;
  click_x: number | null;
  click_y: number | null;
  viewport_width: number | null;
  viewport_height: number | null;
  created_at: string;
}

export interface SessionDetail extends SessionOut {
  steps: StepOut[];
  issues: IssueOut[];
}

// ── Issue ─────────────────────────────────────────────

export type Severity = 'critical' | 'major' | 'minor' | 'enhancement';

export interface IssueOut {
  id: string;
  step_id: string | null;
  session_id: string;
  study_id: string;
  element: string | null;
  description: string;
  severity: Severity;
  heuristic: string | null;
  wcag_criterion: string | null;
  recommendation: string | null;
  page_url: string | null;
  step_number: number | null;
  created_at: string;
}

// ── Insight ───────────────────────────────────────────

export type InsightType = 'universal' | 'persona_specific' | 'comparative' | 'recommendation';

export interface InsightOut {
  id: string;
  study_id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: string | null;
  impact: string | null;
  effort: string | null;
  personas_affected: Record<string, boolean> | null;
  evidence: Record<string, unknown> | null;
  rank: number | null;
  created_at: string;
}

// ── Persona ───────────────────────────────────────────

export interface PersonaTemplateOut {
  id: string;
  name: string;
  emoji: string;
  category: string;
  short_description: string;
  default_profile: Record<string, unknown>;
  avatar_url: string;
  created_at: string;
}

export interface PersonaGenerateRequest {
  description: string;
}

// ── Heatmap ───────────────────────────────────────────

export interface HeatmapDataPoint {
  page_url: string;
  click_x: number;
  click_y: number;
  viewport_width: number;
  viewport_height: number;
  persona_name: string | null;
}

export interface HeatmapResponse {
  page_url: string;
  data_points: HeatmapDataPoint[];
  total_clicks: number;
  page_screenshots: Record<string, string>;
}

// ── Report ────────────────────────────────────────────

export interface ReportMetadata {
  study_id: string;
  format: string;
  available_formats: string[];
  generated: boolean;
}

// ── Health ────────────────────────────────────────────

export interface HealthResponse {
  status: 'ok' | 'degraded';
  db: string;
  redis: string;
}

// ── Comparison ───────────────────────────────────────

export interface IssueDiff {
  element: string | null;
  description: string;
  severity: Severity;
  page_url: string | null;
  status: 'fixed' | 'new' | 'persisting' | 'improved' | 'regressed';
}

export interface ComparisonResult {
  baseline_study_id: string;
  comparison_study_id: string;
  baseline_score: number | null;
  comparison_score: number | null;
  score_delta: number;
  score_improved: boolean;
  issues_fixed: IssueDiff[];
  issues_new: IssueDiff[];
  issues_persisting: IssueDiff[];
  total_baseline_issues: number;
  total_comparison_issues: number;
  summary: string;
}

// ── Schedule ─────────────────────────────────────────

export interface ScheduleCreate {
  name: string;
  url: string;
  starting_path?: string;
  tasks: TaskCreate[];
  persona_template_ids: string[];
  cron_expression?: string;
}

export interface ScheduleUpdate {
  name?: string;
  cron_expression?: string;
  status?: 'active' | 'paused';
}

export interface ScheduleOut {
  id: string;
  name: string;
  url: string;
  starting_path: string;
  tasks: Record<string, unknown>[];
  persona_template_ids: string[];
  cron_expression: string | null;
  webhook_secret: string | null;
  status: 'active' | 'paused' | 'deleted';
  last_run_at: string | null;
  next_run_at: string | null;
  last_study_id: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduleListResponse {
  items: ScheduleOut[];
  total: number;
}

export interface ScheduleRunResponse {
  schedule_id: string;
  study_id: string;
  job_id: string;
}

// ── Score History ────────────────────────────────────

export interface ScoreHistoryPoint {
  study_id: string;
  score: number | null;
  status: string;
  created_at: string;
  schedule_id: string | null;
}

export interface ScoreHistoryResponse {
  url: string;
  data_points: ScoreHistoryPoint[];
  total_studies: number;
  average_score: number | null;
  trend: 'improving' | 'declining' | 'stable' | null;
  score_delta: number | null;
}

export interface TrackedUrl {
  url: string;
  study_count: number;
  latest_score: number | null;
  last_tested: string | null;
}

// ── Video ────────────────────────────────────────────

export interface VideoOut {
  id: string;
  session_id: string;
  video_path: string | null;
  duration_seconds: number | null;
  frame_count: number | null;
  has_narration: boolean;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoGenerateResponse {
  video_id: string;
  session_id: string;
  status: string;
  message: string;
}

// ── Fix Suggestions ──────────────────────────────────

export interface FixSuggestionOut {
  issue_id: string;
  element: string | null;
  description: string;
  severity: Severity;
  fix_suggestion: string | null;
  fix_code: string | null;
  fix_language: string | null;
  page_url: string | null;
}

export interface FixGenerateResponse {
  study_id: string;
  fixes_generated: number;
  fixes: FixSuggestionOut[];
}
