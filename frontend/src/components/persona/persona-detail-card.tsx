'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import type { PersonaTemplateOut } from '@/types';

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-3 w-3" />,
  mobile: <Smartphone className="h-3 w-3" />,
  tablet: <Tablet className="h-3 w-3" />,
};

const BEHAVIORAL_KEYS: Record<string, { label: string; low: string; high: string }> = {
  tech_literacy: { label: 'Tech Literacy', low: 'Beginner', high: 'Expert' },
  patience_level: { label: 'Patience', low: 'Impatient', high: 'Patient' },
  reading_speed: { label: 'Reading', low: 'Skims', high: 'Thorough' },
  trust_level: { label: 'Trust', low: 'Skeptical', high: 'Trusting' },
  exploration_tendency: { label: 'Exploration', low: 'Focused', high: 'Explorer' },
};

function levelToNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const map: Record<string, number> = {
      low: 3, moderate: 5, medium: 5, high: 8,
      skims: 2, thorough: 9, skeptical: 3,
    };
    return map[value.toLowerCase()] ?? null;
  }
  return null;
}

interface PersonaDetailCardProps {
  template: PersonaTemplateOut;
}

export function PersonaDetailCard({ template }: PersonaDetailCardProps) {
  const profile = template.default_profile;

  const behavioralAttrs = Object.entries(BEHAVIORAL_KEYS)
    .map(([key, meta]) => {
      const value = levelToNumber(profile[key]);
      if (value === null) return null;
      return { key, ...meta, value, percent: (value / 10) * 100 };
    })
    .filter(Boolean) as { key: string; label: string; low: string; high: string; value: number; percent: number }[];

  const frustrationTriggers = Array.isArray(profile.frustration_triggers)
    ? (profile.frustration_triggers as string[])
    : [];

  const accessibilityNeeds = profile.accessibility_needs;
  const hasAccessibility = accessibilityNeeds && typeof accessibilityNeeds === 'object' && !Array.isArray(accessibilityNeeds)
    ? Object.entries(accessibilityNeeds as Record<string, unknown>).some(([k, v]) => v === true && k !== 'description')
    : Array.isArray(accessibilityNeeds) && accessibilityNeeds.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="text-2xl">{template.emoji}</span>
          {template.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{template.short_description}</p>

        {/* Category + device */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="capitalize">
            {template.category}
          </Badge>
          {profile.device_preference != null && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              {DEVICE_ICONS[String(profile.device_preference)] ?? null}
              {String(profile.device_preference)}
            </Badge>
          )}
          {profile.age != null && (
            <Badge variant="secondary" className="text-xs">{'Age ' + String(profile.age)}</Badge>
          )}
        </div>

        {/* Behavioral bars */}
        {behavioralAttrs.length > 0 && (
          <div className="space-y-1.5">
            {behavioralAttrs.map((attr) => (
              <div key={attr.key} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[10px] text-muted-foreground">{attr.label}</span>
                <Progress value={attr.percent} className="h-1" />
              </div>
            ))}
          </div>
        )}

        {/* Frustration triggers */}
        {frustrationTriggers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {frustrationTriggers.slice(0, 4).map((trigger) => (
              <Badge key={trigger} variant="secondary" className="text-[10px]">
                {trigger}
              </Badge>
            ))}
            {frustrationTriggers.length > 4 && (
              <Badge variant="secondary" className="text-[10px]">
                +{frustrationTriggers.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Accessibility indicator */}
        {hasAccessibility && (
          <Badge variant="destructive" className="text-[10px]">
            Accessibility needs
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
