'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// ── Style E variations (minimal underline) ──────────

function E1() {
  return (
    <h2 className="mt-1 text-lg text-muted-foreground">
      AI testers test your site in{' '}
      <span className="border-b-2 border-emerald-500/50 font-medium text-foreground pb-0.5">minutes</span>
      {' '}the way real testers would in{' '}
      <span className="border-b-2 border-red-400/30 text-foreground/30 pb-0.5">hours</span>
    </h2>
  );
}

function E2() {
  return (
    <h2 className="mt-1 text-lg text-muted-foreground">
      AI testers test your site in{' '}
      <span className="relative font-medium text-foreground">
        minutes
        <span className="absolute -bottom-0.5 left-0 h-[3px] w-full rounded-full bg-emerald-500/40" />
      </span>
      {' '}— real testers take{' '}
      <span className="relative text-foreground/25">
        hours
        <span className="absolute left-0 top-1/2 h-[1.5px] w-full bg-foreground/15" />
      </span>
    </h2>
  );
}

function E3() {
  return (
    <h2 className="mt-1 text-lg text-muted-foreground">
      Your site, tested in{' '}
      <span className="border-b-2 border-emerald-500/60 font-medium text-foreground pb-0.5">minutes</span>
      {' '}by AI personas who think like{' '}
      <span className="border-b-2 border-blue-400/40 font-medium text-foreground pb-0.5">real users</span>
    </h2>
  );
}

function E4() {
  return (
    <h2 className="mt-1 text-lg text-muted-foreground">
      <span className="border-b-2 border-foreground/20 pb-0.5 text-foreground/70">Real user testing</span>
      {' '}quality.{' '}
      <span className="border-b-2 border-emerald-500/50 font-medium text-foreground pb-0.5">AI speed</span>.{' '}
      <span className="text-foreground/25 line-through">No recruiting needed</span>.
    </h2>
  );
}

function E5() {
  return (
    <h2 className="mt-1 text-lg text-muted-foreground">
      AI testers find{' '}
      <span className="border-b-2 border-red-400/40 font-medium text-foreground pb-0.5">every issue</span>
      {' '}in{' '}
      <span className="border-b-2 border-emerald-500/50 font-medium text-foreground pb-0.5">minutes</span>
      {' '}— before your users do
    </h2>
  );
}

// ── Style C variations (strikethrough contrast) ─────

function C1() {
  return (
    <h2 className="mt-1 text-lg text-muted-foreground">
      Test your site the way real users would.{' '}
      <span className="text-foreground/25 line-through decoration-2 decoration-foreground/10">Weeks of recruiting. Hours of sessions.</span>{' '}
      <span className="font-medium text-foreground">5 minutes with AI.</span>
    </h2>
  );
}

function C2() {
  return (
    <h2 className="mt-1 text-lg text-muted-foreground">
      <span className="text-foreground/20 line-through decoration-1 decoration-foreground/10">Recruit participants. Schedule sessions. Take notes.</span>{' '}
      <span className="font-medium text-foreground">Or just paste a URL.</span>
    </h2>
  );
}

function C3() {
  return (
    <h2 className="mt-1 text-lg text-muted-foreground">
      Usability testing that used to take{' '}
      <span className="text-foreground/20 line-through decoration-2 decoration-foreground/10">$12,000 and 3 weeks</span>.{' '}
      <span className="font-medium text-foreground">Now it takes 5 minutes.</span>
    </h2>
  );
}

function C4() {
  return (
    <h2 className="mt-1 text-lg text-muted-foreground">
      <span className="text-foreground/20 line-through decoration-1 decoration-foreground/10">Hire testers. Write scripts. Wait for results.</span>{' '}
      AI personas do it all —{' '}
      <span className="font-medium text-foreground">in minutes, not weeks.</span>
    </h2>
  );
}

function C5() {
  return (
    <h2 className="mt-1 text-lg text-muted-foreground">
      Real user testing insights.{' '}
      <span className="text-foreground/20 line-through decoration-1 decoration-foreground/10">Real user testing timelines.</span>{' '}
      <span className="font-medium text-foreground">AI makes it instant.</span>
    </h2>
  );
}

// ── Options config ──────────────────────────────────

const E_OPTIONS = [
  { id: 'E1', label: 'Original', component: E1 },
  { id: 'E2', label: 'Dash separator', component: E2 },
  { id: 'E3', label: 'Personas + real users', component: E3 },
  { id: 'E4', label: 'Quality. Speed.', component: E4 },
  { id: 'E5', label: 'Every issue', component: E5 },
];

const C_OPTIONS = [
  { id: 'C1', label: 'Original', component: C1 },
  { id: 'C2', label: 'Or just paste a URL', component: C2 },
  { id: 'C3', label: '$12k and 3 weeks', component: C3 },
  { id: 'C4', label: 'Hire. Write. Wait.', component: C4 },
  { id: 'C5', label: 'Insights not timelines', component: C5 },
];

export default function H2StylesDemo() {
  const [selectedE, setSelectedE] = useState('E1');
  const [selectedC, setSelectedC] = useState('C1');

  const EComponent = E_OPTIONS.find(o => o.id === selectedE)?.component ?? E1;
  const CComponent = C_OPTIONS.find(o => o.id === selectedC)?.component ?? C1;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-3">
        <p className="text-sm font-medium text-foreground/50">H2 Styles — Underline vs Strikethrough variations</p>
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-10">
        {/* ── Underline style (E) ── */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium text-foreground/30 uppercase tracking-wider mb-4">Style: Minimal underline</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {E_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedE(opt.id)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors',
                    selectedE === opt.id
                      ? 'border-foreground/20 bg-foreground/5 text-foreground'
                      : 'border-border text-foreground/40 hover:text-foreground/70',
                  )}
                >
                  {opt.id.slice(1)}: {opt.label}
                </button>
              ))}
            </div>

            {/* Active preview */}
            <div className="rounded-xl border border-border p-8" key={selectedE}>
              <h1 className="text-3xl font-bold tracking-tight">Mirror</h1>
              <EComponent />
            </div>
          </div>

          {/* All E at a glance */}
          <div className="grid gap-3">
            {E_OPTIONS.map(({ id, label, component: Comp }) => (
              <button
                key={id}
                onClick={() => setSelectedE(id)}
                className={cn(
                  'rounded-lg border p-5 text-left transition-colors',
                  selectedE === id ? 'border-foreground/20 bg-foreground/[0.02]' : 'border-border hover:border-foreground/10',
                )}
              >
                <p className="mb-1 text-[10px] font-medium text-foreground/25 uppercase">{id.slice(1)}: {label}</p>
                <h1 className="text-2xl font-bold tracking-tight">Mirror</h1>
                <Comp />
              </button>
            ))}
          </div>
        </div>

        {/* ── Strikethrough style (C) ── */}
        <div className="mt-16 space-y-6 border-t border-border pt-10">
          <div>
            <p className="text-xs font-medium text-foreground/30 uppercase tracking-wider mb-4">Style: Strikethrough contrast</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {C_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedC(opt.id)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors',
                    selectedC === opt.id
                      ? 'border-foreground/20 bg-foreground/5 text-foreground'
                      : 'border-border text-foreground/40 hover:text-foreground/70',
                  )}
                >
                  {opt.id.slice(1)}: {opt.label}
                </button>
              ))}
            </div>

            {/* Active preview */}
            <div className="rounded-xl border border-border p-8" key={selectedC}>
              <h1 className="text-3xl font-bold tracking-tight">Mirror</h1>
              <CComponent />
            </div>
          </div>

          {/* All C at a glance */}
          <div className="grid gap-3">
            {C_OPTIONS.map(({ id, label, component: Comp }) => (
              <button
                key={id}
                onClick={() => setSelectedC(id)}
                className={cn(
                  'rounded-lg border p-5 text-left transition-colors',
                  selectedC === id ? 'border-foreground/20 bg-foreground/[0.02]' : 'border-border hover:border-foreground/10',
                )}
              >
                <p className="mb-1 text-[10px] font-medium text-foreground/25 uppercase">{id.slice(1)}: {label}</p>
                <h1 className="text-2xl font-bold tracking-tight">Mirror</h1>
                <Comp />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
