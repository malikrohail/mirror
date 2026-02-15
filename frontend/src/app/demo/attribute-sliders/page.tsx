'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

// ── Attribute definitions ────────────────────────────────
const ATTRIBUTES = [
  { key: 'tech_literacy', label: 'Tech literacy', low: 'Beginner', high: 'Expert' },
  { key: 'patience', label: 'Patience', low: 'Impatient', high: 'Very Patient' },
  { key: 'reading_speed', label: 'Reading speed', low: 'Skims', high: 'Reads Everything' },
  { key: 'trust_level', label: 'Trust level', low: 'Skeptical', high: 'Trusting' },
  { key: 'exploration', label: 'Exploration tendency', low: 'Task-Focused', high: 'Explorer' },
] as const;

type AttrKey = (typeof ATTRIBUTES)[number]['key'];
type Values = Record<AttrKey, number>;

const DEFAULT_VALUES: Values = {
  tech_literacy: 8,
  patience: 4,
  reading_speed: 8,
  trust_level: 5,
  exploration: 4,
};

function getDescriptor(value: number, low: string, high: string): string {
  if (value <= 3) return low;
  if (value <= 7) return 'Moderate';
  return high;
}

function getColor(value: number): string {
  if (value <= 3) return 'text-red-500';
  if (value <= 5) return 'text-amber-500';
  if (value <= 7) return 'text-blue-500';
  return 'text-emerald-500';
}

function getBgColor(value: number): string {
  if (value <= 3) return 'bg-red-500';
  if (value <= 5) return 'bg-amber-500';
  if (value <= 7) return 'bg-blue-500';
  return 'bg-emerald-500';
}

function getStrokeClass(value: number): string {
  if (value <= 3) return 'stroke-red-500';
  if (value <= 5) return 'stroke-amber-500';
  if (value <= 7) return 'stroke-blue-500';
  return 'stroke-emerald-500';
}

function getLightBg(value: number): string {
  if (value <= 3) return 'bg-red-500/10 text-red-600';
  if (value <= 5) return 'bg-amber-500/10 text-amber-600';
  if (value <= 7) return 'bg-blue-500/10 text-blue-600';
  return 'bg-emerald-500/10 text-emerald-600';
}

// ── Shared slider row ────────────────────────────────────
function AttrSlider({
  attr,
  value,
  onChange,
}: {
  attr: (typeof ATTRIBUTES)[number];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{attr.label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{value}/10</span>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={(vals) => onChange(vals[0] ?? value)}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{attr.low}</span>
        <span>{attr.high}</span>
      </div>
    </div>
  );
}

// ── Style 1: Colored Progress Bars ───────────────────────
function Style1({ values }: { values: Values }) {
  return (
    <div className="space-y-4">
      {ATTRIBUTES.map((attr) => {
        const val = values[attr.key];
        const pct = (val / 10) * 100;
        return (
          <div key={attr.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{attr.label}</span>
              <span className="text-sm tabular-nums text-muted-foreground">{val}/10</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', getBgColor(val))}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {getDescriptor(val, attr.low, attr.high)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Style 2: Dot Matrix (10 dots) ────────────────────────
function Style2({ values }: { values: Values }) {
  return (
    <div className="space-y-3.5">
      {ATTRIBUTES.map((attr) => {
        const val = values[attr.key];
        return (
          <div key={attr.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{attr.label}</span>
              <span className="text-xs text-muted-foreground">
                {getDescriptor(val, attr.low, attr.high)}
              </span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-3 w-3 rounded-full transition-colors',
                    i < val ? getBgColor(val) : 'bg-muted',
                  )}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Style 3: Radar / Spider Chart ────────────────────────
function Style3({ values }: { values: Values }) {
  const cx = 120;
  const cy = 120;
  const r = 90;
  const levels = 5;
  const n = ATTRIBUTES.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  function polar(angle: number, radius: number) {
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  const gridLines = Array.from({ length: levels }, (_, i) => {
    const levelR = (r / levels) * (i + 1);
    return ATTRIBUTES.map((_, j) => {
      const p = polar(startAngle + j * angleStep, levelR);
      return `${p.x},${p.y}`;
    }).join(' ');
  });

  const dataPoints = ATTRIBUTES.map((attr, i) => {
    const dist = (values[attr.key] / 10) * r;
    return polar(startAngle + i * angleStep, dist);
  });

  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 240 240" className="w-64 h-64">
        {gridLines.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="currentColor" className="text-muted-foreground/15" strokeWidth={1} />
        ))}
        {ATTRIBUTES.map((_, i) => {
          const end = polar(startAngle + i * angleStep, r);
          return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="currentColor" className="text-muted-foreground/10" strokeWidth={1} />;
        })}
        <polygon points={dataPoints.map((p) => `${p.x},${p.y}`).join(' ')} className="fill-primary/20 stroke-primary" strokeWidth={2} />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} className="fill-primary" />
        ))}
        {ATTRIBUTES.map((attr, i) => {
          const p = polar(startAngle + i * angleStep, r + 20);
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[9px] font-medium">
              {attr.label.split(' ')[0]} ({values[attr.key]})
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── Style 4: Segmented Bars ──────────────────────────────
function Style4({ values }: { values: Values }) {
  return (
    <div className="space-y-4">
      {ATTRIBUTES.map((attr) => {
        const val = values[attr.key];
        return (
          <div key={attr.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{attr.label}</span>
              <span className={cn('text-sm font-semibold tabular-nums', getColor(val))}>{val}</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className={cn('h-2 flex-1 rounded-sm transition-colors', i < val ? getBgColor(val) : 'bg-muted')} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Style 5: Circular Gauges ─────────────────────────────
function CircularGauge({ value, label, descriptor }: { value: number; label: string; descriptor: string }) {
  const size = 72;
  const sw = 5;
  const radius = (size - sw) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - value / 10);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-muted" strokeWidth={sw} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={cn('transition-all', getStrokeClass(value))}
            strokeWidth={sw}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold tabular-nums">{value}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-center leading-tight">{label}</span>
      <span className="text-[10px] text-muted-foreground">{descriptor}</span>
    </div>
  );
}

function Style5({ values }: { values: Values }) {
  return (
    <div className="flex flex-wrap justify-center gap-6">
      {ATTRIBUTES.map((attr) => (
        <CircularGauge
          key={attr.key}
          value={values[attr.key]}
          label={attr.label}
          descriptor={getDescriptor(values[attr.key], attr.low, attr.high)}
        />
      ))}
    </div>
  );
}

// ── Style 6: Color Pills ────────────────────────────────
function Style6({ values }: { values: Values }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ATTRIBUTES.map((attr) => {
        const val = values[attr.key];
        return (
          <div key={attr.key} className={cn('inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm', getLightBg(val))}>
            <span className="font-medium">{attr.label}</span>
            <span className="font-bold tabular-nums">{val}/10</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Style 7: Vertical Bar Chart ──────────────────────────
function Style7({ values }: { values: Values }) {
  const maxH = 120;
  return (
    <div className="flex items-end justify-center gap-5">
      {ATTRIBUTES.map((attr) => {
        const val = values[attr.key];
        return (
          <div key={attr.key} className="flex flex-col items-center gap-2">
            <span className={cn('text-sm font-bold tabular-nums', getColor(val))}>{val}</span>
            <div className="relative w-10 rounded-t-md bg-muted" style={{ height: maxH }}>
              <div className={cn('absolute bottom-0 w-full rounded-t-md transition-all', getBgColor(val))} style={{ height: (val / 10) * maxH }} />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground text-center w-14 leading-tight">{attr.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Style 8: Number Cards ────────────────────────────────
function Style8({ values }: { values: Values }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {ATTRIBUTES.map((attr) => {
        const val = values[attr.key];
        return (
          <div key={attr.key} className="rounded-xl border border-border p-4 text-center space-y-1 hover:border-foreground/20 transition-colors">
            <div className={cn('text-3xl font-bold tabular-nums', getColor(val))}>{val}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">out of 10</div>
            <div className="text-xs font-medium mt-2">{attr.label}</div>
            <div className="text-[10px] text-muted-foreground">{getDescriptor(val, attr.low, attr.high)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Style 9: Inline Bar with Label Inside ────────────────
function Style9({ values }: { values: Values }) {
  return (
    <div className="space-y-2">
      {ATTRIBUTES.map((attr) => {
        const val = values[attr.key];
        const pct = (val / 10) * 100;
        return (
          <div key={attr.key} className="flex items-center gap-3">
            <span className="w-36 shrink-0 text-sm text-muted-foreground">{attr.label}</span>
            <div className="relative flex-1 h-6 rounded-full bg-muted overflow-hidden">
              <div className={cn('absolute inset-y-0 left-0 rounded-full transition-all', getBgColor(val))} style={{ width: `${pct}%` }} />
              <div className="absolute inset-0 flex items-center px-3">
                <span className={cn('text-xs font-semibold tabular-nums', pct > 30 ? 'text-white' : 'text-foreground')}>
                  {val}/10 — {getDescriptor(val, attr.low, attr.high)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Style 10: Heat Gradient Strip ────────────────────────
function Style10({ values }: { values: Values }) {
  return (
    <div className="space-y-4">
      {ATTRIBUTES.map((attr) => {
        const val = values[attr.key];
        const pct = (val / 10) * 100;
        return (
          <div key={attr.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{attr.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{getDescriptor(val, attr.low, attr.high)}</span>
                <span className={cn('text-sm font-bold tabular-nums', getColor(val))}>{val}</span>
              </div>
            </div>
            <div
              className="relative h-3 w-full rounded-full overflow-hidden"
              style={{ background: 'linear-gradient(to right, #ef4444, #f59e0b, #3b82f6, #10b981)' }}
            >
              <div className="absolute inset-y-0 right-0 bg-background/80 backdrop-blur-sm" style={{ width: `${100 - pct}%` }} />
              <div className="absolute top-0 bottom-0 w-0.5 bg-foreground" style={{ left: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{attr.low}</span>
              <span>{attr.high}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────

const STYLES = [
  { id: '1', label: 'Colored Bars', desc: 'Horizontal bars colored by value (red/amber/blue/green)', component: Style1 },
  { id: '2', label: 'Dot Matrix', desc: '10 dots per attribute, filled dots show the score', component: Style2 },
  { id: '3', label: 'Radar Chart', desc: 'Spider chart showing all 5 attributes at once', component: Style3 },
  { id: '4', label: 'Segmented', desc: '10 discrete segments per bar', component: Style4 },
  { id: '5', label: 'Circular Gauges', desc: 'Ring gauges with number in center', component: Style5 },
  { id: '6', label: 'Color Pills', desc: 'Compact pill tags with color coding', component: Style6 },
  { id: '7', label: 'Vertical Bars', desc: 'Mini bar chart going upward', component: Style7 },
  { id: '8', label: 'Number Cards', desc: 'Large number in a card grid', component: Style8 },
  { id: '9', label: 'Inline Labels', desc: 'Bar with label overlaid inside', component: Style9 },
  { id: '10', label: 'Heat Gradient', desc: 'Gradient strip from cold to hot with marker', component: Style10 },
] as const;

export default function AttributeSlidersDemo() {
  const [selected, setSelected] = useState('1');
  const [values, setValues] = useState<Values>({ ...DEFAULT_VALUES });

  const style = STYLES.find((s) => s.id === selected)!;
  const Component = style.component;

  function updateValue(key: AttrKey, v: number) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  return (
    <div className="min-h-screen bg-background p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Attribute Slider Styles</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drag the sliders on the left, see 10 different visualizations on the right.
        </p>
      </div>

      {/* Style picker */}
      <div className="flex flex-wrap gap-2">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              selected === s.id
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {s.id}. {s.label}
          </button>
        ))}
      </div>

      {/* Two-column: controls + preview */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
        {/* Left: interactive sliders */}
        <div className="rounded-xl border border-border p-5 space-y-5 h-fit">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Controls</h2>
          {ATTRIBUTES.map((attr) => (
            <AttrSlider
              key={attr.key}
              attr={attr}
              value={values[attr.key]}
              onChange={(v) => updateValue(attr.key, v)}
            />
          ))}
        </div>

        {/* Right: visualization preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{style.label}</p>
            <p className="text-sm text-muted-foreground">{style.desc}</p>
          </div>
          <div className="rounded-xl border border-border p-6">
            <Component values={values} />
          </div>
        </div>
      </div>

      {/* All styles at a glance */}
      <div className="pt-8 border-t border-border space-y-10">
        <h2 className="text-lg font-semibold">All styles at a glance</h2>
        {STYLES.map((s) => {
          const C = s.component;
          return (
            <div key={s.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">
                  {s.id}
                </span>
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-sm text-muted-foreground">— {s.desc}</span>
              </div>
              <div className="rounded-xl border border-border p-5">
                <C values={values} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
