'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/* ─── sample data ─── */
const data = {
  website: 'google.com',
  task: 'Find out lebrons age',
  overview:
    "James completed the task of finding LeBron's age on Google.com efficiently in 6 steps with no reported issues. The user maintained high confidence throughout the journey, demonstrating that Google's search functionality worked as intended for this straightforward information retrieval task. With only one persona tested and zero issues identified, this represents a limited data set that prevents comprehensive usability analysis across diverse user groups.",
  score: 95,
  issues: 0,
  completion: 100,
  mood: 'Delighted',
}

function scoreColor(score: number) {
  if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', ring: 'ring-emerald-500/20' }
  if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-500', ring: 'ring-amber-500/20' }
  return { text: 'text-red-600', bg: 'bg-red-500', ring: 'ring-red-500/20' }
}

function scoreLabel(score: number) {
  if (score >= 90) return 'Great'
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Okay'
  if (score >= 40) return 'Poor'
  return 'Critical'
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 1 — Inline metadata row + card metrics                   */
/* ══════════════════════════════════════════════════════════════════ */
function Variant1() {
  return (
    <div className="space-y-5">
      {/* Inline meta */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{data.website}</span>
        <span className="text-muted-foreground/40">/</span>
        <span>{data.task}</span>
      </div>

      {/* Overview as body text */}
      <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
        {data.overview}
      </p>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Overall score', value: data.score, suffix: scoreLabel(data.score), color: scoreColor(data.score).text },
          { label: 'Issues found', value: data.issues || '—' },
          { label: 'Task completion', value: `${data.completion}%` },
          { label: 'Average mood', value: data.mood },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={cn('text-2xl font-semibold tabular-nums', m.color)}>{m.value}</span>
              {m.suffix && <span className={cn('text-xs font-medium uppercase tracking-wide opacity-60', m.color)}>{m.suffix}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 2 — Two-column: left summary, right metrics              */
/* ══════════════════════════════════════════════════════════════════ */
function Variant2() {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-8 items-start">
      {/* Left — summary */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{data.website}</h2>
          <span className="rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground">{data.task}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>
      </div>

      {/* Right — stacked metrics */}
      <div className="grid grid-cols-2 gap-3 min-w-[280px]">
        <div className="rounded-lg border border-border p-3 text-center">
          <span className={cn('text-3xl font-bold tabular-nums', scoreColor(data.score).text)}>{data.score}</span>
          <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wide">{scoreLabel(data.score)}</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <span className="text-3xl font-bold tabular-nums">{data.issues || '—'}</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Issues</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <span className="text-3xl font-bold tabular-nums">{data.completion}%</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Completion</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <span className="text-xl font-bold">{data.mood}</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Mood</p>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 3 — Horizontal dividers, no cards                       */
/* ══════════════════════════════════════════════════════════════════ */
function Variant3() {
  return (
    <div className="space-y-0 divide-y divide-border">
      {/* Row 1: website + task + metrics inline */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">{data.website}</span>
          <span className="text-sm text-muted-foreground">{data.task}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className={cn('text-xl font-semibold tabular-nums', scoreColor(data.score).text)}>{data.score}</span>
            <span className={cn('ml-1.5 text-xs uppercase', scoreColor(data.score).text)}>{scoreLabel(data.score)}</span>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">{data.issues} issues</span>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">{data.completion}% completed</span>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">{data.mood}</span>
          </div>
        </div>
      </div>

      {/* Row 2: overview */}
      <div className="py-4">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-4xl">{data.overview}</p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 4 — Big score hero + compact details                    */
/* ══════════════════════════════════════════════════════════════════ */
function Variant4() {
  return (
    <div className="flex gap-6 items-start">
      {/* Big score */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-border p-5 min-w-[100px]">
        <span className={cn('text-4xl font-bold tabular-nums', scoreColor(data.score).text)}>{data.score}</span>
        <span className={cn('text-xs font-medium uppercase tracking-wider mt-1', scoreColor(data.score).text)}>{scoreLabel(data.score)}</span>
      </div>

      {/* Details */}
      <div className="flex-1 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{data.task}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{data.website}</p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <span>{data.issues} issues found</span>
          <span className="text-muted-foreground/30">|</span>
          <span>{data.completion}% task completion</span>
          <span className="text-muted-foreground/30">|</span>
          <span>Mood: {data.mood}</span>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 5 — Definition list style (label : value inline)        */
/* ══════════════════════════════════════════════════════════════════ */
function Variant5() {
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground font-medium">Website</dt>
        <dd className="text-foreground">{data.website}</dd>

        <dt className="text-muted-foreground font-medium">Task</dt>
        <dd className="text-foreground">{data.task}</dd>

        <dt className="text-muted-foreground font-medium self-start">Overview</dt>
        <dd className="text-foreground/80 leading-relaxed">{data.overview}</dd>
      </dl>

      <div className="border-t border-border pt-3">
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground">Score</span>
            <span className={cn('text-lg font-semibold tabular-nums', scoreColor(data.score).text)}>{data.score}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground">Issues</span>
            <span className="text-lg font-semibold tabular-nums">{data.issues || '—'}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground">Completion</span>
            <span className="text-lg font-semibold tabular-nums">{data.completion}%</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground">Mood</span>
            <span className="text-lg font-semibold">{data.mood}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 6 — Pill badges + condensed                             */
/* ══════════════════════════════════════════════════════════════════ */
function Variant6() {
  return (
    <div className="space-y-4">
      {/* Header with pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
          {data.website}
        </span>
        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {data.task}
        </span>
        <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', scoreColor(data.score).text, scoreColor(data.score).ring, 'ring-2 bg-emerald-500/5')}>
          {data.score} {scoreLabel(data.score)}
        </span>
        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {data.issues} issues
        </span>
        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {data.completion}% completed
        </span>
        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {data.mood}
        </span>
      </div>

      {/* Overview */}
      <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{data.overview}</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 7 — Single-row compact bar                              */
/* ══════════════════════════════════════════════════════════════════ */
function Variant7() {
  return (
    <div className="space-y-4">
      {/* Compact top bar */}
      <div className="flex items-center gap-4 rounded-lg bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground shrink-0">{data.website}</span>
          <svg className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          <span className="text-sm text-muted-foreground truncate">{data.task}</span>
        </div>

        <div className="flex items-center gap-4 shrink-0 border-l border-border pl-4">
          <div className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', scoreColor(data.score).bg)} />
            <span className="text-sm font-semibold tabular-nums">{data.score}</span>
          </div>
          <span className="text-xs text-muted-foreground">{data.issues} issues</span>
          <span className="text-xs text-muted-foreground">{data.completion}%</span>
          <span className="text-xs text-muted-foreground">{data.mood}</span>
        </div>
      </div>

      {/* Overview below */}
      <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{data.overview}</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 8 — Card with header stripe + content                   */
/* ══════════════════════════════════════════════════════════════════ */
function Variant8() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Top stripe */}
      <div className="flex items-center justify-between bg-muted/40 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">{data.website}</h2>
          <span className="text-sm text-muted-foreground">{data.task}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn('w-2.5 h-2.5 rounded-full', scoreColor(data.score).bg)} />
          <span className={cn('text-sm font-bold tabular-nums', scoreColor(data.score).text)}>{data.score}</span>
          <span className={cn('text-xs uppercase', scoreColor(data.score).text)}>{scoreLabel(data.score)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Issues:</span>{' '}
            <span className="font-medium text-foreground">{data.issues || 'None'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Completion:</span>{' '}
            <span className="font-medium text-foreground">{data.completion}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Mood:</span>{' '}
            <span className="font-medium text-foreground">{data.mood}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 9 — Left border accent + flat layout                    */
/* ══════════════════════════════════════════════════════════════════ */
function Variant9() {
  return (
    <div className={cn('border-l-[3px] pl-5 space-y-3', scoreColor(data.score).text.replace('text-', 'border-'))}>
      <div className="flex items-baseline gap-3">
        <h2 className="text-base font-semibold text-foreground">{data.task}</h2>
        <span className="text-xs text-muted-foreground">on {data.website}</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{data.overview}</p>

      <div className="flex items-center gap-4 pt-1">
        <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1">
          <span className={cn('text-base font-bold tabular-nums', scoreColor(data.score).text)}>{data.score}</span>
          <span className="text-[10px] text-muted-foreground uppercase">{scoreLabel(data.score)}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1">
          <span className="text-base font-bold tabular-nums">{data.issues || '—'}</span>
          <span className="text-[10px] text-muted-foreground uppercase">issues</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1">
          <span className="text-base font-bold tabular-nums">{data.completion}%</span>
          <span className="text-[10px] text-muted-foreground uppercase">completion</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1">
          <span className="text-base font-bold">{data.mood}</span>
          <span className="text-[10px] text-muted-foreground uppercase">mood</span>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 10 — Minimal: task as heading, everything else subdued   */
/* ══════════════════════════════════════════════════════════════════ */
function Variant10() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{data.task}</h2>
        <p className="text-xs text-muted-foreground mt-1">Tested on {data.website}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold', scoreColor(data.score).text, scoreColor(data.score).ring, 'ring-1 bg-emerald-500/5')}>
          {data.score}/100
        </div>
        <span className="text-xs text-muted-foreground">{data.issues} issues</span>
        <span className="text-xs text-muted-foreground/30">·</span>
        <span className="text-xs text-muted-foreground">{data.completion}% completion</span>
        <span className="text-xs text-muted-foreground/30">·</span>
        <span className="text-xs text-muted-foreground">{data.mood}</span>
      </div>

      <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-3xl">{data.overview}</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  PAGE                                                             */
/* ══════════════════════════════════════════════════════════════════ */
const variants = [
  { id: 1, name: 'Inline meta + card metrics', component: Variant1 },
  { id: 2, name: 'Two-column: summary | metrics', component: Variant2 },
  { id: 3, name: 'Horizontal dividers, no cards', component: Variant3 },
  { id: 4, name: 'Big score hero + compact details', component: Variant4 },
  { id: 5, name: 'Definition list (label : value)', component: Variant5 },
  { id: 6, name: 'Pill badges + condensed', component: Variant6 },
  { id: 7, name: 'Single-row compact bar', component: Variant7 },
  { id: 8, name: 'Card with header stripe', component: Variant8 },
  { id: 9, name: 'Left border accent + flat', component: Variant9 },
  { id: 10, name: 'Minimal: task as heading', component: Variant10 },
]

export default function StudyHeaderDemoPage() {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Study Header — 10 Variants</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Click a variant number to view it in isolation. Click again to show all.
        </p>
      </div>

      <div className="space-y-8">
        {variants
          .filter((v) => selected === null || selected === v.id)
          .map((v) => (
            <div key={v.id} className="group">
              {/* Label */}
              <button
                onClick={() => setSelected(selected === v.id ? null : v.id)}
                className="flex items-center gap-2 mb-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-bold">
                  {v.id}
                </span>
                <span className="uppercase tracking-wider font-medium">{v.name}</span>
              </button>

              {/* Variant content in a bordered container */}
              <div className="rounded-xl border border-border bg-background p-6">
                <v.component />
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
