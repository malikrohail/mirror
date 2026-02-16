'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Check,
  X,
  Plus,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Settings,
  CornerDownLeft,
  Clock,
  ChevronDown,
  Search,
  ListFilter,
  Tag,
  Cpu,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PersonaBuilderForm } from '@/components/persona/persona-builder-form';
import { useCreateStudy, useRunStudy } from '@/hooks/use-study';
import { usePersonaTemplates } from '@/hooks/use-personas';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TERMS } from '@/lib/constants';
import { estimateCost } from '@/lib/api-client';
import type { EstimateResponse } from '@/types';

type QuickStartPhase = 'input' | 'select-personas';

interface QuickStartProps {
  initialUrl?: string;
  initialDescription?: string;
  /** Pre-selected persona IDs (e.g. from "Add to test" action) */
  preSelectedPersonaIds?: string[];
  /** Called whenever the URL input value changes */
  onUrlChange?: (url: string) => void;
}

type LevelRange = 'low' | 'mid' | 'high';
type DeviceFilter = 'desktop' | 'mobile' | 'tablet';

const LEVEL_OPTIONS: { value: LevelRange; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'mid', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const DEVICE_OPTIONS: { value: DeviceFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'desktop', label: 'Desktop', icon: <Monitor className="mr-2 h-4 w-4" /> },
  { value: 'mobile', label: 'Mobile', icon: <Smartphone className="mr-2 h-4 w-4" /> },
  { value: 'tablet', label: 'Tablet', icon: <Tablet className="mr-2 h-4 w-4" /> },
];

function levelToNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const map: Record<string, number> = { low: 3, moderate: 5, medium: 5, high: 8 };
    return map[value.toLowerCase()] ?? null;
  }
  return null;
}

function getLevelRange(val: number | null): LevelRange | null {
  if (val === null) return null;
  if (val <= 3) return 'low';
  if (val <= 6) return 'mid';
  return 'high';
}

function LevelBars({ level }: { level: string }) {
  const filled = level === 'high' ? 4 : level === 'moderate' ? 3 : level === 'low' ? 1 : 2;
  return (
    <span className="inline-flex items-center gap-[2px]">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-[10px] w-[3px] rounded-[1px]',
            i < filled ? 'bg-foreground/40' : 'bg-foreground/10',
          )}
        />
      ))}
    </span>
  );
}

export function QuickStart({
  initialUrl = '',
  initialDescription = '',
  preSelectedPersonaIds: preSelected,
  onUrlChange: onUrlChangeProp,
}: QuickStartProps = {}) {
  const router = useRouter();
  const [phase, setPhase] = useState<QuickStartPhase>('input');
  const [description, setDescription] = useState(initialDescription);
  const [url, setUrl] = useState(initialUrl);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<Set<string>>(
    () => new Set(preSelected ?? []),
  );
  const [submitting, setSubmitting] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [expandedPersonaId, setExpandedPersonaId] = useState<string | null>(null);
  const [personaModels, setPersonaModels] = useState<Record<string, string>>({});
  const [personaFilter, setPersonaFilter] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterDevice, setFilterDevice] = useState<DeviceFilter | null>(null);
  const [filterTech, setFilterTech] = useState<LevelRange | null>(null);
  const [filterPatience, setFilterPatience] = useState<LevelRange | null>(null);
  const [filterAccessibility, setFilterAccessibility] = useState(false);
  const [costEstimate, setCostEstimate] = useState<EstimateResponse | null>(null);

  const hasFilters = filterCategory !== null || filterDevice !== null || filterTech !== null || filterPatience !== null || filterAccessibility;
  const clearAllFilters = () => {
    setFilterCategory(null);
    setFilterDevice(null);
    setFilterTech(null);
    setFilterPatience(null);
    setFilterAccessibility(false);
  };




  // Sync pre-selected personas when prop changes (e.g. "Add to test" on same page)
  useEffect(() => {
    if (preSelected && preSelected.length > 0) {
      setSelectedPersonaIds((prev) => {
        const next = new Set(prev);
        for (const id of preSelected) next.add(id);
        return next;
      });
    }
  }, [preSelected?.join(',')]);

  const { data: personas } = usePersonaTemplates();
  const categories = [...new Set((personas ?? []).map((p) => p.category).filter(Boolean))];
  const createStudy = useCreateStudy();
  const runStudy = useRunStudy();

  const [browserMode, setBrowserMode] = useState<'local' | 'cloud'>(() => {
    if (typeof window === 'undefined') return 'local';
    return (localStorage.getItem('miror-browser-mode') as 'local' | 'cloud') || 'cloud';
  });
  const toggleBrowserMode = () => {
    const next = browserMode === 'local' ? 'cloud' : 'local';
    setBrowserMode(next);
    localStorage.setItem('miror-browser-mode', next);
    window.dispatchEvent(new StorageEvent('storage', { key: 'miror-browser-mode', newValue: next }));
    toast.success(`Browser mode: ${next === 'local' ? 'Local' : 'Cloud'}`);
  };

  // Fetch cost estimate when persona count changes (debounced 300ms)
  useEffect(() => {
    if (selectedPersonaIds.size === 0) {
      setCostEstimate(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      // Determine the dominant model for the estimate
      const models = Array.from(selectedPersonaIds).map((id) => personaModels[id] ?? 'opus-4.6');
      const modelCounts: Record<string, number> = {};
      for (const m of models) modelCounts[m] = (modelCounts[m] ?? 0) + 1;
      const dominantModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'opus-4.6';

      estimateCost({
        persona_count: selectedPersonaIds.size,
        task_count: 1,
        model: dominantModel,
      }).then((est) => {
        if (!cancelled) setCostEstimate(est);
      }).catch(() => {
        // Silently fail — show fallback
      });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [selectedPersonaIds.size, personaModels]);

  const canGenerate = description.trim().length > 2 && url.trim().length > 0;
  const isValidInput = canGenerate && url.trim().includes('.');

  // Auto-advance to persona selection when all fields are pre-filled (rerun scenario)
  const hasAutoAdvanced = useRef(false);
  useEffect(() => {
    if (
      !hasAutoAdvanced.current &&
      initialUrl && initialUrl.trim().length > 0 && initialUrl.trim().includes('.') &&
      initialDescription && initialDescription.trim().length > 2 &&
      preSelected && preSelected.length > 0
    ) {
      hasAutoAdvanced.current = true;
      setPhase('select-personas');
    }
  }, []);

  const urlRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const URL_PLACEHOLDER = 'anthropic.com';
  const TASK_PLACEHOLDER = 'Find the pricing page';

  const handleContinue = (autoFill = false) => {
    let currentUrl = url;
    let currentDesc = description;

    if (autoFill) {
      if (currentUrl.trim().length === 0) {
        currentUrl = URL_PLACEHOLDER;
        setUrl(currentUrl);
        onUrlChangeProp?.(currentUrl);
      }
      if (currentDesc.trim().length <= 2) {
        currentDesc = TASK_PLACEHOLDER;
        setDescription(currentDesc);
      }
    }

    if (currentUrl.trim().length === 0) {
      urlRef.current?.focus();
    } else if (!currentUrl.trim().includes('.')) {
      toast.error('Enter a valid URL', { description: 'The website needs a domain extension (e.g. .com, .co, .ai)' });
      urlRef.current?.focus();
    } else if (currentDesc.trim().length <= 2) {
      descRef.current?.focus();
    } else {
      setPhase('select-personas');
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'ArrowRight' &&
      !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey &&
      url.trim().length === 0
    ) {
      e.preventDefault();
      setUrl(URL_PLACEHOLDER);
      onUrlChangeProp?.(URL_PLACEHOLDER);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && isValidInput && phase === 'input') {
      e.preventDefault();
      handleContinue();
    }
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === 'ArrowRight' &&
      !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey &&
      description.trim().length === 0
    ) {
      e.preventDefault();
      setDescription(TASK_PLACEHOLDER);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && isValidInput && phase === 'input') {
      e.preventDefault();
      handleContinue();
    }
  };

  const MODEL_OPTIONS = [
    { value: 'opus-4.6', label: 'Opus 4.6' },
    { value: 'sonnet-4.5', label: 'Sonnet 4.5' },
    { value: 'haiku-4.5', label: 'Haiku 4.5' },
    { value: 'chatgpt', label: 'ChatGPT', comingSoon: true },
    { value: 'gemini', label: 'Gemini', comingSoon: true },
  ] as const;
  const MAX_PERSONAS = 5;

  const togglePersona = (id: string) => {
    setSelectedPersonaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_PERSONAS) {
          toast.error(`Maximum ${MAX_PERSONAS} testers allowed`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmitPlan = async () => {
    if (selectedPersonaIds.size === 0) {
      toast.error('Select at least one tester');
      return;
    }
    setSubmitting(true);
    try {
      const normalizedUrl = url.trim().startsWith('http')
        ? url.trim()
        : `https://${url.trim()}`;
      const tasks = [{ description: description.trim(), order_index: 0 }];
      const personaIds = Array.from(selectedPersonaIds);

      const study = await createStudy.mutateAsync({
        url: normalizedUrl,
        tasks,
        persona_template_ids: personaIds,
        persona_models: Object.keys(personaModels).length > 0 ? personaModels : undefined,
      });
      const bm = localStorage.getItem('miror-browser-mode') || 'cloud';
      await runStudy.mutateAsync({ studyId: study.id, browserMode: bm });
      router.replace(`/study/${study.id}/running`);
    } catch (err) {
      toast.error(`Failed to create ${TERMS.singular}`, {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex h-[42px] items-center justify-between px-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] uppercase text-foreground/30">Run a test</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="group/icon flex h-6 w-6 items-center justify-center rounded-md text-foreground/20 transition-colors hover:bg-muted hover:text-foreground/50"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={toggleBrowserMode}>
              {browserMode === 'local' ? <Globe /> : <Monitor />}
              {browserMode === 'local' ? 'Switch to cloud browser' : 'Switch to local browser'}
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="opacity-50 cursor-default">
              <Clock />
              Schedule a test
              <span className="ml-auto text-[10px] text-muted-foreground">Coming soon</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Underline Tabs Stepper */}
        <div className="border-b border-border">
          <div className="flex">
            {(['Describe test plan', 'Select testers'] as const).map((label, i) => {
              const isCurrent = (i === 0 && phase === 'input') || (i === 1 && phase === 'select-personas');

              const btn = (
                <button
                  key={label}
                  onClick={() => {
                    if (i === 0) setPhase('input');
                    else handleContinue();
                  }}
                  className={cn(
                    'relative flex-1 py-2.5 text-[14px] text-center transition-colors',
                    isCurrent ? 'text-foreground/70' : 'text-foreground/30',
                  )}
                >
                  {label}
                  {isCurrent && <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-foreground rounded-t-full" />}
                </button>
              );

              if (label === 'Select testers') {
                return (
                  <Tooltip key={label}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent className="max-w-[200px] text-center">Check out our testers. They have personalities.</TooltipContent>
                  </Tooltip>
                );
              }

              return btn;
            })}
          </div>
        </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Phase: Input */}
          {phase === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/25 mb-1.5">
                  your website
                </label>
                <input
                  ref={urlRef}
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    onUrlChangeProp?.(e.target.value);
                  }}
                  onKeyDown={handleUrlKeyDown}
                  placeholder="anthropic.com"
                  className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/70 outline-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/25 mb-1.5">
                  tester&apos;s task
                </label>
                <textarea
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleTaskKeyDown}
                  placeholder="e.g. Find the pricing page"
                  className="w-full min-h-20 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none resize-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring"
                />
              </div>
              <Button
                onClick={() => handleContinue()}
                className="w-full h-12"
              >
                Continue With Plan
                <CornerDownLeft className="ml-2 h-4 w-4 opacity-40" />
              </Button>

              {/* Persisted selections from persona step */}
              {selectedPersonaIds.size > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <div className="flex items-center -space-x-2">
                    {(personas ?? [])
                      .filter((p) => selectedPersonaIds.has(p.id))
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => togglePersona(p.id)}
                          className="group/avatar relative h-6 w-6 rounded-full border border-border overflow-hidden shrink-0 hover:z-10"
                        >
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center bg-foreground/5 text-[10px]">
                              {p.emoji}
                            </span>
                          )}
                          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                            <X className="h-2.5 w-2.5 text-white" />
                          </span>
                        </button>
                      ))}
                  </div>
                  <span>
                    <span className="text-foreground/40">~</span>{' '}
                    {costEstimate
                      ? `${Math.ceil(costEstimate.estimated_duration_seconds / 60)} min`
                      : `${selectedPersonaIds.size} min`}
                    {' '}&middot;{' '}
                    ${costEstimate
                      ? costEstimate.estimated_cost_usd.toFixed(2)
                      : (selectedPersonaIds.size * 0.5).toFixed(2)}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Phase: Select Personas */}
          {phase === 'select-personas' && (
            <motion.div
              key="select-personas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/20" />
                  <input
                    type="text"
                    value={personaFilter}
                    onChange={(e) => setPersonaFilter(e.target.value)}
                    placeholder="Search"
                    className="w-full h-[34px] rounded-md border border-border bg-muted/30 pl-8 pr-3 text-sm text-foreground/70 outline-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      'flex h-[34px] items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors shrink-0',
                      hasFilters
                        ? 'border-foreground/20 bg-foreground/5 text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}>
                      <ListFilter className="h-3.5 w-3.5" />
                      Filter
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Tag className="mr-2 h-4 w-4" />
                        Category
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-40">
                        <DropdownMenuItem onClick={() => setFilterCategory(null)}>
                          <span className={filterCategory === null ? 'font-medium' : ''}>All</span>
                        </DropdownMenuItem>
                        {categories.map((cat) => (
                          <DropdownMenuItem key={cat} onClick={() => setFilterCategory(cat)}>
                            <span className={filterCategory === cat ? 'font-medium' : ''}>{cat}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Monitor className="mr-2 h-4 w-4" />
                        Device
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-36">
                        <DropdownMenuItem onClick={() => setFilterDevice(null)}>
                          <span className={filterDevice === null ? 'font-medium' : ''}>All</span>
                        </DropdownMenuItem>
                        {DEVICE_OPTIONS.map((opt) => (
                          <DropdownMenuItem key={opt.value} onClick={() => setFilterDevice(opt.value)}>
                            {opt.icon}
                            <span className={filterDevice === opt.value ? 'font-medium' : ''}>{opt.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Cpu className="mr-2 h-4 w-4" />
                        Tech Literacy
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-36">
                        <DropdownMenuItem onClick={() => setFilterTech(null)}>
                          <span className={filterTech === null ? 'font-medium' : ''}>All</span>
                        </DropdownMenuItem>
                        {LEVEL_OPTIONS.map((opt) => (
                          <DropdownMenuItem key={opt.value} onClick={() => setFilterTech(opt.value)}>
                            <span className={filterTech === opt.value ? 'font-medium' : ''}>{opt.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Gauge className="mr-2 h-4 w-4" />
                        Patience
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-36">
                        <DropdownMenuItem onClick={() => setFilterPatience(null)}>
                          <span className={filterPatience === null ? 'font-medium' : ''}>All</span>
                        </DropdownMenuItem>
                        {LEVEL_OPTIONS.map((opt) => (
                          <DropdownMenuItem key={opt.value} onClick={() => setFilterPatience(opt.value)}>
                            <span className={filterPatience === opt.value ? 'font-medium' : ''}>{opt.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setFilterAccessibility((v) => !v)}>
                      <Checkbox checked={filterAccessibility} className="pointer-events-none mr-2" />
                      Accessibility needs
                    </DropdownMenuItem>

                    {hasFilters && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={clearAllFilters}>
                          <X className="mr-2 h-4 w-4" />
                          Clear all filters
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar">
                {/* Add your own */}
                <button
                  type="button"
                  onClick={() => setBuilderOpen(true)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-border p-2.5 transition-colors hover:border-foreground/20 hover:bg-muted/20"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-base shrink-0">
                    <Plus className="h-4 w-4 text-foreground/40" />
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[14px] font-medium">Add your own</p>
                    <p className="text-xs text-muted-foreground truncate">Create an AI tester with a distinct personality</p>
                  </div>
                </button>

                {(personas ?? [])
                  .filter((p) => {
                    const profile = p.default_profile as Record<string, unknown> | undefined;
                    if (personaFilter.trim()) {
                      const q = personaFilter.toLowerCase();
                      const matchesSearch =
                        p.name.toLowerCase().includes(q) ||
                        p.short_description.toLowerCase().includes(q) ||
                        p.category?.toLowerCase().includes(q) ||
                        (profile?.occupation && String(profile.occupation).toLowerCase().includes(q));
                      if (!matchesSearch) return false;
                    }
                    if (filterCategory && p.category !== filterCategory) return false;
                    if (filterDevice && profile && String(profile.device_preference) !== filterDevice) return false;
                    if (filterTech && profile && getLevelRange(levelToNumber(profile.tech_literacy)) !== filterTech) return false;
                    if (filterPatience && profile && getLevelRange(levelToNumber(profile.patience_level)) !== filterPatience) return false;
                    if (filterAccessibility && profile) {
                      const needs = profile.accessibility_needs;
                      if (!Array.isArray(needs) || needs.length === 0) return false;
                    }
                    return true;
                  })
                  .map((persona, i) => {
                  const isSelected = selectedPersonaIds.has(persona.id);
                  const isExpanded = expandedPersonaId === persona.id;
                  const profile = persona.default_profile as Record<string, unknown> | undefined;
                  return (
                    <motion.div
                      key={persona.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => togglePersona(persona.id)}
                      className={cn(
                        'rounded-lg border overflow-hidden transition-all cursor-pointer',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/20',
                      )}
                    >
                      {/* Header row */}
                      <div className="flex items-center gap-2.5 p-2.5">
                        {persona.avatar_url ? (
                          <img src={persona.avatar_url} alt={persona.name} className="h-8 w-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-base shrink-0">
                            {persona.emoji}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium truncate">{persona.name}</p>
                          {isExpanded && profile && (profile.occupation || profile.age) ? (
                            <p className="text-[14px] text-foreground/40 truncate">
                              {profile.occupation ? String(profile.occupation) : ''}
                              {profile.age ? `, ${String(profile.age)}yo` : ''}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground truncate">{persona.short_description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedPersonaId(isExpanded ? null : persona.id);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/20 hover:text-foreground/50 hover:bg-muted"
                          >
                            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && profile && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border space-y-4 px-2.5 pb-3 pt-3">
                              {/* Overview — chips */}
                              {(!!profile.tech_literacy || !!profile.patience_level || !!profile.device_preference) && (
                                <div>
                                  <span className="text-[14px] text-foreground/25">Overview</span>
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {!!profile.tech_literacy && (
                                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[14px] text-foreground/50">
                                        Tech savvy
                                        <LevelBars level={String(profile.tech_literacy)} />
                                      </span>
                                    )}
                                    {!!profile.patience_level && (
                                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[14px] text-foreground/50">
                                        Patience
                                        <LevelBars level={String(profile.patience_level)} />
                                      </span>
                                    )}
                                    {!!profile.device_preference && (
                                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[14px] text-foreground/50">
                                        {String(profile.device_preference) === 'mobile' ? '📱' : '🖥️'} Uses {String(profile.device_preference)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* About */}
                              <div>
                                <span className="text-[14px] text-foreground/25">About</span>
                                <p className="text-[14px] text-foreground/60 mt-1">{persona.short_description}</p>
                              </div>

                              {/* Frustrations */}
                              {Array.isArray(profile.frustration_triggers) && profile.frustration_triggers.length > 0 && (
                                <div>
                                  <span className="text-[14px] text-foreground/25">Frustrations</span>
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {(profile.frustration_triggers as string[]).map((f) => (
                                      <span key={f} className="rounded-full border border-border px-2.5 py-1 text-[14px] text-foreground/50">{f}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Accessibility */}
                              {Array.isArray(profile.accessibility_needs) && profile.accessibility_needs.length > 0 && (
                                <div>
                                  <span className="text-[14px] text-foreground/25">Accessibility</span>
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {(profile.accessibility_needs as string[]).map((a) => (
                                      <span key={a} className="rounded-full border border-border px-2.5 py-1 text-[14px] text-foreground/50">{a}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* Actions */}
              <Button
                onClick={handleSubmitPlan}
                disabled={submitting || selectedPersonaIds.size === 0}
                className="w-full h-12"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Submit Plan'
                )}
              </Button>

              {/* Estimate + selected faces */}
              {selectedPersonaIds.size > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <div className="flex items-center -space-x-2">
                    {(personas ?? [])
                      .filter((p) => selectedPersonaIds.has(p.id))
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => togglePersona(p.id)}
                          className="group/avatar relative h-6 w-6 rounded-full border border-border overflow-hidden shrink-0 hover:z-10"
                        >
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center bg-foreground/5 text-[10px]">
                              {p.emoji}
                            </span>
                          )}
                          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                            <X className="h-2.5 w-2.5 text-white" />
                          </span>
                        </button>
                      ))}
                  </div>
                  <span>
                    <span className="text-foreground/40">~</span>{' '}
                    {costEstimate
                      ? `${Math.ceil(costEstimate.estimated_duration_seconds / 60)} min`
                      : `${selectedPersonaIds.size} min`}
                    {' '}&middot;{' '}
                    ${costEstimate
                      ? costEstimate.estimated_cost_usd.toFixed(2)
                      : (selectedPersonaIds.size * 0.5).toFixed(2)}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="backdrop-blur-sm"
          className="sm:max-w-xl max-h-[85vh] overflow-y-auto"
        >
          <DialogTitle className="sr-only">Add your own tester</DialogTitle>
          <PersonaBuilderForm embedded onSuccess={(personaId) => {
            setBuilderOpen(false);
            setSelectedPersonaIds((prev) => {
              if (prev.size >= MAX_PERSONAS) return prev;
              const next = new Set(prev);
              next.add(personaId);
              return next;
            });
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
