'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// ── Font options ──────────────────────────────────────────

interface FontOption {
  id: string;
  name: string;
  family: string;
  google: string;
  weight: number;
  note: string;
  tag?: 'pick' | 'alt';
}

const FONTS: FontOption[] = [
  // ── Reference ──
  {
    id: 'sora',
    name: 'Sora',
    family: '"Sora", sans-serif',
    google: 'Sora:wght@600',
    weight: 600,
    note: 'Your pick — geometric, Japanese-inspired proportions',
    tag: 'pick',
  },

  // ── Thin / modern ──
  {
    id: 'jost',
    name: 'Jost',
    family: '"Jost", sans-serif',
    google: 'Jost:wght@500;600',
    weight: 500,
    note: 'Futura-inspired — pure geometric, elegant at light weights',
  },
  {
    id: 'josefin-sans',
    name: 'Josefin Sans',
    family: '"Josefin Sans", sans-serif',
    google: 'Josefin+Sans:wght@500;600',
    weight: 600,
    note: 'Tall x-height, thin strokes — vintage-modern',
  },
  {
    id: 'raleway',
    name: 'Raleway',
    family: '"Raleway", sans-serif',
    google: 'Raleway:wght@500;600',
    weight: 500,
    note: 'Thin and elegant — beautiful at lighter weights',
  },
  {
    id: 'figtree',
    name: 'Figtree',
    family: '"Figtree", sans-serif',
    google: 'Figtree:wght@500;600',
    weight: 600,
    note: 'Fresh, friendly geometric — open counters',
  },
  {
    id: 'albert-sans',
    name: 'Albert Sans',
    family: '"Albert Sans", sans-serif',
    google: 'Albert+Sans:wght@500;600',
    weight: 500,
    note: 'Geometric grotesk — clean and airy',
  },
  {
    id: 'lexend',
    name: 'Lexend',
    family: '"Lexend", sans-serif',
    google: 'Lexend:wght@500;600',
    weight: 500,
    note: 'Wide, modern spacing — designed for readability',
  },
  {
    id: 'red-hat-display',
    name: 'Red Hat Display',
    family: '"Red Hat Display", sans-serif',
    google: 'Red+Hat+Display:wght@500;600',
    weight: 500,
    note: 'Tech-forward — distinctive r, slightly condensed',
  },
  {
    id: 'barlow',
    name: 'Barlow',
    family: '"Barlow", sans-serif',
    google: 'Barlow:wght@500;600',
    weight: 500,
    note: 'Slightly condensed, utilitarian — California grotesk',
  },
  {
    id: 'nunito-sans',
    name: 'Nunito Sans',
    family: '"Nunito Sans", sans-serif',
    google: 'Nunito+Sans:wght@500;600',
    weight: 600,
    note: 'Soft-rounded terminals — warm and approachable',
  },
  {
    id: 'onest',
    name: 'Onest',
    family: '"Onest", sans-serif',
    google: 'Onest:wght@500;600',
    weight: 500,
    note: 'Modern rounded grotesk — subtle character in the r',
  },
  {
    id: 'commissioner',
    name: 'Commissioner',
    family: '"Commissioner", sans-serif',
    google: 'Commissioner:wght@500;600',
    weight: 500,
    note: 'Variable flair axis — clean with optional personality',
  },

  // ── Alternatives ──
  {
    id: 'fraunces',
    name: 'Fraunces',
    family: '"Fraunces", serif',
    google: 'Fraunces:wght@500;600',
    weight: 500,
    note: 'Quirky variable serif — soft, wonky, memorable',
    tag: 'alt',
  },
  {
    id: 'cormorant',
    name: 'Cormorant Garamond',
    family: '"Cormorant Garamond", serif',
    google: 'Cormorant+Garamond:wght@500;600',
    weight: 500,
    note: 'Thin elegant serif — editorial, high-fashion feel',
    tag: 'alt',
  },
  {
    id: 'bricolage',
    name: 'Bricolage Grotesque',
    family: '"Bricolage Grotesque", sans-serif',
    google: 'Bricolage+Grotesque:wght@500;600',
    weight: 600,
    note: 'Quirky grotesque — playful optical size variations',
    tag: 'alt',
  },
];

// Build a single Google Fonts URL
const googleUrl = `https://fonts.googleapis.com/css2?${FONTS.map((f) => `family=${f.google}`).join('&')}&display=swap`;

const TAG_STYLES: Record<string, { label: string; cls: string }> = {
  pick: { label: 'your pick', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  alt: { label: 'alternative', cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
};

// ── Sidebar preview ──────────────────────────────────────

function SidebarPreview({ fontFamily, fontWeight }: { fontFamily: string; fontWeight: number }) {
  return (
    <div className="w-48 rounded-lg border border-border bg-[#F9F9FC] dark:bg-[#161616] p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[22px] leading-none" style={{ fontFamily, fontWeight }}>
          miror
        </span>
        <span className="text-foreground/20 text-xs">v1</span>
      </div>
      <div className="space-y-1">
        {['Home', 'Tests', 'Testers', 'Schedules'].map((item) => (
          <div
            key={item}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-[13px]',
              item === 'Home' ? 'bg-foreground/5 text-foreground/70' : 'text-foreground/30',
            )}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Homepage preview ─────────────────────────────────────

function HomepagePreview({ fontFamily, fontWeight }: { fontFamily: string; fontWeight: number }) {
  return (
    <div className="rounded-lg border border-border p-6">
      <h1 className="text-3xl tracking-tight" style={{ fontFamily, fontWeight }}>
        miror
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        AI testers find every issue in minutes — before your users do
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────

export default function LogoFontsDemo() {
  const [selected, setSelected] = useState('sora');
  const activeFont = FONTS.find((f) => f.id === selected) ?? FONTS[0];

  return (
    <div className="min-h-screen bg-background">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={googleUrl} />

      <div className="border-b border-border px-6 py-3">
        <p className="text-sm font-medium text-foreground/50">Logo Fonts — Round 2: thinner &amp; modern, plus alternatives</p>
      </div>

      <div className="mx-auto max-w-4xl px-6 pt-10 space-y-10">
        {/* ── Active preview ── */}
        <div>
          <p className="text-xs font-medium text-foreground/30 uppercase tracking-wider mb-4">
            Active: {activeFont.name} ({activeFont.weight})
          </p>
          <div className="rounded-xl border border-border p-8 space-y-6">
            {/* Large isolated logo */}
            <div className="flex items-center justify-center py-4">
              <span
                className="text-6xl tracking-tight"
                style={{ fontFamily: activeFont.family, fontWeight: activeFont.weight }}
              >
                miror
              </span>
            </div>

            {/* In-context previews */}
            <div className="flex items-start gap-6">
              <SidebarPreview fontFamily={activeFont.family} fontWeight={activeFont.weight} />
              <div className="flex-1">
                <HomepagePreview fontFamily={activeFont.family} fontWeight={activeFont.weight} />
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">{activeFont.note}</p>
          </div>
        </div>

        {/* ── All options grid ── */}
        <div>
          <p className="text-xs font-medium text-foreground/30 uppercase tracking-wider mb-4">
            All options
          </p>
          <div className="grid grid-cols-2 gap-3">
            {FONTS.map((font, i) => (
              <button
                key={font.id}
                onClick={() => setSelected(font.id)}
                className={cn(
                  'rounded-lg border p-5 text-left transition-colors',
                  selected === font.id
                    ? 'border-foreground/20 bg-foreground/[0.02]'
                    : 'border-border hover:border-foreground/10',
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-medium text-foreground/25 uppercase">
                    {i + 1}: {font.name}
                  </p>
                  {font.tag && (
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px]', TAG_STYLES[font.tag].cls)}>
                      {TAG_STYLES[font.tag].label}
                    </span>
                  )}
                </div>
                <span
                  className="block text-[34px] tracking-tight leading-none"
                  style={{ fontFamily: font.family, fontWeight: font.weight }}
                >
                  miror
                </span>
                <p className="mt-2.5 text-xs text-foreground/30">{font.note}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Side-by-side comparison ── */}
        <div className="pb-16">
          <p className="text-xs font-medium text-foreground/30 uppercase tracking-wider mb-4">
            Size comparison (sidebar 22px &middot; H1 30px)
          </p>
          <div className="rounded-xl border border-border divide-y divide-border">
            {FONTS.map((font) => (
              <button
                key={font.id}
                onClick={() => setSelected(font.id)}
                className={cn(
                  'flex w-full items-center gap-6 px-6 py-3 text-left transition-colors hover:bg-muted/20',
                  selected === font.id && 'bg-foreground/[0.02]',
                )}
              >
                <span className="w-40 shrink-0 text-xs text-foreground/30 flex items-center gap-2">
                  {font.name}
                  {font.tag && (
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[9px]', TAG_STYLES[font.tag].cls)}>
                      {TAG_STYLES[font.tag].label}
                    </span>
                  )}
                </span>
                <span
                  className="text-[22px] leading-none w-28"
                  style={{ fontFamily: font.family, fontWeight: font.weight }}
                >
                  miror
                </span>
                <span className="text-foreground/10">|</span>
                <span
                  className="text-3xl tracking-tight leading-none"
                  style={{ fontFamily: font.family, fontWeight: font.weight }}
                >
                  miror
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
