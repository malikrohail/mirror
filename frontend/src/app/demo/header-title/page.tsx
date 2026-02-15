'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// ── Shared data ─────────────────────────────────────────

const PAGE_TITLE = 'Testers';
const CHIPS = [
  { label: 'Testers', value: '27' },
  { label: 'My team', value: '2' },
  { label: 'My tests', value: '13' },
  { label: 'Total spent', value: '$0.00' },
];

const BAR_BASE =
  'flex h-[42px] items-center text-[14px] bg-[#F9F9FC] dark:bg-[#161616]';

function ChipList() {
  return (
    <>
      {CHIPS.map((chip, i) => (
        <span key={i} className="contents">
          {i > 0 && <div className="self-stretch w-px bg-foreground/5" />}
          <span className="text-foreground/30 py-2.5">{chip.label}</span>
          <span className="-ml-2 font-normal text-foreground py-2.5">
            {chip.value}
          </span>
        </span>
      ))}
    </>
  );
}

// ── Option A: Tall vertical divider ─────────────────────
// Bold title, separated by a taller/thicker vertical line

function HeaderA() {
  return (
    <div className="sticky top-0 z-30">
      <div className={cn(BAR_BASE, 'gap-3 pl-3 pr-6')}>
        <span className="text-[18px] font-semibold text-foreground py-2.5">
          {PAGE_TITLE}
        </span>
        <div className="self-stretch w-px bg-foreground/15 mx-2" />
        <ChipList />
      </div>
      <div className="border-b border-border" />
    </div>
  );
}

// ── Option B: Extra spacing + weight contrast ───────────
// Larger title with generous right margin, no explicit divider

function HeaderB() {
  return (
    <div className="sticky top-0 z-30">
      <div className={cn(BAR_BASE, 'gap-3 pl-3 pr-6')}>
        <span className="text-[15px] font-medium text-foreground pr-4 py-2.5">
          {PAGE_TITLE}
        </span>
        <ChipList />
      </div>
      <div className="border-b border-border" />
    </div>
  );
}

// ── Option C: Subtle background pill on title ───────────
// Title sits inside a light rounded pill, chips are plain

function HeaderC() {
  return (
    <div className="sticky top-0 z-30">
      <div className={cn(BAR_BASE, 'gap-3 pl-3 pr-6')}>
        <span className="rounded-md bg-foreground/[0.06] px-2.5 py-1 text-[14px] font-semibold text-foreground">
          {PAGE_TITLE}
        </span>
        <ChipList />
      </div>
      <div className="border-b border-border" />
    </div>
  );
}

// ── Option D: Dot separator ─────────────────────────────
// Bold title followed by a small dot, then chips

function HeaderD() {
  return (
    <div className="sticky top-0 z-30">
      <div className={cn(BAR_BASE, 'gap-3 pl-3 pr-6')}>
        <span className="text-[15px] font-semibold text-foreground py-2.5">
          {PAGE_TITLE}
        </span>
        <span className="h-1 w-1 rounded-full bg-foreground/15" />
        <ChipList />
      </div>
      <div className="border-b border-border" />
    </div>
  );
}

// ── Option E: Left accent border on title ───────────────
// Title has a short colored left border, then a gap, then chips

function HeaderE() {
  return (
    <div className="sticky top-0 z-30">
      <div className={cn(BAR_BASE, 'gap-3 pl-1.5 pr-6')}>
        <span className="border-l-2 border-foreground/20 pl-2 text-[15px] font-semibold text-foreground py-2.5">
          {PAGE_TITLE}
        </span>
        <div className="self-stretch w-px bg-foreground/5" />
        <ChipList />
      </div>
      <div className="border-b border-border" />
    </div>
  );
}

// ── Demo page ───────────────────────────────────────────

const OPTIONS = [
  {
    id: 'A',
    label: 'Vertical divider',
    description:
      'Semibold title separated from chips by a taller, slightly darker vertical line.',
    component: HeaderA,
  },
  {
    id: 'B',
    label: 'Spacing + weight',
    description:
      'Medium-weight title with extra right padding — no explicit divider, just whitespace contrast.',
    component: HeaderB,
  },
  {
    id: 'C',
    label: 'Background pill',
    description:
      'Title inside a subtle rounded pill background, visually grouping it as a distinct element.',
    component: HeaderC,
  },
  {
    id: 'D',
    label: 'Dot separator',
    description:
      'Semibold title followed by a small centered dot before the chips.',
    component: HeaderD,
  },
  {
    id: 'E',
    label: 'Left accent border',
    description:
      'Title with a short left border accent, giving it a "section heading" feel.',
    component: HeaderE,
  },
];

export default function HeaderTitleDemoPage() {
  const [selected, setSelected] = useState('A');

  const Option = OPTIONS.find((o) => o.id === selected)!;
  const Component = Option.component;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold">Header Title Options</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Five ways to add a page title to the left of the stat chips.
        </p>
      </div>

      {/* Selector */}
      <div className="flex flex-wrap gap-2">
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

      {/* Preview — full-width, mimics real layout */}
      <div className="overflow-hidden rounded-lg border border-border">
        <Component />
        <div className="p-8 text-center text-sm text-foreground/20">
          Page content area
        </div>
      </div>

      {/* Show all five side by side for comparison */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-foreground/30">
          All options at a glance
        </h2>
        {OPTIONS.map((opt) => {
          const C = opt.component;
          return (
            <div
              key={opt.id}
              className={cn(
                'overflow-hidden rounded-lg border transition-colors',
                selected === opt.id ? 'border-foreground/30' : 'border-border',
              )}
            >
              <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 text-xs text-foreground/40">
                <span className="font-semibold text-foreground/60">
                  {opt.id}
                </span>
                {opt.label}
              </div>
              <C />
            </div>
          );
        })}
      </div>
    </div>
  );
}
