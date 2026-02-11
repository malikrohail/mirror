'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api-client';

export function useHeatmap(studyId: string, pageUrl?: string) {
  return useQuery({
    queryKey: ['heatmap', studyId, pageUrl],
    queryFn: () => api.getHeatmap(studyId, pageUrl),
    enabled: !!studyId,
  });
}
