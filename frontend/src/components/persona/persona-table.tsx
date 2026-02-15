'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Monitor, Smartphone, Tablet, Accessibility, Plus, ArrowUp, ArrowDown, Users, Play, X, MoreVertical, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { PersonaTemplateOut } from '@/types';

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-3 w-3" />,
  mobile: <Smartphone className="h-3 w-3" />,
  tablet: <Tablet className="h-3 w-3" />,
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function levelToNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const map: Record<string, number> = {
      low: 3, moderate: 5, medium: 5, high: 8,
      skims: 2, thorough: 9, skeptical: 3,
    };
    return map[value.toLowerCase()] ?? null;
  }
  return null;
}

function LevelDots({ value, max = 10 }: { value: number; max?: number }) {
  const filled = Math.round((value / max) * 5);
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i < filled ? 'bg-foreground' : 'bg-foreground/10')} />
      ))}
    </span>
  );
}

function getAccessibilityNeeds(profile: Record<string, unknown>): string[] {
  const needs = profile.accessibility_needs;
  if (Array.isArray(needs)) return needs as string[];
  if (needs && typeof needs === 'object' && !Array.isArray(needs)) {
    return Object.entries(needs as Record<string, unknown>)
      .filter(([k, v]) => v === true && k !== 'description')
      .map(([k]) => k.replace(/_/g, ' '));
  }
  return [];
}

type SortKey = 'name' | 'age' | 'profession' | 'device' | 'tech' | 'patience' | 'accessibility';
type SortDir = 'asc' | 'desc';

function getSortValue(t: PersonaTemplateOut, key: SortKey): string | number {
  const p = t.default_profile;
  switch (key) {
    case 'name': return t.name.toLowerCase();
    case 'age': return p.age != null ? Number(p.age) : -1;
    case 'profession': return p.occupation ? String(p.occupation).toLowerCase() : 'zzz';
    case 'device': return String(p.device_preference ?? 'desktop');
    case 'tech': return levelToNumber(p.tech_literacy) ?? -1;
    case 'patience': return levelToNumber(p.patience_level) ?? -1;
    case 'accessibility': return getAccessibilityNeeds(p).length;
  }
}

interface PersonaTableProps {
  templates: PersonaTemplateOut[];
  onTeamChange?: () => void;
  isMyTeam?: boolean;
}

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: 'name', label: 'Tester', className: 'py-2.5 pl-2 pr-2 w-[40%]' },
  { key: 'age', label: 'Age', className: 'px-2 py-2.5' },
  { key: 'profession', label: 'Profession', className: 'px-2 py-2.5' },
  { key: 'device', label: 'Device', className: 'px-2 py-2.5' },
  { key: 'tech', label: 'Tech', className: 'px-2 py-2.5' },
  { key: 'patience', label: 'Patience', className: 'px-2 py-2.5' },
  { key: 'accessibility', label: 'Accessibility', className: 'px-2 py-2.5' },
];

export function PersonaTable({ templates, onTeamChange, isMyTeam }: PersonaTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const hasSelection = selected.size > 0;

  const addToTeam = useCallback((ids: string[]) => {
    const existing: string[] = JSON.parse(localStorage.getItem('miror-my-team') ?? '[]');
    const merged = Array.from(new Set([...existing, ...ids]));
    localStorage.setItem('miror-my-team', JSON.stringify(merged));
    const names = ids.map((id) => templates.find((t) => t.id === id)?.name).filter(Boolean);
    toast.success(`Added ${names.join(', ')} to your team`);
    onTeamChange?.();
  }, [templates, onTeamChange]);

  const initiateTest = useCallback((ids: string[]) => {
    router.push(`/?personas=${ids.join(',')}`);
  }, [router]);

  const removeFromTeam = useCallback((ids: string[]) => {
    const existing: string[] = JSON.parse(localStorage.getItem('miror-my-team') ?? '[]');
    const updated = existing.filter((id) => !ids.includes(id));
    localStorage.setItem('miror-my-team', JSON.stringify(updated));
    const names = ids.map((id) => templates.find((t) => t.id === id)?.name).filter(Boolean);
    toast.success(`Removed ${names.join(', ')} from your team`);
    onTeamChange?.();
  }, [templates, onTeamChange]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const MAX_SELECTED = 5;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_SELECTED) {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === templates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(templates.map((t) => t.id)));
    }
  };

  const clearSelection = () => setSelected(new Set());

  const sorted = useMemo(() => {
    if (!sortKey) return templates;
    return [...templates].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [templates, sortKey, sortDir]);

  const allChecked = templates.length > 0 && selected.size === templates.length;
  const someChecked = selected.size > 0 && selected.size < templates.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs text-foreground/30 uppercase">
              <th className="py-2.5 pl-4 pr-1 w-8"></th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cn(col.className, 'font-medium cursor-pointer select-none hover:text-foreground/60 transition-colors')}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ArrowUp className="h-3 w-3" />
                        : <ArrowDown className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
              <th className="px-2 py-2.5 font-medium">Model</th>
              <th className="px-2 py-2.5 font-medium">Cost</th>
              <th className="px-2 py-2.5 pr-4 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const p = t.default_profile;
              const techVal = levelToNumber(p.tech_literacy);
              const patienceVal = levelToNumber(p.patience_level);
              const device = String(p.device_preference ?? 'desktop');
              const age = p.age != null ? Number(p.age) : null;
              const occupation = p.occupation ? String(p.occupation) : '—';
              const accessibilityNeeds = getAccessibilityNeeds(p);
              const model = 'Opus 4.6';
              const cost = 0.40;
              const isSelected = selected.has(t.id);
              const isAtLimit = selected.size >= MAX_SELECTED && !isSelected;

              return (
                <tr key={t.id} className="group border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="py-3 pl-4 pr-1 w-8">
                    <div className={cn(
                      'transition-opacity',
                      hasSelection || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleOne(t.id)}
                              disabled={isAtLimit}
                              className={cn('translate-y-[1px]', isAtLimit && 'opacity-30 disabled:cursor-default')}
                            />
                          </span>
                        </TooltipTrigger>
                        {isAtLimit && (
                          <TooltipContent side="right">
                            <p className="text-xs">Maximum of {MAX_SELECTED} testers can be selected</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                  </td>
                  <td className="py-3 pl-2 pr-2 max-w-0">
                    <div className="flex items-center gap-2.5">
                      {t.avatar_url ? (
                        <img src={t.avatar_url} alt={t.name} className="h-8 w-8 rounded-lg object-cover shrink-0" />
                      ) : (
                        <span className="text-lg shrink-0">{t.emoji}</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-[14px] text-foreground/70">{t.name}</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-[14px] text-foreground/30 truncate">{t.short_description}</p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start" className="max-w-xs">
                            <p className="text-xs">{t.short_description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 tabular-nums text-foreground/40">{age ?? '—'}</td>
                  <td className="px-2 py-3 text-foreground/40">{occupation}</td>
                  <td className="px-2 py-3">
                    <span className="inline-flex items-center gap-1 text-foreground/40">
                      {DEVICE_ICONS[device] ?? null} {capitalize(device)}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    {techVal != null ? <LevelDots value={techVal} /> : <span className="text-foreground/20">—</span>}
                  </td>
                  <td className="px-2 py-3">
                    {patienceVal != null ? <LevelDots value={patienceVal} /> : <span className="text-foreground/20">—</span>}
                  </td>
                  <td className="px-2 py-3">
                    {accessibilityNeeds.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 text-xs text-foreground/40 cursor-default">
                            <Accessibility className="h-3 w-3" />
                            {accessibilityNeeds.length} needs
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <ul className="text-xs space-y-0.5">
                            {accessibilityNeeds.map((a) => (
                              <li key={a}>{a}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-foreground/20">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-xs text-foreground/40">{model}</td>
                  <td className="px-2 py-3 text-xs tabular-nums text-foreground/40">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">${cost.toFixed(2)}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Avg. estimated cost per test. May fluctuate slightly.
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-2 py-3 pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/15 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/5 hover:text-foreground/40">
                          {isMyTeam ? <MoreVertical className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {!isMyTeam && (
                          <DropdownMenuItem onClick={() => addToTeam([t.id])}>
                            <Users className="mr-2 h-4 w-4" />
                            Add to team
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => initiateTest([t.id])}>
                          <Play className="mr-2 h-4 w-4" />
                          Add to test
                        </DropdownMenuItem>
                        {isMyTeam && (
                          <DropdownMenuItem onClick={() => removeFromTeam([t.id])} className="text-destructive focus:text-destructive">
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove from team
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating action bar */}
      {hasSelection && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm font-medium text-foreground/50">
              {selected.size} of {templates.length} selected
            </span>
            <Button size="sm" className="rounded-full !gap-1.5" onClick={() => { addToTeam(Array.from(selected)); clearSelection(); }}>
              <Users className="!size-3.5" />
              Add to team
            </Button>
            <Button size="sm" className="rounded-full !gap-1.5" onClick={() => initiateTest(Array.from(selected))}>
              <Play className="!size-3.5" />
              Add to test
            </Button>
            <button
              onClick={clearSelection}
              className="rounded-full p-1 text-foreground/50 transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
