'use client';

import { PersonaDetailCard } from './persona-detail-card';
import type { PersonaTemplateOut } from '@/types';

interface PersonaGridProps {
  templates: PersonaTemplateOut[];
}

export function PersonaGrid({ templates }: PersonaGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <PersonaDetailCard key={t.id} template={t} />
      ))}
    </div>
  );
}
