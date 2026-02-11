'use client';

import { StudyCard } from './study-card';
import type { StudySummary } from '@/types';

interface StudyGridProps {
  studies: StudySummary[];
}

export function StudyGrid({ studies }: StudyGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {studies.map((study) => (
        <StudyCard key={study.id} study={study} />
      ))}
    </div>
  );
}
