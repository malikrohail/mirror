'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/* ─── sample data ─── */
const issues = [
  { id: '1', severity: 'critical' as const, title: 'CTA button leads to wrong page', page: '/pricing', persona: 'Sarah', recommendation: 'Update the CTA link to point to the actual signup flow instead of the docs page.' },
  { id: '2', severity: 'critical' as const, title: 'Cloudflare verification blocks navigation', page: '/signup', persona: 'All', recommendation: 'Implement a fallback or skip mechanism for automated security challenges during signup.' },
  { id: '3', severity: 'major' as const, title: 'Pricing toggle unclear between monthly/annual', page: '/pricing', persona: 'James', recommendation: 'Add clearer visual distinction and labels for the billing period toggle.' },
  { id: '4', severity: 'major' as const, title: 'No confirmation after clicking "Get Started"', page: '/pricing', persona: 'Sarah', recommendation: 'Add loading state or confirmation feedback when the user clicks the primary CTA.' },
  { id: '5', severity: 'minor' as const, title: 'Feature comparison table hard to scan on mobile', page: '/pricing', persona: 'Alex', recommendation: 'Consider a stacked card layout for plan comparison on smaller viewports.' },
]

const reportMd = `# Usability Test Report: Claude.com Pricing Page

*Generated on 2026-02-14 09:59 UTC*

**Overall UX Score: 32/100 (Critical)**

## Executive Summary

This report presents the findings from an AI-powered usability test conducted on the Claude.com pricing page. Three diverse personas were tasked with a single, high-stakes objective: open a Pro account. The results are severe — all three personas completely failed to complete the task.

## Critical Issues

### 1. CTA Button Misdirection
The primary call-to-action on the pricing page does not lead to the expected signup flow. Two of three personas clicked "Get Started" and were redirected to documentation instead of an account creation page.

### 2. Security Verification Blocking
Cloudflare's security verification consistently blocked automated navigation attempts during the signup process, preventing task completion for all personas.

## Recommendations

1. **Immediate**: Fix the CTA button link to point to the correct signup URL
2. **Short-term**: Add clear visual feedback when users interact with pricing CTAs
3. **Medium-term**: Redesign the pricing page with a more direct conversion funnel`

const severityColor = (s: string) => {
  if (s === 'critical') return 'bg-red-500'
  if (s === 'major') return 'bg-amber-500'
  return 'bg-blue-400'
}

const severityLabel = (s: string) => {
  if (s === 'critical') return 'Critical'
  if (s === 'major') return 'Major'
  return 'Minor'
}

/* ─── Shared mini components ─── */
function IssueRow({ issue, compact }: { issue: typeof issues[0]; compact?: boolean }) {
  return (
    <div className={cn('flex items-start gap-3', compact ? 'py-2' : 'py-3')}>
      <div className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', severityColor(issue.severity))} />
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-foreground', compact ? 'text-[13px]' : 'text-[14px]')}>{issue.title}</p>
        <p className={cn('text-foreground/40 mt-0.5', compact ? 'text-[11px]' : 'text-[12px]')}>
          {issue.page} · {issue.persona}
        </p>
        {!compact && (
          <p className="text-[12px] text-foreground/50 mt-1">{issue.recommendation}</p>
        )}
      </div>
    </div>
  )
}

function ShareBar() {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <button className="flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 font-medium hover:bg-foreground/90 transition-colors">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
        Share with dev
      </button>
      <button className="rounded-md border border-border px-3 py-1.5 text-foreground/50 hover:text-foreground transition-colors">
        Copy markdown
      </button>
      <button className="rounded-md border border-border px-3 py-1.5 text-foreground/50 hover:text-foreground transition-colors">
        Export PDF
      </button>
    </div>
  )
}

function TabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex items-center gap-0 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            'px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px',
            active === t ? 'border-foreground text-foreground' : 'border-transparent text-foreground/40 hover:text-foreground/60'
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 1 — Current: separate Issues + Report tabs               */
/* ══════════════════════════════════════════════════════════════════ */
function V1() {
  const [tab, setTab] = useState('Issues')
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <TabBar tabs={['Issues', 'Replay', 'Heatmap', 'Report']} active={tab} onChange={setTab} />
      <div className="h-[320px] overflow-y-auto">
        {tab === 'Issues' && (
          <div className="p-4 space-y-0 divide-y divide-border">
            {issues.map((i) => <IssueRow key={i.id} issue={i} />)}
          </div>
        )}
        {tab === 'Report' && (
          <div className="p-4 text-[13px] text-foreground/70 leading-relaxed whitespace-pre-line">
            <ShareBar />
            <div className="mt-4 border-t border-border pt-4">
              {reportMd.slice(0, 600)}...
            </div>
          </div>
        )}
        {tab !== 'Issues' && tab !== 'Report' && (
          <div className="flex h-full items-center justify-center text-[13px] text-foreground/30">{tab} content</div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 2 — Merged: Issues on top, report below (single scroll)  */
/* ══════════════════════════════════════════════════════════════════ */
function V2() {
  const [tab, setTab] = useState('Findings')
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <TabBar tabs={['Findings', 'Replay', 'Heatmap']} active={tab} onChange={setTab} />
      <div className="h-[320px] overflow-y-auto">
        {tab === 'Findings' && (
          <div>
            {/* Share actions */}
            <div className="px-4 py-2.5 border-b border-border">
              <ShareBar />
            </div>
            {/* Issues section */}
            <div className="px-4 pt-3">
              <p className="text-[11px] uppercase tracking-wider text-foreground/30 mb-2">Issues ({issues.length})</p>
              <div className="divide-y divide-border">
                {issues.map((i) => <IssueRow key={i.id} issue={i} compact />)}
              </div>
            </div>
            {/* Report section */}
            <div className="px-4 pt-4 pb-4 mt-2 border-t border-border">
              <p className="text-[11px] uppercase tracking-wider text-foreground/30 mb-2">Full Report</p>
              <div className="text-[13px] text-foreground/60 leading-relaxed whitespace-pre-line">
                {reportMd.slice(0, 400)}...
              </div>
            </div>
          </div>
        )}
        {tab !== 'Findings' && (
          <div className="flex h-full items-center justify-center text-[13px] text-foreground/30">{tab} content</div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 3 — Issues tab with inline "View full report" toggle     */
/* ══════════════════════════════════════════════════════════════════ */
function V3() {
  const [tab, setTab] = useState('Issues')
  const [showReport, setShowReport] = useState(false)
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <TabBar tabs={['Issues', 'Replay', 'Heatmap']} active={tab} onChange={setTab} />
      <div className="h-[320px] overflow-y-auto">
        {tab === 'Issues' && (
          <div>
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <ShareBar />
            </div>
            {!showReport ? (
              <div className="p-4">
                <div className="divide-y divide-border">
                  {issues.map((i) => <IssueRow key={i.id} issue={i} />)}
                </div>
                <button
                  onClick={() => setShowReport(true)}
                  className="mt-4 w-full rounded-md border border-dashed border-border py-2.5 text-[13px] text-foreground/40 hover:text-foreground/60 hover:border-foreground/20 transition-colors"
                >
                  View full report
                </button>
              </div>
            ) : (
              <div className="p-4">
                <button
                  onClick={() => setShowReport(false)}
                  className="text-[12px] text-foreground/40 hover:text-foreground mb-3 flex items-center gap-1"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  Back to issues
                </button>
                <div className="text-[13px] text-foreground/60 leading-relaxed whitespace-pre-line">
                  {reportMd.slice(0, 600)}...
                </div>
              </div>
            )}
          </div>
        )}
        {tab !== 'Issues' && (
          <div className="flex h-full items-center justify-center text-[13px] text-foreground/30">{tab} content</div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 4 — Sub-tabs: Issues as cards, Report as sub-tab         */
/* ══════════════════════════════════════════════════════════════════ */
function V4() {
  const [tab, setTab] = useState('Results')
  const [sub, setSub] = useState('issues')
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <TabBar tabs={['Results', 'Replay', 'Heatmap']} active={tab} onChange={setTab} />
      <div className="h-[320px] overflow-y-auto">
        {tab === 'Results' && (
          <div>
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-1">
                {['issues', 'report'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSub(s)}
                    className={cn(
                      'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                      sub === s ? 'bg-foreground/10 text-foreground' : 'text-foreground/40 hover:text-foreground/60'
                    )}
                  >
                    {s === 'issues' ? `Issues (${issues.length})` : 'Full report'}
                  </button>
                ))}
              </div>
              <ShareBar />
            </div>
            <div className="p-4">
              {sub === 'issues' ? (
                <div className="divide-y divide-border">
                  {issues.map((i) => <IssueRow key={i.id} issue={i} />)}
                </div>
              ) : (
                <div className="text-[13px] text-foreground/60 leading-relaxed whitespace-pre-line">
                  {reportMd.slice(0, 600)}...
                </div>
              )}
            </div>
          </div>
        )}
        {tab !== 'Results' && (
          <div className="flex h-full items-center justify-center text-[13px] text-foreground/30">{tab} content</div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 5 — Issues with expandable recommendations + share each  */
/* ══════════════════════════════════════════════════════════════════ */
function V5() {
  const [tab, setTab] = useState('Issues')
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <TabBar tabs={['Issues', 'Replay', 'Heatmap']} active={tab} onChange={setTab} />
      <div className="h-[320px] overflow-y-auto">
        {tab === 'Issues' && (
          <div>
            <div className="px-4 py-2.5 border-b border-border">
              <ShareBar />
            </div>
            <div className="p-4 space-y-2">
              {issues.map((i) => (
                <div key={i.id} className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === i.id ? null : i.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className={cn('h-2 w-2 rounded-full shrink-0', severityColor(i.severity))} />
                    <span className="text-[13px] font-medium text-foreground flex-1">{i.title}</span>
                    <span className="text-[11px] text-foreground/30">{i.page}</span>
                    <svg className={cn('h-3.5 w-3.5 text-foreground/30 transition-transform', expanded === i.id && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {expanded === i.id && (
                    <div className="px-3 pb-3 border-t border-border pt-2">
                      <p className="text-[12px] text-foreground/50 mb-2">{i.recommendation}</p>
                      <button className="text-[11px] text-foreground/40 hover:text-foreground flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        Copy as ticket
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {tab !== 'Issues' && (
          <div className="flex h-full items-center justify-center text-[13px] text-foreground/30">{tab} content</div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 6 — Two-column: issues left, report right               */
/* ══════════════════════════════════════════════════════════════════ */
function V6() {
  const [tab, setTab] = useState('Findings')
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4">
        <TabBar tabs={['Findings', 'Replay', 'Heatmap']} active={tab} onChange={setTab} />
      </div>
      <div className="h-[320px]">
        {tab === 'Findings' ? (
          <div className="flex h-full">
            {/* Left: issues */}
            <div className="w-1/2 border-r border-border overflow-y-auto p-3">
              <p className="text-[11px] uppercase tracking-wider text-foreground/30 mb-2">Issues ({issues.length})</p>
              <div className="divide-y divide-border">
                {issues.map((i) => <IssueRow key={i.id} issue={i} compact />)}
              </div>
            </div>
            {/* Right: report */}
            <div className="w-1/2 overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase tracking-wider text-foreground/30">Report</p>
                <ShareBar />
              </div>
              <div className="text-[13px] text-foreground/60 leading-relaxed whitespace-pre-line">
                {reportMd.slice(0, 500)}...
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-foreground/30">{tab} content</div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 7 — Issue-first: each issue is a section with context    */
/* ══════════════════════════════════════════════════════════════════ */
function V7() {
  const [tab, setTab] = useState('Findings')
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <TabBar tabs={['Findings', 'Replay', 'Heatmap']} active={tab} onChange={setTab} />
      <div className="h-[320px] overflow-y-auto">
        {tab === 'Findings' && (
          <div>
            <div className="px-4 py-2.5 border-b border-border">
              <ShareBar />
            </div>
            <div className="p-4 space-y-4">
              {issues.map((i, idx) => (
                <div key={i.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-foreground/25">{idx + 1}</span>
                    <div className={cn('h-1.5 w-1.5 rounded-full', severityColor(i.severity))} />
                    <span className="text-[11px] uppercase tracking-wider text-foreground/30">{severityLabel(i.severity)}</span>
                  </div>
                  <p className="text-[14px] font-medium text-foreground">{i.title}</p>
                  <p className="text-[12px] text-foreground/50">{i.recommendation}</p>
                  <p className="text-[11px] text-foreground/30">{i.page} · Affected: {i.persona}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab !== 'Findings' && (
          <div className="flex h-full items-center justify-center text-[13px] text-foreground/30">{tab} content</div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 8 — Grouped by severity with counts                     */
/* ══════════════════════════════════════════════════════════════════ */
function V8() {
  const [tab, setTab] = useState('Findings')
  const grouped = {
    critical: issues.filter((i) => i.severity === 'critical'),
    major: issues.filter((i) => i.severity === 'major'),
    minor: issues.filter((i) => i.severity === 'minor'),
  }
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <TabBar tabs={['Findings', 'Replay', 'Heatmap']} active={tab} onChange={setTab} />
      <div className="h-[320px] overflow-y-auto">
        {tab === 'Findings' && (
          <div>
            <div className="px-4 py-2.5 border-b border-border">
              <ShareBar />
            </div>
            <div className="p-4 space-y-4">
              {(['critical', 'major', 'minor'] as const).map((sev) => {
                const items = grouped[sev]
                if (items.length === 0) return null
                return (
                  <div key={sev}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn('h-2 w-2 rounded-full', severityColor(sev))} />
                      <span className="text-[12px] font-medium text-foreground">{severityLabel(sev)}</span>
                      <span className="text-[11px] text-foreground/30">{items.length}</span>
                    </div>
                    <div className="space-y-1 pl-4">
                      {items.map((i) => (
                        <div key={i.id} className="flex items-start gap-2 py-1.5">
                          <div className="flex-1">
                            <p className="text-[13px] text-foreground">{i.title}</p>
                            <p className="text-[11px] text-foreground/40 mt-0.5">{i.recommendation}</p>
                          </div>
                          <span className="text-[11px] text-foreground/25 shrink-0">{i.page}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {tab !== 'Findings' && (
          <div className="flex h-full items-center justify-center text-[13px] text-foreground/30">{tab} content</div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 9 — Actionable checklist (tick off as you fix)           */
/* ══════════════════════════════════════════════════════════════════ */
function V9() {
  const [tab, setTab] = useState('Action items')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <TabBar tabs={['Action items', 'Replay', 'Heatmap']} active={tab} onChange={setTab} />
      <div className="h-[320px] overflow-y-auto">
        {tab === 'Action items' && (
          <div>
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <span className="text-[12px] text-foreground/40">{checked.size}/{issues.length} resolved</span>
              <ShareBar />
            </div>
            <div className="p-4 space-y-1">
              {issues.map((i) => {
                const done = checked.has(i.id)
                return (
                  <button
                    key={i.id}
                    onClick={() => {
                      const next = new Set(checked)
                      done ? next.delete(i.id) : next.add(i.id)
                      setChecked(next)
                    }}
                    className={cn('w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/30', done && 'opacity-40')}
                  >
                    <div className={cn('mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors', done ? 'border-foreground/30 bg-foreground/10' : 'border-foreground/20')}>
                      {done && <svg className="h-2.5 w-2.5 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={cn('h-1.5 w-1.5 rounded-full', severityColor(i.severity))} />
                        <p className={cn('text-[13px] font-medium text-foreground', done && 'line-through')}>{i.title}</p>
                      </div>
                      <p className="text-[12px] text-foreground/40 mt-0.5 ml-3.5">{i.recommendation}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {tab !== 'Action items' && (
          <div className="flex h-full items-center justify-center text-[13px] text-foreground/30">{tab} content</div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  VARIANT 10 — Summary card on top, issues below, report in drawer */
/* ══════════════════════════════════════════════════════════════════ */
function V10() {
  const [tab, setTab] = useState('Findings')
  const [showReport, setShowReport] = useState(false)
  const critCount = issues.filter((i) => i.severity === 'critical').length
  const majCount = issues.filter((i) => i.severity === 'major').length
  const minCount = issues.filter((i) => i.severity === 'minor').length
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <TabBar tabs={['Findings', 'Replay', 'Heatmap']} active={tab} onChange={setTab} />
      <div className="h-[320px] overflow-y-auto">
        {tab === 'Findings' && (
          <div>
            {/* Summary bar */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-4 text-[12px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="font-medium text-foreground">{critCount}</span>
                  <span className="text-foreground/40">critical</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="font-medium text-foreground">{majCount}</span>
                  <span className="text-foreground/40">major</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="font-medium text-foreground">{minCount}</span>
                  <span className="text-foreground/40">minor</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReport(!showReport)}
                  className={cn('rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors', showReport ? 'bg-foreground/10 text-foreground' : 'text-foreground/40 hover:text-foreground/60')}
                >
                  {showReport ? 'Show issues' : 'Full report'}
                </button>
                <ShareBar />
              </div>
            </div>
            {/* Content */}
            <div className="p-4">
              {showReport ? (
                <div className="text-[13px] text-foreground/60 leading-relaxed whitespace-pre-line">
                  {reportMd.slice(0, 600)}...
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {issues.map((i) => <IssueRow key={i.id} issue={i} />)}
                </div>
              )}
            </div>
          </div>
        )}
        {tab !== 'Findings' && (
          <div className="flex h-full items-center justify-center text-[13px] text-foreground/30">{tab} content</div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  PAGE                                                             */
/* ══════════════════════════════════════════════════════════════════ */
const variants = [
  { id: 1, name: 'Current: separate Issues + Report tabs', desc: 'Issues and Report are different tabs. User switches between them.', component: V1 },
  { id: 2, name: 'Merged: issues then report (single scroll)', desc: 'One "Findings" tab. Issues listed first, full report below. One scroll.', component: V2 },
  { id: 3, name: 'Issues with "View full report" button', desc: 'Issues tab only. Dashed button at bottom reveals report inline. Back button to return.', component: V3 },
  { id: 4, name: 'Sub-tabs: Issues | Full report', desc: 'One "Results" tab with pill toggle between issues and report. Share bar always visible.', component: V4 },
  { id: 5, name: 'Expandable issues with copy-as-ticket', desc: 'No report tab. Each issue expands to show recommendation + "Copy as ticket" action.', component: V5 },
  { id: 6, name: 'Two-column: issues left, report right', desc: 'Side-by-side split. Issues on the left, report on the right.', component: V6 },
  { id: 7, name: 'Numbered issue cards with context', desc: 'No report tab. Issues displayed as numbered findings with severity, recommendation, and affected personas.', component: V7 },
  { id: 8, name: 'Grouped by severity', desc: 'Issues grouped under Critical / Major / Minor headings with counts. Share bar at top.', component: V8 },
  { id: 9, name: 'Actionable checklist', desc: '"Action items" tab. Each issue is a checkbox. Track resolution progress. Share the list.', component: V9 },
  { id: 10, name: 'Summary bar + toggle issues/report', desc: 'Severity count bar at top. Toggle button switches between issue list and full report.', component: V10 },
]

export default function ResultsLayoutDemoPage() {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Issues + Report Layout — 10 Variants</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Exploring how to combine or separate Issues and Report. Click a number to isolate.
        </p>
      </div>

      <div className="space-y-10">
        {variants
          .filter((v) => selected === null || selected === v.id)
          .map((v) => (
            <div key={v.id}>
              <button
                onClick={() => setSelected(selected === v.id ? null : v.id)}
                className="flex items-start gap-2 mb-3 text-left"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-bold shrink-0 mt-0.5">
                  {v.id}
                </span>
                <div>
                  <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground hover:text-foreground transition-colors">
                    {v.name}
                  </span>
                  <p className="text-[11px] text-foreground/30 mt-0.5">{v.desc}</p>
                </div>
              </button>
              <v.component />
            </div>
          ))}
      </div>
    </div>
  )
}
