'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCreateStudy, useRunStudy } from '@/hooks/use-study';
import { WizardStepUrl } from './wizard-step-url';
import { WizardStepTasks } from './wizard-step-tasks';
import { WizardStepPersonas } from './wizard-step-personas';

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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New Test</h1>
        <p className="text-sm text-muted-foreground">
          Enter a URL, define tasks, and pick personas
        </p>
      </div>

      <WizardStepUrl
        url={data.url}
        onChange={(url) => setData((d) => ({ ...d, url }))}
      />

      <Separator />

      <WizardStepTasks
        tasks={data.tasks}
        onChange={(tasks) => setData((d) => ({ ...d, tasks }))}
      />

      <Separator />

      <WizardStepPersonas
        selected={data.personaIds}
        onToggle={(id) =>
          setData((d) => ({
            ...d,
            personaIds: d.personaIds.includes(id)
              ? d.personaIds.filter((p) => p !== id)
              : d.personaIds.length < 10
                ? [...d.personaIds, id]
                : d.personaIds,
          }))
        }
      />

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.personaIds.length} persona{data.personaIds.length !== 1 ? 's' : ''} selected
        </p>
        <Button onClick={handleSubmit} disabled={submitting || !canSubmit} size="lg">
          {submitting ? 'Creating...' : 'Run Test'}
        </Button>
      </div>
    </div>
  );
}
