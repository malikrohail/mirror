'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import * as api from '@/lib/api-client';

export function usePersonaTemplates(category?: string) {
  return useQuery({
    queryKey: ['persona-templates', category],
    queryFn: () => api.listPersonaTemplates(category),
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
    mutationFn: (description: string) => api.generatePersona(description),
  });
}

export function usePersona(id: string) {
  return useQuery({
    queryKey: ['persona', id],
    queryFn: () => api.getPersona(id),
    enabled: !!id,
  });
}
