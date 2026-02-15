'use client';

import { useState } from 'react';
import { Eye, ChevronDown, ChevronRight, AlertTriangle, AlertCircle, Info, Lightbulb, ExternalLink, Wrench, MapPin, ArrowRight, Flame, Circle, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeaderBar } from '@/components/layout/page-header-bar';

/* ── Mock Data ─────────────────────────────────────── */

interface MockIssue {
  id: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'enhancement';
  recommendation: string;
  heuristic: string;
  page_url: string;
  element: string | null;
  issue_type: 'ux' | 'accessibility' | 'error' | 'performance';
}

const ISSUES: MockIssue[] = [
  {
    id: '1',
    description: "The hero section promotes 'AI research and products' but doesn't have a primary CTA for account creation or API access. This is confusing for someone trying to sign up.",
    severity: 'major',
    recommendation: "Add a prominent 'Get Started' or 'Sign Up for API Access' button in the hero section with clear visual hierarchy.",
    heuristic: 'Match between system and real world',
    page_url: 'https://www.anthropic.com/',
    element: 'hero-section',
    issue_type: 'ux',
  },
  {
    id: '2',
    description: 'The Try Claude link has both an href AND a dropdown toggle button associated with it, which creates confusion about whether clicking takes you to a page or opens a menu.',
    severity: 'major',
    recommendation: 'Either make it a simple link with no dropdown, or use proper ARIA attributes and ensure keyboard navigation works.',
    heuristic: 'Consistency and standards',
    page_url: 'https://www.anthropic.com/',
    element: 'button#w-dropdown-toggle-2',
    issue_type: 'ux',
  },
  {
    id: '3',
    description: 'Color contrast ratio on secondary navigation links is 3.2:1, below the WCAG AA minimum of 4.5:1 for normal text.',
    severity: 'critical',
    recommendation: 'Increase the text color darkness or add a background to meet at least 4.5:1 contrast ratio.',
    heuristic: 'Aesthetic and minimalist design',
    page_url: 'https://www.anthropic.com/research',
    element: 'nav.secondary-links',
    issue_type: 'accessibility',
  },
  {
    id: '4',
    description: 'Page load time exceeds 4 seconds on mobile due to unoptimized hero image (2.8MB PNG).',
    severity: 'minor',
    recommendation: 'Convert hero image to WebP format and add responsive srcset for different viewport sizes.',
    heuristic: 'Efficiency of use',
    page_url: 'https://www.anthropic.com/',
    element: 'img.hero-background',
    issue_type: 'performance',
  },
  {
    id: '5',
    description: 'Add breadcrumb navigation to research article pages to help users orient themselves within the site hierarchy.',
    severity: 'enhancement',
    recommendation: 'Implement a breadcrumb component showing Home > Research > [Article Title].',
    heuristic: 'Recognition rather than recall',
    page_url: 'https://www.anthropic.com/research/article',
    element: null,
    issue_type: 'ux',
  },
];

/* ── Severity helpers ──────────────────────────────── */

const sevIcon = (s: MockIssue['severity'], className = 'h-4 w-4') => {
  switch (s) {
    case 'critical': return <AlertCircle className={cn(className, 'text-red-500')} />;
    case 'major': return <AlertTriangle className={cn(className, 'text-amber-500')} />;
    case 'minor': return <Info className={cn(className, 'text-blue-400')} />;
    case 'enhancement': return <Lightbulb className={cn(className, 'text-emerald-400')} />;
  }
};

const sevDot = (s: MockIssue['severity']) => {
  const colors = { critical: 'bg-red-500', major: 'bg-amber-500', minor: 'bg-blue-400', enhancement: 'bg-emerald-400' };
  return <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', colors[s])} />;
};

const sevBar = (s: MockIssue['severity']) => {
  const colors = { critical: 'bg-red-500', major: 'bg-amber-500', minor: 'bg-blue-400', enhancement: 'bg-emerald-400' };
  return <span className={cn('absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg', colors[s])} />;
};

const sevText = (s: MockIssue['severity']) => {
  const colors = { critical: 'text-red-500', major: 'text-amber-500', minor: 'text-blue-400', enhancement: 'text-emerald-400' };
  return colors[s];
};

const sevBg = (s: MockIssue['severity']) => {
  const colors = { critical: 'bg-red-500/10', major: 'bg-amber-500/10', minor: 'bg-blue-400/10', enhancement: 'bg-emerald-400/10' };
  return colors[s];
};

const sevBorder = (s: MockIssue['severity']) => {
  const colors = { critical: 'border-red-500/30', major: 'border-amber-500/30', minor: 'border-blue-400/30', enhancement: 'border-emerald-400/30' };
  return colors[s];
};

/* ── Design 1: Minimal List ────────────────────────── */

function Design1({ issues }: { issues: MockIssue[] }) {
  return (
    <div className="divide-y divide-border">
      {issues.map((issue) => (
        <div key={issue.id} className="flex items-start gap-3 py-3 px-1">
          {sevDot(issue.severity)}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-foreground/80 leading-relaxed">{issue.description}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-foreground/30">
              <span className={cn('font-medium capitalize', sevText(issue.severity))}>{issue.severity}</span>
              <span>{issue.heuristic}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Design 2: Left Border Accent ──────────────────── */

function Design2({ issues }: { issues: MockIssue[] }) {
  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <div key={issue.id} className="relative rounded-lg border border-border bg-card pl-4 pr-3 py-3">
          {sevBar(issue.severity)}
          <p className="text-[13px] text-foreground/80 leading-relaxed">{issue.description}</p>
          {issue.recommendation && (
            <p className="mt-2 text-[12px] text-foreground/40 flex items-start gap-1.5">
              <Wrench className="h-3 w-3 mt-0.5 shrink-0" />
              {issue.recommendation}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 text-[11px] text-foreground/25">
            <span>{issue.page_url.replace('https://', '')}</span>
            <span>&middot;</span>
            <span>{issue.heuristic}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Design 3: Expandable Accordion ────────────────── */

function Design3({ issues }: { issues: MockIssue[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
      {issues.map((issue) => {
        const open = expanded === issue.id;
        return (
          <div key={issue.id}>
            <button
              onClick={() => setExpanded(open ? null : issue.id)}
              className="flex items-center gap-3 w-full text-left px-3 py-2.5 hover:bg-muted/30 transition-colors"
            >
              {sevIcon(issue.severity, 'h-3.5 w-3.5')}
              <p className="flex-1 text-[13px] text-foreground/80 line-clamp-1">{issue.description}</p>
              <span className={cn('text-[11px] font-medium capitalize mr-2', sevText(issue.severity))}>{issue.severity}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 text-foreground/20 transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
              <div className="px-3 pb-3 pt-0 space-y-2 bg-muted/10">
                {issue.recommendation && (
                  <div className="rounded-md bg-muted/30 px-3 py-2">
                    <p className="text-[11px] font-medium text-foreground/40 uppercase tracking-wider mb-1">Recommendation</p>
                    <p className="text-[12px] text-foreground/60">{issue.recommendation}</p>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[11px] text-foreground/30">
                  <span>{issue.heuristic}</span>
                  <span className="text-foreground/15">&middot;</span>
                  <span>{issue.page_url.replace('https://', '')}</span>
                  <button className="ml-auto flex items-center gap-1 text-foreground/40 hover:text-foreground/60">
                    <Eye className="h-3 w-3" /> Replay
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Design 4: Compact Table ───────────────────────── */

function Design4({ issues }: { issues: MockIssue[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-foreground/30">
            <th className="text-left px-3 py-2 font-medium w-16">Sev.</th>
            <th className="text-left px-3 py-2 font-medium">Issue</th>
            <th className="text-left px-3 py-2 font-medium w-48">Heuristic</th>
            <th className="text-left px-3 py-2 font-medium w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {issues.map((issue) => (
            <tr key={issue.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2.5">
                <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium capitalize', sevText(issue.severity))}>
                  {sevDot(issue.severity)}
                  {issue.severity}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <p className="text-foreground/70 line-clamp-2">{issue.description}</p>
              </td>
              <td className="px-3 py-2.5 text-foreground/30 text-[12px]">{issue.heuristic}</td>
              <td className="px-3 py-2.5">
                <Eye className="h-3.5 w-3.5 text-foreground/20 hover:text-foreground/50 cursor-pointer" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Design 5: Horizontal Cards (GitHub-style) ─────── */

function Design5({ issues }: { issues: MockIssue[] }) {
  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <div key={issue.id} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:border-foreground/15 transition-colors">
          <div className={cn('rounded-full p-1.5 shrink-0 mt-0.5', sevBg(issue.severity))}>
            {sevIcon(issue.severity, 'h-3.5 w-3.5')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-foreground/80 line-clamp-1 flex-1">{issue.description}</p>
            </div>
            {issue.recommendation && (
              <p className="mt-1 text-[12px] text-foreground/35 line-clamp-1">
                <ArrowRight className="inline h-3 w-3 mr-1 -mt-px" />
                {issue.recommendation}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className={cn('text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded', sevBg(issue.severity), sevText(issue.severity))}>
                {issue.severity}
              </span>
              <span className="text-[11px] text-foreground/20">{issue.heuristic}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Design 6: Two-line Dense ──────────────────────── */

function Design6({ issues }: { issues: MockIssue[] }) {
  return (
    <div className="space-y-1">
      {issues.map((issue) => (
        <div key={issue.id} className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-muted/30 transition-colors cursor-pointer">
          <span className={cn('flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold shrink-0', sevBg(issue.severity), sevText(issue.severity))}>
            {issue.severity === 'critical' ? '!' : issue.severity === 'major' ? '!!' : issue.severity === 'minor' ? '~' : '+'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-foreground/70 line-clamp-1">{issue.description}</p>
            <p className="text-[11px] text-foreground/25 line-clamp-1 mt-0.5">
              {issue.heuristic} &middot; {issue.page_url.replace('https://', '')}
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-foreground/15 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ))}
    </div>
  );
}

/* ── Design 7: Card Grid (2-col) ──────────────────── */

function Design7({ issues }: { issues: MockIssue[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {issues.map((issue) => (
        <div key={issue.id} className={cn('rounded-lg border p-3 space-y-2', sevBorder(issue.severity))}>
          <div className="flex items-center gap-2">
            {sevIcon(issue.severity, 'h-3.5 w-3.5')}
            <span className={cn('text-[11px] font-medium capitalize', sevText(issue.severity))}>{issue.severity}</span>
            <span className="ml-auto text-[10px] text-foreground/20 truncate max-w-[120px]">{issue.page_url.replace('https://www.', '')}</span>
          </div>
          <p className="text-[12px] text-foreground/70 leading-relaxed line-clamp-3">{issue.description}</p>
          {issue.recommendation && (
            <p className="text-[11px] text-foreground/30 line-clamp-2">{issue.recommendation}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Design 8: Timeline / Thread ───────────────────── */

function Design8({ issues }: { issues: MockIssue[] }) {
  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
      <div className="space-y-4">
        {issues.map((issue, i) => (
          <div key={issue.id} className="relative">
            {/* Dot on timeline */}
            <div className={cn(
              'absolute -left-6 top-1 h-[18px] w-[18px] rounded-full border-2 border-background flex items-center justify-center',
              issue.severity === 'critical' ? 'bg-red-500' : issue.severity === 'major' ? 'bg-amber-500' : issue.severity === 'minor' ? 'bg-blue-400' : 'bg-emerald-400',
            )}>
              <span className="text-[8px] font-bold text-white">{i + 1}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('text-[11px] font-medium capitalize', sevText(issue.severity))}>{issue.severity}</span>
                <span className="text-[11px] text-foreground/20">&middot;</span>
                <span className="text-[11px] text-foreground/20">{issue.heuristic}</span>
              </div>
              <p className="text-[13px] text-foreground/70 leading-relaxed">{issue.description}</p>
              {issue.recommendation && (
                <div className="mt-1.5 rounded-md border border-dashed border-border px-2.5 py-1.5">
                  <p className="text-[11px] text-foreground/35">
                    <Lightbulb className="inline h-3 w-3 mr-1 -mt-px text-foreground/25" />
                    {issue.recommendation}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Design 9: Severity Groups ─────────────────────── */

function Design9({ issues }: { issues: MockIssue[] }) {
  const groups = (['critical', 'major', 'minor', 'enhancement'] as const).map((sev) => ({
    severity: sev,
    items: issues.filter((i) => i.severity === sev),
  })).filter((g) => g.items.length > 0);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggleCollapse = (sev: string) => setCollapsed((prev) => ({ ...prev, [sev]: !prev[sev] }));
  const toggleCheck = (id: string) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.severity] ?? false;
        return (
          <div key={group.severity}>
            <button
              onClick={() => toggleCollapse(group.severity)}
              className="flex items-center gap-2 mb-2 group/header"
            >
              <span className={cn('text-[14px] uppercase tracking-wider', sevText(group.severity))}>{group.severity === 'major' ? 'Regular' : group.severity}</span>
              <span className="text-[14px] text-foreground/20">{group.items.length}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 text-foreground/20 transition-transform', isCollapsed && '-rotate-90')} />
            </button>
            {!isCollapsed && (
              <div className="ml-4">
                {group.items.map((issue) => {
                  const isChecked = checked.has(issue.id);
                  return (
                    <div key={issue.id} className="flex items-start gap-2.5 py-[5px]">
                      <button
                        onClick={() => toggleCheck(issue.id)}
                        className={cn(
                          'mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          isChecked
                            ? 'border-foreground/30 bg-foreground/10'
                            : 'border-foreground/15 hover:border-foreground/30',
                        )}
                      >
                        {isChecked && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-foreground/50">
                            <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-[14px] text-foreground/70 leading-relaxed', isChecked && 'line-through text-foreground/30')}>{issue.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Design 10: Kanban-style Stacked ───────────────── */

function Design10({ issues }: { issues: MockIssue[] }) {
  return (
    <div className="space-y-1.5">
      {issues.map((issue) => (
        <div
          key={issue.id}
          className="group rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors overflow-hidden"
        >
          <div className="flex gap-3 p-3">
            {/* Severity icon column */}
            <div className="flex flex-col items-center gap-1 pt-0.5">
              <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', sevBg(issue.severity))}>
                {issue.severity === 'critical' && <Flame className={cn('h-3.5 w-3.5', sevText(issue.severity))} />}
                {issue.severity === 'major' && <AlertTriangle className={cn('h-3.5 w-3.5', sevText(issue.severity))} />}
                {issue.severity === 'minor' && <Circle className={cn('h-3 w-3', sevText(issue.severity))} />}
                {issue.severity === 'enhancement' && <Lightbulb className={cn('h-3.5 w-3.5', sevText(issue.severity))} />}
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-foreground/75 leading-relaxed">{issue.description}</p>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                <span className={cn('text-[10px] font-semibold uppercase tracking-widest', sevText(issue.severity))}>
                  {issue.severity}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-foreground/25">
                  <MapPin className="h-2.5 w-2.5" />
                  {issue.page_url.replace('https://www.', '')}
                </span>
                <span className="text-[11px] text-foreground/20">{issue.heuristic}</span>
              </div>
              {issue.recommendation && (
                <div className="mt-2 flex items-start gap-1.5 text-[11px] text-foreground/30">
                  <Wrench className="h-3 w-3 mt-0.5 shrink-0 text-foreground/20" />
                  <span className="line-clamp-1">{issue.recommendation}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Demo Page ─────────────────────────────────────── */

const DESIGNS = [
  { name: 'Minimal List', description: 'Clean divider-separated list with dot severity indicators', component: Design1 },
  { name: 'Left Border Accent', description: 'Cards with colored left border stripe showing severity', component: Design2 },
  { name: 'Expandable Accordion', description: 'Collapsed by default, click to expand details and recommendations', component: Design3 },
  { name: 'Compact Table', description: 'Dense tabular layout with sortable columns', component: Design4 },
  { name: 'GitHub-style Cards', description: 'Horizontal cards with icon badges and inline recommendation', component: Design5 },
  { name: 'Two-line Dense', description: 'Ultra-compact hover-to-reveal list for scanning many issues', component: Design6 },
  { name: 'Card Grid', description: 'Two-column grid of severity-bordered cards', component: Design7 },
  { name: 'Timeline Thread', description: 'Vertical timeline with numbered severity dots and dashed recommendation boxes', component: Design8 },
  { name: 'Severity Groups', description: 'Issues grouped by severity level with section headers', component: Design9 },
  { name: 'Stacked Panels', description: 'Soft background panels with icon blocks and metadata row', component: Design10 },
];

export default function IssueDesignsDemo() {
  const [selected, setSelected] = useState(0);

  return (
    <div>
      <PageHeaderBar title="Issue Card Designs" chips={[{ label: 'Designs', value: `${DESIGNS.length}`, tooltip: 'Number of design variations' }, { label: 'Issues', value: `${ISSUES.length}`, tooltip: 'Sample issues shown' }]} />

      <div className="px-[100px] pt-[40px] pb-[100px]">
        <div className="grid grid-cols-[220px_1fr] gap-8">
          {/* Sidebar nav */}
          <div className="space-y-1 sticky top-8 self-start">
            {DESIGNS.map((d, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={cn(
                  'w-full text-left rounded-md px-3 py-2 text-[13px] transition-colors',
                  selected === i
                    ? 'bg-foreground/10 text-foreground font-medium'
                    : 'text-foreground/40 hover:text-foreground/60 hover:bg-muted/30',
                )}
              >
                <span className="text-foreground/20 mr-2 tabular-nums">{i + 1}.</span>
                {d.name}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-medium">{DESIGNS[selected].name}</h2>
              <p className="text-[13px] text-foreground/40 mt-0.5">{DESIGNS[selected].description}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 min-h-[400px]">
              {(() => {
                const Component = DESIGNS[selected].component;
                return <Component issues={ISSUES} />;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
