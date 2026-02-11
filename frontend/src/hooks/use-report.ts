'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api-client';

export function useReportMetadata(studyId: string) {
  return useQuery({
    queryKey: ['report', studyId],
    queryFn: () => api.getReportMetadata(studyId),
    enabled: !!studyId,
  });
}
