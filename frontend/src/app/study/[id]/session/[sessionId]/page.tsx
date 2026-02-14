'use client';

import { use, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionReplay } from '@/components/session/session-replay';
import { VideoPlayer } from '@/components/session/video-player';
import { TERMS } from '@/lib/constants';
import { useSessionVideo } from '@/hooks/use-video';

export default function SessionReplayPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = use(params);
  const searchParams = useSearchParams();
  const initialStep = searchParams.get('step');
  const [showVideo, setShowVideo] = useState(false);
  const { data: video } = useSessionVideo(sessionId);

  const hasVideo = video && video.status === 'complete';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/study/${id}`} aria-label={`Back to ${TERMS.singular} results`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Session Replay</h1>
        </div>
        <Button
          variant={showVideo ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowVideo((prev) => !prev)}
        >
          <Film className="mr-2 h-4 w-4" />
          {showVideo ? 'Step-by-Step View' : hasVideo ? 'Watch Video' : 'Generate Video'}
        </Button>
      </div>

      {showVideo ? (
        <VideoPlayer sessionId={sessionId} />
      ) : (
        <SessionReplay sessionId={sessionId} initialStepNumber={initialStep ? Number(initialStep) : undefined} />
      )}
    </div>
  );
}
