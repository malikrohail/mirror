import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api-client';

export function useSessionVideo(sessionId: string) {
  return useQuery({ queryKey: ['video', sessionId], queryFn: () => api.getSessionVideo(sessionId), enabled: !!sessionId });
}

export function useGenerateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, options }: { sessionId: string; options?: { include_narration?: boolean; frame_duration_ms?: number } }) =>
      api.generateSessionVideo(sessionId, options),
    onSuccess: (_, { sessionId }) => qc.invalidateQueries({ queryKey: ['video', sessionId] }),
  });
}

export function useStudyVideos(studyId: string) {
  return useQuery({ queryKey: ['videos', studyId], queryFn: () => api.listStudyVideos(studyId), enabled: !!studyId });
}
