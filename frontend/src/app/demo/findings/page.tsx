'use client'

import { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

/* ─── sample issues ─── */
const issues = [
  { id: '1', severity: 'critical', title: 'CTA button leads to wrong page', page: '/pricing', persona: 'Sarah', recommendation: 'Update the CTA link to point to the actual signup flow instead of the docs page.', description: 'The primary "Get Started" button on the pricing page redirects to the documentation instead of the signup flow. This completely blocks the conversion funnel.', heuristic: 'Error prevention', issue_type: 'navigation' },
  { id: '2', severity: 'critical', title: 'Cloudflare verification blocks navigation', page: '/signup', persona: 'All personas', recommendation: 'Implement a fallback or skip mechanism for automated security challenges during signup.', description: 'Cloudflare security verification consistently blocks user navigation attempts during the signup process, preventing task completion.', heuristic: 'Flexibility and efficiency', issue_type: 'accessibility' },
  { id: '3', severity: 'major', title: 'Pricing toggle unclear between monthly/annual', page: '/pricing', persona: 'James', recommendation: 'Add clearer visual distinction and labels for the billing period toggle.', description: 'The monthly/annual pricing toggle lacks clear visual feedback. Users cannot easily determine which billing period is currently selected.', heuristic: 'Visibility of system status', issue_type: 'usability' },
  { id: '4', severity: 'major', title: 'No confirmation after clicking "Get Started"', page: '/pricing', persona: 'Sarah', recommendation: 'Add loading state or confirmation feedback when the user clicks the primary CTA.', description: 'Clicking the "Get Started" button provides no visual feedback — no loading spinner, no transition, nothing to indicate the action was registered.', heuristic: 'Visibility of system status', issue_type: 'usability' },
  { id: '5', severity: 'minor', title: 'Feature comparison table hard to scan on mobile', page: '/pricing', persona: 'Alex', recommendation: 'Consider a stacked card layout for plan comparison on smaller viewports.', description: 'The feature comparison table requires horizontal scrolling on mobile devices, making it difficult to compare plans side by side.', heuristic: 'Aesthetic and minimalist design', issue_type: 'usability' },
  { id: '6', severity: 'minor', title: 'Footer links have low contrast', page: '/pricing', persona: 'James', recommendation: 'Increase the contrast ratio of footer links to meet WCAG AA standards (4.5:1 minimum).', description: 'Footer navigation links use a light gray color that fails WCAG AA contrast requirements, making them difficult to read.', heuristic: 'Accessibility', issue_type: 'accessibility' },
]

const reportMd = `# Usability Test Report: Claude.com Pricing Page

*Generated on 2026-02-14 09:59 UTC*

**Overall UX Score: 32/100 (Critical)**

## Executive Summary

This report presents the findings from an AI-powered usability test conducted on the Claude.com pricing page (https://claude.com/pricing). Three diverse personas were tasked with a single, high-stakes objective: open a Pro account. The results are severe — all three personas completely failed to complete the task, yielding an overall UX score of 12 out of 100.

The user journey breaks down at two critical points in the conversion funnel. First, the 'Try Claude' call-to-action buttons on the pricing page are either non-functional or semantically ambiguous, failing to clearly communicate that they lead to a Pro subscription signup. This affected two of the three personas. Second, Cloudflare security verification blocked automated navigation for all three personas.

## Critical Issues

### 1. CTA Button Misdirection
The primary call-to-action on the pricing page does not lead to the expected signup flow. Two of three personas clicked "Get Started" and were redirected to documentation instead of an account creation page. This is a **fundamental conversion blocker**.

**Impact:** 100% of personas affected
**Page:** /pricing
**Heuristic:** Error Prevention

### 2. Security Verification Blocking
Cloudflare's security verification consistently blocked automated navigation attempts during the signup process, preventing task completion for all personas.

**Impact:** 100% of personas affected
**Page:** /signup
**Heuristic:** Flexibility and Efficiency of Use

## Major Issues

### 3. Pricing Toggle Ambiguity
The monthly/annual billing toggle lacks clear visual indicators. Users cannot confidently determine which period is selected, creating confusion around actual pricing.

### 4. Missing CTA Feedback
No loading state, animation, or transition occurs after clicking the primary CTA. Users are left wondering if their click registered.

## Minor Issues

### 5. Mobile Comparison Table
Feature comparison requires horizontal scrolling on mobile, degrading the comparison experience.

### 6. Footer Contrast
Footer links fail WCAG AA contrast requirements.

## Recommendations

1. **Immediate**: Fix the CTA button link to point to the correct signup URL
2. **Immediate**: Add clear loading/transition feedback on CTA click
3. **Short-term**: Redesign the billing period toggle with explicit labels
4. **Short-term**: Implement Cloudflare verification fallback
5. **Medium-term**: Create responsive card layout for mobile plan comparison
6. **Low priority**: Increase footer link contrast ratio

## Personas Tested

| Persona | Completion | Steps | Final Mood |
|---------|-----------|-------|------------|
| Sarah (Designer, 28) | Failed | 12 | Frustrated |
| James (Developer, 34) | Failed | 15 | Frustrated |
| Alex (Student, 21) | Failed | 9 | Confused |
`

const severityColor = (s: string) => {
  if (s === 'critical') return 'bg-red-500'
  if (s === 'major') return 'bg-amber-500'
  return 'bg-blue-400'
}

/* ─── Issue card ─── */
function IssueCard({ issue }: { issue: typeof issues[0] }) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-start gap-3">
        <div className={cn('mt-1 h-2.5 w-2.5 rounded-full shrink-0', severityColor(issue.severity))} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-medium text-foreground">{issue.title}</p>
            <span className="text-[11px] text-foreground/30 shrink-0 capitalize">{issue.severity}</span>
          </div>
          <p className="text-[13px] text-foreground/50 mt-1">{issue.description}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-foreground/30">
            <span>{issue.page}</span>
            <span>·</span>
            <span>{issue.persona}</span>
            <span>·</span>
            <span>{issue.heuristic}</span>
          </div>
          <div className="mt-2 rounded-md bg-muted/50 px-3 py-2">
            <p className="text-[12px] text-foreground/60"><span className="font-medium text-foreground/70">Fix:</span> {issue.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Share bar (mock) ─── */
function ShareBar() {
  return (
    <div className="flex items-center gap-1.5">
      <button className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-normal text-foreground/70 hover:bg-muted/50 transition-colors">
        <svg className="h-3.5 w-3.5 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
        Share with dev
        <svg className="h-3 w-3 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      <button className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-normal text-foreground/40 cursor-not-allowed">
        <svg className="h-3.5 w-3.5" viewBox="0 0 100 100" fill="currentColor"><path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z" /></svg>
        Open Linear ticket
      </button>
      <button className="flex items-center justify-center rounded-md border border-border bg-background px-2 py-1.5 text-foreground/50 hover:bg-muted/50 transition-colors">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
      </button>
    </div>
  )
}

/* ─── Tabs ─── */
function TabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex items-center gap-0">
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

/* ─── Main ─── */
export default function FindingsDemoPage() {
  const [tab, setTab] = useState('Findings')
  const [view, setView] = useState<'issues' | 'report'>('issues')
  const [severityFilter, setSeverityFilter] = useState<string | null>(null)

  const counts = useMemo(() => ({
    critical: issues.filter((i) => i.severity === 'critical').length,
    major: issues.filter((i) => i.severity === 'major').length,
    minor: issues.filter((i) => i.severity === 'minor').length,
  }), [])

  const filtered = useMemo(() => {
    if (!severityFilter) return issues
    return issues.filter((i) => i.severity === severityFilter)
  }, [severityFilter])

  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Findings Tab — Demo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Combined issues + report view with severity filters and share actions.
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-background">
        {/* Tab bar */}
        <div className="border-b border-border bg-muted/30 px-3">
          <TabBar tabs={['Findings', 'Replay', 'Heatmap']} active={tab} onChange={setTab} />
        </div>

        {tab === 'Findings' && (
          <div className="flex flex-col" style={{ height: '560px' }}>
            {/* Severity filters + toggle + share */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
              {/* Severity pills */}
              <div className="flex items-center gap-3 text-[12px] flex-1 min-w-0">
                {(['critical', 'major', 'minor'] as const).map((sev) => {
                  if (counts[sev] === 0) return null
                  const isActive = severityFilter === sev
                  const colors = { critical: 'bg-red-500', major: 'bg-amber-500', minor: 'bg-blue-400' }
                  return (
                    <button
                      key={sev}
                      onClick={() => {
                        setSeverityFilter(isActive ? null : sev)
                        setView('issues')
                      }}
                      className={cn(
                        'flex items-center gap-1.5 transition-opacity',
                        severityFilter && !isActive ? 'opacity-30' : 'opacity-100',
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full', colors[sev])} />
                      <span className="font-medium text-foreground">{counts[sev]}</span>
                      <span className="text-foreground/40">{sev}</span>
                    </button>
                  )
                })}
              </div>
              {/* Full report toggle */}
              <button
                onClick={() => setView(view === 'report' ? 'issues' : 'report')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors shrink-0',
                  view === 'report' ? 'bg-foreground/10 text-foreground' : 'text-foreground/40 hover:text-foreground/60'
                )}
              >
                {view === 'report' ? 'Show issues' : 'Full report'}
              </button>
              {/* Share actions */}
              <div className="shrink-0">
                <ShareBar />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {view === 'report' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMd}</ReactMarkdown>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <p className="text-[14px] font-medium text-foreground/50">No issues found</p>
                      <p className="text-[13px] text-foreground/30 mt-1">No usability issues match this filter.</p>
                    </div>
                  ) : (
                    filtered.map((issue) => <IssueCard key={issue.id} issue={issue} />)
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab !== 'Findings' && (
          <div className="flex items-center justify-center text-[13px] text-foreground/30" style={{ height: '560px' }}>
            {tab} content
          </div>
        )}
      </div>
    </div>
  )
}
