'use client';

import { useState } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, CheckCircle, AlertCircle, MinusCircle, GitCompare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useCompareStudies } from '@/hooks/use-comparison';
import * as api from '@/lib/api-client';
import { SEVERITY_COLORS } from '@/lib/constants';
import type { IssueDiff } from '@/types';

function IssueDiffRow({ issue }: { issue: IssueDiff }) {
  const statusIcon = { fixed: <CheckCircle className="h-4 w-4 text-green-500" />, new: <AlertCircle className="h-4 w-4 text-red-500" />, persisting: <MinusCircle className="h-4 w-4 text-yellow-500" /> }[issue.status] ?? null;
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      {statusIcon}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={SEVERITY_COLORS[issue.severity] ?? ''}>{issue.severity}</Badge>
          {issue.element && <code className="text-xs text-muted-foreground">{issue.element}</code>}
        </div>
        <p className="text-sm">{issue.description}</p>
        {issue.page_url && <p className="mt-1 text-xs text-muted-foreground">{issue.page_url}</p>}
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [baselineId, setBaselineId] = useState('');
  const [comparisonId, setComparisonId] = useState('');
  const { data: studies } = useQuery({ queryKey: ['studies', 'complete'], queryFn: () => api.listStudies(1, 100, 'complete') });
  const compare = useCompareStudies();

  const completedStudies = studies?.items ?? [];
  const result = compare.data;

  return (
    <div className="space-y-6 p-6">
      <div><h1 className="flex items-center gap-2 text-2xl font-semibold"><GitCompare className="h-6 w-6" />Compare Studies</h1><p className="text-sm text-muted-foreground">Compare two study runs side-by-side to see what improved or regressed</p></div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Baseline (before)</label>
            <Select value={baselineId} onValueChange={setBaselineId}>
              <SelectTrigger><SelectValue placeholder="Select baseline study" /></SelectTrigger>
              <SelectContent>{completedStudies.map(s => <SelectItem key={s.id} value={s.id}>{s.url} — {s.overall_score ?? '?'}/100 ({new Date(s.created_at).toLocaleDateString()})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Comparison (after)</label>
            <Select value={comparisonId} onValueChange={setComparisonId}>
              <SelectTrigger><SelectValue placeholder="Select comparison study" /></SelectTrigger>
              <SelectContent>{completedStudies.map(s => <SelectItem key={s.id} value={s.id}>{s.url} — {s.overall_score ?? '?'}/100 ({new Date(s.created_at).toLocaleDateString()})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button disabled={!baselineId || !comparisonId || compare.isPending} onClick={() => compare.mutate({ baselineId, comparisonId })}>
            {compare.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitCompare className="mr-2 h-4 w-4" />}Compare
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Card><CardContent className="pt-6 text-center">
              <p className="text-xs text-muted-foreground">Score Delta</p>
              <p className={`text-3xl font-bold ${result.score_improved ? 'text-green-600 dark:text-green-400' : result.score_delta < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                {result.score_delta > 0 ? '+' : ''}{result.score_delta.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">{result.baseline_score?.toFixed(0)} → {result.comparison_score?.toFixed(0)}</p>
              {result.score_improved ? <TrendingUp className="mx-auto mt-1 h-5 w-5 text-green-500" /> : <TrendingDown className="mx-auto mt-1 h-5 w-5 text-red-500" />}
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Issues Fixed</p><p className="text-3xl font-bold text-green-600 dark:text-green-400">{result.issues_fixed.length}</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">New Issues</p><p className="text-3xl font-bold text-red-600 dark:text-red-400">{result.issues_new.length}</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Persisting</p><p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{result.issues_persisting.length}</p></CardContent></Card>
          </div>

          <Card><CardContent className="pt-6"><p className="text-sm">{result.summary}</p></CardContent></Card>

          <Tabs defaultValue="fixed">
            <TabsList><TabsTrigger value="fixed">Fixed ({result.issues_fixed.length})</TabsTrigger><TabsTrigger value="new">New ({result.issues_new.length})</TabsTrigger><TabsTrigger value="persisting">Persisting ({result.issues_persisting.length})</TabsTrigger></TabsList>
            <TabsContent value="fixed" className="space-y-2 pt-4">{result.issues_fixed.length ? result.issues_fixed.map((d, i) => <IssueDiffRow key={i} issue={d} />) : <p className="py-8 text-center text-sm text-muted-foreground">No fixed issues</p>}</TabsContent>
            <TabsContent value="new" className="space-y-2 pt-4">{result.issues_new.length ? result.issues_new.map((d, i) => <IssueDiffRow key={i} issue={d} />) : <p className="py-8 text-center text-sm text-muted-foreground">No new issues</p>}</TabsContent>
            <TabsContent value="persisting" className="space-y-2 pt-4">{result.issues_persisting.length ? result.issues_persisting.map((d, i) => <IssueDiffRow key={i} issue={d} />) : <p className="py-8 text-center text-sm text-muted-foreground">No persisting issues</p>}</TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
