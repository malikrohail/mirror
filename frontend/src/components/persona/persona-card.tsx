'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { PersonaTemplateOut } from '@/types';

interface PersonaCardProps {
  template: PersonaTemplateOut;
  selected: boolean;
  onToggle: (id: string) => void;
}

const MODEL_BADGE_COLORS: Record<string, string> = {
  'opus-4.6': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'sonnet-4.5': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'haiku-4.5': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export function PersonaCard({ template, selected, onToggle }: PersonaCardProps) {
  const modelSlug = template.model ?? 'opus-4.6';
  const modelDisplay = template.model_display_name ?? 'Opus 4.6';
  const costPerRun = template.estimated_cost_per_run_usd ?? 0;

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
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize text-secondary-foreground">
              {template.category}
            </span>
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0 h-4 border-0', MODEL_BADGE_COLORS[modelSlug] ?? '')}
            >
              {modelDisplay}
            </Badge>
            {costPerRun > 0 && (
              <span className="text-[10px] text-muted-foreground">
                ~${costPerRun.toFixed(2)}/run
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
