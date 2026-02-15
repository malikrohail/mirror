'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Shared ──────────────────────────────────────────────

function DemoLabel({ n, label, active, onClick }: { n: number; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-sm transition-all',
        active
          ? 'bg-foreground text-background font-medium'
          : 'text-foreground/50 hover:text-foreground/80 hover:bg-foreground/5',
      )}
    >
      {n}. {label}
    </button>
  );
}

// Mock chips data
const CHIPS = [
  { label: 'Testers', value: '27' },
  { label: 'My team', value: '0' },
  { label: 'My tests', value: '13' },
  { label: 'Total spent', value: '$0.00' },
];

// Mock table rows
function MockTable() {
  const rows = [
    { name: 'Cognitive Disability User', desc: 'A 28-year-old with ADHD who needs clear structure...', age: 28, prof: 'Graphic Designer' },
    { name: 'Color Blind User', desc: 'A 40-year-old with deuteranopia (red-green color blindness)...', age: 40, prof: 'Accountant' },
    { name: 'Low Vision User', desc: 'A 60-year-old with macular degeneration...', age: 60, prof: 'Librarian' },
    { name: 'Motor Impairment User', desc: 'A 50-year-old with limited fine motor control...', age: 50, prof: 'Writer' },
    { name: 'Screen Reader User', desc: 'A 35-year-old who is blind and navigates entirely...', age: 35, prof: 'Accessibility Consultant' },
  ];
  return (
    <div className="border-t border-border">
      <div className="flex items-center px-6 py-2 text-[11px] uppercase tracking-wider text-foreground/30 border-b border-border/50">
        <span className="w-[400px]">Tester</span>
        <span className="w-16 text-center">Age</span>
        <span className="flex-1">Profession</span>
      </div>
      {rows.map((r) => (
        <div key={r.name} className="flex items-center px-6 py-3 text-[13px] border-b border-border/30 hover:bg-muted/20">
          <div className="w-[400px]">
            <p className="text-foreground/70">{r.name}</p>
            <p className="text-foreground/30 text-xs truncate">{r.desc}</p>
          </div>
          <span className="w-16 text-center text-foreground/40">{r.age}</span>
          <span className="flex-1 text-foreground/40">{r.prof}</span>
        </div>
      ))}
    </div>
  );
}

// ── Option 1: Current (reference) ───────────────────────
// Large bold title on the left, chips after divider

function Option1() {
  return (
    <div>
      <div className="sticky top-0 z-30">
        <div className="flex h-[42px] items-center gap-3 pl-5 pr-6 text-[14px] bg-[#F9F9FC]">
          <span className="text-[18px] font-semibold leading-none text-foreground">Testers</span>
          <div className="self-stretch w-px bg-foreground/15 mx-2" />
          {CHIPS.map((c, i) => (
            <span key={i} className="contents">
              {i > 0 && <div className="self-stretch w-px bg-foreground/5" />}
              <span className="flex items-center gap-3 py-2.5">
                <span className="text-foreground/30">{c.label}</span>
                <span className="-ml-2 text-foreground">{c.value}</span>
              </span>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Plus className="h-3.5 w-3.5" />Add Tester
            </button>
          </div>
        </div>
        <div className="border-b border-border" />
      </div>
      <MockTable />
    </div>
  );
}

// ── Option 2: Smaller title, same weight ────────────────
// Title at 14px (same as chips), semibold. More balanced.

function Option2() {
  return (
    <div>
      <div className="sticky top-0 z-30">
        <div className="flex h-[42px] items-center gap-3 pl-5 pr-6 text-[14px] bg-[#F9F9FC]">
          <span className="text-[14px] font-semibold leading-none text-foreground">Testers</span>
          <div className="self-stretch w-px bg-foreground/15 mx-2" />
          {CHIPS.map((c, i) => (
            <span key={i} className="contents">
              {i > 0 && <div className="self-stretch w-px bg-foreground/5" />}
              <span className="flex items-center gap-3 py-2.5">
                <span className="text-foreground/30">{c.label}</span>
                <span className="-ml-2 text-foreground">{c.value}</span>
              </span>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Plus className="h-3.5 w-3.5" />Add Tester
            </button>
          </div>
        </div>
        <div className="border-b border-border" />
      </div>
      <MockTable />
    </div>
  );
}

// ── Option 3: Title as uppercase label ──────────────────
// Title uses the same uppercase style as the section headers
// (RECENT TESTS, AVAILABLE TESTERS). Chips feel like peers.

function Option3() {
  return (
    <div>
      <div className="sticky top-0 z-30">
        <div className="flex h-[42px] items-center gap-3 pl-5 pr-6 text-[14px] bg-[#F9F9FC]">
          <span className="text-[14px] uppercase text-foreground/30 font-normal leading-none">Testers</span>
          <div className="self-stretch w-px bg-foreground/10 mx-1" />
          {CHIPS.map((c, i) => (
            <span key={i} className="contents">
              {i > 0 && <div className="self-stretch w-px bg-foreground/5" />}
              <span className="flex items-center gap-3 py-2.5">
                <span className="text-foreground/30">{c.label}</span>
                <span className="-ml-2 text-foreground">{c.value}</span>
              </span>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Plus className="h-3.5 w-3.5" />Add Tester
            </button>
          </div>
        </div>
        <div className="border-b border-border" />
      </div>
      <MockTable />
    </div>
  );
}

// ── Option 4: Medium title (15px, medium weight) ────────
// Slightly smaller than current, lighter weight. Still readable
// as the page title but doesn't dominate.

function Option4() {
  return (
    <div>
      <div className="sticky top-0 z-30">
        <div className="flex h-[42px] items-center gap-3 pl-5 pr-6 text-[14px] bg-[#F9F9FC]">
          <span className="text-[15px] font-medium leading-none text-foreground">Testers</span>
          <div className="self-stretch w-px bg-foreground/10 mx-2" />
          {CHIPS.map((c, i) => (
            <span key={i} className="contents">
              {i > 0 && <div className="self-stretch w-px bg-foreground/5" />}
              <span className="flex items-center gap-3 py-2.5">
                <span className="text-foreground/30">{c.label}</span>
                <span className="-ml-2 text-foreground">{c.value}</span>
              </span>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Plus className="h-3.5 w-3.5" />Add Tester
            </button>
          </div>
        </div>
        <div className="border-b border-border" />
      </div>
      <MockTable />
    </div>
  );
}

// ── Option 5: Breadcrumb style ──────────────────────────
// Title rendered like a breadcrumb path. Nav arrows + title.
// Chips flow naturally after.

function Option5() {
  return (
    <div>
      <div className="sticky top-0 z-30">
        <div className="flex h-[42px] items-center gap-2 pl-3 pr-6 text-[14px] bg-[#F9F9FC]">
          <div className="flex items-center gap-1 text-foreground/25">
            <button className="rounded p-1 hover:bg-foreground/5 hover:text-foreground/50"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <button className="rounded p-1 hover:bg-foreground/5 hover:text-foreground/50"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
          <span className="text-[14px] font-medium leading-none text-foreground">Testers</span>
          <div className="self-stretch w-px bg-foreground/10 mx-2" />
          {CHIPS.map((c, i) => (
            <span key={i} className="contents">
              {i > 0 && <div className="self-stretch w-px bg-foreground/5" />}
              <span className="flex items-center gap-3 py-2.5">
                <span className="text-foreground/30">{c.label}</span>
                <span className="-ml-2 text-foreground">{c.value}</span>
              </span>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Plus className="h-3.5 w-3.5" />Add Tester
            </button>
          </div>
        </div>
        <div className="border-b border-border" />
      </div>
      <MockTable />
    </div>
  );
}

// ── Option 6: Title as chip ─────────────────────────────
// Title is styled like the first chip — same size, but bold value.
// Everything reads as one uniform row of metadata.

function Option6() {
  return (
    <div>
      <div className="sticky top-0 z-30">
        <div className="flex h-[42px] items-center gap-3 pl-5 pr-6 text-[14px] bg-[#F9F9FC]">
          {[{ label: '', value: 'Testers', bold: true }, ...CHIPS].map((c, i) => (
            <span key={i} className="contents">
              {i > 0 && <div className="self-stretch w-px bg-foreground/5" />}
              <span className="flex items-center gap-3 py-2.5">
                {c.label && <span className="text-foreground/30">{c.label}</span>}
                <span className={cn('-ml-2 text-foreground', 'bold' in c && c.bold ? 'font-medium' : 'font-normal')}>
                  {c.value}
                </span>
              </span>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Plus className="h-3.5 w-3.5" />Add Tester
            </button>
          </div>
        </div>
        <div className="border-b border-border" />
      </div>
      <MockTable />
    </div>
  );
}

// ── Option 7: 14px medium + tighter chips ───────────────
// Title 14px medium. Chips use smaller gap and lighter dividers.
// Overall more compact and balanced.

function Option7() {
  return (
    <div>
      <div className="sticky top-0 z-30">
        <div className="flex h-[42px] items-center gap-2 pl-5 pr-6 text-[13px] bg-[#F9F9FC]">
          <span className="text-[14px] font-medium leading-none text-foreground">Testers</span>
          <div className="self-stretch w-px bg-foreground/10 mx-1.5" />
          {CHIPS.map((c, i) => (
            <span key={i} className="contents">
              {i > 0 && <span className="text-foreground/10 mx-0.5">&middot;</span>}
              <span className="flex items-center gap-1.5 py-2.5">
                <span className="text-foreground/30">{c.label}</span>
                <span className="text-foreground">{c.value}</span>
              </span>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Plus className="h-3.5 w-3.5" />Add Tester
            </button>
          </div>
        </div>
        <div className="border-b border-border" />
      </div>
      <MockTable />
    </div>
  );
}

// ── Option 8: No divider after title ────────────────────
// Title flows directly into chips without a divider.
// Title at 14px medium. Chips separated by thin dividers.

function Option8() {
  return (
    <div>
      <div className="sticky top-0 z-30">
        <div className="flex h-[42px] items-center gap-4 pl-5 pr-6 text-[14px] bg-[#F9F9FC]">
          <span className="text-[14px] font-medium leading-none text-foreground">Testers</span>
          {CHIPS.map((c, i) => (
            <span key={i} className="contents">
              <div className="self-stretch w-px bg-foreground/5" />
              <span className="flex items-center gap-3 py-2.5">
                <span className="text-foreground/30">{c.label}</span>
                <span className="-ml-2 text-foreground">{c.value}</span>
              </span>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Plus className="h-3.5 w-3.5" />Add Tester
            </button>
          </div>
        </div>
        <div className="border-b border-border" />
      </div>
      <MockTable />
    </div>
  );
}

// ── Option 9: Muted title + bold values ─────────────────
// Title at foreground/50, slightly understated. Chip values
// are the visual anchors instead. Title is present but quiet.

function Option9() {
  return (
    <div>
      <div className="sticky top-0 z-30">
        <div className="flex h-[42px] items-center gap-3 pl-5 pr-6 text-[14px] bg-[#F9F9FC]">
          <span className="text-[14px] font-medium leading-none text-foreground/50">Testers</span>
          <div className="self-stretch w-px bg-foreground/10 mx-1" />
          {CHIPS.map((c, i) => (
            <span key={i} className="contents">
              {i > 0 && <div className="self-stretch w-px bg-foreground/5" />}
              <span className="flex items-center gap-3 py-2.5">
                <span className="text-foreground/30">{c.label}</span>
                <span className="-ml-2 font-medium text-foreground">{c.value}</span>
              </span>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Plus className="h-3.5 w-3.5" />Add Tester
            </button>
          </div>
        </div>
        <div className="border-b border-border" />
      </div>
      <MockTable />
    </div>
  );
}

// ── Option 10: Title + count badge ──────────────────────
// Title at 14px medium with a small count badge next to it.
// Remaining chips without the "Testers: 27" entry (it's in the badge).

function Option10() {
  const filteredChips = CHIPS.filter(c => c.label !== 'Testers');
  return (
    <div>
      <div className="sticky top-0 z-30">
        <div className="flex h-[42px] items-center gap-3 pl-5 pr-6 text-[14px] bg-[#F9F9FC]">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-medium leading-none text-foreground">Testers</span>
            <span className="rounded-full bg-foreground/5 px-1.5 py-0.5 text-[11px] tabular-nums text-foreground/40">27</span>
          </div>
          <div className="self-stretch w-px bg-foreground/10 mx-1" />
          {filteredChips.map((c, i) => (
            <span key={i} className="contents">
              {i > 0 && <div className="self-stretch w-px bg-foreground/5" />}
              <span className="flex items-center gap-3 py-2.5">
                <span className="text-foreground/30">{c.label}</span>
                <span className="-ml-2 text-foreground">{c.value}</span>
              </span>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Plus className="h-3.5 w-3.5" />Add Tester
            </button>
          </div>
        </div>
        <div className="border-b border-border" />
      </div>
      <MockTable />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DEMO PAGE
// ═══════════════════════════════════════════════════════════

const OPTIONS = [
  { label: 'Current (18px bold)', component: Option1 },
  { label: '14px semibold', component: Option2 },
  { label: 'Uppercase label', component: Option3 },
  { label: '15px medium', component: Option4 },
  { label: 'With nav arrows', component: Option5 },
  { label: 'Title as chip', component: Option6 },
  { label: 'Dot separators', component: Option7 },
  { label: 'No title divider', component: Option8 },
  { label: 'Muted title', component: Option9 },
  { label: 'Title + badge', component: Option10 },
];

export default function PageHeaderDemoPage() {
  const [active, setActive] = useState(0);
  const ActiveComponent = OPTIONS[active].component;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8 pb-4">
        <h1 className="text-2xl font-medium tracking-tight mb-1">Page Header Options</h1>
        <p className="text-sm text-foreground/40 mb-6">
          10 variations for the sticky header bar. Shown with a mock Testers page for context.
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          {OPTIONS.map((opt, i) => (
            <DemoLabel key={i} n={i + 1} label={opt.label} active={active === i} onClick={() => setActive(i)} />
          ))}
        </div>
      </div>

      {/* Full-width preview */}
      <div className="mt-4 border-t border-border">
        <ActiveComponent />
      </div>
    </div>
  );
}
