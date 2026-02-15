'use client';

import { useState } from 'react';
import { ListFilter, CircleDot, Globe, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Shared data ─────────────────────────────────────────

const STATUSES = ['Complete', 'Running', 'Analyzing', 'Failed', 'Setup'];
const URLS = ['example.com', 'myapp.io', 'dashboard.co'];

// ── Option A: side="right" + avoidCollisions={false} ────

function FilterA() {
  const [showFailed, setShowFailed] = useState(false);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex h-[30px] items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ListFilter className="h-3.5 w-3.5" />
          Filter
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CircleDot className="mr-2 h-4 w-4" />
            Status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent side="right" avoidCollisions={false} className="w-36">
            <DropdownMenuItem>All</DropdownMenuItem>
            {STATUSES.map((s) => (
              <DropdownMenuItem key={s}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="mr-2 h-4 w-4" />
            URL
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent side="right" avoidCollisions={false} className="w-48">
            <DropdownMenuItem>All</DropdownMenuItem>
            {URLS.map((u) => (
              <DropdownMenuItem key={u}>{u}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowFailed((v) => !v)}>
          <Checkbox checked={showFailed} className="pointer-events-none mr-2" />
          Show failed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Option B: align="end" on parent ─────────────────────

function FilterB() {
  const [showFailed, setShowFailed] = useState(false);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex h-[30px] items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ListFilter className="h-3.5 w-3.5" />
          Filter
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CircleDot className="mr-2 h-4 w-4" />
            Status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-36">
            <DropdownMenuItem>All</DropdownMenuItem>
            {STATUSES.map((s) => (
              <DropdownMenuItem key={s}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="mr-2 h-4 w-4" />
            URL
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem>All</DropdownMenuItem>
            {URLS.map((u) => (
              <DropdownMenuItem key={u}>{u}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowFailed((v) => !v)}>
          <Checkbox checked={showFailed} className="pointer-events-none mr-2" />
          Show failed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Option C: avoidCollisions={false} on sub ────────────

function FilterC() {
  const [showFailed, setShowFailed] = useState(false);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex h-[30px] items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ListFilter className="h-3.5 w-3.5" />
          Filter
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CircleDot className="mr-2 h-4 w-4" />
            Status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent avoidCollisions={false} className="w-36">
            <DropdownMenuItem>All</DropdownMenuItem>
            {STATUSES.map((s) => (
              <DropdownMenuItem key={s}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="mr-2 h-4 w-4" />
            URL
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent avoidCollisions={false} className="w-48">
            <DropdownMenuItem>All</DropdownMenuItem>
            {URLS.map((u) => (
              <DropdownMenuItem key={u}>{u}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowFailed((v) => !v)}>
          <Checkbox checked={showFailed} className="pointer-events-none mr-2" />
          Show failed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Option D: sideOffset to nudge right ─────────────────

function FilterD() {
  const [showFailed, setShowFailed] = useState(false);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex h-[30px] items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ListFilter className="h-3.5 w-3.5" />
          Filter
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CircleDot className="mr-2 h-4 w-4" />
            Status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent sideOffset={2} alignOffset={-4} className="w-36">
            <DropdownMenuItem>All</DropdownMenuItem>
            {STATUSES.map((s) => (
              <DropdownMenuItem key={s}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="mr-2 h-4 w-4" />
            URL
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent sideOffset={2} alignOffset={-4} className="w-48">
            <DropdownMenuItem>All</DropdownMenuItem>
            {URLS.map((u) => (
              <DropdownMenuItem key={u}>{u}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowFailed((v) => !v)}>
          <Checkbox checked={showFailed} className="pointer-events-none mr-2" />
          Show failed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Option E: Inline sections (no submenus) ─────────────

function FilterE() {
  const [showFailed, setShowFailed] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex h-[30px] items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ListFilter className="h-3.5 w-3.5" />
          Filter
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Status section */}
        <button
          onClick={() => setStatusOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        >
          <CircleDot className="h-4 w-4" />
          Status
          <ChevronRight className={cn('ml-auto h-3.5 w-3.5 transition-transform', statusOpen && 'rotate-90')} />
        </button>
        {statusOpen && (
          <div className="ml-6 border-l border-border pl-2">
            {['All', ...STATUSES].map((s) => (
              <DropdownMenuItem key={s} className="text-xs">
                {s}
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {/* URL section */}
        <button
          onClick={() => setUrlOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        >
          <Globe className="h-4 w-4" />
          URL
          <ChevronRight className={cn('ml-auto h-3.5 w-3.5 transition-transform', urlOpen && 'rotate-90')} />
        </button>
        {urlOpen && (
          <div className="ml-6 border-l border-border pl-2">
            {['All', ...URLS].map((u) => (
              <DropdownMenuItem key={u} className="text-xs">
                {u}
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowFailed((v) => !v)}>
          <Checkbox checked={showFailed} className="pointer-events-none mr-2" />
          Show failed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Demo page ───────────────────────────────────────────

const OPTIONS = [
  {
    id: 'A',
    label: 'Force right',
    description: 'side="right" + avoidCollisions={false} on SubContent. Overrides Radix auto-flip.',
    component: FilterA,
  },
  {
    id: 'B',
    label: 'align="end"',
    description: 'Anchor parent dropdown to right edge of trigger, giving submenus more room to the right.',
    component: FilterB,
  },
  {
    id: 'C',
    label: 'No collision',
    description: 'Keep align="start" on parent but disable avoidCollisions on sub-content only.',
    component: FilterC,
  },
  {
    id: 'D',
    label: 'Offset nudge',
    description: 'Use sideOffset and alignOffset to nudge the submenu positioning rightward.',
    component: FilterD,
  },
  {
    id: 'E',
    label: 'Inline expand',
    description: 'No submenus at all — sections expand inline with a rotate chevron. No directional confusion.',
    component: FilterE,
  },
];

export default function DropdownDirectionDemoPage() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold">Dropdown Direction Options</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Five ways to fix submenu opening direction. Click each Filter button to test.
        </p>
      </div>

      <div className="space-y-6">
        {OPTIONS.map((opt) => {
          const C = opt.component;
          return (
            <div key={opt.id} className="rounded-lg border border-border p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">
                  {opt.id}
                </span>
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.description}</span>
              </div>
              <div className="flex justify-end">
                <C />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
