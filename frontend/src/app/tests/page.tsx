'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudies } from '@/hooks/use-study';
import { StudyGrid } from '@/components/study/study-grid';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageSkeleton } from '@/components/common/page-skeleton';

export default function DashboardPage() {
  const [page] = useState(1);
  const { data, isLoading, isError, error, refetch } = useStudies(page, 20);

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <ErrorState
          title="Failed to load tests"
          message={error?.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">My Tests</h1>
      </div>

      {data && data.items.length > 0 ? (
        <StudyGrid studies={data.items} />
      ) : (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="No tests yet"
          description="Run your first test to get started."
          action={
            <Button asChild>
              <Link href="/">
                <Plus className="mr-2 h-4 w-4" />
                New Test
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
