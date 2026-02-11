'use client';

import { usePersonaTemplates } from '@/hooks/use-personas';
import { PersonaCard } from './persona-card';
import { Skeleton } from '@/components/ui/skeleton';

interface PersonaSelectorProps {
  selected: string[];
  onToggle: (id: string) => void;
}

export function PersonaSelector({ selected, onToggle }: PersonaSelectorProps) {
  const { data: templates, isLoading } = usePersonaTemplates();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!templates?.length) {
    return <p className="text-sm text-muted-foreground">No persona templates available.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {templates.map((t) => (
        <PersonaCard
          key={t.id}
          template={t}
          selected={selected.includes(t.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
