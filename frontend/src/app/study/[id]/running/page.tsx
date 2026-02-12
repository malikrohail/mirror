'use client';

import { use } from 'react';
import { StudyProgress } from '@/components/study/study-progress';

export default function StudyRunningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="space-y-6 p-6">
      <StudyProgress studyId={id} />
    </div>
  );
}
