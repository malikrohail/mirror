'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { ChevronDown, Monitor, Smartphone, X, Calendar, RotateCcw, Sparkles, Check, Cloud, User, ClipboardList, Users, TrendingUp, BookOpen, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCreateStudy, useRunStudy, useStudies } from '@/hooks/use-study';
import { TERMS } from '@/lib/constants';
import { PageHeaderBar } from '@/components/layout/page-header-bar';
import { WizardStepPersonas } from './wizard-step-personas';
import { WebsitePreview } from './website-preview';
import { QuickStart } from './quick-start';
import type { StudySummary } from '@/types';


function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type BrowserMode = 'local' | 'cloud';

export function StudySetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'new' | 'rerun'>('new');
  const [browserMode, setBrowserMode] = useState<BrowserMode>('local');
  const [data, setData] = useState({
    url: searchParams.get('url') ?? '',
    tasks: [''],
    personaIds: searchParams.get('personas')?.split(',').filter(Boolean) ?? ([] as string[]),
  });

  useEffect(() => {
    const stored = localStorage.getItem('mirror-browser-mode');
    if (stored === 'local' || stored === 'cloud') {
      setBrowserMode(stored);
    }
  }, []);

  // Pre-warm Browserbase session in the background while user configures study.
  // This saves 7-15 seconds when they click "Run Test".
  useEffect(() => {
    fetch('/api/v1/studies/browser/warm', { method: 'POST' }).catch(() => {});
  }, []);

  const toggleBrowserMode = (m: BrowserMode) => {
    setBrowserMode(m);
    localStorage.setItem('mirror-browser-mode', m);
  };

  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [browserEngine, setBrowserEngine] = useState<'local' | 'cloud'>('local');

  useEffect(() => {
    const stored = localStorage.getItem('mirror-browser-mode');
    if (stored === 'local' || stored === 'cloud') {
      setBrowserEngine(stored);
    }
  }, []);

  const handleBrowserEngineChange = (mode: 'local' | 'cloud') => {
    setBrowserEngine(mode);
    localStorage.setItem('mirror-browser-mode', mode);
    // Dispatch storage event for same-window listeners (storage event only fires cross-tab)
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'mirror-browser-mode',
      newValue: mode,
    }));
  };

  const [setupMode, setSetupMode] = useState<'quick' | 'manual'>('quick');

  const [bookmarks, setBookmarks] = useState<string[]>([]);

  const refreshBookmarks = () => {
    try {
      const stored = localStorage.getItem('mirror-browser-favorites');
      setBookmarks(stored ? JSON.parse(stored) : []);
    } catch {
      setBookmarks([]);
    }
  };

  const createStudy = useCreateStudy();
  const runStudy = useRunStudy();
  const { data: previousStudies } = useStudies(1, 50);

  const completedStudies = (previousStudies?.items ?? []).filter(
    (s) => s.status === 'complete' || s.status === 'failed',
  );

  const loadFromStudy = (study: StudySummary) => {
    const templateIds = (study.personas ?? [])
      .map((p) => p.template_id)
      .filter((id): id is string => id !== null);
    setData({
      url: study.url,
      tasks: (study.tasks ?? []).length > 0 ? (study.tasks ?? []).map((t) => t.description) : [''],
      personaIds: templateIds,
    });
  };

  const canSubmit =
    data.url.trim().length > 0 &&
    data.tasks.some((t) => t.trim().length > 0) &&
    data.personaIds.length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const tasks = data.tasks
        .filter((t) => t.trim())
        .map((t, i) => ({ description: t.trim(), order_index: i }));
      const study = await createStudy.mutateAsync({
        url: data.url.trim(),
        tasks,
        persona_template_ids: data.personaIds,
      });
      const browserMode = localStorage.getItem('mirror-browser-mode') || 'local';
      await runStudy.mutateAsync({ studyId: study.id, browserMode });
      router.push(`/study/${study.id}/running`);
    } catch (err) {
      toast.error(`Failed to create ${TERMS.singular}`, {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      setSubmitting(false);
    }
  };

  const acceptPlaceholder = (
    e: KeyboardEvent<HTMLInputElement>,
    value: string,
    placeholder: string,
    onAccept: (val: string) => void,
  ) => {
    if (!value && e.key === 'ArrowRight') {
      e.preventDefault();
      onAccept(placeholder);
    }
  };

  const headerRight = (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <User className="h-4 w-4" />
            <span>Profile</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/tests" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Previous Tests
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/personas" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Testers
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/schedules" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Scheduled Tests
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/history" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Score History
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/docs" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Docs
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex items-center gap-2">
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
            <span className="dark:hidden">Dark Mode</span>
            <span className="hidden dark:inline">Light Mode</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div>
      <PageHeaderBar
        chips={[
          { label: 'Mode', value: mode === 'rerun' ? 'Rerun' : 'New Test' },
          { label: 'Browser', value: browserMode === 'cloud' ? 'Cloud' : 'Local' },
        ]}
        right={headerRight}
      />
    <div className="grid min-h-full grid-cols-1 lg:grid-cols-[minmax(380px,1fr)_1.5fr] gap-4 p-6">
      {/* Left column — config + testers + run button */}
      <div className="flex flex-col gap-6">
        {/* Mode toggle: Quick Start / Manual */}
        <div className="flex rounded-md border p-0.5">
          <button
            onClick={() => setSetupMode('quick')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors ${
              setupMode === 'quick'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Quick Start
          </button>
          <button
            onClick={() => setSetupMode('manual')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors ${
              setupMode === 'manual'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Manual Setup
          </button>
        </div>

        {/* Quick Start mode */}
        {setupMode === 'quick' && <QuickStart />}

        {/* Manual mode — existing panels */}
        {setupMode === 'manual' && (
        <>
        {/* Panel 1 — Configure test */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-h-0">
          <div className="flex h-[46px] shrink-0 items-center border-b border-border px-3">
            <span className="text-[16px] font-medium text-foreground/90">Configure your {TERMS.singular}</span>
          </div>
          <div className="space-y-4 px-6 pt-3 pb-6 overflow-y-auto">
            {/* New / Rerun toggle */}
            <div className="flex rounded-md border p-0.5">
              <button
                onClick={() => setMode('new')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === 'new'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                New {TERMS.singularCap}
              </button>
              <button
                onClick={() => setMode('rerun')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === 'rerun'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Rerun {TERMS.singularCap}
              </button>
            </div>

            {/* Rerun picker */}
            {mode === 'rerun' && (
              <div>
                <label className="block text-[14px] font-medium uppercase text-foreground/50">
                  Pick a previous {TERMS.singular}
                </label>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border p-1.5">
                  {completedStudies.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                      No previous {TERMS.plural} yet
                    </p>
                  ) : (
                    completedStudies.map((s) => {
                      const isSelected = s.url === data.url && (s.tasks ?? []).every((t, i) => data.tasks[i] === t.description);
                      return (
                        <button
                          key={s.id}
                          onClick={() => loadFromStudy(s)}
                          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? 'border border-primary bg-primary/5'
                              : 'border border-transparent hover:bg-muted'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">
                              {(() => { try { return new URL(s.url).hostname + new URL(s.url).pathname; } catch { return s.url; } })()}
                            </p>
                            <p className="truncate text-muted-foreground">
                              {(s.tasks ?? []).map((t) => t.description).join(', ')}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {s.overall_score !== null && (
                              <span className={`font-semibold ${s.overall_score >= 80 ? 'text-emerald-600' : s.overall_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                {s.overall_score}
                              </span>
                            )}
                            <span className="text-muted-foreground">{fmtDate(s.created_at)}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* URL */}
            <div>
              <label className="block text-[14px] font-medium uppercase text-foreground/50">
                Your website
              </label>
              <div className="mt-2 flex w-full items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring dark:border-input dark:bg-background">
                <input
                  type="text"
                  value={data.url.replace(/^https?:\/\/(www\.)?/, '')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^https?:\/\/(www\.)?/, '');
                    setData((d) => ({ ...d, url: raw ? `https://${raw}` : '' }));
                  }}
                  onKeyDown={(e) =>
                    acceptPlaceholder(
                      e,
                      data.url,
                      'claude.com/pricing',
                      (v) => setData((d) => ({ ...d, url: `https://${v}` })),
                    )
                  }
                  placeholder="claude.com/pricing"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-foreground/30"
                />
                <DropdownMenu onOpenChange={(open) => { if (open) refreshBookmarks(); }}>
                  <DropdownMenuTrigger asChild>
                    <button className="flex shrink-0 items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                      Bookmarks
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {bookmarks.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                        No bookmarks yet
                      </p>
                    ) : (
                      bookmarks.map((bm) => (
                        <DropdownMenuItem
                          key={bm}
                          onClick={() => setData((d) => ({ ...d, url: bm }))}
                        >
                          <span className="truncate text-sm">
                            {(() => { try { return new URL(bm).hostname; } catch { return bm; } })()}
                          </span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Tasks */}
            <div>
              <label className="block text-[14px] font-medium uppercase text-foreground/50">
                What should the testers achieve?
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  value={data.tasks[0]}
                  onChange={(e) =>
                    setData((d) => ({ ...d, tasks: [e.target.value] }))
                  }
                  onKeyDown={(e) => {
                    acceptPlaceholder(e, data.tasks[0], 'Open a pro account', (v) =>
                      setData((d) => ({ ...d, tasks: [v] })),
                    );
                  }}
                  placeholder="Open a pro account"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-foreground/30 focus:ring-1 focus:ring-ring dark:border-input dark:bg-background"
                />
              </div>
            </div>

            {/* Device */}
            <div>
              <label className="block text-[14px] font-medium uppercase text-foreground/50">
                What device should they use?
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setViewMode('desktop')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    viewMode === 'desktop'
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/20'
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  Desktop
                </button>
                <button
                  onClick={() => setViewMode('mobile')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    viewMode === 'mobile'
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/20'
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </button>
              </div>
            </div>

            {/* Browser engine */}
            <div>
              <label className="block text-[14px] font-medium uppercase text-foreground/50">
                Browser engine
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleBrowserEngineChange('local')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    browserEngine === 'local'
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/20'
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  Local
                </button>
                <button
                  onClick={() => handleBrowserEngineChange('cloud')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    browserEngine === 'cloud'
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/20'
                  }`}
                >
                  <Cloud className="h-4 w-4" />
                  Cloud
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {browserEngine === 'local'
                  ? 'Uses local Chromium — free, no CAPTCHA solving'
                  : 'Uses Browserbase — live view, auto CAPTCHA solving'}
              </p>
            </div>

          </div>
        </div>

        {/* Panel 2 — Choose testers */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-h-0">
          <div className="flex h-[46px] shrink-0 items-center border-b border-border px-3">
            <span className="text-[16px] font-medium text-foreground/90">Choose your testers</span>
          </div>
          <div className="px-6 pt-3 pb-6 overflow-y-auto">
            <WizardStepPersonas
              selected={data.personaIds}
              onToggle={(id) =>
                setData((d) => ({
                  ...d,
                  personaIds: d.personaIds.includes(id)
                    ? d.personaIds.filter((p) => p !== id)
                    : d.personaIds.length < 8
                      ? [...d.personaIds, id]
                      : d.personaIds,
                }))
              }
            />
            {data.personaIds.length > 0 && (
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>{data.personaIds.length} tester{data.personaIds.length !== 1 ? 's' : ''} selected</span>
                <span><span className="text-foreground/30">Est.</span> {data.personaIds.length * 2} min &middot; ${(data.personaIds.length * 0.5).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        </>
        )}
      </div>

      {/* Right column — Website preview + Run Test */}
      <div className="hidden lg:flex lg:flex-col gap-4">
        <WebsitePreview
          url={data.url}
          onUrlChange={(url) => setData((d) => ({ ...d, url }))}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className="relative" title={!canSubmit && !submitting ? (
          !data.url.trim() ? 'Enter a website URL' :
          !data.tasks.some((t) => t.trim()) ? 'Add a task for testers' :
          data.personaIds.length === 0 ? 'Select at least one tester' : ''
        ) : undefined}>
          <Button
            onClick={canSubmit && !submitting ? handleSubmit : undefined}
            className="h-12 w-full text-base cursor-pointer"
            style={!canSubmit || submitting ? { opacity: 1, pointerEvents: 'auto' } : undefined}
          >
            {submitting
              ? 'Creating...'
              : mode === 'rerun'
                ? `Rerun ${TERMS.singularCap}`
                : `Run ${TERMS.singularCap}`}
          </Button>
        </div>
      </div>
    </div>
    </div>
  );
}
