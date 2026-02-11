'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExecutiveSummaryProps {
  summary: string | null;
}

export function ExecutiveSummary({ summary }: ExecutiveSummaryProps) {
  if (!summary) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Executive Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {summary}
        </p>
      </CardContent>
    </Card>
  );
}
