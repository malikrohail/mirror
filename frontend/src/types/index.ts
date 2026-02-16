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
  persona_models?: Record<string, string>;
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
  model: string | null;
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
  started_at: string | null;
  duration_seconds: number | null;
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
  error_message?: string | null;
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
  first_task?: string | null;
  total_cost_usd?: number | null;
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
  ux_score: number | null;
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
export type IssueType = 'ux' | 'accessibility' | 'error' | 'performance';

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
  issue_type: IssueType;
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
  reasoning_trace: string | null;
  created_at: string;
}

// ── Persona ───────────────────────────────────────────

export type PersonaModel = 'opus-4.6' | 'sonnet-4.5' | 'haiku-4.5';

export interface PersonaTemplateOut {
  id: string;
  name: string;
  emoji: string;
  category: string;
  short_description: string;
  default_profile: Record<string, unknown>;
  avatar_url: string;
  model: PersonaModel;
  model_display_name: string;
  estimated_cost_per_run_usd: number;
  created_at: string;
}

export interface PersonaAccessibilityConfig {
  screen_reader?: boolean;
  low_vision?: boolean;
  color_blind?: boolean;
  motor_impairment?: boolean;
  cognitive?: boolean;
  description?: string | null;
}

export interface PersonaGenerationOptions {
  tech_literacy?: number;
  patience_level?: number;
  reading_speed?: number;
  trust_level?: number;
  exploration_tendency?: number;
  device_preference?: 'desktop' | 'mobile' | 'tablet';
  accessibility_needs?: PersonaAccessibilityConfig;
}

export interface PersonaGenerateRequest {
  description: string;
  options?: PersonaGenerationOptions;
  avatar_url?: string;
  model?: PersonaModel;
}

export interface PersonaGenerateDraftResponse extends PersonaGenerationOptions {
  name: string;
  short_description?: string | null;
  emoji?: string | null;
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

// ── Study Plan (Quick Start) ─────────────────────────

export interface StudyPlanRequest {
  description: string;
  url: string;
}

export interface StudyPlanTask {
  description: string;
  order_index: number;
}

export interface StudyPlanPersona {
  template_id: string | null;
  name: string;
  emoji: string;
  reason: string;
}

export interface StudyPlanResponse {
  url: string;
  tasks: StudyPlanTask[];
  personas: StudyPlanPersona[];
  summary: string;
}

// ── Narration ───────────────────────────────────────

export interface NarrationStatusOut {
  session_id: string;
  status: 'not_started' | 'generating' | 'complete' | 'failed';
  total_steps: number;
  generated_steps: number;
  failed_steps: number;
  voice_id: string | null;
  error: string | null;
}

export interface NarrationGenerateResponse {
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

// ── GitHub PR Export ────────────────────────────────

export interface GitHubPRRequest {
  repo: string;
  token: string;
  issue_ids?: string[];
}

export interface GitHubPRResponse {
  pr_url: string;
  pr_number: number;
  branch_name: string;
  files_created: string[];
  fixes_included: number;
}

// ── Flow Analysis ───────────────────────────────────

export interface TransitionIssue {
  from_page: string;
  to_page: string;
  description: string;
  severity: Severity;
  heuristic: string;
  recommendation: string;
}

export interface FlowAnalysisResult {
  flow_name: string;
  pages: string[];
  consistency_score: number;
  transition_issues: TransitionIssue[];
  information_loss: string[];
  strengths: string[];
  summary: string;
}

// ── Accessibility Audit ─────────────────────────────

export interface VisualAccessibilityIssue {
  description: string;
  wcag_criterion: string;
  measured_value: string | null;
  required_value: string | null;
  element_description: string;
  severity: Severity;
  screenshot_region: Record<string, number>;
}

export interface WCAGCriterionResult {
  criterion: string;
  level: string;
  status: 'pass' | 'fail' | 'not_applicable';
  evidence: string;
}

export interface AccessibilityAuditResult {
  page_url: string;
  wcag_level: string;
  pass_count: number;
  fail_count: number;
  compliance_percentage: number;
  criteria: WCAGCriterionResult[];
  visual_issues: VisualAccessibilityIssue[];
  summary: string;
}

// ── Fix Preview ─────────────────────────────────────

export interface FixPreviewResponse {
  success: boolean;
  before_url: string | null;
  after_url: string | null;
  diff_url: string | null;
  before_base64: string | null;
  after_base64: string | null;
  diff_base64: string | null;
  error: string | null;
}

// ── Estimate ────────────────────────────────────────

export interface EstimateRequest {
  persona_count: number;
  task_count: number;
  model?: string;
}

export interface EstimateBreakdown {
  navigation_cost: number;
  analysis_cost: number;
  synthesis_cost: number;
}

export interface EstimateResponse {
  estimated_cost_usd: number;
  estimated_duration_seconds: number;
  estimated_sessions: number;
  estimated_total_steps: number;
  breakdown: EstimateBreakdown;
  model: string;
  persona_count: number;
  task_count: number;
}

// ── Teams ───────────────────────────────────────────

export interface TeamMemberOut {
  id: string;
  persona_template_id: string;
  order_index: number;
  persona_template: Record<string, unknown> | null;
}

export interface TeamListResponse {
  items: TeamMemberOut[];
  total: number;
}

// ── Preferences ─────────────────────────────────────

export interface PreferencesData {
  browser_mode?: string;
  theme?: string;
  default_model?: string;
}

export interface PreferencesResponse {
  user_id: string;
  preferences: Record<string, unknown>;
}

// ── Favorites ───────────────────────────────────────

export interface FavoriteCreate {
  url: string;
  label?: string;
  notes?: string;
}

export interface FavoriteUpdate {
  url?: string;
  label?: string;
  notes?: string;
}

export interface FavoriteOut {
  id: string;
  url: string;
  label: string | null;
  notes: string | null;
  created_at: string;
}

export interface FavoriteListResponse {
  items: FavoriteOut[];
  total: number;
}

// ── Showcase ────────────────────────────────────────

export interface ShowcaseStudy {
  study: StudyOut;
  sessions: SessionOut[];
  issues: IssueOut[];
  insights: InsightOut[];
}
