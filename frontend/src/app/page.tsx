'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ChevronRight, Loader2, Plus, Users, Play, MoreVertical, UserMinus, X, HelpCircle, RefreshCw, Code2, Mouse, Presentation, Home } from 'lucide-react';
import { TestsIllustration, TeamIllustration } from '@/components/common/empty-illustrations';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn, scoreColor, scoreLabel, studyName } from '@/lib/utils';
import { MirorIcon } from '@/components/common/miror-logo';
import { TaglineH2 } from '@/components/common/tagline-h2';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStudies } from '@/hooks/use-study';
import { usePersonaTemplates } from '@/hooks/use-personas';
import { QuickStart } from '@/components/study/quick-start';
import { WebsitePreview } from '@/components/study/website-preview';
import { PageHeaderBar } from '@/components/layout/page-header-bar';
import type { StudySummary, PersonaTemplateOut } from '@/types';

// ── Helpers ──────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
      </span>
    );
  }
  if (status === 'analyzing') {
    return (
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-purple-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-purple-500" />
      </span>
    );
  }
  if (status === 'failed') return <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />;
  return <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />;
}

// ── Section Card ─────────────────────────────────────────

function SectionCard({
  title,
  count,
  href,
  linkLabel = 'View all',
  children,
  loading,
  empty,
  emptyContent,
}: {
  title: string;
  count?: number;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyContent?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex h-[42px] items-center justify-between px-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] uppercase text-foreground/30">{title}</h3>
          {count !== undefined && (
            <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 text-xs text-foreground/50 transition-colors hover:text-foreground"
          >
            {linkLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="p-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : empty ? (
          emptyContent ?? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nothing here yet
            </div>
          )
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ── Helpers (match tests page) ───────────────────────────

const statusColor = (status: string) =>
  status === 'complete' ? 'text-green-600' :
  status === 'failed' ? 'text-red-500' :
  status === 'running' ? 'text-blue-500' :
  'text-muted-foreground';

function studyHref(s: StudySummary) {
  if (s.status === 'complete' || s.status === 'failed') return `/study/${s.id}`;
  return `/study/${s.id}/running`;
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ScoreCell({ score }: { score: number | null | undefined }) {
  if (score == null || score <= 0) return <span className="text-foreground/20">&mdash;</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('font-semibold', scoreColor(score).text)}>{Math.round(score)}</span>
      <span className={cn('text-[10px] font-medium uppercase tracking-wide opacity-60', scoreColor(score).text)}>
        {scoreLabel(score)}
      </span>
    </span>
  );
}

// ── Test Row ─────────────────────────────────────────────

function TestRow({ study, index }: { study: StudySummary; index: number }) {
  return (
    <Link
      href={studyHref(study)}
      className="group/row flex items-center px-3 py-2.5 text-[13px] hover:bg-muted/20 transition-colors border-b border-border/50 last:border-b-0"
    >
      <div className="grid flex-1 items-center" style={{ gridTemplateColumns: '80px 1fr 100px 50px 80px 60px' }}>
        <span className="text-foreground/30">{studyName(study.url, index)}</span>
        <span className="text-foreground/70 truncate pr-4">{study.first_task ?? ''}</span>
        <span className="inline-flex items-center gap-1.5">
          <StatusDot status={study.status} />
          <span className={cn('capitalize', statusColor(study.status))}>{study.status}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-foreground/40">
          <Users className="h-3 w-3" />
          {study.persona_count ?? 0}
        </span>
        <span className="tabular-nums"><ScoreCell score={study.overall_score} /></span>
        <span className="text-right text-foreground/30">{fmtShort(study.created_at)}</span>
      </div>
      <ChevronRight className="mx-3 h-3.5 w-3.5 shrink-0 text-foreground/15 opacity-0 group-hover/row:opacity-100 transition-opacity" />
    </Link>
  );
}

// ── Team Member ──────────────────────────────────────────

function TeamMember({
  persona,
  isOnTeam,
  isSelected,
  hasSelection,
  onToggleSelect,
  onAddToTeam,
  onRemoveFromTeam,
}: {
  persona: PersonaTemplateOut;
  isOnTeam: boolean;
  isSelected: boolean;
  hasSelection: boolean;
  onToggleSelect: (id: string) => void;
  onAddToTeam: (id: string) => void;
  onRemoveFromTeam: (id: string) => void;
}) {
  const router = useRouter();
  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/20">
      <div className="w-6 shrink-0 flex items-center justify-center">
        <div className={cn(
          'transition-opacity',
          hasSelection || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(persona.id)}
            className="translate-y-[1px]"
          />
        </div>
      </div>
      {persona.avatar_url ? (
        <img src={persona.avatar_url} alt={persona.name} className="h-8 w-8 rounded-lg object-cover shrink-0" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-base shrink-0">
          {persona.emoji}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-foreground/70 truncate">{persona.name}</p>
        <p className="text-[14px] text-foreground/30 truncate">{persona.short_description}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/15 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/5 hover:text-foreground/40">
            {isOnTeam ? <MoreVertical className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {!isOnTeam && (
            <DropdownMenuItem onClick={() => onAddToTeam(persona.id)}>
              <Users className="mr-2 h-4 w-4" />
              Add to team
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => router.push(`/?personas=${persona.id}`)}>
            <Play className="mr-2 h-4 w-4" />
            Add to test
          </DropdownMenuItem>
          {isOnTeam && (
            <DropdownMenuItem onClick={() => onRemoveFromTeam(persona.id)} className="text-destructive focus:text-destructive">
              <UserMinus className="mr-2 h-4 w-4" />
              Remove from team
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: studyData, isLoading: studiesLoading } = useStudies(1, 50);
  const { data: personas, isLoading: personasLoading } = usePersonaTemplates();

  // Pre-selected personas from "Add to test" action
  const preSelectedPersonaIds = searchParams.get('personas')?.split(',').filter(Boolean) ?? [];

  // URL from QuickStart — drives the right-column cross-fade
  const [quickStartUrl, setQuickStartUrl] = useState('');
  const trimmedUrl = quickStartUrl.trim();
  const previewUrl = trimmedUrl
    ? (trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`)
    : '';
  // Only show preview when something that looks like a real URL is typed (has a dot)
  const showPreview = trimmedUrl.includes('.');
  const leftColRef = useRef<HTMLDivElement>(null);

  // Scroll to QuickStart when personas are pre-selected
  useEffect(() => {
    if (preSelectedPersonaIds.length > 0 && leftColRef.current) {
      leftColRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [preSelectedPersonaIds.length]);

  // Get team IDs from localStorage
  const [teamIds, setTeamIds] = useState<string[]>([]);

  const refreshTeamIds = useCallback(() => {
    try {
      const stored = localStorage.getItem('miror-my-team');
      setTeamIds(stored ? JSON.parse(stored) : []);
    } catch {
      setTeamIds([]);
    }
  }, []);

  useEffect(() => {
    refreshTeamIds();
  }, [refreshTeamIds]);

  const addToTeam = useCallback((id: string) => {
    const existing: string[] = JSON.parse(localStorage.getItem('miror-my-team') ?? '[]');
    const merged = Array.from(new Set([...existing, id]));
    localStorage.setItem('miror-my-team', JSON.stringify(merged));
    const name = personas?.find((p) => p.id === id)?.name;
    toast.success(`Added ${name} to your team`);
    refreshTeamIds();
  }, [personas, refreshTeamIds]);

  const removeFromTeam = useCallback((id: string) => {
    const existing: string[] = JSON.parse(localStorage.getItem('miror-my-team') ?? '[]');
    const updated = existing.filter((x) => x !== id);
    localStorage.setItem('miror-my-team', JSON.stringify(updated));
    const name = personas?.find((p) => p.id === id)?.name;
    toast.success(`Removed ${name} from your team`);
    refreshTeamIds();
  }, [personas, refreshTeamIds]);

  // Selection state for team members
  const [selectedPersonas, setSelectedPersonas] = useState<Set<string>>(new Set());
  const hasSelection = selectedPersonas.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedPersonas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedPersonas(new Set()), []);

  const addSelectedToTeam = useCallback(() => {
    const ids = Array.from(selectedPersonas);
    const existing: string[] = JSON.parse(localStorage.getItem('miror-my-team') ?? '[]');
    const merged = Array.from(new Set([...existing, ...ids]));
    localStorage.setItem('miror-my-team', JSON.stringify(merged));
    const names = ids.map((id) => personas?.find((p) => p.id === id)?.name).filter(Boolean);
    toast.success(`Added ${names.join(', ')} to your team`);
    refreshTeamIds();
    clearSelection();
  }, [selectedPersonas, personas, refreshTeamIds, clearSelection]);

  const initiateTestWithSelected = useCallback(() => {
    const ids = Array.from(selectedPersonas);
    router.push(`/?personas=${ids.join(',')}`);
  }, [selectedPersonas, router]);

  const studies = studyData?.items ?? [];
  const recentStudies = studies.slice(0, 6);
  const teamPersonas = personas?.filter((p) => teamIds.includes(p.id)) ?? [];
  const displayTeam = teamPersonas.length > 0 ? teamPersonas : (personas ?? []).slice(0, 5);
  const allTestersCount = personas?.length ?? 0;
  const teamLabel = teamPersonas.length > 0 ? 'Your Team' : 'Available testers';

  // Global stats
  const totalTests = studyData?.total ?? studies.length;
  const totalTesters = personas?.length ?? 0;
  const completedTests = studies.filter((s) => s.status === 'complete').length;
  // Time saved: 4h base per study + 30min per persona×task session
  const hoursSaved = studies
    .filter((s) => s.status === 'complete')
    .reduce((sum, s) => {
      const sessions = (s.persona_count ?? 1) * (s.task_count ?? 1);
      return sum + 4 + sessions * 0.5;
    }, 0);
  const timeSavedLabel = hoursSaved >= 24 ? `${Math.round(hoursSaved / 24)}d` : `${Math.round(hoursSaved)}h`;
  // Cost saved: ~$500 per completed study (equivalent quick remote test round)
  const costSaved = completedTests * 500;
  const costSavedLabel = costSaved >= 1000 ? `$${(costSaved / 1000).toFixed(costSaved % 1000 === 0 ? 0 : 1)}k` : `$${costSaved}`;

  const headerChips = [
    { label: 'Tests run', value: String(totalTests), tooltip: 'Total tests run across the entire platform' },
    { label: 'Testers', value: String(totalTesters), tooltip: 'Total AI personas available on the platform' },
    ...(completedTests > 0
      ? [
          {
            label: 'Time saved',
            value: `~${timeSavedLabel}`,
            tooltip: 'Estimated time saved across the entire platform vs manual QA. Calculated as 4h setup per test + 30min per tester×task session (recruiting, scheduling, running, note-taking, and write-up).',
          },
          {
            label: 'Cost saved',
            value: `~${costSavedLabel}`,
            tooltip: 'Estimated cost saved across the entire platform vs traditional user testing. Calculated at ~$500 per test (participant incentives, platform fees, and researcher time).',
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeaderBar
        icon={Home}
        title={showPreview ? 'New test' : `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, hackathon judges`}
        chips={headerChips}
        right={
          <>
            <button
              onClick={() => router.push('/study/showcase')}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
            >
              <Presentation className="h-3.5 w-3.5" />
              Case study
            </button>
            <button
              onClick={() => router.push('/docs')}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              How it works
            </button>
          </>
        }
      />

      <div className="px-[100px] pt-[40px] pb-[100px]">
        <h1 className="flex items-center gap-2.5 text-3xl tracking-tight" style={{ fontFamily: '"Red Hat Display", sans-serif', fontWeight: 500 }}>
          <MirorIcon size={28} />
          <span>miror</span>
        </h1>
        <div className="mt-2">
          <TaglineH2 />
        </div>

      {/* Same grid as /study/new */}
        <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] items-start gap-4 pt-6">
        {/* Left column — QuickStart */}
        <div ref={leftColRef} className="flex flex-col gap-4">
          <QuickStart
            onUrlChange={setQuickStartUrl}
            preSelectedPersonaIds={preSelectedPersonaIds.length > 0 ? preSelectedPersonaIds : undefined}
          />
        </div>

        {/* Right column — cross-fade between cards and browser preview */}
        <div className="hidden lg:block relative">
          <AnimatePresence mode="wait">
            {showPreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <WebsitePreview url={previewUrl} onUrlChange={(u) => setQuickStartUrl(u)} />
              </motion.div>
            ) : (
              <motion.div
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-4"
              >
                <SectionCard
                  title="Recent tests"
                  count={studies.length}
                  href="/tests"
                  loading={studiesLoading}
                  empty={recentStudies.length === 0}
                  emptyContent={
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <TestsIllustration />
                      <div>
                        <p className="text-sm font-medium">No tests yet</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Run your first test to see results here</p>
                      </div>
                      <Button variant="outline" size="sm" className="mt-1" asChild>
                        <Link href="/"><Plus className="mr-1.5 h-3.5 w-3.5" />Run your first test</Link>
                      </Button>
                    </div>
                  }
                >
                  {recentStudies.map((study, i) => (
                    <TestRow key={study.id} study={study} index={studies.length - i} />
                  ))}
                </SectionCard>

                <SectionCard
                  title={teamLabel}
                  count={teamPersonas.length > 0 ? teamPersonas.length : allTestersCount}
                  href="/personas"
                  linkLabel="See all"
                  loading={personasLoading}
                  empty={displayTeam.length === 0}
                  emptyContent={
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <TeamIllustration />
                      <div>
                        <p className="text-sm font-medium">Build your team</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Add AI testers to run usability tests on your site</p>
                      </div>
                      <Button variant="outline" size="sm" className="mt-1" asChild>
                        <Link href="/personas"><Plus className="mr-1.5 h-3.5 w-3.5" />Browse testers</Link>
                      </Button>
                    </div>
                  }
                >
                  {displayTeam.map((p) => (
                    <TeamMember
                      key={p.id}
                      persona={p}
                      isOnTeam={teamIds.includes(p.id)}
                      isSelected={selectedPersonas.has(p.id)}
                      hasSelection={hasSelection}
                      onToggleSelect={toggleSelect}
                      onAddToTeam={addToTeam}
                      onRemoveFromTeam={removeFromTeam}
                    />
                  ))}
                </SectionCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>

      {/* Floating action bar */}
      {hasSelection && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm font-medium text-foreground/50">
              {selectedPersonas.size} of {displayTeam.length} selected
            </span>
            {Array.from(selectedPersonas).every((id) => teamIds.includes(id)) ? (
              <Button size="sm" className="rounded-full" onClick={() => { Array.from(selectedPersonas).forEach((id) => removeFromTeam(id)); clearSelection(); }}>
                <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                Remove from team
              </Button>
            ) : (
              <Button size="sm" className="rounded-full !gap-1.5" onClick={addSelectedToTeam}>
                <Users className="!size-3.5" />
                Add to team
              </Button>
            )}
            <Button size="sm" className="rounded-full !gap-1.5" onClick={initiateTestWithSelected}>
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
    </div>
  );
}
