'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getReportMdUrl, getReportPdfUrl } from '@/lib/api-client';

interface ExportButtonProps {
  studyId: string;
}

export function ExportButton({ studyId }: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={getReportMdUrl(studyId)} download>
            Download Markdown
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={getReportPdfUrl(studyId)} download>
            Download PDF
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
