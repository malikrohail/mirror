'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api-client';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
    refetchInterval: 30_000,
    retry: false,
  });
}
