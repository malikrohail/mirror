'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCreateStudy, useRunStudy } from '@/hooks/use-study';
import { WizardStepPersonas } from './wizard-step-personas';
import { WebsitePreview } from './website-preview';

export function StudySetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({
    url: searchParams.get('url') ?? '',
    tasks: [''],
    personaIds: [] as string[],
  });

  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

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

  const canSubmit =
    data.url.trim().length > 0 &&
    data.tasks.some((t) => t.trim().length > 0) &&
    data.personaIds.length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const study = await createStudy.mutateAsync({
        url: data.url.trim(),
        tasks: data.tasks
          .filter((t) => t.trim())
          .map((t, i) => ({ description: t.trim(), order_index: i })),
        persona_template_ids: data.personaIds,
      });
      await runStudy.mutateAsync(study.id);
      router.push(`/study/${study.id}/running`);
    } catch (err) {
      toast.error('Failed to create test', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(380px,1fr)_1.5fr] gap-4 p-6">
      {/* Left column — config + testers + run button */}
      <div className="flex flex-col gap-4 overflow-y-auto scrollbar-hide">
        {/* Panel 1 — Configure test */}
        <div className="flex flex-col overflow-hidden rounded-lg border bg-background min-h-0">
          <div className="flex h-[46px] shrink-0 items-center border-b bg-blue-50 px-3 dark:bg-blue-950/30">
            <span className="text-[16px] font-medium text-foreground/90">Configure your test</span>
          </div>
          <div className="space-y-4 px-6 pt-3 pb-6 overflow-y-auto">
            <div>
              <label className="block text-[14px] font-medium uppercase text-foreground/50">
                Your website
              </label>
              <div className="mt-2 flex w-full items-center rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring">
                <input
                  type="text"
                  value={data.url.replace(/^https?:\/\/(www\.)?/, '')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^https?:\/\/(www\.)?/, '');
                    setData((d) => ({ ...d, url: raw ? `https://${raw}` : '' }));
                  }}
                  placeholder="e.g. https://claude.ai"
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
            <div>
              <label className="block text-[14px] font-medium uppercase text-foreground/50">
                What should the testers achieve on your site?
              </label>
              <input
                type="text"
                value={data.tasks[0] ?? ''}
                onChange={(e) => setData((d) => ({ ...d, tasks: [e.target.value] }))}
                placeholder="e.g. Ask Claude to write a cover letter"
                className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-foreground/30 focus:ring-1 focus:ring-ring"
              />
            </div>
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
          </div>
        </div>

        {/* Panel 2 — Choose testers */}
        <div className="flex flex-col overflow-hidden rounded-lg border bg-background min-h-0">
          <div className="flex h-[46px] shrink-0 items-center border-b bg-violet-50 px-3 dark:bg-violet-950/30">
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
            {submitting ? 'Creating...' : 'Run Test'}
          </Button>
        </div>
      </div>
    </div>
  );
}
