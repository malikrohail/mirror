'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SessionDetail, PersonaTemplateOut } from '@/types';

interface PersonaInfoPanelProps {
  session: SessionDetail;
  template?: PersonaTemplateOut | null;
}

export function PersonaInfoPanel({ session, template }: PersonaInfoPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="text-lg">{template?.emoji ?? '👤'}</span>
          {template?.name ?? 'Persona'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {template?.short_description && (
          <p className="text-muted-foreground">{template.short_description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          <Badge variant={session.task_completed ? 'default' : 'outline'} className="text-[10px]">
            {session.task_completed ? 'Task Completed' : 'Task Incomplete'}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {session.total_steps} steps
          </Badge>
        </div>
        {session.summary && (
          <p className="text-muted-foreground">{session.summary}</p>
        )}
      </CardContent>
    </Card>
  );
}
