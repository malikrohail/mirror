'use client';

import { useState } from 'react';
import { Monitor, Smartphone, Tablet, Accessibility, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Mock data ────────────────────────────────────────────

const MOCK_PERSONAS = [
  {
    id: '1', emoji: '🧠', name: 'Cognitive Disability User', category: 'Accessibility',
    short_description: 'A 28-year-old with ADHD who needs clear structure, minimal distractions, and forgiving interfaces',
    age: 28, occupation: 'Graphic Designer', device: 'desktop', model: 'Opus 4.6', cost: 0.42,
    tech_literacy: 5, patience: 3, reading: 2, trust: 5,
    accessibility: ['reduced_motion', 'minimal_distractions', 'clear_structure'],
    avatar_url: 'https://i.pravatar.cc/200?u=cognitive',
  },
  {
    id: '2', emoji: '🎨', name: 'Color Blind User', category: 'Accessibility',
    short_description: 'A 40-year-old with deuteranopia who relies on patterns, not color alone',
    age: 40, occupation: 'Accountant', device: 'desktop', model: 'Opus 4.6', cost: 0.38,
    tech_literacy: 5, patience: 5, reading: 5, trust: 5,
    accessibility: ['color-only indicators', 'red/green status without labels', 'poor contrast ratios'],
    avatar_url: 'https://i.pravatar.cc/200?u=colorblind',
  },
  {
    id: '3', emoji: '👓', name: 'Low Vision User', category: 'Accessibility',
    short_description: 'A 60-year-old with macular degeneration who uses high zoom and needs strong contrast',
    age: 60, occupation: 'Retired Teacher', device: 'desktop', model: 'Sonnet 4.5', cost: 0.12,
    tech_literacy: 8, patience: 7, reading: 6, trust: 5,
    accessibility: ['low contrast text', 'small click targets', 'text in images', 'horizontal scrolling at zoom'],
    avatar_url: 'https://i.pravatar.cc/200?u=lowvision',
  },
  {
    id: '4', emoji: '👵', name: 'Senior Citizen', category: 'Demographics',
    short_description: 'A 72-year-old retiree who is cautious online and prefers familiar patterns',
    age: 72, occupation: 'Retired Nurse', device: 'tablet', model: 'Opus 4.6', cost: 0.45,
    tech_literacy: 2, patience: 8, reading: 7, trust: 3,
    accessibility: [],
    avatar_url: 'https://i.pravatar.cc/200?u=senior',
  },
  {
    id: '5', emoji: '⚡', name: 'Power User', category: 'Behavior',
    short_description: 'A 31-year-old developer who speed-runs interfaces and expects keyboard shortcuts',
    age: 31, occupation: 'Software Engineer', device: 'desktop', model: 'Sonnet 4.5', cost: 0.09,
    tech_literacy: 10, patience: 2, reading: 3, trust: 4,
    accessibility: [],
    avatar_url: 'https://i.pravatar.cc/200?u=poweruser',
  },
  {
    id: '6', emoji: '📱', name: 'Mobile-First Teen', category: 'Demographics',
    short_description: 'A 17-year-old who primarily uses mobile and expects instant, swipeable interfaces',
    age: 17, occupation: 'Student', device: 'mobile', model: 'Opus 4.6', cost: 0.35,
    tech_literacy: 7, patience: 1, reading: 2, trust: 6,
    accessibility: [],
    avatar_url: 'https://i.pravatar.cc/200?u=teen',
  },
];

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-3 w-3" />,
  mobile: <Smartphone className="h-3 w-3" />,
  tablet: <Tablet className="h-3 w-3" />,
};

function LevelDots({ value, max = 10 }: { value: number; max?: number }) {
  const filled = Math.round((value / max) * 5);
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i < filled ? 'bg-foreground' : 'bg-foreground/10')} />
      ))}
    </span>
  );
}

function LevelBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="h-1 w-16 rounded-full bg-foreground/10">
      <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
    </div>
  );
}

function LevelLabel({ value }: { value: number }) {
  if (value <= 3) return <span className="text-foreground/40">Low</span>;
  if (value <= 6) return <span className="text-foreground/60">Mid</span>;
  return <span className="text-foreground/80">High</span>;
}

// ── Option A: Compact Table ──────────────────────────────

function OptionA() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs text-foreground/40 uppercase">
              <th className="py-2.5 pl-4 pr-2 font-medium w-[40%]">Tester</th>
              <th className="px-2 py-2.5 font-medium">Age</th>
              <th className="px-2 py-2.5 font-medium">Profession</th>
              <th className="px-2 py-2.5 font-medium">Device</th>
              <th className="px-2 py-2.5 font-medium">Tech</th>
              <th className="px-2 py-2.5 font-medium">Patience</th>
              <th className="px-2 py-2.5 font-medium">Accessibility</th>
              <th className="px-2 py-2.5 font-medium">Model</th>
              <th className="px-2 py-2.5 font-medium">Cost</th>
              <th className="px-2 py-2.5 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PERSONAS.map((p) => (
              <tr key={p.id} className="group border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer">
                <td className="py-3 pl-4 pr-2 max-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg shrink-0">{p.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{p.name}</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-xs text-foreground/40 truncate">{p.short_description}</p>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start" className="max-w-xs">
                          <p className="text-xs">{p.short_description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 tabular-nums text-foreground/60">{p.age}</td>
                <td className="px-2 py-3 text-foreground/60">{p.occupation}</td>
                <td className="px-2 py-3">
                  <span className="inline-flex items-center gap-1 text-foreground/50">
                    {DEVICE_ICONS[p.device]} {capitalize(p.device)}
                  </span>
                </td>
                <td className="px-2 py-3"><LevelDots value={p.tech_literacy} /></td>
                <td className="px-2 py-3"><LevelDots value={p.patience} /></td>
                <td className="px-2 py-3">
                  {p.accessibility.length > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 text-xs text-foreground/50 cursor-default">
                          <Accessibility className="h-3 w-3" />
                          {p.accessibility.length} needs
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <ul className="text-xs space-y-0.5">
                          {p.accessibility.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-foreground/20">—</span>
                  )}
                </td>
                <td className="px-2 py-3 text-xs text-foreground/50">{p.model}</td>
                <td className="px-2 py-3 text-xs tabular-nums text-foreground/50">${p.cost.toFixed(2)}</td>
                <td className="px-2 py-3 pr-4">
                  <ChevronRight className="h-3.5 w-3.5 text-foreground/15 opacity-0 group-hover:opacity-100 transition-opacity" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}

// ── Option B: Horizontal Cards (compact, side-scrollable feel) ────

function OptionB() {
  return (
    <div className="space-y-2">
      {MOCK_PERSONAS.map((p) => (
        <div key={p.id} className="group flex items-center gap-4 rounded-lg border border-border px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer">
          <span className="text-2xl">{p.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{p.name}</p>
              <span className="text-xs text-foreground/30">{p.age}y · {p.occupation}</span>
            </div>
            <p className="text-xs text-foreground/40 truncate mt-0.5">{p.short_description}</p>
          </div>
          <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-foreground/50">
            <span className="inline-flex items-center gap-1">{DEVICE_ICONS[p.device]} {p.device}</span>
            <div className="flex items-center gap-1">
              <span className="text-foreground/30">Tech</span>
              <LevelBar value={p.tech_literacy} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-foreground/30">Patience</span>
              <LevelBar value={p.patience} />
            </div>
            {p.accessibility.length > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5">
                <Accessibility className="mr-0.5 h-2.5 w-2.5" />
                {p.accessibility.length}
              </Badge>
            )}
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-foreground/15 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ── Option C: Minimal Grid Cards ─────────────────────────

function OptionC() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MOCK_PERSONAS.map((p) => (
        <div key={p.id} className="group rounded-lg border border-border p-4 hover:bg-muted/20 transition-colors cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{p.emoji}</span>
              <div>
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-foreground/40">{p.age} · {p.occupation}</p>
              </div>
            </div>
            {p.accessibility.length > 0 && (
              <Accessibility className="h-3.5 w-3.5 text-red-400" />
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-y-2 text-xs">
            <div>
              <p className="text-foreground/30">Device</p>
              <p className="flex items-center gap-1 mt-0.5 text-foreground/70">{DEVICE_ICONS[p.device]} {p.device}</p>
            </div>
            <div>
              <p className="text-foreground/30">Tech</p>
              <div className="mt-1"><LevelDots value={p.tech_literacy} /></div>
            </div>
            <div>
              <p className="text-foreground/30">Patience</p>
              <div className="mt-1"><LevelDots value={p.patience} /></div>
            </div>
          </div>

          {p.accessibility.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {p.accessibility.slice(0, 2).map((a) => (
                <span key={a} className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">{a}</span>
              ))}
              {p.accessibility.length > 2 && (
                <span className="text-[10px] text-foreground/30">+{p.accessibility.length - 2}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Option D: Avatar Row with Stat Pills ─────────────────

function OptionD() {
  return (
    <div className="space-y-1">
      {MOCK_PERSONAS.map((p) => (
        <div key={p.id} className="group flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/20 transition-colors cursor-pointer">
          <img src={p.avatar_url} alt="" className="h-8 w-8 rounded-full bg-muted" />
          <div className="w-36 shrink-0">
            <p className="text-sm font-medium truncate">{p.name}</p>
            <p className="text-[11px] text-foreground/40">{p.occupation}</p>
          </div>
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[11px] text-foreground/50">
              {p.age}y
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[11px] text-foreground/50">
              {DEVICE_ICONS[p.device]} {p.device}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[11px] text-foreground/50">
              Tech <LevelDots value={p.tech_literacy} />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[11px] text-foreground/50">
              Patience <LevelDots value={p.patience} />
            </span>
            {p.accessibility.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-500">
                <Accessibility className="h-2.5 w-2.5" /> {p.accessibility.length} needs
              </span>
            )}
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-foreground/15 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ── Option E: Dense Grid with Level Labels ───────────────

function OptionE() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {MOCK_PERSONAS.map((p) => (
        <div key={p.id} className="group flex gap-3 rounded-lg border border-border p-3 hover:bg-muted/20 transition-colors cursor-pointer">
          <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
            <span className="text-xl">{p.emoji}</span>
            <span className="text-[10px] text-foreground/30">{p.age}y</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{p.name}</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-foreground/40">
                {DEVICE_ICONS[p.device]} {p.device}
              </span>
            </div>
            <p className="text-[11px] text-foreground/40">{p.occupation}</p>
            <div className="mt-2 flex gap-4 text-[11px]">
              <div>
                <span className="text-foreground/30">Tech </span>
                <LevelLabel value={p.tech_literacy} />
              </div>
              <div>
                <span className="text-foreground/30">Patience </span>
                <LevelLabel value={p.patience} />
              </div>
              {p.accessibility.length > 0 && (
                <span className="text-red-500 flex items-center gap-0.5">
                  <Accessibility className="h-2.5 w-2.5" /> A11y
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────

const OPTIONS = [
  { id: 'A', label: 'Table', description: 'Full table with columns for each attribute, dots for levels', component: OptionA },
  { id: 'B', label: 'List Rows', description: 'Horizontal rows with inline bars, everything on one line', component: OptionB },
  { id: 'C', label: 'Grid Cards', description: 'Compact cards with 3-col stat grid and accessibility tags', component: OptionC },
  { id: 'D', label: 'Avatar Pills', description: 'Avatar photos with stat pills, flat list style', component: OptionD },
  { id: 'E', label: 'Dense Grid', description: 'Two-column grid with emoji + text labels for levels', component: OptionE },
];

export default function PersonaOptionsPage() {
  const [selected, setSelected] = useState('A');
  const Option = OPTIONS.find((o) => o.id === selected)!;
  const Component = Option.component;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Persona Display Options</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick a layout. Fields: name, emoji, age, profession, device, tech literacy, patience, accessibility.</p>
      </div>

      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelected(opt.id)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              selected === opt.id
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.id}: {opt.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-foreground/40">{Option.description}</p>

      <Component />
    </div>
  );
}
