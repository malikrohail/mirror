'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, Users, ListFilter, X, Tag, Monitor, Smartphone, Tablet,
  Cpu, Gauge, Accessibility, DollarSign,
} from 'lucide-react';
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
import { usePersonaTemplates } from '@/hooks/use-personas';
import { useStudies } from '@/hooks/use-study';
import { PersonaTable } from '@/components/persona/persona-table';
import { PersonaBuilderForm } from '@/components/persona/persona-builder-form';
import { EmptyState } from '@/components/common/empty-state';
import { TeamIllustration } from '@/components/common/empty-illustrations';
import { PageSkeleton } from '@/components/common/page-skeleton';
import { PageHeaderBar } from '@/components/layout/page-header-bar';
import { cn } from '@/lib/utils';
import type { PersonaTemplateOut } from '@/types';

type Tab = 'all' | 'mine';
type LevelRange = 'low' | 'mid' | 'high';
type DeviceFilter = 'desktop' | 'mobile' | 'tablet';

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

function getLevelRange(val: number | null): LevelRange | null {
  if (val === null) return null;
  if (val <= 3) return 'low';
  if (val <= 6) return 'mid';
  return 'high';
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

export default function PersonaLibraryPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceFilter | null>(null);
  const [techLevel, setTechLevel] = useState<LevelRange | null>(null);
  const [patienceLevel, setPatienceLevel] = useState<LevelRange | null>(null);
  const [accessibilityOnly, setAccessibilityOnly] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const { data: templates, isLoading } = usePersonaTemplates();
  const { data: studiesData } = useStudies(1, 50);

  const [myTeamIds, setMyTeamIds] = useState<string[]>([]);

  const refreshMyTeam = useCallback(() => {
    const stored: string[] = JSON.parse(localStorage.getItem('miror-my-team') ?? '[]');
    setMyTeamIds(stored);
  }, []);

  useEffect(() => {
    refreshMyTeam();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'miror-my-team') refreshMyTeam();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshMyTeam]);

  // Re-read when switching to "mine" tab (covers same-tab localStorage writes)
  useEffect(() => {
    if (tab === 'mine') refreshMyTeam();
  }, [tab, refreshMyTeam]);

  const myTeamCount = myTeamIds.length;
  const myTests = studiesData?.total ?? 0;
  const totalCost = useMemo(() => {
    if (!studiesData?.items) return 0;
    return studiesData.items.reduce((sum, s) => sum + (s.total_cost_usd ?? 0), 0);
  }, [studiesData]);

  const categories = useMemo(() => {
    if (!templates) return [];
    return Array.from(new Set(templates.map((t) => t.category))).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    if (!templates) return [];
    let list: PersonaTemplateOut[] = templates;
    if (tab === 'mine') list = list.filter((t) => myTeamIds.includes(t.id));
    if (category) list = list.filter((t) => t.category === category);
    if (device) list = list.filter((t) => String(t.default_profile.device_preference) === device);
    if (techLevel) list = list.filter((t) => getLevelRange(levelToNumber(t.default_profile.tech_literacy)) === techLevel);
    if (patienceLevel) list = list.filter((t) => getLevelRange(levelToNumber(t.default_profile.patience_level)) === patienceLevel);
    if (accessibilityOnly) list = list.filter((t) => getAccessibilityNeeds(t.default_profile).length > 0);
    return list;
  }, [templates, tab, myTeamIds, category, device, techLevel, patienceLevel, accessibilityOnly]);

  const hasFilters = category !== null || device !== null || techLevel !== null || patienceLevel !== null || accessibilityOnly;

  const clearAllFilters = () => {
    setCategory(null);
    setDevice(null);
    setTechLevel(null);
    setPatienceLevel(null);
    setAccessibilityOnly(false);
  };

  const activeFilterChips: { label: string; clear: () => void }[] = [];
  if (category) activeFilterChips.push({ label: category, clear: () => setCategory(null) });
  if (device) activeFilterChips.push({ label: device.charAt(0).toUpperCase() + device.slice(1), clear: () => setDevice(null) });
  if (techLevel) activeFilterChips.push({ label: `Tech: ${techLevel}`, clear: () => setTechLevel(null) });
  if (patienceLevel) activeFilterChips.push({ label: `Patience: ${patienceLevel}`, clear: () => setPatienceLevel(null) });
  if (accessibilityOnly) activeFilterChips.push({ label: 'Accessibility', clear: () => setAccessibilityOnly(false) });

  const headerChips = templates
    ? [
        { label: 'Testers', value: templates.length, tooltip: 'Total AI personas available' },
        { label: 'My team', value: myTeamCount, tooltip: 'Personas added to your team' },
        { label: 'My tests', value: myTests, tooltip: 'Total tests you have run' },
        { label: 'Total spent', value: `$${totalCost.toFixed(2)}`, tooltip: 'Total API cost across all tests' },
      ]
    : [];

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      {headerChips.length > 0 && (
        <PageHeaderBar
          icon={Users}
          title="Testers"
          chips={headerChips}
          right={
            <Button size="sm" className="h-[30px] text-sm" onClick={() => setBuilderOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Tester
            </Button>
          }
        />
      )}
      <div className="space-y-2.5 px-[100px] pt-[40px] pb-[100px]">
        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <p className="text-[14px] uppercase text-foreground/30">Available testers</p>
          <div className="flex-1" />

          {/* My Team toggle chip */}
          <button
            onClick={() => setTab(tab === 'mine' ? 'all' : 'mine')}
            className={cn(
              'flex h-[30px] items-center gap-1.5 rounded-md border px-2.5 text-[14px] transition-colors',
              tab === 'mine'
                ? 'border-foreground/20 bg-foreground/5 text-foreground/70'
                : 'border-border text-foreground/70 hover:text-foreground',
            )}
          >
            My Team <span className="text-foreground/30">{myTeamCount}</span>
            {tab === 'mine' && <X className="h-3 w-3" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'flex h-[30px] items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors',
                hasFilters
                  ? 'border-foreground/20 bg-foreground/5 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}>
                <ListFilter className="h-3.5 w-3.5" />
                Filter
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Category */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Tag className="mr-2 h-4 w-4" />
                  Category
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-40">
                  <DropdownMenuItem onClick={() => setCategory(null)}>
                    <span className={category === null ? 'font-medium' : ''}>All</span>
                  </DropdownMenuItem>
                  {categories.map((cat) => (
                    <DropdownMenuItem key={cat} onClick={() => setCategory(cat)}>
                      <span className={category === cat ? 'font-medium' : ''}>{cat}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Device */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Monitor className="mr-2 h-4 w-4" />
                  Device
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  <DropdownMenuItem onClick={() => setDevice(null)}>
                    <span className={device === null ? 'font-medium' : ''}>All</span>
                  </DropdownMenuItem>
                  {DEVICE_OPTIONS.map((opt) => (
                    <DropdownMenuItem key={opt.value} onClick={() => setDevice(opt.value)}>
                      {opt.icon}
                      <span className={device === opt.value ? 'font-medium' : ''}>{opt.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Tech Literacy */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Cpu className="mr-2 h-4 w-4" />
                  Tech Literacy
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  <DropdownMenuItem onClick={() => setTechLevel(null)}>
                    <span className={techLevel === null ? 'font-medium' : ''}>All</span>
                  </DropdownMenuItem>
                  {LEVEL_OPTIONS.map((opt) => (
                    <DropdownMenuItem key={opt.value} onClick={() => setTechLevel(opt.value)}>
                      <span className={techLevel === opt.value ? 'font-medium' : ''}>{opt.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Patience */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Gauge className="mr-2 h-4 w-4" />
                  Patience
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  <DropdownMenuItem onClick={() => setPatienceLevel(null)}>
                    <span className={patienceLevel === null ? 'font-medium' : ''}>All</span>
                  </DropdownMenuItem>
                  {LEVEL_OPTIONS.map((opt) => (
                    <DropdownMenuItem key={opt.value} onClick={() => setPatienceLevel(opt.value)}>
                      <span className={patienceLevel === opt.value ? 'font-medium' : ''}>{opt.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Accessibility toggle */}
              <DropdownMenuItem onClick={() => setAccessibilityOnly((v) => !v)}>
                <Checkbox checked={accessibilityOnly} className="pointer-events-none mr-2" />
                Accessibility needs
              </DropdownMenuItem>

              {/* Clear all */}
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

          {/* Active filter chips */}
          {activeFilterChips.map((chip) => (
            <button
              key={chip.label}
              onClick={chip.clear}
              className="flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-sm text-muted-foreground hover:text-foreground"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <PersonaTable templates={filtered} onTeamChange={refreshMyTeam} isMyTeam={tab === 'mine'} />
        ) : (
          <EmptyState
            illustration={<TeamIllustration />}
            title={tab === 'mine' ? 'No team members yet' : 'No testers found'}
            description={tab === 'mine' ? 'Testers you create or use in tests will appear here.' : 'No persona templates match your filter.'}
            action={tab === 'mine' ? (
              <Button variant="outline" size="sm" onClick={() => setTab('all')}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Browse testers
              </Button>
            ) : undefined}
          />
        )}
      </div>

      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Add Tester</DialogTitle>
          <PersonaBuilderForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
