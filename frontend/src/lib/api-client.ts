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
  PersonaOut,
  HealthResponse,
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

export function runStudy(id: string): Promise<StudyRunResponse> {
  return request(`/studies/${id}/run`, { method: 'POST' });
}

export function getStudyStatus(id: string): Promise<StudyStatusResponse> {
  return request(`/studies/${id}/status`);
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
  filters?: { severity?: string; persona_id?: string; page_url?: string },
): Promise<IssueOut[]> {
  const params = new URLSearchParams();
  if (filters?.severity) params.set('severity', filters.severity);
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

export function generatePersona(description: string): Promise<{ message: string; description: string }> {
  return request('/personas/generate', {
    method: 'POST',
    body: JSON.stringify({ description }),
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

export { ApiError };
