'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, History, Globe, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrackedUrls, useScoreHistory } from '@/hooks/use-score-history';

function fmtDate(iso: string | null) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TrendBadge({ trend }: { trend: 'improving' | 'declining' | 'stable' | null }) {
  if (!trend) return null;
  const cfg = {
    improving: { label: 'Improving', icon: TrendingUp, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
    declining: { label: 'Declining', icon: TrendingDown, cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
    stable: { label: 'Stable', icon: Minus, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  }[trend];
  const Icon = cfg.icon;
  return <Badge variant="outline" className={cfg.cls}><Icon className="mr-1 h-3 w-3" />{cfg.label}</Badge>;
}

function ScoreVal({ s }: { s: number | null }) {
  if (s === null) return <span className="text-muted-foreground">--</span>;
  const c = s >= 80 ? 'text-emerald-600 dark:text-emerald-400' : s >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
  return <span className={`font-semibold ${c}`}>{s}</span>;
}

function UrlTable({ selected, onSelect }: { selected: string | null; onSelect: (u: string) => void }) {
  const { data: urls, isLoading } = useTrackedUrls();
  if (isLoading) return <>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</>;
  if (!urls?.length) return <div className="flex flex-col items-center gap-3 py-16"><Globe className="h-10 w-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">No tracked URLs yet. Complete a study to start tracking.</p></div>;
  return (
    <Table><TableHeader><TableRow><TableHead>URL</TableHead><TableHead className="text-center">Studies</TableHead><TableHead className="text-center">Score</TableHead><TableHead className="text-right">Last Tested</TableHead></TableRow></TableHeader>
      <TableBody>{urls.map(u => (
        <TableRow key={u.url} className={`cursor-pointer ${selected === u.url ? 'bg-muted' : ''}`} onClick={() => onSelect(u.url)}>
          <TableCell className="max-w-xs truncate font-medium">{u.url}</TableCell>
          <TableCell className="text-center">{u.study_count}</TableCell>
          <TableCell className="text-center"><ScoreVal s={u.latest_score} /></TableCell>
          <TableCell className="text-right text-muted-foreground">{fmtDate(u.last_tested)}</TableCell>
        </TableRow>
      ))}</TableBody></Table>
  );
}

function ScoreChart({ url }: { url: string }) {
  const { data, isLoading } = useScoreHistory(url);
  if (isLoading) return <Skeleton className="h-[400px] w-full" />;
  if (!data?.data_points.length) return <div className="flex flex-col items-center gap-3 py-16"><BarChart3 className="h-10 w-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">No score data available.</p></div>;

  const chartData = data.data_points.filter(p => p.score !== null).map(p => ({ date: fmtShort(p.created_at), score: p.score, study_id: p.study_id, full: fmtDate(p.created_at) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold truncate max-w-lg">{url}</h2><p className="text-sm text-muted-foreground">{data.total_studies} studies tracked</p></div><TrendBadge trend={data.trend} /></div>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Average Score</p><p className="text-2xl font-bold">{data.average_score ?? '--'}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Studies</p><p className="text-2xl font-bold">{data.total_studies}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Score Delta</p><p className="text-2xl font-bold">{data.score_delta !== null ? `${data.score_delta > 0 ? '+' : ''}${data.score_delta}` : '--'}</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-base">Score Trend</CardTitle></CardHeader><CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { score: number; full: string; study_id: string };
                return <div className="rounded-lg border bg-background p-3 shadow-md"><p className="text-sm font-medium">Score: {d.score}</p><p className="text-xs text-muted-foreground">{d.full}</p><Link href={`/study/${d.study_id}`} className="mt-1 block text-xs text-primary underline">View study</Link></div>;
              }} />
              <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} fill="url(#sg)" dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>
    </div>
  );
}

export default function HistoryPage() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3"><History className="h-6 w-6 text-muted-foreground" /><div><h1 className="text-lg font-semibold">Score History</h1><p className="text-sm text-muted-foreground">Track UX scores for your URLs over time</p></div></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        <Card><CardHeader><CardTitle className="text-base">Tracked URLs</CardTitle></CardHeader><CardContent><UrlTable selected={selected} onSelect={setSelected} /></CardContent></Card>
        <div>{selected ? <ScoreChart url={selected} /> : <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center"><BarChart3 className="h-10 w-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">Select a URL to view its score trend</p></div>}</div>
      </div>
    </div>
  );
}
