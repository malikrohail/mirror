'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PersonaTemplateOut } from '@/types';

interface PersonaDetailCardProps {
  template: PersonaTemplateOut;
}

export function PersonaDetailCard({ template }: PersonaDetailCardProps) {
  const profile = template.default_profile;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="text-2xl">{template.emoji}</span>
          {template.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{template.short_description}</p>
        <Badge variant="outline" className="capitalize">
          {template.category}
        </Badge>
        {Object.keys(profile).length > 0 && (
          <div className="space-y-1 text-xs">
            <p className="font-medium text-muted-foreground">Profile attributes</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(profile).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="text-[10px]">
                  {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
