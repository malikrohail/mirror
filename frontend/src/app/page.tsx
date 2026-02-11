'use client';

import { Suspense } from 'react';
import { StudySetupWizard } from '@/components/study/study-setup-wizard';
import { PageSkeleton } from '@/components/common/page-skeleton';

export default function NewTestPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StudySetupWizard />
    </Suspense>
  );
}
