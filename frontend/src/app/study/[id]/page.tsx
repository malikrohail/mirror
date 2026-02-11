'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, Flame, FileText } from 'lucide-react';
import { useStudy, useSessions, useIssues, useInsights } from '@/hooks/use-study';
import { usePersonaTemplates } from '@/hooks/use-personas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/common/export-button';
import { OverviewTab } from '@/components/results/overview-tab';
import { IssuesTab } from '@/components/results/issues-tab';
import { PageSkeleton } from '@/components/common/page-skeleton';
import { ErrorState } from '@/components/common/error-state';

export default function StudyResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: study, isLoading, isError, error } = useStudy(id);
  const { data: sessions } = useSessions(id);
  const { data: issues } = useIssues(id);
  const { data: insights } = useInsights(id);
  const { data: templates } = usePersonaTemplates();

  if (isLoading) return <PageSkeleton />;
  if (isError || !study) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorState title="Failed to load test" message={error?.message} />
      </div>
    );
  }

  if (study.status === 'running') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">This test is still running.</p>
        <Button asChild>
          <Link href={`/study/${id}/running`}>View Progress</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tests" aria-label="Back to tests">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{study.url}</h1>
            <p className="text-xs text-muted-foreground">
              {study.tasks.length} task{study.tasks.length !== 1 ? 's' : ''},{' '}
              {study.personas.length} persona{study.personas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/study/${id}/session/${sessions?.[0]?.id ?? ''}`}>
              <Eye className="mr-2 h-4 w-4" />
              Replay
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/study/${id}/heatmap`}>
              <Flame className="mr-2 h-4 w-4" />
              Heatmap
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/study/${id}/report`}>
              <FileText className="mr-2 h-4 w-4" />
              Report
            </Link>
          </Button>
          <ExportButton studyId={id} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            study={study}
            issues={issues ?? []}
            sessions={sessions ?? []}
            insights={insights ?? []}
            templates={templates ?? []}
          />
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <IssuesTab studyId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
