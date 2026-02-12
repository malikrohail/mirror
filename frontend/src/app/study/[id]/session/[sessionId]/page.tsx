'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionReplay } from '@/components/session/session-replay';

export default function SessionReplayPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = use(params);
  const searchParams = useSearchParams();
  const initialStep = searchParams.get('step');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/study/${id}`} aria-label="Back to study results">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Session Replay</h1>
      </div>
      <SessionReplay sessionId={sessionId} initialStepNumber={initialStep ? Number(initialStep) : undefined} />
    </div>
  );
}
