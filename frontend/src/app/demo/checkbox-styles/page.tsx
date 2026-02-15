'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROWS = [
  { label: 'claude', sub: 'AI assistant' },
  { label: 'gemini', sub: 'Google AI' },
  { label: 'gpt-4o', sub: 'OpenAI model' },
  { label: 'llama', sub: 'Meta open source' },
];

// ── Option A: Soft fill, no border change ──
function CheckboxA({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all',
        checked
          ? 'border-foreground/20 bg-foreground/10 text-foreground/60'
          : 'border-foreground/15 bg-transparent',
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={2.5} />}
    </button>
  );
}

// ── Option B: Outline only, check appears ──
function CheckboxB({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all',
        checked
          ? 'border-foreground/40 text-foreground/50'
          : 'border-foreground/15 bg-transparent',
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={2} />}
    </button>
  );
}

// ── Option C: Primary tint (light brand color) ──
function CheckboxC({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all',
        checked
          ? 'border-blue-400/40 bg-blue-500/15 text-blue-600'
          : 'border-foreground/15 bg-transparent',
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={2.5} />}
    </button>
  );
}

// ── Option D: Filled dot instead of check ──
function CheckboxD({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all',
        checked
          ? 'border-foreground/25 bg-transparent'
          : 'border-foreground/15 bg-transparent',
      )}
    >
      {checked && <span className="h-2 w-2 rounded-sm bg-foreground/40" />}
    </button>
  );
}

// ── Option E: Soft dark (current but lighter) ──
function CheckboxE({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all',
        checked
          ? 'border-foreground/30 bg-foreground/30 text-white'
          : 'border-foreground/15 bg-transparent',
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={2.5} />}
    </button>
  );
}

const OPTIONS = [
  { key: 'A', title: 'Soft fill', desc: 'Light bg + muted check', Checkbox: CheckboxA },
  { key: 'B', title: 'Outline only', desc: 'Border darkens, no fill', Checkbox: CheckboxB },
  { key: 'C', title: 'Primary tint', desc: 'Light blue fill + blue check', Checkbox: CheckboxC },
  { key: 'D', title: 'Filled dot', desc: 'Dot instead of checkmark', Checkbox: CheckboxD },
  { key: 'E', title: 'Soft dark', desc: 'Current style but 30% opacity', Checkbox: CheckboxE },
];

export default function CheckboxStylesDemo() {
  const [selected, setSelected] = useState<Record<string, Set<number>>>(() =>
    Object.fromEntries(OPTIONS.map((o) => [o.key, new Set([0, 1])])),
  );

  const toggle = (optKey: string, idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev[optKey]);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return { ...prev, [optKey]: next };
    });
  };

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-lg font-semibold">Checkbox selected state options</h1>
      <p className="mt-1 text-sm text-foreground/50">Five alternatives to the current bold black checkbox</p>

      <div className="mt-8 grid gap-8">
        {OPTIONS.map(({ key, title, desc, Checkbox }) => (
          <div key={key} className="rounded-xl border border-border bg-card">
            <div className="flex items-baseline gap-2 border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">Option {key}</span>
              <span className="text-sm text-foreground/50">{title}</span>
              <span className="text-xs text-foreground/30">{desc}</span>
            </div>
            <div className="p-1">
              {ROWS.map((row, i) => {
                const isChecked = selected[key].has(i);
                return (
                  <div
                    key={i}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/20 cursor-pointer"
                    onClick={() => toggle(key, i)}
                  >
                    <Checkbox checked={isChecked} onChange={() => toggle(key, i)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{row.label}</p>
                      <p className="text-xs text-foreground/40">{row.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
