'use client';

import { useMutation } from '@tanstack/react-query';
import * as api from '@/lib/api-client';

export function useCompareStudies() {
  return useMutation({
    mutationFn: ({ baselineId, comparisonId }: { baselineId: string; comparisonId: string }) =>
      api.compareStudies(baselineId, comparisonId),
  });
}
