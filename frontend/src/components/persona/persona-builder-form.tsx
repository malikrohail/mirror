'use client';

import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGeneratePersona, useGeneratePersonaDraft } from '@/hooks/use-personas';
import { TypewriterStatus } from '@/components/common/typewriter-status';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2, Monitor, Smartphone, Tablet, Check, RotateCcw, CornerDownLeft, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PersonaGenerateDraftResponse, PersonaGenerateRequest, PersonaModel, PersonaTemplateOut } from '@/types';

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

type DevicePreference = 'desktop' | 'mobile' | 'tablet';
type AccessibilityConfigKey =
  | 'screen_reader'
  | 'low_vision'
  | 'color_blind'
  | 'motor_impairment'
  | 'cognitive';

const ACCESSIBILITY_OPTIONS: { key: AccessibilityConfigKey; label: string }[] = [
  { key: 'screen_reader', label: 'Screen reader' },
  { key: 'low_vision', label: 'Low vision' },
  { key: 'color_blind', label: 'Color blind' },
  { key: 'motor_impairment', label: 'Motor impairment' },
  { key: 'cognitive', label: 'Cognitive support' },
];

const DEFAULT_LEVEL = 5;
const DRAFT_LOADING_MESSAGES = [
  'Parsing tester description',
  'Generating behavioral baseline',
  'Calibrating tech and patience levels',
  'Inferring accessibility needs',
  'Preparing editable tester configuration',
];
const TESTER_DESCRIPTION_PLACEHOLDER = 'e.g., A visually impaired university professor who uses assistive technology and expects excellent keyboard navigation';
const MODEL_OPTIONS = [
  { value: 'opus-4.6', label: 'Opus 4.6' },
  { value: 'sonnet-4.5', label: 'Sonnet 4.5' },
  { value: 'haiku-4.5', label: 'Haiku 4.5' },
  { value: 'chatgpt', label: 'ChatGPT', comingSoon: true },
  { value: 'gemini', label: 'Gemini', comingSoon: true },
] as const;
const FORM_LABEL_CLASS = 'text-[14px] font-normal text-foreground/70';

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createPixelAvatarDataUrl(seedText: string): string {
  if (typeof document === 'undefined') {
    return '';
  }

  let seed = hashSeed(seedText || 'mirror-avatar') || 1;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const palettes = [
    ['#101820', '#f2aa4c', '#f8f4e3'],
    ['#151515', '#4fc3f7', '#d8f3ff'],
    ['#1a1423', '#ff7f50', '#ffe8d6'],
    ['#0f172a', '#60a5fa', '#dbeafe'],
    ['#1f2937', '#34d399', '#ecfeff'],
    ['#3b0d11', '#ff6b6b', '#ffe5e5'],
  ];
  const palette = palettes[Math.floor(rand() * palettes.length)] ?? palettes[0];
  const [bg, colorA, colorB] = palette;

  const grid = 12;
  const cell = 8;
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = grid * cell;
  smallCanvas.height = grid * cell;
  const smallCtx = smallCanvas.getContext('2d');
  if (!smallCtx) {
    return '';
  }

  smallCtx.fillStyle = bg;
  smallCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);

  for (let y = 0; y < grid; y += 1) {
    for (let x = 0; x < Math.ceil(grid / 2); x += 1) {
      const draw = rand() > 0.34;
      if (!draw) continue;
      smallCtx.fillStyle = rand() > 0.5 ? colorA : colorB;
      smallCtx.fillRect(x * cell, y * cell, cell, cell);
      const mirrorX = grid - 1 - x;
      smallCtx.fillRect(mirrorX * cell, y * cell, cell, cell);
    }
  }

  smallCtx.strokeStyle = colorA;
  smallCtx.lineWidth = 2;
  smallCtx.strokeRect(1, 1, smallCanvas.width - 2, smallCanvas.height - 2);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = smallCanvas.width * 2;
  outputCanvas.height = smallCanvas.height * 2;
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) {
    return '';
  }
  outputCtx.imageSmoothingEnabled = false;
  outputCtx.drawImage(smallCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
  return outputCanvas.toDataURL('image/png');
}

async function fileToSquareDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  const src = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to read image.'));
      img.src = src;
    });

    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = Math.floor((image.naturalWidth - cropSize) / 2);
    const sy = Math.floor((image.naturalHeight - cropSize) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to process image.');
    }

    ctx.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, 128, 128);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(src);
  }
}

function ConfigSlider({
  id,
  label,
  value,
  displayValue,
  min = 1,
  max = 10,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  displayValue?: string;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className={FORM_LABEL_CLASS}>
          {label}
        </Label>
        <span className="text-[14px] text-foreground/30">{displayValue ?? `${value}/${max}`}</span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(vals) => onChange(vals[0] ?? value)}
      />
    </div>
  );
}

const DEVICE_LABELS: Record<number, string> = { 1: 'Mobile', 2: 'Tablet', 3: 'Desktop' };

function deviceLevelToPreference(level: number): DevicePreference {
  if (level <= 1) return 'mobile';
  if (level <= 2) return 'tablet';
  return 'desktop';
}

function devicePreferenceToLevel(pref: string): number {
  switch (pref) {
    case 'mobile': return 1;
    case 'tablet': return 2;
    default: return 3;
  }
}

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

type PersonaBuilderFormProps = {
  embedded?: boolean;
  onSuccess?: (personaId: string) => void;
};

type BuilderStep = 'describe' | 'configure';

function toLevelValue(value: number | null | undefined): number {
  if (typeof value !== 'number') return DEFAULT_LEVEL;
  if (value < 1) return 1;
  if (value > 10) return 10;
  return Math.round(value);
}

export function PersonaBuilderForm({ embedded = false, onSuccess }: PersonaBuilderFormProps) {
  const [step, setStep] = useState<BuilderStep>('describe');
  const [description, setDescription] = useState('');
  const [generatedName, setGeneratedName] = useState('');
  const [draftSourceDescription, setDraftSourceDescription] = useState<string | null>(null);
  const [generatedPersona, setGeneratedPersona] = useState<PersonaTemplateOut | null>(null);
  const [placeholderAvatarUrl, setPlaceholderAvatarUrl] = useState('');
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState('');
  const [deviceLevel, setDeviceLevel] = useState(3);
  const [techLiteracy, setTechLiteracy] = useState(DEFAULT_LEVEL);
  const [patienceLevel, setPatienceLevel] = useState(DEFAULT_LEVEL);
  const [readingSpeed, setReadingSpeed] = useState(DEFAULT_LEVEL);
  const [trustLevel, setTrustLevel] = useState(DEFAULT_LEVEL);
  const [explorationTendency, setExplorationTendency] = useState(DEFAULT_LEVEL);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<Record<AccessibilityConfigKey, boolean>>({
    screen_reader: false,
    low_vision: false,
    color_blind: false,
    motor_impairment: false,
    cognitive: false,
  });
  const [accessibilityDescription, setAccessibilityDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState<PersonaModel>('opus-4.6');
  const generatePersonaDraft = useGeneratePersonaDraft();
  const generatePersona = useGeneratePersona();
  const queryClient = useQueryClient();

  useEffect(() => {
    const seed = `${Date.now()}-${Math.random()}`;
    setPlaceholderAvatarUrl(createPixelAvatarDataUrl(seed));
  }, []);

  const selectedAvatarUrl = uploadedAvatarUrl || placeholderAvatarUrl;

  const applyDraftOptions = (draft: PersonaGenerateDraftResponse) => {
    setGeneratedName(draft.name.trim());
    setTechLiteracy(toLevelValue(draft.tech_literacy));
    setPatienceLevel(toLevelValue(draft.patience_level));
    setReadingSpeed(toLevelValue(draft.reading_speed));
    setTrustLevel(toLevelValue(draft.trust_level));
    setExplorationTendency(toLevelValue(draft.exploration_tendency));
    setDeviceLevel(devicePreferenceToLevel(draft.device_preference ?? 'desktop'));

    const a11y = draft.accessibility_needs;
    setAccessibilityNeeds({
      screen_reader: a11y?.screen_reader === true,
      low_vision: a11y?.low_vision === true,
      color_blind: a11y?.color_blind === true,
      motor_impairment: a11y?.motor_impairment === true,
      cognitive: a11y?.cognitive === true,
    });
    setAccessibilityDescription(a11y?.description ?? '');
  };

  const handleContinueToConfigure = async () => {
    if (generatePersonaDraft.isPending) return;
    const normalizedDescription = description.trim();
    if (normalizedDescription.length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }
    if (draftSourceDescription === normalizedDescription) {
      setStep('configure');
      return;
    }

    try {
      const draft = await generatePersonaDraft.mutateAsync({ description: normalizedDescription });
      applyDraftOptions(draft);
      setDraftSourceDescription(normalizedDescription);
      setStep('configure');
    } catch (err) {
      toast.error('Failed to generate tester configuration', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const handleDescribeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === 'ArrowRight'
      && !e.shiftKey
      && !e.metaKey
      && !e.ctrlKey
      && !e.altKey
      && description.trim().length === 0
    ) {
      e.preventDefault();
      setDescription(TESTER_DESCRIPTION_PLACEHOLDER.replace(/^e\.g\.,?\s*/i, ''));
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && !generatePersonaDraft.isPending) {
      e.preventDefault();
      void handleContinueToConfigure();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generatePersona.isPending) {
      return;
    }
    if (!selectedAvatarUrl) {
      toast.error('Add a tester picture or select the generated placeholder.');
      return;
    }
    if (description.trim().length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }
    try {
      const hasAccessibilityConfig = Object.values(accessibilityNeeds).some(Boolean)
        || accessibilityDescription.trim().length > 0;

      const payload: PersonaGenerateRequest = {
        description: description.trim(),
        avatar_url: selectedAvatarUrl,
        model: selectedModel,
        options: {
          tech_literacy: techLiteracy,
          patience_level: patienceLevel,
          reading_speed: readingSpeed,
          trust_level: trustLevel,
          exploration_tendency: explorationTendency,
          device_preference: deviceLevelToPreference(deviceLevel),
          ...(hasAccessibilityConfig ? {
            accessibility_needs: {
              ...accessibilityNeeds,
              ...(accessibilityDescription.trim().length > 0
                ? { description: accessibilityDescription.trim() }
                : {}),
            },
          } : {}),
        },
      };

      const result = await generatePersona.mutateAsync(payload);
      setGeneratedPersona(result);
      setDescription('');
      const existing: string[] = JSON.parse(localStorage.getItem('miror-my-team') ?? '[]');
      if (!existing.includes(result.id)) {
        localStorage.setItem('miror-my-team', JSON.stringify([...existing, result.id]));
      }
      queryClient.invalidateQueries({ queryKey: ['persona-templates'] });
      toast.success(`${result.name} added to your team`);
      onSuccess?.(result.id);
    } catch (err) {
      toast.error('Failed to generate persona', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const handleReset = () => {
    setStep('describe');
    setDraftSourceDescription(null);
    setGeneratedName('');
    setGeneratedPersona(null);
    setDescription('');
    setUploadedAvatarUrl('');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToSquareDataUrl(file);
      setUploadedAvatarUrl(dataUrl);
    } catch (err) {
      toast.error('Failed to process image', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      e.target.value = '';
    }
  };

  const setAccessibilityNeed = (key: AccessibilityConfigKey, checked: boolean) => {
    setAccessibilityNeeds((prev) => ({ ...prev, [key]: checked }));
  };

  const isAddTesterDisabled = description.trim().length === 0 || selectedAvatarUrl.length === 0;
  const addTesterDisabledReason = description.trim().length === 0
    ? 'Add a persona description to continue'
    : 'Preparing placeholder image';

  const formContent = (
    <div
      className={cn(
        'bg-card',
        embedded ? 'rounded-none border-0' : 'overflow-hidden rounded-xl border border-border',
      )}
    >
      <div className={cn("border-b border-border", embedded && "-mx-6 px-6")}>
        <div className="flex">
          {(['Describe tester', 'Configure tester'] as const).map((label, i) => {
            const isCurrent = (i === 0 && step === 'describe') || (i === 1 && step === 'configure');
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (i === 0) {
                    setStep('describe');
                  } else if (step === 'configure') {
                    setStep('configure');
                  } else {
                    void handleContinueToConfigure();
                  }
                }}
                className={cn(
                  'relative flex-1 py-2.5 text-[14px] text-center transition-colors',
                  isCurrent ? 'text-foreground/70' : 'text-foreground/30',
                )}
              >
                {label}
                {isCurrent && <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full bg-foreground" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        {step === 'describe' ? (
          generatePersonaDraft.isPending ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <svg className="h-10 w-10 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" className="opacity-20" />
                <path d="M12 2a10 10 0 0 1 10 10" className="text-foreground/70" strokeLinecap="round" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium">Generating tester configuration</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Claude is preparing editable metrics from your description.
                </p>
              </div>
              <TypewriterStatus messages={DRAFT_LOADING_MESSAGES} />
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleContinueToConfigure();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Textarea
                  id="persona-description"
                  placeholder={TESTER_DESCRIPTION_PLACEHOLDER}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleDescribeKeyDown}
                  className="min-h-[120px] resize-none border-border/60 text-base shadow-none placeholder:text-[14px] placeholder:font-normal placeholder:text-foreground/30 focus-visible:border-border/70 focus-visible:ring-0 focus-visible:shadow-none"
                />
              </div>

              <Button
                type="submit"
                disabled={description.trim().length < 10}
                className="h-12 w-full disabled:opacity-100"
              >
                Continue to Configure
                <CornerDownLeft className="ml-2 h-4 w-4 opacity-40" />
              </Button>
            </form>
          )
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-20 shrink-0">
                <label htmlFor="tester-avatar-upload" className="block cursor-pointer">
                  {selectedAvatarUrl ? (
                    <NextImage
                      src={selectedAvatarUrl}
                      alt="Tester picture"
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-md border bg-muted object-cover transition-opacity hover:opacity-90"
                      style={uploadedAvatarUrl ? undefined : { imageRendering: 'pixelated' }}
                      unoptimized
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-md border bg-muted/40" />
                  )}
                </label>
                <input
                  id="tester-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                {generatedName !== '' && (
                  <p className="text-sm font-medium text-foreground/70">{generatedName}</p>
                )}
                <p className="text-sm text-foreground/40">{description}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-[14px] text-foreground/50 hover:text-foreground/70 transition-colors mt-1"
                    >
                      {MODEL_OPTIONS.find((m) => m.value === selectedModel)?.label ?? 'Opus 4.6'}
                      <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[140px]">
                    {MODEL_OPTIONS.map((m) => (
                      <DropdownMenuItem
                        key={m.value}
                        disabled={'comingSoon' in m && m.comingSoon}
                        onClick={() => {
                          if (!('comingSoon' in m && m.comingSoon)) {
                            setSelectedModel(m.value as PersonaModel);
                          }
                        }}
                      >
                        <span className={cn(selectedModel === m.value && 'font-medium')}>
                          {m.label}
                        </span>
                        {'comingSoon' in m && m.comingSoon && (
                          <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/30">
                Preferences
              </p>

              <div className="rounded-lg border border-border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ConfigSlider
                    id="preferred-device"
                    label="Preferred device"
                    value={deviceLevel}
                    min={1}
                    max={3}
                    displayValue={DEVICE_LABELS[deviceLevel] ?? 'Desktop'}
                    onChange={setDeviceLevel}
                  />
                  <ConfigSlider
                    id="tech-literacy"
                    label="Tech literacy"
                    value={techLiteracy}
                    onChange={setTechLiteracy}
                  />
                  <ConfigSlider
                    id="patience-level"
                    label="Patience"
                    value={patienceLevel}
                    onChange={setPatienceLevel}
                  />
                  <ConfigSlider
                    id="reading-speed"
                    label="Reading speed"
                    value={readingSpeed}
                    onChange={setReadingSpeed}
                  />
                  <ConfigSlider
                    id="trust-level"
                    label="Trust level"
                    value={trustLevel}
                    onChange={setTrustLevel}
                  />
                  <ConfigSlider
                    id="exploration-tendency"
                    label="Exploration tendency"
                    value={explorationTendency}
                    onChange={setExplorationTendency}
                  />
                </div>
              </div>

              <p className="mt-6 text-xs font-medium uppercase tracking-wide text-foreground/30">
                Accessibility
              </p>

              <div className="rounded-lg border border-border p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {ACCESSIBILITY_OPTIONS.map((option) => (
                    <label
                      key={option.key}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={accessibilityNeeds[option.key]}
                        onCheckedChange={(checked) => setAccessibilityNeed(option.key, checked === true)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block w-full">
                    <Button
                      type="submit"
                      disabled={isAddTesterDisabled}
                      className="h-12 w-full disabled:opacity-100"
                    >
                      {generatePersona.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {generatePersona.isPending ? 'Adding tester...' : 'Add Tester'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isAddTesterDisabled && (
                  <TooltipContent side="top">
                    {addTesterDisabledReason}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className={embedded ? 'space-y-6' : 'mx-auto max-w-xl space-y-6'}>
      {embedded ? (
        formContent
      ) : (
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
          <CardContent>{formContent}</CardContent>
        </Card>
      )}

    </div>
  );
}
