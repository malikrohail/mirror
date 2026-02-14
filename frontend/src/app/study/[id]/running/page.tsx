'use client';

import { use, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, MoreVertical, Terminal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '@/lib/api-client';
import { useDeleteStudy } from '@/hooks/use-study';
import { useStudyStore } from '@/stores/study-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StudyProgress } from '@/components/study/study-progress';

export default function StudyRunningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const deleteStudy = useDeleteStudy();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeStudy = useStudyStore((s) => s.activeStudy);
  const logs = useStudyStore((s) => s.logs);
  const [logsOpen, setLogsOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const { data: study } = useQuery({
    queryKey: ['study-header', id],
    queryFn: () => api.getStudy(id),
    refetchInterval: 3000,
    enabled: !!id,
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions-progress', id],
    queryFn: () => api.listSessions(id),
    refetchInterval: 2000,
    enabled: !!id && (study?.status === 'running' || study?.status === 'analyzing'),
  });

  const { data: liveState } = useQuery({
    queryKey: ['live-state', id],
    queryFn: () => api.getLiveState(id),
    refetchInterval: 1500,
    enabled: !!id && study?.status === 'running',
  });

  const isRunning = study?.status === 'running';
  const isAnalyzing = study?.status === 'analyzing';
  const isComplete = study?.status === 'complete';
  const isFailed = study?.status === 'failed';
  const isInProgress = isRunning || isAnalyzing;

  // Calculate progress
  const maxSteps = 30;
  const totalSessions = sessions?.length ?? 0;
  const sessionProgress = sessions?.reduce((sum, s) => {
    if (s.status === 'complete' || s.status === 'failed') return sum + 1;
    const ws = activeStudy?.personas[s.id];
    const polled = liveState?.[s.id];
    const step = ws?.step_number ?? (polled as Record<string, unknown>)?.step_number as number ?? s.total_steps ?? 0;
    return sum + Math.min(step / maxSteps, 0.95);
  }, 0) ?? 0;
  const percent = isComplete
    ? 100
    : isFailed
      ? 0
      : isAnalyzing
        ? 90
        : totalSessions > 0
          ? Math.round((sessionProgress / totalSessions) * 80)
          : 0;

  const phaseLabel = isComplete
    ? 'Complete'
    : isFailed
      ? 'Failed'
      : isAnalyzing
        ? 'Analyzing'
        : isRunning
          ? 'Navigating'
          : 'Starting';

  const handleDelete = () => {
    deleteStudy.mutate(id, {
      onSuccess: () => {
        toast.success('Test deleted');
        router.push('/tests');
      },
      onError: () => {
        toast.error('Failed to delete test');
      },
    });
  };

  return (
    <div>
      {/* Header — full width, edge to edge separator */}
      <div className="px-6 pb-2 pt-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate text-sm font-normal text-muted-foreground">
              <Link href="/tests" className="text-foreground/30 hover:text-foreground transition-colors">Tests</Link>
              <span>/</span>
              <span className="truncate">{study?.url?.replace(/^https?:\/\//, '') ?? '...'}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Progress badge */}
            <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground">
              <span className={isInProgress ? 'animate-pulse' : ''} style={isInProgress ? { animationDuration: '2s' } : undefined}>
                {phaseLabel}
              </span>
              {isInProgress && (
                <span className="inline-flex items-end gap-[3px]">
                  {Array.from({ length: 20 }).map((_, i) => {
                    const filled = i < Math.round((percent / 100) * 20);
                    return (
                      <span
                        key={i}
                        className={`inline-block w-[4px] h-[14px] rounded-sm ${filled ? 'bg-green-500' : 'bg-foreground/10'}`}
                      />
                    );
                  })}
                </span>
              )}
              <span className="tabular-nums">{percent}%</span>
            </div>
            <button
              type="button"
              onClick={() => setLogsOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Log</span>
              <span className="tabular-nums text-muted-foreground/60">({logs.length})</span>
              {!logsOpen && logs.length > 0 && (
                <span className="max-w-[200px] truncate font-mono text-muted-foreground/50">
                  {logs[logs.length - 1].message}
                </span>
              )}
              {logsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete test
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {logsOpen && (
        <div className="max-h-48 overflow-y-auto border-b border-border bg-zinc-950 px-6 py-2 font-mono text-xs">
          {logs.length === 0 && (
            <p className="py-2 text-zinc-500">Waiting for events…</p>
          )}
          {logs.map((entry, i) => (
            <div key={i} className="flex gap-2 py-0.5 leading-5">
              <span className="shrink-0 text-zinc-500">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={
                entry.level === 'error' ? 'text-red-400' :
                entry.level === 'warn' ? 'text-yellow-400' :
                'text-zinc-300'
              }>
                {entry.message}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}
      <div className="border-b border-border" />

      {/* Content */}
      <div className="space-y-4 px-6 pb-6 pt-2">
        <StudyProgress studyId={id} />
      </div>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete test</DialogTitle>
            <DialogDescription>
              This will permanently delete this test and all its data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteStudy.isPending}
              onClick={handleDelete}
            >
              {deleteStudy.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
