'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
    <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(380px,1fr)_1.5fr]">
      {/* Left panel — config */}
      <div className="flex flex-col overflow-y-auto scrollbar-hide">
        <div className="space-y-6 flex-1 px-10 pt-10 pb-6">
        <div>
          <h1 className="text-[32px] font-semibold leading-tight">Find UX issues before your users do</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hire AI testers with real personalities to try your site and flag every point of confusion.
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <label className="block text-[18px] font-medium text-foreground/70">
            What&apos;s your website URL?
          </label>
          <input
            type="text"
            value={data.url.replace(/^https?:\/\/(www\.)?/, '')}
            onChange={(e) => {
              const raw = e.target.value.replace(/^https?:\/\/(www\.)?/, '');
              setData((d) => ({ ...d, url: raw ? `https://${raw}` : '' }));
            }}
            placeholder="e.g. https://claude.ai"
            className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-foreground/30 focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="rounded-lg border p-4">
          <label className="block text-[18px] font-medium text-foreground/70">
            What should testers try to do?
          </label>
          <input
            type="text"
            value={data.tasks[0] ?? ''}
            onChange={(e) => setData((d) => ({ ...d, tasks: [e.target.value] }))}
            placeholder="e.g. Ask Claude to write a cover letter"
            className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-foreground/30 focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="rounded-lg border p-4">
          <label className="block text-[18px] font-medium text-foreground/70">
            Who should test it?
          </label>
          <div className="mt-2">
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
          </div>
        </div>

        {data.personaIds.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{data.personaIds.length} tester{data.personaIds.length !== 1 ? 's' : ''} selected</span>
            <span><span className="text-foreground/30">Est. run time</span> {data.personaIds.length * 2} min <span className="text-foreground/30">&middot; Est. cost</span> ${(data.personaIds.length * 0.5).toFixed(2)}</span>
          </div>
        )}
        </div>

        <div className="sticky bottom-0 bg-background px-10 pb-6">
          <Button onClick={handleSubmit} disabled={submitting || !canSubmit} className="h-12 w-full text-base">
            {submitting ? 'Creating...' : 'Run Test'}
          </Button>
        </div>
      </div>

      {/* Right panel — website preview */}
      <div className="hidden p-6 pb-6 pl-0 lg:block">
        <WebsitePreview
          url={data.url}
          onUrlChange={(url) => setData((d) => ({ ...d, url }))}
        />
      </div>
    </div>
  );
}
