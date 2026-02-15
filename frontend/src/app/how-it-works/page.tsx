'use client';

import { HelpCircle, Globe, Eye, BarChart3, Users, Clock, Cpu } from 'lucide-react';
import { PageHeaderBar } from '@/components/layout/page-header-bar';

const steps = [
  {
    number: '01',
    title: 'Describe your test',
    icon: Globe,
    bullets: [
      'Paste the URL of the site you want to test',
      'Describe the task you want testers to complete (e.g. "Find the pricing page and sign up for a free trial")',
      'Select AI testers from the library or create your own',
    ],
  },
  {
    number: '02',
    title: 'Watch AI testers navigate',
    icon: Eye,
    bullets: [
      'Each tester has its own personality, preferences, and devices',
      'Each tester opens a real browser and navigates your site like a real user',
      'They think aloud, react emotionally, and flag UX issues as they go',
      'Watch live via browser streams and a step-by-step timeline',
      'Multiple testers run in parallel, no waiting',
    ],
  },
  {
    number: '03',
    title: 'Get actionable results',
    icon: BarChart3,
    bullets: [
      'Overall UX score with per-tester breakdowns',
      'Issues ranked by severity: critical, major, minor',
      'Click heatmaps showing where users focused',
      'Session replays with think-aloud narration',
      'Exportable report to share with your team, human or AI',
    ],
  },
];

const facts = [
  { icon: Users, label: 'Up to 5 testers in parallel' },
  { icon: Clock, label: 'Results in 1–2 minutes' },
  { icon: Cpu, label: 'Powered by Claude Opus 4.6' },
];

export default function HowItWorksPage() {
  return (
    <div>
      <PageHeaderBar icon={HelpCircle} title="How it works" />

      <div className="px-[100px] pt-[40px] pb-[100px]">
        {/* Hero */}
        <h1
          className="text-3xl tracking-tight text-foreground"
          style={{ fontFamily: '"Red Hat Display", sans-serif', fontWeight: 500 }}
        >
          How miror works
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-foreground/50">
          AI testers with distinct personalities navigate your site and find UX issues in minutes, not weeks.
          Paste a URL, pick testers, and get a full audit with scores, heatmaps, and session replays.
        </p>

        {/* Steps */}
        <div className="mt-10 flex flex-col gap-5">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-border bg-card"
            >
              <div className="flex h-[42px] items-center gap-3 border-b border-border bg-muted/30 px-4">
                <span className="font-mono text-[11px] uppercase tracking-wider text-foreground/30">
                  Step {step.number}
                </span>
                <step.icon className="h-3.5 w-3.5 text-foreground/30" />
                <span className="text-[14px] text-foreground/80">{step.title}</span>
              </div>
              <div className="px-5 py-4">
                <ul className="flex flex-col gap-2">
                  {step.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] text-foreground/70">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/20" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom facts */}
        <div className="mt-10 -mx-[100px] flex items-center justify-center gap-8 border-y border-border bg-muted/30 px-[100px] py-4">
          {facts.map((fact, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className="mr-6 h-4 w-px bg-foreground/10" />}
              <fact.icon className="h-3.5 w-3.5 text-foreground/30" />
              <span className="text-[13px] text-foreground/50">{fact.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
