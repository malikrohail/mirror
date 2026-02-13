'use client';

import { useState } from 'react';
import { Film, Download, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSessionVideo, useGenerateVideo } from '@/hooks/use-video';
import { getVideoDownloadUrl } from '@/lib/api-client';

interface VideoPlayerProps {
  sessionId: string;
  personaName?: string;
}

export function VideoPlayer({ sessionId, personaName }: VideoPlayerProps) {
  const { data: video, isLoading } = useSessionVideo(sessionId);
  const gen = useGenerateVideo();
  const [narration, setNarration] = useState(true);

  if (isLoading) return <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg"><Film className="h-5 w-5" />Video Replay{personaName && <span className="text-sm font-normal text-muted-foreground">— {personaName}</span>}</CardTitle>
        {video?.status === 'complete' && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{video.frame_count} frames</Badge>
            <Badge variant="secondary">{video.duration_seconds?.toFixed(0)}s</Badge>
            <a href={getVideoDownloadUrl(sessionId)} download><Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" />Download</Button></a>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!video || video.status === 'failed' ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            {video?.status === 'failed' ? <><AlertCircle className="h-10 w-10 text-red-500" /><p className="text-sm text-muted-foreground">{video.error_message || 'Video generation failed'}</p></> : <Film className="h-10 w-10 text-muted-foreground" />}
            <p className="text-sm text-muted-foreground">Generate a video replay of this session</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={narration} onChange={e => setNarration(e.target.checked)} className="rounded" />Include narration</label>
              <Button onClick={() => gen.mutate({ sessionId, options: { include_narration: narration } })} disabled={gen.isPending}>{gen.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Film className="mr-2 h-4 w-4" />}Generate Video</Button>
            </div>
          </div>
        ) : video.status === 'generating' || video.status === 'pending' ? (
          <div className="flex flex-col items-center gap-3 py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /><p className="text-sm text-muted-foreground">Generating video...</p></div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border bg-black"><img src={getVideoDownloadUrl(sessionId)} alt="Session replay" className="mx-auto max-h-[600px] w-auto" /></div>
            <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{video.has_narration ? 'With narration' : 'Without narration'}</p><Button variant="ghost" size="sm" onClick={() => gen.mutate({ sessionId })} disabled={gen.isPending}><RefreshCw className="mr-1 h-3 w-3" />Regenerate</Button></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
