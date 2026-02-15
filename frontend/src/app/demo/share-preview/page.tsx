'use client';

import { useState } from 'react';
import { Sparkles, Monitor, Send, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const AI_SNIPPET = `## Critical Issues Found

| # | Issue | Severity | Heuristic |
|---|-------|----------|-----------|
| 1 | CTA buttons non-functional | Critical | Error Prevention |
| 2 | Cloudflare blocking flow | Critical | User Control |
| 3 | Ambiguous pricing labels | Major | Match Real World |

### Recommendations
1. Fix 'Try Claude' button routing
2. Add Cloudflare verification fallback...`;

const HUMAN_SNIPPET = `3 critical issues found on claude.com/pricing:

- CTA buttons don't work → Fix routing to signup
- Cloudflare blocks the flow → Add fallback
- Pricing labels are confusing → Clarify tier names

Score: 12/100 — needs immediate attention.`;

function PreviewCard({ title, content, className }: { title: string; content: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-muted/50 p-3 ${className ?? ''}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-foreground/40 mb-1.5">{title}</p>
      <pre className="text-[12px] text-foreground/70 whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
    </div>
  );
}

/* ─── Option 1: Side tooltip with snippet ─── */
function Option1() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5">
          <Send className="h-3.5 w-3.5 text-foreground/50" />
          Share with dev
          <ChevronDown className="h-3 w-3 text-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[140px]">
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuItem>
              <Sparkles className="h-4 w-4" />
              AI
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[320px] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-foreground/50 mb-1">Preview</p>
            <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed">{AI_SNIPPET.slice(0, 200)}...</pre>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuItem>
              <Monitor className="h-4 w-4" />
              Human
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[320px] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-foreground/50 mb-1">Preview</p>
            <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed">{HUMAN_SNIPPET.slice(0, 200)}...</pre>
          </TooltipContent>
        </Tooltip>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Option 2: Inline preview below each item ─── */
function Option2() {
  const [hovered, setHovered] = useState<'ai' | 'human' | null>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5">
          <Send className="h-3.5 w-3.5 text-foreground/50" />
          Share with dev
          <ChevronDown className="h-3 w-3 text-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[340px]">
        <div
          onMouseEnter={() => setHovered('ai')}
          onMouseLeave={() => setHovered(null)}
        >
          <DropdownMenuItem>
            <Sparkles className="h-4 w-4" />
            AI
          </DropdownMenuItem>
          {hovered === 'ai' && (
            <div className="mx-2 mb-2 rounded-md bg-muted/60 p-2">
              <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/60">{AI_SNIPPET.slice(0, 180)}...</pre>
            </div>
          )}
        </div>
        <div
          onMouseEnter={() => setHovered('human')}
          onMouseLeave={() => setHovered(null)}
        >
          <DropdownMenuItem>
            <Monitor className="h-4 w-4" />
            Human
          </DropdownMenuItem>
          {hovered === 'human' && (
            <div className="mx-2 mb-2 rounded-md bg-muted/60 p-2">
              <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/60">{HUMAN_SNIPPET.slice(0, 180)}...</pre>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Option 3: Wide dropdown with side-by-side preview ─── */
function Option3() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5">
          <Send className="h-3.5 w-3.5 text-foreground/50" />
          Share with dev
          <ChevronDown className="h-3 w-3 text-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[520px] p-3">
        <div className="grid grid-cols-2 gap-3">
          <button className="text-left rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-4 w-4 text-foreground/50" />
              <span className="text-[13px] font-medium">AI</span>
            </div>
            <p className="text-[11px] text-foreground/40 mb-1.5">Full markdown for Claude Code, Cursor, etc.</p>
            <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/50 line-clamp-5">{AI_SNIPPET.slice(0, 160)}...</pre>
          </button>
          <button className="text-left rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-1.5 mb-2">
              <Monitor className="h-4 w-4 text-foreground/50" />
              <span className="text-[13px] font-medium">Human</span>
            </div>
            <p className="text-[11px] text-foreground/40 mb-1.5">Shorter, task-oriented summary for your team</p>
            <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/50 line-clamp-5">{HUMAN_SNIPPET.slice(0, 160)}...</pre>
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Option 4: Stacked cards in dropdown ─── */
function Option4() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5">
          <Send className="h-3.5 w-3.5 text-foreground/50" />
          Share with dev
          <ChevronDown className="h-3 w-3 text-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px] p-2 space-y-1.5">
        <button className="w-full text-left rounded-md border border-border p-2.5 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-foreground/50" />
            <span className="text-[13px] font-medium">AI</span>
            <span className="text-[11px] text-foreground/40 ml-auto">Claude Code, Cursor, etc.</span>
          </div>
          <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/40 line-clamp-3">{AI_SNIPPET.slice(0, 120)}...</pre>
        </button>
        <button className="w-full text-left rounded-md border border-border p-2.5 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <Monitor className="h-3.5 w-3.5 text-foreground/50" />
            <span className="text-[13px] font-medium">Human</span>
            <span className="text-[11px] text-foreground/40 ml-auto">Slack, email, etc.</span>
          </div>
          <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/40 line-clamp-3">{HUMAN_SNIPPET.slice(0, 120)}...</pre>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Option 5: Popover panel with tabs ─── */
function Option5() {
  const [tab, setTab] = useState<'ai' | 'human'>('ai');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5">
          <Send className="h-3.5 w-3.5 text-foreground/50" />
          Share with dev
          <ChevronDown className="h-3 w-3 text-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[360px] p-0">
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab('ai')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors ${tab === 'ai' ? 'text-foreground border-b-2 border-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI
          </button>
          <button
            onClick={() => setTab('human')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors ${tab === 'human' ? 'text-foreground border-b-2 border-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
          >
            <Monitor className="h-3.5 w-3.5" />
            Human
          </button>
        </div>
        <div className="p-3">
          <p className="text-[11px] text-foreground/40 mb-2">
            {tab === 'ai' ? 'Full markdown for Claude Code, Cursor, etc.' : 'Shorter, task-oriented summary for your team'}
          </p>
          <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/60 max-h-[200px] overflow-y-auto">
            {tab === 'ai' ? AI_SNIPPET : HUMAN_SNIPPET}
          </pre>
          <Button size="sm" className="w-full mt-3">
            Copy to clipboard
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Option 6: Right panel flyout on hover ─── */
function Option6() {
  const [hovered, setHovered] = useState<'ai' | 'human' | null>(null);

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5">
            <Send className="h-3.5 w-3.5 text-foreground/50" />
            Share with dev
            <ChevronDown className="h-3 w-3 text-foreground/40" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[140px]">
          <div onMouseEnter={() => setHovered('ai')} onMouseLeave={() => setHovered(null)}>
            <DropdownMenuItem>
              <Sparkles className="h-4 w-4" />
              AI
            </DropdownMenuItem>
          </div>
          <div onMouseEnter={() => setHovered('human')} onMouseLeave={() => setHovered(null)}>
            <DropdownMenuItem>
              <Monitor className="h-4 w-4" />
              Human
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {hovered && (
        <div className="absolute left-[160px] top-[36px] w-[300px] rounded-lg border border-border bg-popover p-3 shadow-md z-50">
          <p className="text-[11px] font-medium uppercase tracking-wider text-foreground/40 mb-1">
            {hovered === 'ai' ? 'AI Format' : 'Human Format'}
          </p>
          <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/60 max-h-[180px] overflow-y-auto">
            {hovered === 'ai' ? AI_SNIPPET : HUMAN_SNIPPET}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ─── Option 7: Tooltip with formatted code block ─── */
function Option7() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5">
          <Send className="h-3.5 w-3.5 text-foreground/50" />
          Share with dev
          <ChevronDown className="h-3 w-3 text-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[160px]">
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuItem>
              <Sparkles className="h-4 w-4" />
              AI
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[340px] p-0">
            <div className="p-2 border-b border-white/10">
              <span className="text-[11px] font-medium">Full markdown for Claude Code, Cursor, etc.</span>
            </div>
            <div className="p-2 bg-black/20 rounded-b-md">
              <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed opacity-80">{AI_SNIPPET.slice(0, 200)}...</pre>
            </div>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuItem>
              <Monitor className="h-4 w-4" />
              Human
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[340px] p-0">
            <div className="p-2 border-b border-white/10">
              <span className="text-[11px] font-medium">Shorter, task-oriented summary for your team</span>
            </div>
            <div className="p-2 bg-black/20 rounded-b-md">
              <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed opacity-80">{HUMAN_SNIPPET.slice(0, 200)}...</pre>
            </div>
          </TooltipContent>
        </Tooltip>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Option 8: Description + snippet below each item ─── */
function Option8() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5">
          <Send className="h-3.5 w-3.5 text-foreground/50" />
          Share with dev
          <ChevronDown className="h-3 w-3 text-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px] p-1.5 space-y-1">
        <button className="w-full text-left rounded-md px-3 py-2 hover:bg-accent transition-colors">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-foreground/50" />
            <span className="text-[13px] font-medium">AI</span>
          </div>
          <p className="text-[11px] text-foreground/40 mt-0.5 ml-5">Full markdown for Claude Code, Cursor, etc.</p>
          <div className="mt-1.5 ml-5 rounded bg-muted/60 px-2 py-1.5">
            <pre className="text-[10px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/40 line-clamp-3">{AI_SNIPPET.slice(0, 140)}...</pre>
          </div>
        </button>
        <button className="w-full text-left rounded-md px-3 py-2 hover:bg-accent transition-colors">
          <div className="flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5 text-foreground/50" />
            <span className="text-[13px] font-medium">Human</span>
          </div>
          <p className="text-[11px] text-foreground/40 mt-0.5 ml-5">Shorter, task-oriented summary for your team</p>
          <div className="mt-1.5 ml-5 rounded bg-muted/60 px-2 py-1.5">
            <pre className="text-[10px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/40 line-clamp-3">{HUMAN_SNIPPET.slice(0, 140)}...</pre>
          </div>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Option 9: Split dropdown — items left, live preview right ─── */
function Option9() {
  const [hovered, setHovered] = useState<'ai' | 'human'>('ai');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5">
          <Send className="h-3.5 w-3.5 text-foreground/50" />
          Share with dev
          <ChevronDown className="h-3 w-3 text-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[440px] p-0">
        <div className="flex">
          <div className="w-[140px] border-r border-border py-1">
            <div
              onMouseEnter={() => setHovered('ai')}
              className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer transition-colors ${hovered === 'ai' ? 'bg-accent' : ''}`}
            >
              <Sparkles className="h-3.5 w-3.5 text-foreground/50" />
              <span className="text-[13px]">AI</span>
            </div>
            <div
              onMouseEnter={() => setHovered('human')}
              className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer transition-colors ${hovered === 'human' ? 'bg-accent' : ''}`}
            >
              <Monitor className="h-3.5 w-3.5 text-foreground/50" />
              <span className="text-[13px]">Human</span>
            </div>
          </div>
          <div className="flex-1 p-3">
            <p className="text-[11px] text-foreground/40 mb-1.5">
              {hovered === 'ai' ? 'Full markdown for Claude Code, Cursor, etc.' : 'Shorter, task-oriented summary for your team'}
            </p>
            <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/50 max-h-[160px] overflow-y-auto">
              {hovered === 'ai' ? AI_SNIPPET : HUMAN_SNIPPET}
            </pre>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Option 10: Accordion expand in dropdown ─── */
function Option10() {
  const [expanded, setExpanded] = useState<'ai' | 'human' | null>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5">
          <Send className="h-3.5 w-3.5 text-foreground/50" />
          Share with dev
          <ChevronDown className="h-3 w-3 text-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px] p-1">
        <div>
          <div
            className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() => setExpanded(expanded === 'ai' ? null : 'ai')}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-foreground/50" />
              <span className="text-[13px]">AI</span>
            </div>
            <ChevronDown className={`h-3 w-3 text-foreground/30 transition-transform ${expanded === 'ai' ? 'rotate-180' : ''}`} />
          </div>
          {expanded === 'ai' && (
            <div className="mx-2 mb-1.5 rounded bg-muted/60 p-2">
              <p className="text-[11px] text-foreground/40 mb-1">Full markdown for Claude Code, Cursor, etc.</p>
              <pre className="text-[10px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/50">{AI_SNIPPET.slice(0, 180)}...</pre>
              <button className="mt-2 text-[11px] font-medium text-foreground/60 hover:text-foreground transition-colors">
                Copy to clipboard →
              </button>
            </div>
          )}
        </div>
        <div>
          <div
            className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() => setExpanded(expanded === 'human' ? null : 'human')}
          >
            <div className="flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5 text-foreground/50" />
              <span className="text-[13px]">Human</span>
            </div>
            <ChevronDown className={`h-3 w-3 text-foreground/30 transition-transform ${expanded === 'human' ? 'rotate-180' : ''}`} />
          </div>
          {expanded === 'human' && (
            <div className="mx-2 mb-1.5 rounded bg-muted/60 p-2">
              <p className="text-[11px] text-foreground/40 mb-1">Shorter, task-oriented summary for your team</p>
              <pre className="text-[10px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/50">{HUMAN_SNIPPET.slice(0, 180)}...</pre>
              <button className="mt-2 text-[11px] font-medium text-foreground/60 hover:text-foreground transition-colors">
                Copy to clipboard →
              </button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const OPTIONS = [
  { id: 1, name: 'Side Tooltip', desc: 'Tooltip appears to the right with a snippet preview', component: Option1 },
  { id: 2, name: 'Inline Expand on Hover', desc: 'Snippet slides in below the hovered item', component: Option2 },
  { id: 3, name: 'Side-by-Side Cards', desc: 'Wide dropdown showing both formats as clickable cards', component: Option3 },
  { id: 4, name: 'Stacked Cards', desc: 'Vertical cards with snippet preview and metadata', component: Option4 },
  { id: 5, name: 'Tabbed Panel', desc: 'Tab switcher between AI/Human with full preview + copy button', component: Option5 },
  { id: 6, name: 'Flyout Panel', desc: 'Floating panel appears alongside the dropdown on hover', component: Option6 },
  { id: 7, name: 'Rich Tooltip', desc: 'Dark tooltip with header + code block section', component: Option7 },
  { id: 8, name: 'Description + Snippet', desc: 'Each item shows description and a muted code preview', component: Option8 },
  { id: 9, name: 'Split Pane', desc: 'Menu items on left, live preview panel on right', component: Option9 },
  { id: 10, name: 'Accordion', desc: 'Click to expand each item and see preview + copy action', component: Option10 },
];

export default function SharePreviewDemo() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold mb-2">Share with Dev — Preview Options</h1>
      <p className="text-muted-foreground mb-8">10 ways to show a snippet preview when hovering/selecting AI vs Human format</p>

      <div className="space-y-12">
        {OPTIONS.map(({ id, name, desc, component: Component }) => (
          <div key={id} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">
                Option {id}: {name}
              </h2>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-6 min-h-[80px] flex items-start">
              <Component />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
