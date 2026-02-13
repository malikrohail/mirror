import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api-client';
import type { ScheduleCreate, ScheduleUpdate } from '@/types';

export function useSchedules() {
  return useQuery({ queryKey: ['schedules'], queryFn: () => api.listSchedules() });
}

export function useSchedule(id: string) {
  return useQuery({ queryKey: ['schedule', id], queryFn: () => api.getSchedule(id), enabled: !!id });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: ScheduleCreate) => api.createSchedule(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }) });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<ScheduleUpdate> }) => api.updateSchedule(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }) });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.deleteSchedule(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }) });
}

export function useTriggerSchedule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.triggerSchedule(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }) });
}
