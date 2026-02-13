'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/common/progress-bar';
import { ThinkAloudBubble } from '@/components/common/think-aloud-bubble';
import { LiveBrowserView } from './live-browser-view';
import { ScreencastViewer } from './screencast-viewer';
import { EMOTION_ICONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import type { EmotionalState } from '@/types';

interface PersonaProgressCardProps {
  personaName: string;
  stepNumber: number;
  totalSteps: number;
  thinkAloud: string;
  screenshotUrl: string;
  emotionalState: string;
  action: string;
  taskProgress: number;
  completed: boolean;
  liveViewUrl?: string | null;
  browserActive?: boolean;
  screencastAvailable?: boolean;
  sessionId?: string;
}

export function PersonaProgressCard({
  personaName,
  stepNumber,
  thinkAloud,
  screenshotUrl,
  emotionalState,
  action,
  taskProgress,
  completed,
  liveViewUrl,
  browserActive,
  screencastAvailable,
  sessionId,
}: PersonaProgressCardProps) {
  const hasLiveView = liveViewUrl !== undefined && liveViewUrl !== null;
  const hasScreencast = screencastAvailable && sessionId;

  // View priority: screencast > live view (Browserbase) > static screenshot
  const renderBrowserView = () => {
    if (hasScreencast && (browserActive || !hasLiveView)) {
      return (
        <ScreencastViewer
          sessionId={sessionId}
          browserActive={browserActive ?? false}
          personaName={personaName}
          screenshotUrl={screenshotUrl}
        />
      );
    }

    if (hasLiveView) {
      return (
        <LiveBrowserView
          liveViewUrl={liveViewUrl}
          browserActive={browserActive ?? false}
          personaName={personaName}
          screenshotUrl={screenshotUrl}
        />
      );
    }

    if (screenshotUrl) {
      return (
        <div className="overflow-hidden rounded-md border">
          <img
            src={screenshotUrl}
            alt={`${personaName} – step ${stepNumber}`}
            className="aspect-video w-full object-cover object-top"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <Card className={completed ? 'opacity-75' : ''}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {EMOTION_ICONS[emotionalState as EmotionalState] ?? '🤔'}
            </span>
            <span className="text-sm font-medium">{personaName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {action}
            </Badge>
            <span className="tabular-nums text-xs text-muted-foreground">
              Step {stepNumber}
            </span>
          </div>
        </div>

        {renderBrowserView()}

        <ProgressBar value={taskProgress} showLabel />

        {thinkAloud && (
          <ThinkAloudBubble
            text={thinkAloud}
            emotionalState={emotionalState as EmotionalState}
          />
        )}

        {completed && (
          <p className="text-xs font-medium text-green-600 dark:text-green-400">
            Completed
          </p>
        )}
      </CardContent>
    </Card>
  );
}
