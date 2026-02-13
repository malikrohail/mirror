import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runStudy } from '../api-client';

// Mock fetch globally
const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ job_id: 'test-job-id' }),
  });
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('runStudy', () => {
  const studyId = 'abc-123';

  it('appends ?browser_mode=local when browser_mode is "local"', async () => {
    await runStudy(studyId, { browser_mode: 'local' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain(`/studies/${studyId}/run`);
    expect(calledUrl).toContain('browser_mode=local');
  });

  it('appends ?browser_mode=cloud when browser_mode is "cloud"', async () => {
    await runStudy(studyId, { browser_mode: 'cloud' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain(`/studies/${studyId}/run`);
    expect(calledUrl).toContain('browser_mode=cloud');
  });

  it('does not append browser_mode query param when options is undefined', async () => {
    await runStudy(studyId);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain(`/studies/${studyId}/run`);
    expect(calledUrl).not.toContain('browser_mode');
    expect(calledUrl).not.toContain('?');
  });

  it('does not append browser_mode query param when browser_mode is undefined', async () => {
    await runStudy(studyId, {});

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain(`/studies/${studyId}/run`);
    expect(calledUrl).not.toContain('browser_mode');
    expect(calledUrl).not.toContain('?');
  });

  it('sends a POST request', async () => {
    await runStudy(studyId, { browser_mode: 'local' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.method).toBe('POST');
  });

  it('includes Content-Type header', async () => {
    await runStudy(studyId, { browser_mode: 'cloud' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.headers['Content-Type']).toBe('application/json');
  });
});
