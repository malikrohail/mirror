'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, ArrowRight, Terminal, Globe, Play, ChevronRight, Zap } from 'lucide-react';

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

// ═══════════════════════════════════════════════════════════
// ORIGINALS (1, 3, 4)
// ═══════════════════════════════════════════════════════════

// ── 1. Terminal Card (original) ─────────────────────────

function Option1() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
        <span className="ml-3 text-xs font-mono text-foreground/30">quick-start</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-foreground/50">
          Describe what you want to test and we&apos;ll generate a plan.
        </p>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/30 mb-1.5">target</label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2">
            <span className="text-foreground/20 font-mono text-sm">https://</span>
            <input type="text" placeholder="example.com" className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/20" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/30 mb-1.5">task</label>
          <textarea placeholder="e.g. Sign up for a free trial" className="w-full min-h-20 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-sm outline-none resize-none placeholder:text-foreground/20" />
          <p className="mt-1 text-[11px] font-mono text-foreground/20">Be specific about goals, user flows, or pain points you suspect.</p>
        </div>
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background py-2.5 text-sm font-medium hover:bg-foreground/90">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Plan
        </button>
      </div>
    </div>
  );
}

// ── 2. Dark Terminal (original) ─────────────────────────

function Option2() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden text-zinc-300">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="ml-3 text-xs font-mono text-zinc-600">miror &mdash; quick start</span>
      </div>
      <div className="p-5 space-y-4 font-mono">
        <p className="text-sm text-zinc-500">Describe what you want to test and we&apos;ll generate a plan.</p>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5">target_url</label>
          <div className="flex items-center rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2">
            <span className="text-emerald-600 mr-1.5 text-sm">$</span>
            <input type="text" placeholder="example.com" className="flex-1 bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-700 font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5">test_task</label>
          <div className="rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2">
            <div className="flex items-start">
              <span className="text-emerald-600 mr-1.5 text-sm mt-[1px]">$</span>
              <textarea placeholder="e.g. Sign up for a free trial" className="flex-1 min-h-16 bg-transparent text-sm text-zinc-300 outline-none resize-none placeholder:text-zinc-700 font-mono" />
            </div>
          </div>
          <p className="mt-1 text-[11px] text-zinc-700"># Be specific about goals, user flows, or pain points</p>
        </div>
        <button className="w-full flex items-center justify-center gap-2 rounded-md bg-zinc-100 text-zinc-900 py-2.5 text-sm font-medium hover:bg-white">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Plan
        </button>
      </div>
    </div>
  );
}

// ── 3. Compact Panel (original) ─────────────────────────

function Option3() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-[14px] uppercase text-foreground/30">Quick Start</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-mono text-foreground/30">&gt;_</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-mono uppercase tracking-wider text-foreground/25 shrink-0 w-10">url</label>
          <input type="text" placeholder="example.com" className="flex-1 rounded-md border border-border bg-foreground/[0.02] px-3 py-1.5 text-sm outline-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex items-start gap-3">
          <label className="text-[11px] font-mono uppercase tracking-wider text-foreground/25 shrink-0 w-10 mt-2">task</label>
          <div className="flex-1">
            <textarea placeholder="e.g. Sign up for a free trial" className="w-full min-h-20 rounded-md border border-border bg-foreground/[0.02] px-3 py-1.5 text-sm outline-none resize-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring" />
            <p className="mt-1 text-[11px] text-foreground/20">Be specific about goals, user flows, or pain points you suspect.</p>
          </div>
        </div>
        <div className="pt-1">
          <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background py-2.5 text-sm font-medium hover:bg-foreground/90">
            <Sparkles className="h-3.5 w-3.5" />
            Generate Plan
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NEW OPTIONS (4–13)
// ═══════════════════════════════════════════════════════════

// ── 4. Dark Header, Light Body ──────────────────────────
// Dark title bar like the dark terminal, but the body stays light
// like the rest of the page. Bridges both worlds.

function Option4() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-200 bg-zinc-900">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="ml-3 text-xs font-mono text-zinc-500">quick-start</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-foreground/40">Describe what you want to test and we&apos;ll generate a plan.</p>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/30 mb-1.5">target</label>
          <div className="flex items-center rounded-lg border border-border bg-foreground/[0.02] px-3 py-2">
            <span className="text-foreground/20 font-mono text-sm mr-1.5">https://</span>
            <input type="text" placeholder="example.com" className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/20" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/30 mb-1.5">task</label>
          <textarea placeholder="e.g. Sign up for a free trial" className="w-full min-h-20 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-sm outline-none resize-none placeholder:text-foreground/20" />
          <p className="mt-1 text-[11px] font-mono text-foreground/20">Be specific about goals, user flows, or pain points you suspect.</p>
        </div>
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background py-2.5 text-sm font-medium hover:bg-foreground/90">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Plan
        </button>
      </div>
    </div>
  );
}

// ── 5. Compact Dark ─────────────────────────────────────
// Dark bg like Option 2, but compact inline-label layout like Option 3.
// Tight, efficient, terminal-native.

function Option5() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden text-zinc-300">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Quick Start</span>
          <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-500">&gt;_</span>
        </div>
      </div>
      <div className="p-4 space-y-3 font-mono">
        <div className="flex items-center gap-3">
          <label className="text-[11px] uppercase tracking-wider text-zinc-600 shrink-0 w-12">url</label>
          <div className="flex-1 flex items-center rounded-md bg-zinc-900 border border-zinc-800 px-3 py-1.5">
            <span className="text-emerald-600 mr-1.5 text-sm">$</span>
            <input type="text" placeholder="example.com" className="flex-1 bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-700 font-mono" />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <label className="text-[11px] uppercase tracking-wider text-zinc-600 shrink-0 w-12 mt-2">task</label>
          <div className="flex-1">
            <div className="rounded-md bg-zinc-900 border border-zinc-800 px-3 py-1.5">
              <div className="flex items-start">
                <span className="text-emerald-600 mr-1.5 text-sm mt-[1px]">$</span>
                <textarea placeholder="e.g. Sign up for a free trial" className="flex-1 min-h-16 bg-transparent text-sm text-zinc-300 outline-none resize-none placeholder:text-zinc-700 font-mono" />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-zinc-700"># Be specific about goals, flows, or pain points</p>
          </div>
        </div>
        <div className="pt-1">
          <button className="w-full flex items-center justify-center gap-2 rounded-md bg-zinc-100 text-zinc-900 py-2.5 text-sm font-medium font-sans hover:bg-white">
            <Sparkles className="h-3.5 w-3.5" />
            Generate Plan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 6. Terminal Card Minimal ────────────────────────────
// Option 1 stripped to the bone. No description text, tighter spacing,
// label + input on the same visual line. Maximum signal-to-noise.

function Option6() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-muted/30">
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="ml-2 text-[11px] font-mono text-foreground/25">quick-start</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/25 mb-1">target</label>
          <input type="text" placeholder="https://example.com" className="w-full rounded-md border border-border bg-foreground/[0.02] px-3 py-2 text-sm outline-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/25 mb-1">task</label>
          <textarea placeholder="e.g. Sign up for a free trial" className="w-full min-h-[72px] rounded-md border border-border bg-foreground/[0.02] px-3 py-2 text-sm outline-none resize-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring" />
        </div>
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background py-2.5 text-sm font-medium hover:bg-foreground/90">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Plan
        </button>
      </div>
    </div>
  );
}

// ── 7. Dark Inset Fields ────────────────────────────────
// Dark terminal where inputs are slightly lighter than the bg
// (no visible border on fields). Looks like carved-out input areas.

function Option7() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden text-zinc-300">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800/60">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="ml-3 text-xs font-mono text-zinc-600">quick-start</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-zinc-500 font-mono">Describe what you want to test.</p>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">target</label>
          <div className="flex items-center rounded-lg bg-zinc-900/80 px-3 py-2.5">
            <Globe className="h-3.5 w-3.5 text-zinc-600 mr-2 shrink-0" />
            <input type="text" placeholder="example.com" className="flex-1 bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-700 font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">task</label>
          <div className="rounded-lg bg-zinc-900/80 px-3 py-2.5">
            <textarea placeholder="e.g. Sign up for a free trial" className="w-full min-h-[72px] bg-transparent text-sm text-zinc-300 outline-none resize-none placeholder:text-zinc-700 font-mono" />
          </div>
          <p className="mt-1.5 text-[11px] font-mono text-zinc-700">Be specific about goals, user flows, or pain points.</p>
        </div>
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-white text-zinc-900 py-2.5 text-sm font-medium hover:bg-zinc-100">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Plan
        </button>
      </div>
    </div>
  );
}

// ── 8. SectionCard Style ────────────────────────────────
// Matches RECENT TESTS / AVAILABLE TESTERS header exactly.
// Body uses the same muted input styling. Perfect page cohesion.

function Option8() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] uppercase text-foreground/30">Quick Start</h3>
        </div>
        <span className="text-[11px] font-mono text-foreground/20">&gt;_</span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-foreground/40">Describe what you want to test and we&apos;ll generate a plan.</p>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/25 mb-1.5">your website</label>
          <input type="text" placeholder="example.com" className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/25 mb-1.5">tester&apos;s task</label>
          <textarea placeholder="e.g. Sign up for a free trial" className="w-full min-h-20 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none resize-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring" />
          <p className="mt-1 text-[11px] text-foreground/20">Be specific about goals, user flows, or pain points you suspect.</p>
        </div>
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background py-2.5 text-sm font-medium hover:bg-foreground/90">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Plan
        </button>
      </div>
    </div>
  );
}

// ── 9. Terminal Card + Showcase Row ─────────────────────
// Like Option 1 but with the "Showcase study" link baked into
// the card as a subtle footer row. One unified block.

function Option9() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
        <span className="ml-3 text-xs font-mono text-foreground/30">quick-start</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-foreground/50">Describe what you want to test and we&apos;ll generate a plan.</p>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/30 mb-1.5">target</label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2">
            <span className="text-foreground/20 font-mono text-sm">https://</span>
            <input type="text" placeholder="example.com" className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/20" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/30 mb-1.5">task</label>
          <textarea placeholder="e.g. Sign up for a free trial" className="w-full min-h-20 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-sm outline-none resize-none placeholder:text-foreground/20" />
          <p className="mt-1 text-[11px] font-mono text-foreground/20">Be specific about goals, user flows, or pain points you suspect.</p>
        </div>
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background py-2.5 text-sm font-medium hover:bg-foreground/90">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Plan
        </button>
      </div>
      {/* Showcase footer */}
      <div className="border-t border-border">
        <button className="flex w-full items-center justify-center gap-2 py-2.5 text-sm text-foreground/30 transition-colors hover:bg-muted/20 hover:text-foreground/50">
          <Play className="h-3.5 w-3.5" />
          Showcase study
        </button>
      </div>
    </div>
  );
}

// ── 10. Dark Emerald Accent ─────────────────────────────
// Dark terminal with emerald accent line on left, no $ prompts,
// cleaner labels. More polished dark theme.

function Option10() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden text-zinc-300">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-600/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="ml-3 text-xs font-mono text-zinc-600">quick-start</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-zinc-500">Describe what you want to test and we&apos;ll generate a plan.</p>
        <div className="border-l-2 border-emerald-800/40 pl-4">
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">target</label>
          <div className="flex items-center rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2">
            <span className="text-zinc-600 font-mono text-sm mr-1.5">https://</span>
            <input type="text" placeholder="example.com" className="flex-1 bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-700 font-mono" />
          </div>
        </div>
        <div className="border-l-2 border-emerald-800/40 pl-4">
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">task</label>
          <textarea placeholder="e.g. Sign up for a free trial" className="w-full min-h-[72px] rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-300 outline-none resize-none placeholder:text-zinc-700 font-mono" />
          <p className="mt-1 text-[11px] font-mono text-zinc-700">Be specific about goals, flows, or pain points.</p>
        </div>
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white py-2.5 text-sm font-medium hover:bg-emerald-500">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Plan
        </button>
      </div>
    </div>
  );
}

// ── 11. Compact Duo-Tone ────────────────────────────────
// Compact inline labels. URL field has a subtle tinted background,
// task area is open. Monospace label + SectionCard header.

function Option11() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="ml-2 text-xs font-mono text-foreground/25">quick-start</span>
        <span className="ml-auto text-[10px] font-mono text-foreground/20">&gt;_</span>
      </div>
      <div className="p-4 space-y-3">
        {/* URL as a tinted row */}
        <div className="flex items-center gap-2 rounded-lg bg-foreground/[0.03] border border-border/60 px-3 py-2">
          <Globe className="h-3.5 w-3.5 text-foreground/20 shrink-0" />
          <input type="text" placeholder="example.com" className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/20" />
        </div>
        {/* Task */}
        <div>
          <textarea placeholder="What should the tester do? e.g. Sign up for a free trial" className="w-full min-h-24 rounded-lg border border-border px-3 py-2.5 text-sm outline-none resize-none placeholder:text-foreground/20 focus:ring-1 focus:ring-ring" />
          <p className="mt-1 text-[11px] font-mono text-foreground/20">Be specific about goals, user flows, or pain points.</p>
        </div>
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background py-2.5 text-sm font-medium hover:bg-foreground/90">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Plan
        </button>
      </div>
    </div>
  );
}

// ── 12. Dark with Glow Button ───────────────────────────
// Dark terminal with a glowing CTA button. Inputs use a subtle
// ring on focus. Premium feel.

function Option12() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden text-zinc-300">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800/60">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="ml-3 text-xs font-mono text-zinc-600">miror</span>
        <span className="ml-auto text-[10px] font-mono text-zinc-700">quick-start</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-zinc-500 font-mono">Paste a URL and describe what to test.</p>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">target</label>
          <input type="text" placeholder="https://example.com" className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-300 outline-none placeholder:text-zinc-700 font-mono focus:ring-1 focus:ring-zinc-600" />
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1.5">task</label>
          <textarea placeholder="e.g. Sign up for a free trial" className="w-full min-h-[72px] rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-300 outline-none resize-none placeholder:text-zinc-700 font-mono focus:ring-1 focus:ring-zinc-600" />
          <p className="mt-1 text-[11px] font-mono text-zinc-700"># goals, user flows, or pain points</p>
        </div>
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-white text-zinc-900 py-2.5 text-sm font-medium shadow-[0_0_20px_rgba(255,255,255,0.08)] hover:shadow-[0_0_24px_rgba(255,255,255,0.12)] hover:bg-zinc-100 transition-shadow">
          <Zap className="h-3.5 w-3.5" />
          Generate Plan
        </button>
      </div>
    </div>
  );
}

// ── 13. Terminal Card + URL Chip ─────────────────────────
// Like Option 1 but URL becomes a compact chip/pill at the top.
// The task gets all the space. Feels like you're composing a command.

function Option13() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
        <span className="ml-3 text-xs font-mono text-foreground/30">quick-start</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-foreground/50">Describe what you want to test and we&apos;ll generate a plan.</p>
        {/* URL as compact pill row */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-foreground/25">run</span>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.02] px-3 py-1.5">
            <Globe className="h-3 w-3 text-foreground/20" />
            <input type="text" placeholder="example.com" className="bg-transparent text-sm outline-none placeholder:text-foreground/20 w-40" />
          </div>
        </div>
        {/* Task gets all the focus */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/25 mb-1.5">task</label>
          <textarea placeholder="e.g. Sign up for a free trial" className="w-full min-h-24 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-sm outline-none resize-none placeholder:text-foreground/20" />
          <p className="mt-1 text-[11px] font-mono text-foreground/20">Be specific about goals, user flows, or pain points you suspect.</p>
        </div>
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background py-2.5 text-sm font-medium hover:bg-foreground/90">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Plan
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DEMO PAGE
// ═══════════════════════════════════════════════════════════

const OPTIONS = [
  { label: 'Terminal Card', component: Option1 },
  { label: 'Dark Terminal', component: Option2 },
  { label: 'Compact Panel', component: Option3 },
  { label: 'Dark Header', component: Option4 },
  { label: 'Compact Dark', component: Option5 },
  { label: 'Minimal', component: Option6 },
  { label: 'Dark Inset', component: Option7 },
  { label: 'SectionCard', component: Option8 },
  { label: 'With Showcase', component: Option9 },
  { label: 'Emerald Accent', component: Option10 },
  { label: 'Duo-Tone', component: Option11 },
  { label: 'Dark Glow', component: Option12 },
  { label: 'URL Chip', component: Option13 },
];

export default function QuickStartDemoPage() {
  const [active, setActive] = useState(0);
  const ActiveComponent = OPTIONS[active].component;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-medium tracking-tight mb-1">Quick Start Options</h1>
        <p className="text-sm text-foreground/40 mb-6">
          13 variations: your 3 favorites first, then 10 new explorations.
        </p>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 flex-wrap">
          {OPTIONS.map((opt, i) => (
            <DemoLabel
              key={i}
              n={i + 1}
              label={opt.label}
              active={active === i}
              onClick={() => setActive(i)}
            />
          ))}
        </div>

        {/* Preview: Side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(380px,1fr)_1.5fr] gap-4">
          <div>
            <ActiveComponent />
          </div>
          <div className="hidden lg:flex lg:flex-col gap-4">
            <MockRecentTests />
            <MockTeam />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mock cards for context ──────────────────────────────

function MockRecentTests() {
  const tests = [
    { name: 'google13', task: 'find out lebrons age', status: 'complete', score: 95, personas: 1, date: 'Feb 14' },
    { name: 'google12', task: 'search for bread', status: 'complete', score: 95, personas: 1, date: 'Feb 14' },
    { name: 'google11', task: 'search for something to do in boston', status: 'failed', score: null, personas: 1, date: 'Feb 14' },
    { name: 'google10', task: 'search for best hotel in helsinki', status: 'failed', score: null, personas: 2, date: 'Feb 14' },
    { name: 'google9', task: 'search for best restuarant in boston', status: 'failed', score: null, personas: 2, date: 'Feb 14' },
    { name: 'hord8', task: 'stake eth', status: 'running', score: null, personas: 3, date: 'Feb 13' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] uppercase text-foreground/30">Recent tests</h3>
          <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">13</span>
        </div>
        <span className="flex items-center gap-1 text-xs text-foreground/50">View all <ArrowRight className="h-3 w-3" /></span>
      </div>
      <div className="p-1">
        {tests.map((t) => (
          <div key={t.name} className="flex items-center px-3 py-2.5 text-[13px] border-b border-border/50 last:border-b-0">
            <div className="grid flex-1 items-center" style={{ gridTemplateColumns: '80px 1fr 100px 50px 80px 60px' }}>
              <span className="text-foreground/30">{t.name}</span>
              <span className="text-foreground/70 truncate pr-4">{t.task}</span>
              <span className={cn('inline-flex items-center gap-1.5 capitalize', t.status === 'complete' ? 'text-green-600' : t.status === 'failed' ? 'text-red-500' : 'text-blue-500')}>
                <span className={cn('inline-flex h-1.5 w-1.5 rounded-full', t.status === 'complete' ? 'bg-emerald-500' : t.status === 'failed' ? 'bg-red-500' : 'bg-blue-500')} />
                {t.status === 'complete' ? 'Complete' : t.status === 'failed' ? 'Failed' : 'Running'}
              </span>
              <span className="text-foreground/40 inline-flex items-center gap-1">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                {t.personas}
              </span>
              <span className="tabular-nums">
                {t.score ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-semibold text-green-600">{t.score}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-green-600/60">Great</span>
                  </span>
                ) : <span className="text-foreground/20">&mdash;</span>}
              </span>
              <span className="text-right text-foreground/30">{t.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockTeam() {
  const team = [
    { name: 'Cognitive Disability User', desc: 'A 28-year-old with ADHD who needs clear structure, minimal distractions, and forgiving interfaces' },
    { name: 'Color Blind User', desc: 'A 40-year-old with deuteranopia (red-green color blindness) who relies on patterns, not color alone' },
    { name: 'Low Vision User', desc: 'A 60-year-old with macular degeneration who uses high zoom and needs strong contrast' },
    { name: 'Motor Impairment User', desc: 'A 50-year-old with limited fine motor control who uses keyboard and voice commands' },
    { name: 'Screen Reader User', desc: 'A 35-year-old who is blind and navigates entirely with a screen reader and keyboard' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] uppercase text-foreground/30">Available testers</h3>
          <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">27</span>
        </div>
        <span className="flex items-center gap-1 text-xs text-foreground/50">See all <ArrowRight className="h-3 w-3" /></span>
      </div>
      <div className="p-1">
        {team.map((t) => (
          <div key={t.name} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-sm shrink-0">{t.name[0]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-foreground/70 truncate font-medium">{t.name}</p>
              <p className="text-[14px] text-foreground/30 truncate">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
