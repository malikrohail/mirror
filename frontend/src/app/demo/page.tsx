'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ── Tab Style Options ────────────────────────────────────

const TABS = ['All testers', 'My testers'];

// A: Underline tabs (like browser tabs / Material)
function TabsA({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  return (
    <div className="flex border-b border-border">
      {TABS.map((t, i) => (
        <button
          key={t}
          onClick={() => onSelect(i)}
          className={cn(
            'px-3 pb-2 text-sm font-medium transition-colors',
            active === i
              ? 'border-b-2 border-foreground text-foreground'
              : 'text-foreground/40 hover:text-foreground/70',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// B: Pill / segmented control (subtle bg)
function TabsB({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-foreground/[0.04] p-0.5">
      {TABS.map((t, i) => (
        <button
          key={t}
          onClick={() => onSelect(i)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-all',
            active === i
              ? 'bg-white text-foreground shadow-sm'
              : 'text-foreground/40 hover:text-foreground/70',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// C: Text only with dot indicator
function TabsC({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  return (
    <div className="flex items-center gap-4">
      {TABS.map((t, i) => (
        <button
          key={t}
          onClick={() => onSelect(i)}
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium transition-colors',
            active === i
              ? 'text-foreground'
              : 'text-foreground/30 hover:text-foreground/60',
          )}
        >
          {active === i && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
          {t}
        </button>
      ))}
    </div>
  );
}

// D: Bordered pill (outline active, no bg)
function TabsD({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {TABS.map((t, i) => (
        <button
          key={t}
          onClick={() => onSelect(i)}
          className={cn(
            'rounded-full border px-3 py-1 text-sm font-medium transition-all',
            active === i
              ? 'border-foreground/20 bg-foreground/[0.04] text-foreground'
              : 'border-transparent text-foreground/30 hover:text-foreground/60',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// E: Slash separator
function TabsE({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  return (
    <div className="flex items-center gap-0">
      {TABS.map((t, i) => (
        <span key={t} className="contents">
          {i > 0 && <span className="mx-2 text-foreground/15 select-none">/</span>}
          <button
            onClick={() => onSelect(i)}
            className={cn(
              'text-sm font-medium transition-colors',
              active === i
                ? 'text-foreground'
                : 'text-foreground/30 hover:text-foreground/60',
            )}
          >
            {t}
          </button>
        </span>
      ))}
    </div>
  );
}

// ── Demo page ────────────────────────────────────────────

const TAB_OPTIONS = [
  { id: 'A', label: 'Underline', description: 'Classic underline indicator beneath active tab', component: TabsA },
  { id: 'B', label: 'Segmented', description: 'Pill-shaped segmented control with white active bg and shadow', component: TabsB },
  { id: 'C', label: 'Dot', description: 'Plain text with a small dot indicator on the active tab', component: TabsC },
  { id: 'D', label: 'Outlined Pill', description: 'Subtle border + bg on active, transparent inactive', component: TabsD },
  { id: 'E', label: 'Slash', description: 'Separated by a slash, bold active vs muted inactive', component: TabsE },
];

export default function DemoPage() {
  const [selected, setSelected] = useState('A');
  const [activeTab, setActiveTab] = useState(0);

  const Option = TAB_OPTIONS.find((o) => o.id === selected)!;
  const Component = Option.component;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold">UI Component Demos</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick styles for different UI components.</p>
      </div>

      {/* Navigation to other demos */}
      <div className="flex gap-2 text-sm">
        <Link href="/demo" className="rounded-md bg-foreground text-background px-3 py-1.5 font-medium">Tabs</Link>
        <Link href="/tests/options" className="rounded-md border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground">Test History</Link>
        <Link href="/personas/options" className="rounded-md border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground">Persona Cards</Link>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-semibold uppercase text-foreground/30">Tab Styles</h2>

        <div className="flex gap-2">
          {TAB_OPTIONS.map((opt) => (
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

        {/* Preview area */}
        <div className="rounded-lg border border-border p-6">
          <div className="flex items-center gap-4">
            <Component active={activeTab} onSelect={setActiveTab} />
            <div className="flex-1" />
            <div className="h-[30px] w-16 rounded-md border border-border bg-muted/20" />
          </div>
          <div className="mt-6 rounded-md border border-dashed border-border/50 p-8 text-center text-sm text-foreground/20">
            {TABS[activeTab]} content area
          </div>
        </div>
      </div>
    </div>
  );
}
