'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useGeneratePersona } from '@/hooks/use-personas';
import { Sparkles, Loader2, User, Monitor, Smartphone, Tablet, Check, RotateCcw } from 'lucide-react';
import type { PersonaTemplateOut } from '@/types';

const EXAMPLE_PROMPTS = [
  'A 65-year-old retiree who has difficulty reading small text and prefers simple navigation',
  'A blind user who relies entirely on a screen reader to browse the web',
  'A busy parent who only browses on their phone during their commute',
  'A non-native English speaker who struggles with technical jargon and complex forms',
];

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-3 w-3" />,
  mobile: <Smartphone className="h-3 w-3" />,
  tablet: <Tablet className="h-3 w-3" />,
};

const BEHAVIORAL_LABELS: Record<string, { label: string; low: string; high: string }> = {
  tech_literacy: { label: 'Tech Literacy', low: 'Beginner', high: 'Expert' },
  patience_level: { label: 'Patience', low: 'Impatient', high: 'Very Patient' },
  reading_speed: { label: 'Reading Style', low: 'Skims', high: 'Reads Everything' },
  trust_level: { label: 'Trust Level', low: 'Skeptical', high: 'Trusting' },
  exploration_tendency: { label: 'Exploration', low: 'Task-Focused', high: 'Explorer' },
};

function levelToNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const map: Record<string, number> = { low: 3, moderate: 5, medium: 5, high: 8 };
    return map[value.toLowerCase()] ?? null;
  }
  return null;
}

function PersonaPreview({ persona }: { persona: PersonaTemplateOut }) {
  const profile = persona.default_profile;

  return (
    <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <CardDescription className="text-green-600">Persona generated successfully</CardDescription>
        </div>
        <CardTitle className="flex items-center gap-3 text-lg">
          <span className="text-2xl">{persona.emoji}</span>
          {persona.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{persona.short_description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Identity */}
        <div className="flex flex-wrap gap-2">
          {profile.age != null && (
            <Badge variant="outline">{'Age: ' + String(profile.age)}</Badge>
          )}
          {profile.occupation != null && (
            <Badge variant="outline">{String(profile.occupation)}</Badge>
          )}
          {profile.device_preference != null && (
            <Badge variant="outline" className="flex items-center gap-1">
              {DEVICE_ICONS[String(profile.device_preference)] ?? null}
              {String(profile.device_preference)}
            </Badge>
          )}
        </div>

        {/* Background */}
        {profile.background != null && (
          <p className="text-sm text-muted-foreground">{String(profile.background)}</p>
        )}

        {/* Behavioral attributes */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Behavioral Attributes
          </p>
          <div className="grid gap-2">
            {Object.entries(BEHAVIORAL_LABELS).map(([key, meta]) => {
              const value = levelToNumber(profile[key]);
              if (value === null) return null;
              const percent = (value / 10) * 100;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{meta.label}</span>
                    <span className="text-muted-foreground">
                      {percent <= 30 ? meta.low : percent >= 70 ? meta.high : ''}
                    </span>
                  </div>
                  <Progress value={percent} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Frustration triggers */}
        {Array.isArray(profile.frustration_triggers) && profile.frustration_triggers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Frustration Triggers
            </p>
            <div className="flex flex-wrap gap-1">
              {(profile.frustration_triggers as string[]).map((trigger) => (
                <Badge key={trigger} variant="secondary" className="text-xs">
                  {trigger}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Accessibility needs */}
        {profile.accessibility_needs != null && typeof profile.accessibility_needs === 'object' && !Array.isArray(profile.accessibility_needs) && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Accessibility Needs
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(profile.accessibility_needs as Record<string, unknown>)
                .filter(([k, v]) => v === true && k !== 'description')
                .map(([key]) => (
                  <Badge key={key} variant="destructive" className="text-xs">
                    {key.replace(/_/g, ' ')}
                  </Badge>
                ))}
              {String((profile.accessibility_needs as Record<string, unknown>).description || '') !== '' && (
                <Badge variant="outline" className="text-xs">
                  {String((profile.accessibility_needs as Record<string, unknown>).description)}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PersonaBuilderForm() {
  const [description, setDescription] = useState('');
  const [generatedPersona, setGeneratedPersona] = useState<PersonaTemplateOut | null>(null);
  const generatePersona = useGeneratePersona();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }
    try {
      const result = await generatePersona.mutateAsync(description.trim());
      setGeneratedPersona(result);
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['persona-templates'] });
    } catch (err) {
      toast.error('Failed to generate persona', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const handleReset = () => {
    setGeneratedPersona(null);
    setDescription('');
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Build a Custom Persona
          </CardTitle>
          <CardDescription>
            Describe the type of user you want to simulate. Our AI will generate a
            detailed persona with behavioral attributes, frustration triggers, and
            accessibility needs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="persona-description">Describe your persona</Label>
              <Textarea
                id="persona-description"
                placeholder="e.g., A visually impaired university professor who uses assistive technology and expects excellent keyboard navigation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] resize-none text-base"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters. Include demographics, abilities, device preferences, and motivations.
              </p>
            </div>
            <Button
              type="submit"
              disabled={generatePersona.isPending || description.trim().length < 10}
              className="w-full"
            >
              {generatePersona.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating persona...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Persona
                </>
              )}
            </Button>
          </form>

          {!description && !generatedPersona && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Try an example
                </p>
                <div className="grid gap-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setDescription(prompt)}
                      className="rounded-md border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-accent-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {generatedPersona && (
        <div className="space-y-3">
          <PersonaPreview persona={generatedPersona} />
          <Button variant="outline" onClick={handleReset} className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            Create Another Persona
          </Button>
        </div>
      )}
    </div>
  );
}
