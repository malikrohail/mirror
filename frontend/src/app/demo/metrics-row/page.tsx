'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/* ─── sample data ─── */
const data = {
  task: 'Open a pro account',
  website: 'claude.com/pricing',
  overview:
    "All three personas completely failed to open a Pro account on claude.com/pricing. Two critical issues emerged: first, the pricing page's CTA button language was unclear or ambiguous (affecting 2 of 3 personas), and second, Cloudflare security verification blocked automated navigation. All three personas ended in a frustrated emotional state. This represents a fundamental conversion funnel problem.",
  score: 32,
  issues: 5,
  completion: 0,
  mood: 'Frustrated',
}

function scoreColor(score: number) {
  if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500' }
  if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-500' }
  return { text: 'text-red-600', bg: 'bg-red-500' }
}

function scoreLabel(score: number) {
  if (score >= 90) return 'Great'
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Okay'
  if (score >= 40) return 'Poor'
  return 'Critical'
}

/* ─── shared context wrapper (variant 4 layout) ─── */
function ContextWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-6 items-start">
      {/* Big score */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-border p-5 min-w-[100px]">
        <span className={cn('text-4xl font-bold tabular-nums', scoreColor(data.score).text)}>
          {data.score}
        </span>
        <span className={cn('text-xs font-medium uppercase tracking-wider mt-1', scoreColor(data.score).text)}>
          {scoreLabel(data.score)}
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 space-y-3">
        <div>
          <p className="text-[16px] text-foreground">{data.task}</p>
          <p className="text-[14px] text-foreground/50 mt-0.5">{data.website}</p>
        </div>
        <p className="text-[14px] text-foreground/70 leading-relaxed">{data.overview}</p>

        {/* The metrics row variant goes here */}
        {children}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 1 — Current: inline with pipe separators                 */
/* ══════════════════════════════════════════════════════════════════ */
function V1() {
  return (
    <div className="flex items-center gap-5 text-[14px]">
      <span>
        <span className="font-medium text-foreground">{data.issues}</span>
        <span className="text-foreground/30"> issues found</span>
      </span>
      <span className="text-foreground/30">|</span>
      <span>
        <span className="font-medium text-foreground">{data.completion}%</span>
        <span className="text-foreground/30"> task completion</span>
      </span>
      <span className="text-foreground/30">|</span>
      <span>
        <span className="font-medium text-foreground">{data.mood}</span>
        <span className="text-foreground/30"> overall mood</span>
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 2 — Dot separators, label first                         */
/* ══════════════════════════════════════════════════════════════════ */
function V2() {
  return (
    <div className="flex items-center gap-3 text-[14px]">
      <span>
        <span className="text-foreground/40">Issues</span>
        <span className="font-medium text-foreground ml-1.5">{data.issues}</span>
      </span>
      <span className="text-foreground/20">·</span>
      <span>
        <span className="text-foreground/40">Completion</span>
        <span className="font-medium text-foreground ml-1.5">{data.completion}%</span>
      </span>
      <span className="text-foreground/20">·</span>
      <span>
        <span className="text-foreground/40">Mood</span>
        <span className="font-medium text-foreground ml-1.5">{data.mood}</span>
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 3 — Mini cards / chips                                   */
/* ══════════════════════════════════════════════════════════════════ */
function V3() {
  return (
    <div className="flex items-center gap-2">
      {[
        { label: 'Issues', value: String(data.issues) },
        { label: 'Completion', value: `${data.completion}%` },
        { label: 'Mood', value: data.mood },
      ].map((m) => (
        <div key={m.label} className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1">
          <span className="text-[13px] font-medium text-foreground">{m.value}</span>
          <span className="text-[11px] text-foreground/30">{m.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 4 — Three mini bordered cards in a row                   */
/* ══════════════════════════════════════════════════════════════════ */
function V4() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'Issues found', value: String(data.issues) },
        { label: 'Task completion', value: `${data.completion}%` },
        { label: 'Overall mood', value: data.mood },
      ].map((m) => (
        <div key={m.label} className="rounded-lg border border-border px-3 py-2.5">
          <p className="text-[11px] text-foreground/30">{m.label}</p>
          <p className="text-[14px] font-medium text-foreground mt-0.5">{m.value}</p>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 5 — Slash-separated, all one weight                     */
/* ══════════════════════════════════════════════════════════════════ */
function V5() {
  return (
    <p className="text-[14px] text-foreground/50">
      {data.issues} issues / {data.completion}% completion / {data.mood}
    </p>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 6 — Stacked labels above values                         */
/* ══════════════════════════════════════════════════════════════════ */
function V6() {
  return (
    <div className="flex items-start gap-8">
      {[
        { label: 'Issues', value: String(data.issues) },
        { label: 'Completion', value: `${data.completion}%` },
        { label: 'Mood', value: data.mood },
      ].map((m) => (
        <div key={m.label}>
          <p className="text-[11px] text-foreground/30 uppercase tracking-wider">{m.label}</p>
          <p className="text-[14px] font-medium text-foreground mt-0.5">{m.value}</p>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 7 — Pills with colored accents                          */
/* ══════════════════════════════════════════════════════════════════ */
function V7() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center rounded-full bg-foreground/5 ring-1 ring-foreground/10 px-3 py-0.5 text-[13px]">
        <span className="font-medium text-foreground">{data.issues}</span>
        <span className="text-foreground/30 ml-1">issues</span>
      </span>
      <span className="inline-flex items-center rounded-full bg-foreground/5 ring-1 ring-foreground/10 px-3 py-0.5 text-[13px]">
        <span className="font-medium text-foreground">{data.completion}%</span>
        <span className="text-foreground/30 ml-1">completion</span>
      </span>
      <span className="inline-flex items-center rounded-full bg-foreground/5 ring-1 ring-foreground/10 px-3 py-0.5 text-[13px]">
        <span className="font-medium text-foreground">{data.mood}</span>
        <span className="text-foreground/30 ml-1">mood</span>
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 8 — Thin divider line with values above labels           */
/* ══════════════════════════════════════════════════════════════════ */
function V8() {
  return (
    <div className="border-t border-border pt-3 mt-1">
      <div className="flex items-center gap-8">
        {[
          { label: 'Issues found', value: String(data.issues) },
          { label: 'Task completion', value: `${data.completion}%` },
          { label: 'Overall mood', value: data.mood },
        ].map((m) => (
          <div key={m.label} className="flex items-baseline gap-1.5">
            <span className="text-[14px] font-medium text-foreground">{m.value}</span>
            <span className="text-[13px] text-foreground/30">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 9 — Compact sentence form                               */
/* ══════════════════════════════════════════════════════════════════ */
function V9() {
  return (
    <p className="text-[14px] text-foreground/40">
      <span className="font-medium text-foreground">{data.issues}</span> issues found,{' '}
      <span className="font-medium text-foreground">{data.completion}%</span> task completion,{' '}
      <span className="font-medium text-foreground">{data.mood.toLowerCase()}</span> overall mood
    </p>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 10 — Inline with em dash separators, value only bold     */
/* ══════════════════════════════════════════════════════════════════ */
function V10() {
  return (
    <div className="flex items-center gap-4 text-[14px] text-foreground/30">
      <span><span className="font-medium text-foreground">{data.issues}</span> issues</span>
      <span>—</span>
      <span><span className="font-medium text-foreground">{data.completion}%</span> completed</span>
      <span>—</span>
      <span><span className="font-medium text-foreground">{data.mood}</span> mood</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  PAGE                                                             */
/* ══════════════════════════════════════════════════════════════════ */
const variants = [
  { id: 1, name: 'Pipe separators (current)', component: V1 },
  { id: 2, name: 'Dot separators, label first', component: V2 },
  { id: 3, name: 'Mini chips, value then label', component: V3 },
  { id: 4, name: 'Three bordered mini cards', component: V4 },
  { id: 5, name: 'Slash-separated, single weight', component: V5 },
  { id: 6, name: 'Stacked: label above value', component: V6 },
  { id: 7, name: 'Outlined pills', component: V7 },
  { id: 8, name: 'Divider line + inline metrics', component: V8 },
  { id: 9, name: 'Sentence form', component: V9 },
  { id: 10, name: 'Em dash separators', component: V10 },
]

export default function MetricsRowDemoPage() {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Metrics Row — 10 Variants</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Each variant shown within the chosen layout. Click a number to isolate.
        </p>
      </div>

      <div className="space-y-8">
        {variants
          .filter((v) => selected === null || selected === v.id)
          .map((v) => (
            <div key={v.id}>
              <button
                onClick={() => setSelected(selected === v.id ? null : v.id)}
                className="flex items-center gap-2 mb-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-bold">
                  {v.id}
                </span>
                <span className="uppercase tracking-wider font-medium">{v.name}</span>
              </button>

              <div className="rounded-xl border border-border bg-background p-6">
                <ContextWrapper>
                  <v.component />
                </ContextWrapper>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
