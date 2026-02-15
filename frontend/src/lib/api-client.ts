import { API_BASE } from './constants';
import type {
  StudyCreate,
  StudyOut,
  StudyListResponse,
  StudyRunResponse,
  StudyStatusResponse,
  SessionOut,
  SessionDetail,
  StepOut,
  IssueOut,
  InsightOut,
  HeatmapResponse,
  ReportMetadata,
  PersonaTemplateOut,
  PersonaGenerateDraftResponse,
  PersonaGenerateRequest,
  PersonaOut,
  HealthResponse,
  ComparisonResult,
  ScheduleCreate,
  ScheduleUpdate,
  ScheduleOut,
  ScheduleListResponse,
  ScheduleRunResponse,
  ScoreHistoryResponse,
  TrackedUrl,
  VideoOut,
  VideoGenerateResponse,
  FixSuggestionOut,
  FixGenerateResponse,
  StudyPlanRequest,
  StudyPlanResponse,
  NarrationStatusOut,
  NarrationGenerateResponse,
  GitHubPRRequest,
  GitHubPRResponse,
} from '@/types';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => 'Unknown error');
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Studies ─────────────────────────────────────────

export function createStudy(data: StudyCreate): Promise<StudyOut> {
  return request('/studies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listStudies(
  page = 1,
  limit = 20,
  status?: string,
): Promise<StudyListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  return request(`/studies?${params}`);
}

export function getStudy(id: string): Promise<StudyOut> {
  return request(`/studies/${id}`);
}

export function deleteStudy(id: string): Promise<void> {
  return request(`/studies/${id}`, { method: 'DELETE' });
}

export function runStudy(
  id: string,
  options?: { browser_mode?: string },
): Promise<StudyRunResponse> {
  const params = new URLSearchParams();
  if (options?.browser_mode) params.set('browser_mode', options.browser_mode);
  const qs = params.toString();
  return request(`/studies/${id}/run${qs ? `?${qs}` : ''}`, { method: 'POST' });
}

export function getStudyStatus(id: string): Promise<StudyStatusResponse> {
  return request(`/studies/${id}/status`);
}

export function generateStudyPlan(data: StudyPlanRequest): Promise<StudyPlanResponse> {
  return request('/studies/plan', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getLiveState(studyId: string): Promise<Record<string, LiveSessionState>> {
  return request(`/studies/${studyId}/live-state`);
}

export interface LiveSessionState {
  session_id: string;
  persona_name?: string;
  step_number?: number;
  think_aloud?: string;
  screenshot_url?: string;
  emotional_state?: string;
  action?: string | { type: string; description?: string; selector?: string };
  task_progress?: number;
  completed?: boolean;
  total_steps?: number;
  live_view_url?: string | null;
  browser_active?: boolean;
}

// ── Sessions ────────────────────────────────────────

export function listSessions(studyId: string): Promise<SessionOut[]> {
  return request(`/studies/${studyId}/sessions`);
}

export function getSession(sessionId: string): Promise<SessionDetail> {
  return request(`/sessions/${sessionId}`);
}

export function listSteps(
  sessionId: string,
  page = 1,
  limit = 50,
): Promise<StepOut[]> {
  return request(`/sessions/${sessionId}/steps?page=${page}&limit=${limit}`);
}

export function getStep(sessionId: string, stepNumber: number): Promise<StepOut> {
  return request(`/sessions/${sessionId}/steps/${stepNumber}`);
}

// ── Issues & Insights ───────────────────────────────

export function listIssues(
  studyId: string,
  filters?: { severity?: string; issue_type?: string; persona_id?: string; page_url?: string },
): Promise<IssueOut[]> {
  const params = new URLSearchParams();
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.issue_type) params.set('issue_type', filters.issue_type);
  if (filters?.persona_id) params.set('persona_id', filters.persona_id);
  if (filters?.page_url) params.set('page_url', filters.page_url);
  const qs = params.toString();
  return request(`/studies/${studyId}/issues${qs ? `?${qs}` : ''}`);
}

export function listInsights(studyId: string): Promise<InsightOut[]> {
  return request(`/studies/${studyId}/insights`);
}

export function getHeatmap(studyId: string, pageUrl?: string): Promise<HeatmapResponse> {
  const params = new URLSearchParams();
  if (pageUrl) params.set('page_url', pageUrl);
  const qs = params.toString();
  return request(`/studies/${studyId}/heatmap${qs ? `?${qs}` : ''}`);
}

// ── Reports ─────────────────────────────────────────

export function getReportMetadata(studyId: string): Promise<ReportMetadata> {
  return request(`/studies/${studyId}/report`);
}

export function getReportMdUrl(studyId: string): string {
  return `${API_BASE}/studies/${studyId}/report/md`;
}

export function getReportPdfUrl(studyId: string): string {
  return `${API_BASE}/studies/${studyId}/report/pdf`;
}

// ── Personas ────────────────────────────────────────

export function listPersonaTemplates(category?: string): Promise<PersonaTemplateOut[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const qs = params.toString();
  return request(`/personas/templates${qs ? `?${qs}` : ''}`);
}

export function getPersonaTemplate(id: string): Promise<PersonaTemplateOut> {
  return request(`/personas/templates/${id}`);
}

export function generatePersona(
  data: string | PersonaGenerateRequest,
): Promise<PersonaTemplateOut> {
  const payload: PersonaGenerateRequest = typeof data === 'string'
    ? { description: data }
    : data;

  return request('/personas/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function generatePersonaDraft(
  data: string | PersonaGenerateRequest,
): Promise<PersonaGenerateDraftResponse> {
  const payload: PersonaGenerateRequest = typeof data === 'string'
    ? { description: data }
    : data;

  return request('/personas/generate/draft', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPersona(id: string): Promise<PersonaOut> {
  return request(`/personas/${id}`);
}

// ── Screenshots ─────────────────────────────────────

export function getScreenshotUrl(path: string): string {
  return `${API_BASE}/screenshots/${path}`;
}

// ── Health ──────────────────────────────────────────

export function getHealth(): Promise<HealthResponse> {
  return request('/health');
}

// ── Comparison ───────────────────────────────────────

export function compareStudies(baselineId: string, comparisonId: string): Promise<ComparisonResult> {
  return request(`/studies/${baselineId}/compare/${comparisonId}`, { method: 'POST' });
}

// ── Schedules ────────────────────────────────────────

export function createSchedule(data: ScheduleCreate): Promise<ScheduleOut> {
  return request('/schedules', { method: 'POST', body: JSON.stringify(data) });
}

export function listSchedules(): Promise<ScheduleListResponse> {
  return request('/schedules');
}

export function getSchedule(id: string): Promise<ScheduleOut> {
  return request(`/schedules/${id}`);
}

export function updateSchedule(id: string, data: Partial<ScheduleUpdate>): Promise<ScheduleOut> {
  return request(`/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteSchedule(id: string): Promise<void> {
  return request(`/schedules/${id}`, { method: 'DELETE' });
}

export function triggerSchedule(id: string): Promise<ScheduleRunResponse> {
  return request(`/schedules/${id}/trigger`, { method: 'POST' });
}

// ── Score History ────────────────────────────────────

export function listTrackedUrls(): Promise<TrackedUrl[]> {
  return request('/history/urls');
}

export function getScoreHistory(url: string, limit = 50): Promise<ScoreHistoryResponse> {
  return request(`/history/scores?url=${encodeURIComponent(url)}&limit=${limit}`);
}

// ── Videos ───────────────────────────────────────────

export function getSessionVideo(sessionId: string): Promise<VideoOut | null> {
  return request(`/sessions/${sessionId}/video`);
}

export function generateSessionVideo(sessionId: string, options?: { include_narration?: boolean; frame_duration_ms?: number }): Promise<VideoGenerateResponse> {
  return request(`/sessions/${sessionId}/video/generate`, { method: 'POST', body: JSON.stringify(options ?? {}) });
}

export function getVideoDownloadUrl(sessionId: string): string {
  return `${API_BASE}/sessions/${sessionId}/video/download`;
}

export function listStudyVideos(studyId: string): Promise<VideoOut[]> {
  return request(`/studies/${studyId}/videos`);
}

// ── Narration ────────────────────────────────────────

export function generateNarration(sessionId: string): Promise<NarrationGenerateResponse> {
  return request(`/sessions/${sessionId}/narration/generate`, { method: 'POST' });
}

export function getNarrationStatus(sessionId: string): Promise<NarrationStatusOut> {
  return request(`/sessions/${sessionId}/narration/status`);
}

export function getNarrationAudioUrl(sessionId: string, stepNumber: number): string {
  return `${API_BASE}/sessions/${sessionId}/narration/${stepNumber}`;
}

// ── Fix Suggestions ──────────────────────────────────

export function generateFixes(studyId: string, issueIds?: string[]): Promise<FixGenerateResponse> {
  return request(`/studies/${studyId}/fixes/generate`, { method: 'POST', body: JSON.stringify(issueIds ? { issue_ids: issueIds } : {}) });
}

export function listFixes(studyId: string): Promise<FixSuggestionOut[]> {
  return request(`/studies/${studyId}/fixes`);
}

// ── GitHub PR Export ─────────────────────────────────

export function createGitHubPR(studyId: string, data: GitHubPRRequest): Promise<GitHubPRResponse> {
  return request(`/studies/${studyId}/export/github-pr`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export { ApiError };
