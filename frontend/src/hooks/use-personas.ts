'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import * as api from '@/lib/api-client';
import type { PersonaGenerateRequest } from '@/types';

export function usePersonaTemplates(category?: string) {
  return useQuery({
    queryKey: ['persona-templates', category],
    queryFn: () => api.listPersonaTemplates(category),
    staleTime: 60 * 60 * 1000, // 1 hour — templates rarely change
  });
}

export function usePersonaTemplate(id: string) {
  return useQuery({
    queryKey: ['persona-template', id],
    queryFn: () => api.getPersonaTemplate(id),
    enabled: !!id,
  });
}

export function useGeneratePersona() {
  return useMutation({
    mutationFn: (data: string | PersonaGenerateRequest) => api.generatePersona(data),
  });
}

export function useGeneratePersonaDraft() {
  return useMutation({
    mutationFn: (data: string | PersonaGenerateRequest) => api.generatePersonaDraft(data),
  });
}

export function usePersona(id: string) {
  return useQuery({
    queryKey: ['persona', id],
    queryFn: () => api.getPersona(id),
    enabled: !!id,
  });
}
