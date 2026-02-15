'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import * as api from '@/lib/api-client';
import { withResolvedPersonaAvatar } from '@/config/persona-avatars';
import type { PersonaGenerateRequest } from '@/types';

export function usePersonaTemplates(category?: string) {
  return useQuery({
    queryKey: ['persona-templates', category],
    queryFn: async () => {
      const templates = await api.listPersonaTemplates(category);
      return templates.map(withResolvedPersonaAvatar);
    },
  });
}

export function usePersonaTemplate(id: string) {
  return useQuery({
    queryKey: ['persona-template', id],
    queryFn: async () => {
      const template = await api.getPersonaTemplate(id);
      return withResolvedPersonaAvatar(template);
    },
    enabled: !!id,
  });
}

export function useGeneratePersona() {
  return useMutation({
    mutationFn: async (data: string | PersonaGenerateRequest) => {
      const persona = await api.generatePersona(data);
      return withResolvedPersonaAvatar(persona);
    },
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
