'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api-client';

export function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId),
    enabled: !!sessionId,
  });
}

export function useSteps(sessionId: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ['steps', sessionId, page, limit],
    queryFn: () => api.listSteps(sessionId, page, limit),
    enabled: !!sessionId,
  });
}

export function useStep(sessionId: string, stepNumber: number) {
  return useQuery({
    queryKey: ['step', sessionId, stepNumber],
    queryFn: () => api.getStep(sessionId, stepNumber),
    enabled: !!sessionId && stepNumber > 0,
  });
}
