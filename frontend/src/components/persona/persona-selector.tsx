'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { usePersonaTemplates, useGeneratePersona } from '@/hooks/use-personas';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface PersonaSelectorProps {
  selected: string[];
  onToggle: (id: string) => void;
}

const PAGE_SIZE = 4;

const BG_COLORS = [
  'bg-rose-100',
  'bg-sky-100',
  'bg-amber-100',
  'bg-emerald-100',
  'bg-violet-100',
  'bg-orange-100',
  'bg-teal-100',
  'bg-pink-100',
];

export function PersonaSelector({ selected, onToggle }: PersonaSelectorProps) {
  const { data: templates, isLoading } = usePersonaTemplates();
  const generatePersona = useGeneratePersona();
  const [page, setPage] = useState(0);
  const [customDescription, setCustomDescription] = useState('');

  const totalPages = templates ? Math.ceil(templates.length / PAGE_SIZE) : 0;
  const canGoBack = page > 0;
  const canGoForward = page < totalPages - 1;

  const goBack = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const goForward = useCallback(() => setPage((p) => p + 1), []);

  const handleGenerate = async () => {
    if (!customDescription.trim() || generatePersona.isPending) return;
    try {
      const persona = await generatePersona.mutateAsync(customDescription.trim());
      onToggle(persona.id);
      setCustomDescription('');
    } catch {
      // error state shown inline
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full rounded-md" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!templates?.length) {
    return (
      <p className="text-sm text-muted-foreground">No persona templates available.</p>
    );
  }

  const pageItems = templates.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-2.5">
      {/* Create persona input */}
      <p className="text-[14px] font-medium uppercase text-foreground/50">Create your ideal tester</p>
      <div className="relative">
        <input
          type="text"
          value={customDescription}
          onChange={(e) => setCustomDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. non-technical 50 year old teacher"
          disabled={generatePersona.isPending}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring disabled:opacity-60"
        />
        {generatePersona.isPending && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </div>
        )}
        {generatePersona.isError && (
          <p className="mt-1 text-xs text-destructive">
            Failed to generate. Try again.
          </p>
        )}
      </div>

      {/* Label */}
      <p className="mt-6 text-[14px] font-medium uppercase text-foreground/50">Select a tester</p>

      {/* Carousel */}
      <div className="grid grid-cols-4 gap-2">
        {pageItems.map((t, i) => {
          const globalIndex = page * PAGE_SIZE + i;
          const isSelected = selected.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => onToggle(t.id)}
              className={cn(
                'group flex flex-col overflow-hidden rounded-xl border text-left transition-all',
                isSelected
                  ? 'border-primary/40 ring-2 ring-primary/20'
                  : 'border-border hover:border-foreground/20'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center overflow-hidden',
                  !t.avatar_url && 'py-2.5',
                  BG_COLORS[globalIndex % BG_COLORS.length]
                )}
              >
                {t.avatar_url ? (
                  <img
                    src={t.avatar_url}
                    alt={t.name}
                    className="h-full w-full object-cover aspect-[4/3]"
                  />
                ) : (
                  <span className="text-2xl">{t.emoji}</span>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-xs font-medium leading-snug text-foreground/80">
                  {t.name}
                </p>
                {t.short_description && (
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {t.short_description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation: arrows + page dots */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
              canGoBack
                ? 'text-foreground/50 hover:bg-muted hover:text-foreground'
                : 'text-muted-foreground/20'
            )}
            aria-label="Previous personas"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === page
                    ? 'w-4 bg-primary'
                    : 'w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40'
                )}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
              canGoForward
                ? 'text-foreground/50 hover:bg-muted hover:text-foreground'
                : 'text-muted-foreground/20'
            )}
            aria-label="More personas"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
