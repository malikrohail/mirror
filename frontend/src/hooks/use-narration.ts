import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api-client';

export function useNarrationStatus(sessionId: string) {
  return useQuery({
    queryKey: ['narration-status', sessionId],
    queryFn: () => api.getNarrationStatus(sessionId),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      // Poll every 2s while generating, stop once complete or failed
      const status = query.state.data?.status;
      if (status === 'generating') return 2000;
      return false;
    },
  });
}

export function useGenerateNarration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.generateNarration(sessionId),
    onSuccess: (_, sessionId) => {
      qc.invalidateQueries({ queryKey: ['narration-status', sessionId] });
    },
  });
}
