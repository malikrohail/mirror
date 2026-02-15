'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Globe, Sparkles, Users, BarChart3, ArrowRight, Play, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── How It Works Steps ────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      icon: Globe,
      label: 'Paste your URL',
      desc: 'Enter your website and describe what to test',
    },
    {
      icon: Users,
      label: 'AI testers navigate',
      desc: 'Personas browse your site like real users',
    },
    {
      icon: BarChart3,
      label: 'Get your report',
      desc: 'Scores, issues, heatmaps, and recordings',
    },
  ];

  return (
    <div className="flex items-center justify-center gap-4">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/5">
              <step.icon className="h-4 w-4 text-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground/70">{step.label}</p>
              <p className="text-xs text-foreground/30">{step.desc}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight className="h-3.5 w-3.5 text-foreground/15 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Trust Badges ─────────────────────────────────────

function TrustBadges() {
  const badges = [
    { icon: Clock, label: '~5 min per test' },
    { icon: CheckCircle2, label: 'No setup required' },
    { icon: Sparkles, label: 'AI-powered analysis' },
  ];
  return (
    <div className="flex items-center justify-center gap-4">
      {badges.map((b, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 text-xs text-foreground/30">
          <b.icon className="h-3 w-3" />
          {b.label}
        </span>
      ))}
    </div>
  );
}

// ── Sample Result Card ──────────────────────────────

function SampleResultCard() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-[14px] uppercase text-foreground/30">What you&apos;ll get</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">72</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600/60">Okay</p>
            <p className="mt-1 text-xs text-foreground/30">Usability score</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground/70">14</p>
            <p className="mt-1 text-xs text-foreground/30">Issues found</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground/70">5</p>
            <p className="mt-1 text-xs text-foreground/30">Testers used</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
            <span className="text-foreground/60">Navigation menu not accessible via keyboard</span>
            <span className="ml-auto text-[10px] font-medium uppercase text-red-600">Critical</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-orange-50 dark:bg-orange-950/30 px-3 py-2 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
            <span className="text-foreground/60">CTA button has low contrast ratio (2.8:1)</span>
            <span className="ml-auto text-[10px] font-medium uppercase text-orange-600">Major</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 px-3 py-2 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
            <span className="text-foreground/60">Form labels missing for email input field</span>
            <span className="ml-auto text-[10px] font-medium uppercase text-yellow-600">Minor</span>
          </div>
        </div>
        <p className="text-xs text-foreground/20 text-center">Sample output from a real test</p>
      </div>
    </div>
  );
}

// ── Demo Options ────────────────────────────────────

const OPTIONS = [
  {
    id: 'A',
    title: 'Option A: How-it-works steps + trust badges',
    desc: 'Horizontal 3-step flow below the h2, plus trust signals near the CTA',
  },
  {
    id: 'B',
    title: 'Option B: Sample results preview',
    desc: 'Show a "What you\'ll get" card on the right column for first-time users',
  },
  {
    id: 'C',
    title: 'Option C: Try with example button',
    desc: 'Pre-fill button that loads a demo URL + task so users can see the flow',
  },
  {
    id: 'D',
    title: 'Option D: Combined (steps + sample + try)',
    desc: 'All three elements together',
  },
];

export default function OnboardingDemo() {
  const [selected, setSelected] = useState('D');

  return (
    <div className="min-h-screen bg-background">
      {/* Option picker */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 px-6 py-3">
          <p className="text-sm font-medium text-foreground/50 shrink-0">Onboarding demo:</p>
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm transition-colors',
                selected === opt.id
                  ? 'border-foreground/20 bg-foreground/5 text-foreground'
                  : 'border-border text-foreground/40 hover:text-foreground/70',
              )}
            >
              {opt.id}: {opt.title.split(': ')[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Simulated page */}
      <div className="border-b border-border bg-muted/10 px-6 py-2.5">
        <span className="text-sm text-foreground/30">Header bar area</span>
      </div>

      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold tracking-tight">Mirror</h1>
        <h2 className="mt-1 text-lg text-muted-foreground">
          Paste a URL. Get usability insights in minutes.
        </h2>
      </div>

      {/* Option A/D: How-it-works steps */}
      {(selected === 'A' || selected === 'D') && (
        <div className="px-6 pt-5">
          <HowItWorks />
        </div>
      )}

      <div className="grid min-h-full grid-cols-1 lg:grid-cols-[minmax(380px,1fr)_1.5fr] gap-4 px-6 pb-6 pt-4">
        {/* Left column — Quick Start placeholder */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-dashed border-border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-foreground/40" />
              <p className="text-base font-semibold">Quick Start</p>
            </div>
            <p className="text-sm text-foreground/40">Describe what you want to test and we will generate a plan for you.</p>

            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-sm text-foreground/50">Website URL</p>
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground/30">
                  <Globe className="h-4 w-4" />
                  example.com
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-sm text-foreground/50">Describe what you want to test...</p>
                <div className="rounded-md border border-border px-3 py-2 text-sm text-foreground/20 h-20">
                  e.g. I want to test if new users can easily find the pricing page...
                </div>
              </div>
            </div>

            {/* Option A/D: Trust badges */}
            {(selected === 'A' || selected === 'D') && (
              <TrustBadges />
            )}

            <Button className="w-full" size="lg">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Plan
            </Button>

            {/* Option C/D: Try with example */}
            {(selected === 'C' || selected === 'D') && (
              <button className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-sm text-foreground/40 transition-colors hover:border-foreground/20 hover:text-foreground/60">
                <Play className="h-3.5 w-3.5" />
                Try with an example
              </button>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="hidden lg:flex lg:flex-col gap-4">
          {/* Option B/D: Sample results card */}
          {(selected === 'B' || selected === 'D') && (
            <SampleResultCard />
          )}

          {/* Recent tests placeholder */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] uppercase text-foreground/30">Recent tests</h3>
                <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">0</span>
              </div>
            </div>
            <div className="py-8 text-center text-sm text-muted-foreground">
              Run your first test to see results here
            </div>
          </div>

          {/* Available testers placeholder */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] uppercase text-foreground/30">Available testers</h3>
                <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">27</span>
              </div>
              <span className="text-xs text-foreground/50">See all &rarr;</span>
            </div>
            <div className="divide-y divide-border/50 px-2 py-1">
              {['Cognitive Disability User', 'Color Blind User', 'Low Vision User'].map((name) => (
                <div key={name} className="flex items-center gap-2.5 px-2 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-base">
                    {name === 'Cognitive Disability User' ? '🧠' : name === 'Color Blind User' ? '👁️' : '🔍'}
                  </span>
                  <div>
                    <p className="text-[14px] text-foreground/70">{name}</p>
                    <p className="text-[14px] text-foreground/30">Description placeholder</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
