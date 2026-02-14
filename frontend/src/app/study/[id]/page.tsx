'use client';

import { use } from 'react';
import { redirect } from 'next/navigation';

export default function StudyResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  redirect(`/study/${id}/running`);
}
