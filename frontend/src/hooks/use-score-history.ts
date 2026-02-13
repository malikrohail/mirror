import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api-client';

export function useTrackedUrls() {
  return useQuery({ queryKey: ['tracked-urls'], queryFn: () => api.listTrackedUrls() });
}

export function useScoreHistory(url: string) {
  return useQuery({ queryKey: ['score-history', url], queryFn: () => api.getScoreHistory(url), enabled: !!url });
}
