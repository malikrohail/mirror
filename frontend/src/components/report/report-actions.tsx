'use client';

import { useState } from 'react';
import { Download, FileText, Check, Monitor, MoreVertical, ChevronDown, Sparkles, Send, Copy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getReportPdfUrl } from '@/lib/api-client';
import { toast } from 'sonner';

function LinearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z" />
    </svg>
  );
}

const AI_EXAMPLE = `## Critical Issues

| # | Issue | Severity |
|---|-------|----------|
| 1 | CTA buttons non-functional | Critical |
| 2 | Cloudflare blocking signup | Critical |

## Recommendations
1. Fix button routing to /signup
2. Add Cloudflare verification fallback`;

const HUMAN_EXAMPLE = `3 critical issues on the pricing page:

- CTA buttons don't work → Fix routing
- Cloudflare blocks signup → Add fallback
- Pricing labels unclear → Rename tiers

Score: 12/100. Needs immediate fixes.`;

interface ReportActionsProps {
  studyId: string;
  markdownContent?: string;
}

export function ReportActions({ studyId, markdownContent }: ReportActionsProps) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);
  const [copiedHuman, setCopiedHuman] = useState(false);

  const copyMarkdown = async () => {
    if (!markdownContent) return;
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopiedMd(true);
      toast.success('Markdown copied to clipboard');
      setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const shareWithAiDev = () => {
    if (!markdownContent) return;
    const text = `Here is a UX test report. Please analyze it and fix the issues found:\n\n${markdownContent}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAi(true);
      toast.success('Report copied — paste it into Claude Code or Cursor');
      setTimeout(() => setCopiedAi(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const shareWithHumanDev = () => {
    if (!markdownContent) return;
    navigator.clipboard.writeText(markdownContent).then(() => {
      setCopiedHuman(true);
      toast.success('Report copied — share it with your team');
      setTimeout(() => setCopiedHuman(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5">
            <Send className="h-3.5 w-3.5 text-foreground/50" />
            Share with dev
            <ChevronDown className="h-3 w-3 text-foreground/40" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[480px] p-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              className="group rounded-lg border border-border text-left cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={shareWithAiDev}
              disabled={!markdownContent}
            >
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-4 w-4 text-foreground/50" />
                  <span className="text-[16px] font-medium text-foreground/70">AI</span>
                </div>
                <p className="text-[14px] font-normal text-foreground/70">Full markdown report for Claude Code, Cursor, etc.</p>
              </div>
              <div className="border-t border-border" />
              <div className="p-3">
                <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/40 line-clamp-6">{AI_EXAMPLE}</pre>
              </div>
              <div className="border-t border-border" />
              <div className="p-3">
                <span className="flex items-center justify-center gap-1.5 w-full rounded-md border border-border px-3 py-1.5 text-[14px] font-normal text-foreground/70 group-hover:bg-accent transition-colors">
                  {copiedAi ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedAi ? 'Copied' : 'Copy to clipboard'}
                </span>
              </div>
            </button>
            <button
              className="group rounded-lg border border-border text-left cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={shareWithHumanDev}
              disabled={!markdownContent}
            >
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Monitor className="h-4 w-4 text-foreground/50" />
                  <span className="text-[16px] font-medium text-foreground/70">Human</span>
                </div>
                <p className="text-[14px] font-normal text-foreground/70">Shorter, task-oriented summary for your team</p>
              </div>
              <div className="border-t border-border" />
              <div className="p-3">
                <pre className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-foreground/40 line-clamp-6">{HUMAN_EXAMPLE}</pre>
              </div>
              <div className="border-t border-border" />
              <div className="p-3">
                <span className="flex items-center justify-center gap-1.5 w-full rounded-md border border-border px-3 py-1.5 text-[14px] font-normal text-foreground/70 group-hover:bg-accent transition-colors">
                  {copiedHuman ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedHuman ? 'Copied' : 'Copy to clipboard'}
                </span>
              </div>
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="outline" size="sm" className="text-[14px] font-normal text-foreground/70 gap-1.5" disabled>
              <LinearIcon className="h-3.5 w-3.5 text-foreground/50" />
              Open Linear ticket
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Coming soon</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="px-2">
            <MoreVertical className="h-3.5 w-3.5 text-foreground/50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={getReportPdfUrl(studyId)} download>
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyMarkdown} disabled={copiedMd}>
            {copiedMd ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {copiedMd ? 'Copied' : 'Copy Markdown'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
