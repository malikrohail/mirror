'use client';

import { useState } from 'react';
import { Wand2, Copy, Check, Code, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api-client';
import type { FixSuggestionOut } from '@/types';

interface FixPanelProps {
  studyId: string;
}

export function FixPanel({ studyId }: FixPanelProps) {
  const qc = useQueryClient();
  const { data: fixes, isLoading } = useQuery({ queryKey: ['fixes', studyId], queryFn: () => api.listFixes(studyId) });
  const gen = useMutation({ mutationFn: () => api.generateFixes(studyId), onSuccess: () => qc.invalidateQueries({ queryKey: ['fixes', studyId] }) });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg"><Wand2 className="h-5 w-5" />AI Fix Suggestions</CardTitle>
        <Button onClick={() => gen.mutate()} disabled={gen.isPending} size="sm">{gen.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}{fixes?.length ? 'Generate More' : 'Generate Fixes'}</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        : !fixes?.length ? (
          <div className="py-8 text-center"><Code className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">Click &quot;Generate Fixes&quot; to get AI-powered code fixes for your UX issues.</p></div>
        ) : (
          <div className="space-y-3">
            {gen.data && <p className="text-sm text-green-600 dark:text-green-400">Generated {gen.data.fixes_generated} new fixes</p>}
            {fixes.map(f => <FixCard key={f.issue_id} fix={f} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FixCard({ fix }: { fix: FixSuggestionOut }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const sevCls = { critical: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400', major: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400', minor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400', enhancement: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' }[fix.severity] || '';
  const langCls = { css: 'text-blue-500', html: 'text-orange-500', javascript: 'text-yellow-500', react: 'text-cyan-500' }[fix.fix_language || ''] || 'text-gray-500';

  const handleCopy = async () => { if (fix.fix_code) { await navigator.clipboard.writeText(fix.fix_code); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="outline" className={sevCls}>{fix.severity}</Badge>
            {fix.fix_language && <Badge variant="outline" className={langCls}>{fix.fix_language}</Badge>}
            {fix.element && <code className="text-xs text-muted-foreground">{fix.element}</code>}
          </div>
          <p className="text-sm">{fix.description}</p>
          {fix.fix_suggestion && <p className="mt-1 text-sm text-muted-foreground">{fix.fix_suggestion}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
      </div>
      {expanded && fix.fix_code && (
        <div className="mt-3">
          <div className="flex items-center justify-between rounded-t-md bg-zinc-800 px-3 py-1.5 dark:bg-zinc-900">
            <span className="text-xs text-zinc-400">{fix.fix_language || 'code'}</span>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2 text-zinc-400 hover:text-white">{copied ? <><Check className="mr-1 h-3 w-3" />Copied</> : <><Copy className="mr-1 h-3 w-3" />Copy</>}</Button>
          </div>
          <pre className="overflow-x-auto rounded-b-md bg-zinc-900 p-3 text-sm text-zinc-100 dark:bg-zinc-950"><code>{fix.fix_code}</code></pre>
        </div>
      )}
    </div>
  );
}
