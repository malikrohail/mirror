'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePersonaTemplates } from '@/hooks/use-personas';

interface WizardReviewProps {
  data: {
    url: string;
    tasks: string[];
    personaIds: string[];
  };
}

export function WizardReview({ data }: WizardReviewProps) {
  const { data: templates } = usePersonaTemplates();
  const selectedTemplates = templates?.filter((t) => data.personaIds.includes(t.id)) ?? [];

  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium">Review your test</h3>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">URL</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{data.url}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tasks ({data.tasks.filter((t) => t.trim()).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-1 text-sm">
            {data.tasks
              .filter((t) => t.trim())
              .map((task, i) => (
                <li key={i}>{task}</li>
              ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Personas ({selectedTemplates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {selectedTemplates.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs"
              >
                <span>{t.emoji}</span>
                {t.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
