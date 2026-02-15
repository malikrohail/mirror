'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type IconProps = { size?: number; className?: string };

// ══════════════════════════════════════════════════════════
// ORIGINALS (reference)
// ══════════════════════════════════════════════════════════

function IconReflectedM({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 18V6l4 6 4-6 4 6 4-6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18V22l4-3.5 4 3.5 4-3.5 4 3.5V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
    </svg>
  );
}

function IconTwoProfiles({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 20c0-3 2-5 5-5 1.5 0 2.5-.5 3-2 .3-.8.5-2 0-3-.5-1.5-2-2.5-3.5-2.5S4 9 4 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 20c0-3-2-5-5-5-1.5 0-2.5-.5-3-2-.3-.8-.5-2 0-3 .5-1.5 2-2.5 3.5-2.5S20 9 20 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
    </svg>
  );
}

function IconWindowReflect({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <circle cx="5.5" cy="5" r="0.7" fill="currentColor" opacity="0.3" />
      <circle cx="8" cy="5" r="0.7" fill="currentColor" opacity="0.3" />
      <rect x="5" y="18" width="14" height="3" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.15" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════
// BROWSER WINDOW VARIATIONS (like #6)
// ══════════════════════════════════════════════════════════

function IconBrowserCursor({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="2" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <line x1="2" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="4.5" cy="4" r="0.6" fill="currentColor" opacity="0.3" />
      <circle cx="6.5" cy="4" r="0.6" fill="currentColor" opacity="0.3" />
      {/* Cursor */}
      <path d="M15 12l4.5 2-1.8.7-.7 1.8L15 12z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconBrowserScan({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="5.5" cy="5" r="0.6" fill="currentColor" opacity="0.3" />
      <circle cx="7.5" cy="5" r="0.6" fill="currentColor" opacity="0.3" />
      {/* Scan line */}
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeDasharray="2 1.5" />
      {/* Scan glow */}
      <rect x="5" y="10" width="14" height="4" rx="1" fill="currentColor" opacity="0.04" />
    </svg>
  );
}

function IconBrowserMirror({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Front browser */}
      <rect x="2" y="2" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <line x1="2" y1="5.5" x2="17" y2="5.5" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="4" cy="3.8" r="0.5" fill="currentColor" opacity="0.3" />
      <circle cx="5.8" cy="3.8" r="0.5" fill="currentColor" opacity="0.3" />
      {/* Back browser (reflection) */}
      <rect x="7" y="11" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" opacity="0.2" />
      <line x1="7" y1="14.5" x2="22" y2="14.5" stroke="currentColor" strokeWidth="0.8" opacity="0.1" />
    </svg>
  );
}

function IconBrowserEye({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="2" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="5.5" cy="4" r="0.6" fill="currentColor" opacity="0.3" />
      <circle cx="7.5" cy="4" r="0.6" fill="currentColor" opacity="0.3" />
      {/* Eye inside browser */}
      <path d="M7 10.5s2-3 5-3 5 3 5 3-2 3-5 3-5-3-5-3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" opacity="0.6" />
      <circle cx="12" cy="10.5" r="1.5" fill="currentColor" opacity="0.5" />
      {/* Bottom bar */}
      <rect x="8" y="18" width="8" height="2" rx="1" fill="currentColor" opacity="0.08" />
    </svg>
  );
}

function IconBrowserMinimal({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Just the top bar dots — ultra minimal */}
      <circle cx="5" cy="5" r="1.2" fill="currentColor" opacity="0.5" />
      <circle cx="9" cy="5" r="1.2" fill="currentColor" opacity="0.3" />
      <circle cx="13" cy="5" r="1.2" fill="currentColor" opacity="0.15" />
      {/* Content area as simple lines */}
      <line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="4" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      <line x1="4" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.12" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════
// TWO PROFILES VARIATIONS (like #4)
// ══════════════════════════════════════════════════════════

function IconHeadsSilhouette({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Left head */}
      <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 20c0-3.3 2.2-5 5-5s5 1.7 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Right head (faded reflection) */}
      <circle cx="16" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" opacity="0.2" />
      <path d="M11 20c0-3.3 2.2-5 5-5s5 1.7 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}

function IconUserDashed({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Solid user (human) */}
      <circle cx="8.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Dashed user (AI) */}
      <circle cx="15.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.5 2" opacity="0.4" />
      <path d="M10.5 19c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2.5 2" opacity="0.4" />
    </svg>
  );
}

function IconFaceMirror({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Mirror axis */}
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="0.8" opacity="0.12" />
      {/* Left face — simple */}
      <circle cx="7" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="5.8" cy="8" r="0.6" fill="currentColor" />
      <circle cx="8.2" cy="8" r="0.6" fill="currentColor" />
      <path d="M5.5 10.5c.5 1 2 1.5 3 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Right face — faded */}
      <circle cx="17" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.8" opacity="0.2" />
      <circle cx="15.8" cy="8" r="0.6" fill="currentColor" opacity="0.2" />
      <circle cx="18.2" cy="8" r="0.6" fill="currentColor" opacity="0.2" />
      <path d="M15.5 10.5c.5 1 2 1.5 3 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}

function IconPersonaOverlap({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Back circle (AI) */}
      <circle cx="14" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.18" />
      {/* Front circle (user) */}
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8" />
      {/* Overlap zone — small dot */}
      <circle cx="12" cy="10" r="1.5" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

function IconUserReflection({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* User */}
      <circle cx="12" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 15c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Mirror line */}
      <line x1="6" y1="16.5" x2="18" y2="16.5" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      {/* Reflection below (inverted, faded) */}
      <path d="M7 18c0 1.5 1 2.5 2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.12" />
      <path d="M17 18c0 1.5-1 2.5-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.12" />
      <circle cx="12" cy="20.5" r="1.5" stroke="currentColor" strokeWidth="1" opacity="0.1" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════
// REFLECTED M VARIATIONS (like #1)
// ══════════════════════════════════════════════════════════

function IconMWaterline({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* M above */}
      <path d="M4 14V4l4 5.5L12 4l4 5.5L20 4v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Water line */}
      <line x1="2" y1="15" x2="22" y2="15" stroke="currentColor" strokeWidth="0.8" opacity="0.2" />
      {/* Rippled reflection */}
      <path d="M5 16.5c1-.3 2 .3 3 0s2-.3 3 0 2 .3 3 0 2-.3 3 0 2 .3 3 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.12" />
      <path d="M6 19c1-.2 1.5.2 2.5 0s1.5-.2 2.5 0 1.5.2 2.5 0 1.5-.2 2.5 0" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.07" />
    </svg>
  );
}

function IconMFlipped({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* M above */}
      <path d="M4 13V4l4 5 4-5 4 5 4-5v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Mirror line */}
      <line x1="3" y1="14" x2="21" y2="14" stroke="currentColor" strokeWidth="0.8" opacity="0.12" />
      {/* Flipped M below (upside down) */}
      <path d="M4 15v7l4-4 4 4 4-4 4 4v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
    </svg>
  );
}

function IconMShadow({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Shadow/reflection offset behind */}
      <path d="M5 19V7l4 6 4-6 4 6 4-6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.1" />
      {/* Main M */}
      <path d="M4 18V6l4 6 4-6 4 6 4-6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMGradient({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="m-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      {/* Single M with gradient fade from top to bottom */}
      <path d="M4 21V4l4 6 4-6 4 6 4-6v17" stroke="url(#m-fade)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMMinimal({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Just the peaks of the M — ultra minimal */}
      <path d="M3 16L7 7l5 6 5-6 4 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Subtle reflection line below */}
      <path d="M5 19l3-3 4 3 4-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.12" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════
// OPTIONS CONFIG — grouped by family
// ══════════════════════════════════════════════════════════

type Family = 'browser' | 'profiles' | 'reflected-m';

interface IconOption {
  id: string;
  name: string;
  note: string;
  family: Family;
  original?: boolean;
  Icon: (props: IconProps) => React.JSX.Element;
}

const FAMILY_META: Record<Family, { label: string; color: string }> = {
  browser: { label: 'Browser', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  profiles: { label: 'Profiles', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  'reflected-m': { label: 'Reflected M', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
};

const ICONS: IconOption[] = [
  // ── Browser Window family ──
  { id: 'window-reflect', name: 'Browser Reflect', note: 'Browser with faint reflection beneath — testing websites is the product', family: 'browser', original: true, Icon: IconWindowReflect },
  { id: 'browser-cursor', name: 'Browser + Cursor', note: 'Browser with pointer cursor — active interaction, clicking through a site', family: 'browser', Icon: IconBrowserCursor },
  { id: 'browser-scan', name: 'Browser Scan', note: 'Browser with scan line passing through — automated analysis in progress', family: 'browser', Icon: IconBrowserScan },
  { id: 'browser-mirror', name: 'Browser Mirror', note: 'Two overlapping browsers — original and its reflection, before/after', family: 'browser', Icon: IconBrowserMirror },
  { id: 'browser-eye', name: 'Browser + Eye', note: 'Browser with an eye inside — "we see what users see"', family: 'browser', Icon: IconBrowserEye },
  { id: 'browser-minimal', name: 'Browser Minimal', note: 'Just traffic light dots + content lines — ultra-reduced, abstract', family: 'browser', Icon: IconBrowserMinimal },

  // ── Two Profiles family ──
  { id: 'two-profiles', name: 'Two Profiles', note: 'Persona facing its reflection — AI persona mirrors a real user', family: 'profiles', original: true, Icon: IconTwoProfiles },
  { id: 'heads-silhouette', name: 'Head + Ghost', note: 'Two user avatars, one faded — real user and their AI double', family: 'profiles', Icon: IconHeadsSilhouette },
  { id: 'user-dashed', name: 'Solid + Dashed', note: 'Solid human, dashed AI — clearly distinguishes real from simulated', family: 'profiles', Icon: IconUserDashed },
  { id: 'face-mirror', name: 'Face Mirror', note: 'Two simple faces across a mirror axis — playful, instantly readable', family: 'profiles', Icon: IconFaceMirror },
  { id: 'persona-overlap', name: 'Venn Overlap', note: 'Two overlapping circles — where AI and user insight meet', family: 'profiles', Icon: IconPersonaOverlap },
  { id: 'user-reflection', name: 'User Reflection', note: 'User icon with reflection below a mirror line — portrait in a mirror', family: 'profiles', Icon: IconUserReflection },

  // ── Reflected M family ──
  { id: 'reflected-m', name: 'M + Reflection', note: 'The m letterform with a faded zigzag reflection — directly ties name to mark', family: 'reflected-m', original: true, Icon: IconReflectedM },
  { id: 'm-waterline', name: 'M + Waterline', note: 'M above a waterline with ripple reflection — mirror on water', family: 'reflected-m', Icon: IconMWaterline },
  { id: 'm-flipped', name: 'M + Flipped M', note: 'M with a full upside-down reflection — literal mirror image', family: 'reflected-m', Icon: IconMFlipped },
  { id: 'm-shadow', name: 'M + Shadow', note: 'M with an offset drop shadow — depth, subtle mirror effect', family: 'reflected-m', Icon: IconMShadow },
  { id: 'm-gradient', name: 'M Gradient Fade', note: 'Single tall M that fades from solid to ghost — the mark dissolves', family: 'reflected-m', Icon: IconMGradient },
  { id: 'm-minimal', name: 'M Peaks', note: 'Just the zigzag peaks of the M + subtle echo — ultra minimal', family: 'reflected-m', Icon: IconMMinimal },
];

// ── Sidebar preview ──────────────────────────────────────

const LOGO_FONT = '"Red Hat Display", sans-serif';
const LOGO_WEIGHT = 500;

function SidebarPreview({ icon: Icon }: { icon: (props: IconProps) => React.JSX.Element }) {
  return (
    <div className="w-52 rounded-lg border border-border bg-[#F9F9FC] dark:bg-[#161616] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} />
        <span className="text-[22px] leading-none" style={{ fontFamily: LOGO_FONT, fontWeight: LOGO_WEIGHT }}>
          miror
        </span>
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

// ── Page ─────────────────────────────────────────────────

export default function LogoIconDemo() {
  const [selected, setSelected] = useState('window-reflect');
  const [familyFilter, setFamilyFilter] = useState<Family | null>(null);
  const active = ICONS.find((i) => i.id === selected) ?? ICONS[0];
  const filtered = familyFilter ? ICONS.filter((i) => i.family === familyFilter) : ICONS;

  return (
    <div className="min-h-screen bg-background">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@500;600&display=swap"
      />

      <div className="border-b border-border px-6 py-3">
        <p className="text-sm font-medium text-foreground/50">Logo Icon — 18 marks in 3 families for miror + Red Hat Display</p>
      </div>

      <div className="mx-auto max-w-4xl px-6 pt-10 space-y-10">
        {/* ── Active preview ── */}
        <div>
          <p className="text-xs font-medium text-foreground/30 uppercase tracking-wider mb-4">
            Active: {active.name}
          </p>
          <div className="rounded-xl border border-border p-8 space-y-8">
            {/* Large icon + wordmark */}
            <div className="flex items-center justify-center gap-8 py-4">
              <div className="flex flex-col items-center gap-2">
                <active.Icon size={64} />
                <span className="text-[10px] text-foreground/20 uppercase">Icon only</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <active.Icon size={32} />
                  <span
                    className="text-4xl tracking-tight"
                    style={{ fontFamily: LOGO_FONT, fontWeight: LOGO_WEIGHT }}
                  >
                    miror
                  </span>
                </div>
                <span className="text-[10px] text-foreground/20 uppercase">Lockup</span>
              </div>
            </div>

            {/* Size scale */}
            <div className="flex items-center justify-center gap-6">
              {[16, 20, 24, 32, 48].map((s) => (
                <div key={s} className="flex flex-col items-center gap-1.5">
                  <active.Icon size={s} />
                  <span className="text-[10px] text-foreground/20">{s}px</span>
                </div>
              ))}
            </div>

            {/* In-context: sidebar + dark + favicon */}
            <div className="flex items-start gap-6">
              <SidebarPreview icon={active.Icon} />
              <div className="flex-1 space-y-4">
                <div className="rounded-lg bg-[#161616] p-6">
                  <div className="flex items-center gap-3 text-white">
                    <active.Icon size={28} />
                    <span
                      className="text-[28px] tracking-tight"
                      style={{ fontFamily: LOGO_FONT, fontWeight: LOGO_WEIGHT }}
                    >
                      miror
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/40">On dark background</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                    <active.Icon size={16} />
                    <span className="text-xs text-foreground/40">Browser tab</span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
                    <active.Icon size={22} />
                  </div>
                  <span className="text-xs text-foreground/20">App icon</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">{active.note}</p>
          </div>
        </div>

        {/* ── Family filter ── */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFamilyFilter(null)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              familyFilter === null
                ? 'border-foreground/20 bg-foreground/5 text-foreground'
                : 'border-border text-foreground/40 hover:text-foreground/70',
            )}
          >
            All ({ICONS.length})
          </button>
          {(Object.keys(FAMILY_META) as Family[]).map((fam) => {
            const count = ICONS.filter((i) => i.family === fam).length;
            return (
              <button
                key={fam}
                onClick={() => setFamilyFilter(familyFilter === fam ? null : fam)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  familyFilter === fam
                    ? 'border-foreground/20 bg-foreground/5 text-foreground'
                    : 'border-border text-foreground/40 hover:text-foreground/70',
                )}
              >
                {FAMILY_META[fam].label} ({count})
              </button>
            );
          })}
        </div>

        {/* ── All options grid ── */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((icon, i) => (
              <button
                key={icon.id}
                onClick={() => setSelected(icon.id)}
                className={cn(
                  'rounded-lg border p-5 text-left transition-colors',
                  selected === icon.id
                    ? 'border-foreground/20 bg-foreground/[0.02]'
                    : 'border-border hover:border-foreground/10',
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-medium text-foreground/25 uppercase">
                    {icon.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {icon.original && (
                      <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[9px] text-foreground/30">
                        original
                      </span>
                    )}
                    <span className={cn('rounded-full px-2 py-0.5 text-[9px]', FAMILY_META[icon.family].color)}>
                      {FAMILY_META[icon.family].label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <icon.Icon size={28} />
                  <span
                    className="text-[26px] tracking-tight leading-none"
                    style={{ fontFamily: LOGO_FONT, fontWeight: LOGO_WEIGHT }}
                  >
                    miror
                  </span>
                </div>
                <p className="text-xs text-foreground/30">{icon.note}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Side-by-side comparison ── */}
        <div className="pb-16">
          <p className="text-xs font-medium text-foreground/30 uppercase tracking-wider mb-4">
            Side by side
          </p>
          <div className="rounded-xl border border-border divide-y divide-border">
            {filtered.map((icon) => (
              <button
                key={icon.id}
                onClick={() => setSelected(icon.id)}
                className={cn(
                  'flex w-full items-center gap-5 px-6 py-3.5 text-left transition-colors hover:bg-muted/20',
                  selected === icon.id && 'bg-foreground/[0.02]',
                )}
              >
                <span className="w-36 shrink-0 text-xs text-foreground/30 flex items-center gap-1.5">
                  {icon.name}
                  {icon.original && <span className="text-[8px] text-foreground/20">(orig)</span>}
                </span>
                <icon.Icon size={20} />
                <span className="text-foreground/10">+</span>
                <span className="flex items-center gap-2">
                  <icon.Icon size={20} />
                  <span
                    className="text-[22px] leading-none"
                    style={{ fontFamily: LOGO_FONT, fontWeight: LOGO_WEIGHT }}
                  >
                    miror
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
