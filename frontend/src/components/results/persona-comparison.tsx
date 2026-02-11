'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EMOTION_ICONS } from '@/lib/constants';
import type { SessionOut, PersonaOut, PersonaTemplateOut } from '@/types';
import type { EmotionalState } from '@/types';

interface PersonaComparisonProps {
  sessions: SessionOut[];
  personas: PersonaOut[];
  templates: PersonaTemplateOut[];
}

export function PersonaComparison({ sessions, personas, templates }: PersonaComparisonProps) {
  if (sessions.length === 0) return null;

  const templateMap = new Map(templates.map((t) => [t.id, t]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Persona Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map((session) => {
            const persona = personas.find((p) => p.id === session.persona_id);
            const template = persona?.template_id ? templateMap.get(persona.template_id) : null;

            return (
              <div key={session.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{template?.emoji ?? '👤'}</span>
                  <div>
                    <p className="text-sm font-medium">{template?.name ?? 'Persona'}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.total_steps} steps
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={session.task_completed ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {session.task_completed ? 'Completed' : session.status === 'gave_up' ? 'Gave up' : 'Failed'}
                  </Badge>
                  {session.emotional_arc && (
                    <span className="text-sm">
                      {(() => {
                        const entries = Object.entries(session.emotional_arc);
                        const last = entries[entries.length - 1];
                        return last ? EMOTION_ICONS[last[1] as EmotionalState] ?? '' : '';
                      })()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
