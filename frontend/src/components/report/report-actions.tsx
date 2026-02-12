'use client';

import { useState } from 'react';
import { Download, FileText, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getReportMdUrl, getReportPdfUrl } from '@/lib/api-client';
import { toast } from 'sonner';

interface ReportActionsProps {
  studyId: string;
  markdownContent?: string;
}

export function ReportActions({ studyId, markdownContent }: ReportActionsProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (!markdownContent) return;
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={getReportMdUrl(studyId)} download>
          <FileText className="mr-2 h-4 w-4" />
          Markdown
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={getReportPdfUrl(studyId)} download>
          <Download className="mr-2 h-4 w-4" />
          PDF
        </a>
      </Button>
      {markdownContent && (
        <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={copied}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      )}
    </div>
  );
}
