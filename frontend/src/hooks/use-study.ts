'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api-client';
import type { StudyCreate, StudyStatus } from '@/types';

export function useStudies(page = 1, limit = 20, status?: StudyStatus) {
  return useQuery({
    queryKey: ['studies', page, limit, status],
    queryFn: () => api.listStudies(page, limit, status),
  });
}

export function useStudy(id: string) {
  return useQuery({
    queryKey: ['study', id],
    queryFn: () => api.getStudy(id),
    enabled: !!id,
  });
}

export function useStudyStatus(id: string, enabled = true) {
  return useQuery({
    queryKey: ['study-status', id],
    queryFn: () => api.getStudyStatus(id),
    enabled: !!id && enabled,
    refetchInterval: 5000,
  });
}

export function useCreateStudy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StudyCreate) => api.createStudy(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studies'] }),
  });
}

export function useRunStudy() {
  return useMutation({
    mutationFn: (studyId: string) => api.runStudy(studyId),
  });
}

export function useDeleteStudy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studyId: string) => api.deleteStudy(studyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studies'] }),
  });
}

export function useSessions(studyId: string) {
  return useQuery({
    queryKey: ['sessions', studyId],
    queryFn: () => api.listSessions(studyId),
    enabled: !!studyId,
  });
}

export function useIssues(
  studyId: string,
  filters?: { severity?: string; persona_id?: string; page_url?: string },
) {
  return useQuery({
    queryKey: ['issues', studyId, filters],
    queryFn: () => api.listIssues(studyId, filters),
    enabled: !!studyId,
  });
}

export function useInsights(studyId: string) {
  return useQuery({
    queryKey: ['insights', studyId],
    queryFn: () => api.listInsights(studyId),
    enabled: !!studyId,
  });
}
