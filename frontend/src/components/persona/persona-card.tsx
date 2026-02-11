'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { PersonaTemplateOut } from '@/types';

interface PersonaCardProps {
  template: PersonaTemplateOut;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function PersonaCard({ template, selected, onToggle }: PersonaCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer border-2 transition-shadow duration-200',
        selected ? 'border-primary' : 'border-transparent',
      )}
      onClick={() => onToggle(template.id)}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(template.id);
        }
      }}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <Checkbox checked={selected} className="mt-0.5" tabIndex={-1} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{template.emoji}</span>
            <span className="text-sm font-medium">{template.name}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {template.short_description}
          </p>
          <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize text-secondary-foreground">
            {template.category}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
