'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  Filter,
  LayoutGrid,
  Users,
  Columns2,
  Rows3,
  X,
} from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────
const TESTERS = [
  {
    id: '1',
    name: 'AI Accessibility Auditor',
    emoji: '🤖',
    role: 'AI Accessibility Auditor, 25yo',
    score: 78,
    emotion: 'Satisfied',
    emotionEmoji: '😊',
    attributes: ['Tech savvy ||||  ||', 'Patience ||||  ||', '🖥 Uses desktop'],
    color: 'bg-blue-500',
  },
  {
    id: '2',
    name: 'AI Customer Support Bot',
    emoji: '🤖',
    role: 'AI Customer Support Agent, 25yo',
    score: 78,
    emotion: 'Satisfied',
    emotionEmoji: '😊',
    attributes: ['Tech savvy ||||  ||', 'Patience ||||  ||', '🖥 Uses desktop'],
    color: 'bg-green-500',
  },
  {
    id: '3',
    name: 'Retired Grandparent',
    emoji: '👴',
    role: 'Retired Teacher, 72yo',
    score: 45,
    emotion: 'Frustrated',
    emotionEmoji: '😤',
    attributes: ['Tech savvy ||  ||||||', 'Patience ||||||  ||', '📱 Uses mobile'],
    color: 'bg-orange-500',
  },
];

interface Issue {
  id: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'enhancement';
  testerId: string;
  testerName: string;
  testerEmoji: string;
  page: string;
}

const ISSUES: Issue[] = [
  { id: '1', description: 'The dropdown list items (.nav_dropdown_item) don\'t expose their inner link text or href in the accessibility tree, making it difficult for screen readers to identify and interact with individual menu items', severity: 'critical', testerId: '1', testerName: 'AI Accessibility Auditor', testerEmoji: '🤖', page: '/pricing' },
  { id: '2', description: 'The list items in the navigation dropdown appear empty in the accessibility tree — no link text or roles are exposed, which means screen reader users cannot identify what each menu item does.', severity: 'critical', testerId: '1', testerName: 'AI Accessibility Auditor', testerEmoji: '🤖', page: '/pricing' },
  { id: '3', description: 'The main page title \'Pricing\' is rendered as a <p> element instead of an <h1>. Screen reader users navigating by headings would not find the page title.', severity: 'critical', testerId: '1', testerName: 'AI Accessibility Auditor', testerEmoji: '🤖', page: '/pricing' },
  { id: '4', description: 'Submit button has no visible focus indicator — keyboard-only users cannot tell which element is active.', severity: 'critical', testerId: '2', testerName: 'AI Customer Support Bot', testerEmoji: '🤖', page: '/contact' },
  { id: '5', description: 'Form error messages are not associated with their input fields via aria-describedby.', severity: 'major', testerId: '2', testerName: 'AI Customer Support Bot', testerEmoji: '🤖', page: '/contact' },
  { id: '6', description: 'Text size is too small for comfortable reading on mobile. Body text is 12px, below the recommended 16px minimum.', severity: 'major', testerId: '3', testerName: 'Retired Grandparent', testerEmoji: '👴', page: '/pricing' },
  { id: '7', description: 'Navigation hamburger menu icon has no label — could not figure out how to access the menu on mobile.', severity: 'critical', testerId: '3', testerName: 'Retired Grandparent', testerEmoji: '👴', page: '/' },
  { id: '8', description: 'Color contrast ratio of 2.8:1 on muted helper text fails WCAG AA requirements (4.5:1 needed).', severity: 'major', testerId: '1', testerName: 'AI Accessibility Auditor', testerEmoji: '🤖', page: '/pricing' },
  { id: '9', description: 'Consider adding a "skip to main content" link for keyboard navigation users.', severity: 'enhancement', testerId: '1', testerName: 'AI Accessibility Auditor', testerEmoji: '🤖', page: '/' },
  { id: '10', description: 'Price comparison table columns are not properly scoped with <th scope="col">, making it hard to understand in a screen reader.', severity: 'minor', testerId: '2', testerName: 'AI Customer Support Bot', testerEmoji: '🤖', page: '/pricing' },
];

const SEVERITY_CONFIG = {
  critical: { label: 'CRITICAL', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
  major: { label: 'MAJOR', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
  minor: { label: 'MINOR', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  enhancement: { label: 'ENHANCEMENT', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
};

// ── Shared Components ──────────────────────────────────────

function SeverityDot({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG];
  return <span className={cn('inline-block h-2 w-2 rounded-full', config?.dot ?? 'bg-gray-400')} />;
}

function TesterAvatar({ emoji, size = 'md' }: { emoji: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-6 w-6 text-xs', md: 'h-8 w-8 text-sm', lg: 'h-10 w-10 text-base' };
  return (
    <div className={cn('flex items-center justify-center rounded-full bg-muted', sizes[size])}>
      {emoji}
    </div>
  );
}

function IssueRow({ issue, showTester = false }: { issue: Issue; showTester?: boolean }) {
  const sev = SEVERITY_CONFIG[issue.severity];
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 p-3 text-sm hover:bg-muted/30 transition-colors">
      <SeverityDot severity={issue.severity} />
      <div className="flex-1 min-w-0">
        <p className="text-foreground/90">{issue.description}</p>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          {showTester && (
            <span className="flex items-center gap-1">
              <TesterAvatar emoji={issue.testerEmoji} size="sm" />
              <span className="font-medium">{issue.testerName.split(' ').slice(0, 2).join(' ')}</span>
            </span>
          )}
          <span className={cn('font-semibold uppercase', sev.color)}>{sev.label}</span>
          <span className="text-muted-foreground/50">{issue.page}</span>
        </div>
      </div>
    </div>
  );
}

function MiniScoreCard({ tester }: { tester: typeof TESTERS[0] }) {
  return (
    <div className="flex items-center gap-2">
      <TesterAvatar emoji={tester.emoji} />
      <div>
        <div className="text-sm font-medium">{tester.name}</div>
        <div className="text-xs text-muted-foreground">{tester.score}/100 {tester.emotionEmoji}</div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/30 mb-2">{children}</div>;
}

// ── Option 1: Unified Feed with Inline Tester Badges ───────
function Option1() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">All Findings</h3>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{ISSUES.length} issues</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {TESTERS.map((t) => (
              <TesterAvatar key={t.id} emoji={t.emoji} size="sm" />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">3 testers</span>
        </div>
      </div>
      <div className="space-y-2">
        {ISSUES.slice(0, 5).map((issue) => (
          <IssueRow key={issue.id} issue={issue} showTester />
        ))}
      </div>
    </div>
  );
}

// ── Option 2: Horizontal Tester Tabs with "All" ───────────
function Option2() {
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = selected ? ISSUES.filter((i) => i.testerId === selected) : ISSUES;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 border-b border-border pb-0">
        <button
          onClick={() => setSelected(null)}
          className={cn(
            'flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium transition-colors',
            !selected ? 'border-foreground text-foreground' : 'border-transparent text-foreground/40 hover:text-foreground/70',
          )}
        >
          <Users className="h-3.5 w-3.5" />
          All
          <span className="rounded-full bg-muted px-1.5 text-xs">{ISSUES.length}</span>
        </button>
        {TESTERS.map((t) => {
          const count = ISSUES.filter((i) => i.testerId === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium transition-colors',
                selected === t.id ? 'border-foreground text-foreground' : 'border-transparent text-foreground/40 hover:text-foreground/70',
              )}
            >
              <span className="text-xs">{t.emoji}</span>
              {t.name.split(' ').slice(1, 2).join(' ')}
              <span className="rounded-full bg-muted px-1.5 text-xs">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        {filtered.slice(0, 4).map((issue) => (
          <IssueRow key={issue.id} issue={issue} showTester={!selected} />
        ))}
      </div>
    </div>
  );
}

// ── Option 3: Filter Chips (Multi-select) ──────────────────
function Option3() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filtered = selected.size > 0 ? ISSUES.filter((i) => selected.has(i.testerId)) : ISSUES;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Filter by tester:</span>
        {TESTERS.map((t) => (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
              selected.has(t.id)
                ? 'border-foreground/30 bg-foreground/5 text-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/20',
            )}
          >
            <span>{t.emoji}</span>
            {t.name.split(' ').slice(1, 2).join(' ')}
            {selected.has(t.id) && <X className="h-3 w-3" />}
          </button>
        ))}
        {selected.size > 0 && (
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground">
            Clear all
          </button>
        )}
      </div>
      <div className="space-y-2">
        {filtered.slice(0, 4).map((issue) => (
          <IssueRow key={issue.id} issue={issue} showTester />
        ))}
      </div>
    </div>
  );
}

// ── Option 4: Side-by-Side Comparison ──────────────────────
function Option4() {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(1);
  const leftTester = TESTERS[left];
  const rightTester = TESTERS[right];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Columns2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Compare Testers</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[leftTester, rightTester].map((tester, idx) => (
          <div key={tester.id} className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
              <TesterAvatar emoji={tester.emoji} />
              <div>
                <div className="text-sm font-medium">{tester.name}</div>
                <div className="text-xs text-muted-foreground">{tester.score}/100 {tester.emotionEmoji}</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {ISSUES.filter((i) => i.testerId === tester.id).slice(0, 3).map((issue) => (
                <div key={issue.id} className="flex items-start gap-2 rounded border border-border/50 p-2 text-xs">
                  <SeverityDot severity={issue.severity} />
                  <p className="text-foreground/80 line-clamp-2">{issue.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Option 5: Kanban Columns ───────────────────────────────
function Option5() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Issues by Tester</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {TESTERS.map((tester) => {
          const testerIssues = ISSUES.filter((i) => i.testerId === tester.id);
          return (
            <div key={tester.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TesterAvatar emoji={tester.emoji} size="sm" />
                  <span className="text-xs font-semibold">{tester.name.split(' ').slice(1, 3).join(' ')}</span>
                </div>
                <span className="text-xs text-muted-foreground">{tester.score}/100</span>
              </div>
              <div className="space-y-1.5">
                {testerIssues.slice(0, 3).map((issue) => (
                  <div key={issue.id} className={cn('rounded-lg border p-2 text-xs', SEVERITY_CONFIG[issue.severity].border, SEVERITY_CONFIG[issue.severity].bg)}>
                    <div className="flex items-center gap-1 mb-1">
                      <SeverityDot severity={issue.severity} />
                      <span className={cn('font-semibold uppercase text-[10px]', SEVERITY_CONFIG[issue.severity].color)}>
                        {SEVERITY_CONFIG[issue.severity].label}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-foreground/70">{issue.description}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Option 6: Compact Summary Bar + Merged Feed ────────────
function Option6() {
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = selected ? ISSUES.filter((i) => i.testerId === selected) : ISSUES;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {TESTERS.map((t) => {
          const count = ISSUES.filter((i) => i.testerId === t.id && i.severity === 'critical').length;
          return (
            <button
              key={t.id}
              onClick={() => setSelected(selected === t.id ? null : t.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-2.5 transition-all flex-1',
                selected === t.id ? 'border-foreground/30 bg-foreground/[0.03] ring-1 ring-foreground/10' : 'border-border hover:border-foreground/20',
              )}
            >
              <TesterAvatar emoji={t.emoji} size="sm" />
              <div className="text-left">
                <div className="text-xs font-semibold">{t.name.split(' ').slice(1, 3).join(' ')}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{t.score}</span>/100
                  {count > 0 && <span className="text-red-500 font-medium">{count} critical</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        {filtered.slice(0, 4).map((issue) => (
          <IssueRow key={issue.id} issue={issue} showTester={!selected} />
        ))}
      </div>
    </div>
  );
}

// ── Option 7: Accordion per Tester ─────────────────────────
function Option7() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['1']));

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {TESTERS.map((tester) => {
        const isOpen = expanded.has(tester.id);
        const testerIssues = ISSUES.filter((i) => i.testerId === tester.id);
        const critCount = testerIssues.filter((i) => i.severity === 'critical').length;

        return (
          <div key={tester.id} className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => toggle(tester.id)}
              className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
            >
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <TesterAvatar emoji={tester.emoji} size="sm" />
              <span className="text-sm font-medium flex-1">{tester.name}</span>
              <span className="text-sm font-bold">{tester.score}/100</span>
              <span className="text-xs text-muted-foreground">{tester.emotionEmoji}</span>
              {critCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{critCount} critical</span>
              )}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{testerIssues.length} issues</span>
            </button>
            {isOpen && (
              <div className="border-t border-border bg-muted/10 p-3 space-y-2">
                {testerIssues.slice(0, 3).map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Option 8: Thin Filter Sidebar + Full-width Feed ────────
function Option8() {
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = selected ? ISSUES.filter((i) => i.testerId === selected) : ISSUES;

  return (
    <div className="flex gap-3">
      <div className="w-40 shrink-0 space-y-1">
        <SectionLabel>Testers</SectionLabel>
        <button
          onClick={() => setSelected(null)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
            !selected ? 'bg-foreground/5 text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Users className="h-3.5 w-3.5" />
          All testers
          <span className="ml-auto text-muted-foreground">{ISSUES.length}</span>
        </button>
        {TESTERS.map((t) => {
          const count = ISSUES.filter((i) => i.testerId === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                selected === t.id ? 'bg-foreground/5 text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{t.emoji}</span>
              <span className="truncate">{t.name.split(' ').slice(1, 3).join(' ')}</span>
              <span className="ml-auto">{count}</span>
            </button>
          );
        })}
        <div className="mt-4 space-y-1">
          <SectionLabel>Severity</SectionLabel>
          {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
            const count = filtered.filter((i) => i.severity === key).length;
            return (
              <div key={key} className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                <SeverityDot severity={key} />
                <span>{config.label}</span>
                <span className="ml-auto">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {filtered.slice(0, 4).map((issue) => (
          <IssueRow key={issue.id} issue={issue} showTester={!selected} />
        ))}
      </div>
    </div>
  );
}

// ── Option 9: Dashboard Grid (Summary Cards → Expand) ──────
function Option9() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {TESTERS.map((tester) => {
          const testerIssues = ISSUES.filter((i) => i.testerId === tester.id);
          const isExpanded = expanded === tester.id;
          const critCount = testerIssues.filter((i) => i.severity === 'critical').length;
          const majorCount = testerIssues.filter((i) => i.severity === 'major').length;

          return (
            <button
              key={tester.id}
              onClick={() => setExpanded(isExpanded ? null : tester.id)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all',
                isExpanded ? 'border-foreground/20 ring-1 ring-foreground/10 bg-foreground/[0.02]' : 'border-border hover:border-foreground/15',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <TesterAvatar emoji={tester.emoji} />
                <div className="text-right">
                  <div className="text-lg font-bold">{tester.score}</div>
                  <div className="text-[10px] text-muted-foreground">/100</div>
                </div>
              </div>
              <div className="text-xs font-semibold">{tester.name}</div>
              <div className="text-[11px] text-muted-foreground mb-2">{tester.role}</div>
              <div className="flex gap-1.5">
                {critCount > 0 && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">{critCount} critical</span>
                )}
                {majorCount > 0 && (
                  <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">{majorCount} major</span>
                )}
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{testerIssues.length} total</span>
              </div>
            </button>
          );
        })}
      </div>
      {expanded && (
        <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <TesterAvatar emoji={TESTERS.find((t) => t.id === expanded)!.emoji} size="sm" />
            {TESTERS.find((t) => t.id === expanded)!.name} — Issues
          </div>
          {ISSUES.filter((i) => i.testerId === expanded).slice(0, 3).map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Option 10: Interleaved Timeline (All Testers) ──────────
function Option10() {
  const timelineItems = [
    { time: '0:12', testerId: '1', text: 'Navigated to /pricing — page loads but heading structure seems off.', type: 'step' as const },
    { time: '0:15', testerId: '3', text: 'Can\'t find the menu button... where is the navigation?', type: 'step' as const },
    { time: '0:18', testerId: '2', text: 'Looking for a contact form to test support flows.', type: 'step' as const },
    { time: '0:22', testerId: '1', text: 'Dropdown items have no accessible names — critical a11y issue.', type: 'issue' as const, severity: 'critical' as const },
    { time: '0:25', testerId: '3', text: 'Found the hamburger icon but it has no label. Very confusing.', type: 'issue' as const, severity: 'critical' as const },
    { time: '0:30', testerId: '2', text: 'Submit button — I can\'t see a focus ring with keyboard navigation.', type: 'issue' as const, severity: 'critical' as const },
    { time: '0:35', testerId: '1', text: 'Color contrast on helper text is too low: 2.8:1 ratio.', type: 'issue' as const, severity: 'major' as const },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Rows3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Live Timeline — All Testers</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
        {TESTERS.map((t) => (
          <span key={t.id} className="flex items-center gap-1">
            <span className={cn('h-2.5 w-2.5 rounded-full', t.color)} />
            {t.name.split(' ').slice(1, 3).join(' ')}
          </span>
        ))}
      </div>
      <div className="relative space-y-0">
        <div className="absolute left-[58px] top-0 bottom-0 w-px bg-border" />
        {timelineItems.map((item, idx) => {
          const tester = TESTERS.find((t) => t.id === item.testerId)!;
          return (
            <div key={idx} className="flex items-start gap-3 py-2 relative">
              <span className="w-10 text-right text-[11px] text-muted-foreground tabular-nums shrink-0">{item.time}</span>
              <div className={cn('relative z-10 mt-0.5 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center', tester.color)}>
                <span className="text-[8px] text-white">{tester.emoji}</span>
              </div>
              <div className={cn(
                'flex-1 rounded-lg border p-2 text-xs',
                item.type === 'issue' ? cn(SEVERITY_CONFIG[item.severity!].bg, SEVERITY_CONFIG[item.severity!].border) : 'border-border',
              )}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-medium text-foreground/70">{tester.name.split(' ').slice(1, 3).join(' ')}</span>
                  {item.type === 'issue' && (
                    <span className={cn('font-semibold uppercase text-[10px]', SEVERITY_CONFIG[item.severity!].color)}>
                      {SEVERITY_CONFIG[item.severity!].label}
                    </span>
                  )}
                </div>
                <p className="text-foreground/80">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Demo Page ─────────────────────────────────────────

const OPTIONS = [
  { id: '1', label: 'Unified Feed', desc: 'Single merged feed with inline tester badges — no selection needed. Shows who found what.', component: Option1 },
  { id: '2', label: 'Tester Tabs', desc: 'Horizontal tabs at top: "All" + one tab per tester. Clean, familiar pattern.', component: Option2 },
  { id: '3', label: 'Filter Chips', desc: 'Multi-select filter chips — toggle one or more testers. Flexible combination filtering.', component: Option3 },
  { id: '4', label: 'Side-by-Side', desc: 'Two-column comparison of any two testers. Great for spotting where different personas diverge.', component: Option4 },
  { id: '5', label: 'Kanban Columns', desc: 'One column per tester, issues as cards. Quick visual overview of distribution.', component: Option5 },
  { id: '6', label: 'Summary Bar + Feed', desc: 'Compact tester score cards at top, unified feed below. Click a card to filter.', component: Option6 },
  { id: '7', label: 'Accordion', desc: 'Collapsible sections per tester. Open multiple at once. Keeps hierarchy clear.', component: Option7 },
  { id: '8', label: 'Filter Sidebar', desc: 'Thin left sidebar for tester + severity filters. Feed takes full width.', component: Option8 },
  { id: '9', label: 'Dashboard Grid', desc: 'Tester summary cards in a grid. Click to expand and see issues inline below.', component: Option9 },
  { id: '10', label: 'Interleaved Timeline', desc: 'Chronological timeline of all testers\' actions and findings. Color-coded by tester.', component: Option10 },
];

export default function ResultsFeedDemo() {
  const [selected, setSelected] = useState('1');
  const Option = OPTIONS.find((o) => o.id === selected)!;
  const Component = Option.component;

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div>
        <Link href="/demo" className="text-xs text-muted-foreground hover:text-foreground mb-2 inline-block">&larr; Back to demos</Link>
        <h1 className="text-lg font-semibold">Results Feed Layout</h1>
        <p className="text-sm text-muted-foreground mt-1">
          10 options for showing findings from multiple testers. The current layout only shows one tester at a time with no &ldquo;All&rdquo; option.
        </p>
      </div>

      {/* Option selector */}
      <div className="space-y-2">
        <SectionLabel>Pick a layout</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                selected === opt.id
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
              )}
            >
              {opt.id}. {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{Option.desc}</p>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-border bg-background p-5">
        <Component />
      </div>

      {/* Comparison table */}
      <div className="space-y-2">
        <SectionLabel>Quick Comparison</SectionLabel>
        <div className="overflow-hidden rounded-lg border border-border text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">#</th>
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Layout</th>
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Shows All</th>
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Filter</th>
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Compare</th>
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Best For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ['1', 'Unified Feed', '✅', '—', '—', 'Quick scan of all issues'],
                ['2', 'Tester Tabs', '✅', 'Single', '—', 'Familiar pattern, easy switching'],
                ['3', 'Filter Chips', '✅', 'Multi', '—', 'Flexible combos, power users'],
                ['4', 'Side-by-Side', '—', '—', '✅', 'Comparing two testers directly'],
                ['5', 'Kanban Columns', '✅', '—', '✅', 'Visual distribution overview'],
                ['6', 'Summary Bar', '✅', 'Single', '—', 'Scores visible + filtered feed'],
                ['7', 'Accordion', '✅', 'Toggle', '—', 'Clear hierarchy per tester'],
                ['8', 'Filter Sidebar', '✅', 'Multi+Sev', '—', 'Complex filtering (tester + severity)'],
                ['9', 'Dashboard Grid', '✅', 'Single', '—', 'Summary first, details on demand'],
                ['10', 'Timeline', '✅', '—', '—', 'Chronological narrative, live feel'],
              ].map((row) => (
                <tr key={row[0]} className={cn(selected === row[0] && 'bg-foreground/[0.03]')}>
                  {row.map((cell, i) => (
                    <td key={i} className={cn('py-2 px-3', i === 0 && 'font-mono')}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
