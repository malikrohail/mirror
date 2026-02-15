'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Calendar, Play, Pause, Trash2, Copy, ExternalLink, Clock, Globe, Plus, Zap, RefreshCw } from 'lucide-react';
import { ScheduleIllustration } from '@/components/common/empty-illustrations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PageSkeleton } from '@/components/common/page-skeleton';
import { useSchedules, useCreateSchedule, useUpdateSchedule, useDeleteSchedule, useTriggerSchedule } from '@/hooks/use-schedules';
import { usePersonaTemplates } from '@/hooks/use-personas';
import { API_BASE, TERMS } from '@/lib/constants';
import type { ScheduleOut } from '@/types';

function formatDate(d: string | null) {
  if (!d) return '--';
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const statusColors: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900',
  paused: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900',
};

function ScheduleRow({ s }: { s: ScheduleOut }) {
  const update = useUpdateSchedule();
  const del_ = useDeleteSchedule();
  const trigger = useTriggerSchedule();
  const [confirmDel, setConfirmDel] = useState(false);
  const webhookUrl = s.webhook_secret ? `${typeof window !== 'undefined' ? window.location.origin : ''}${API_BASE}/webhooks/deploy/${s.webhook_secret}` : null;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{s.name}</h3>
            <Badge variant="outline" className={statusColors[s.status] ?? ''}>{s.status}</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Globe className="h-3 w-3" /><span className="truncate">{s.url}</span></div>
          {s.cron_expression && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" /><code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{s.cron_expression}</code></div>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
            <span>Runs: <span className="font-medium text-foreground">{s.run_count}</span></span>
            <span>Last: <span className="font-medium text-foreground">{formatDate(s.last_run_at)}</span></span>
            <span>Next: <span className="font-medium text-foreground">{formatDate(s.next_run_at)}</span></span>
          </div>
          {s.last_study_id && <Link href={`/study/${s.last_study_id}`} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">View last results <ExternalLink className="h-3 w-3" /></Link>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {webhookUrl && <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Webhook URL copied'); }} title="Copy webhook URL"><Copy className="h-4 w-4" /></Button>}
          <Button variant="ghost" size="icon" disabled={update.isPending} onClick={() => update.mutate({ id: s.id, data: { status: s.status === 'active' ? 'paused' : 'active' } })} title={s.status === 'active' ? 'Pause' : 'Resume'}>
            {s.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" disabled={trigger.isPending || s.status !== 'active'} onClick={() => trigger.mutate(s.id, { onSuccess: (r) => toast.success(`${TERMS.singularCap} ${r.study_id.slice(0, 8)}... triggered`) })} title="Trigger now">
            {trigger.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          </Button>
          <Dialog open={confirmDel} onOpenChange={setConfirmDel}>
            <DialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Delete schedule</DialogTitle><DialogDescription>Delete &quot;{s.name}&quot;? Existing {TERMS.plural} will not be affected.</DialogDescription></DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDel(false)}>Cancel</Button>
                <Button variant="destructive" disabled={del_.isPending} onClick={() => del_.mutate(s.id, { onSuccess: () => setConfirmDel(false) })}>{del_.isPending ? 'Deleting...' : 'Delete'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
}

function CreateDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateSchedule();
  const { data: templates } = usePersonaTemplates();
  const [form, setForm] = useState({ name: '', url: '', task: '', cron: '', personaIds: [] as string[] });
  const canSubmit = form.name.trim() && form.url.trim() && form.task.trim() && form.personaIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Schedule</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Schedule</DialogTitle><DialogDescription>Set up a recurring or webhook-triggered test.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Schedule name</Label><Input placeholder="e.g. Weekly checkout test" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Website URL</Label><Input placeholder="https://example.com" value={form.url} onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Task for testers</Label><Input placeholder="Complete a purchase" value={form.task} onChange={(e) => setForm(f => ({ ...f, task: e.target.value }))} /></div>
          <div className="space-y-2">
            <Label>Cron expression <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="0 9 * * 1 (every Monday 9am)" value={form.cron} onChange={(e) => setForm(f => ({ ...f, cron: e.target.value }))} className="font-mono" />
            <p className="text-xs text-muted-foreground">Leave empty for webhook-only triggers.</p>
          </div>
          <div className="space-y-2">
            <Label>Testers ({form.personaIds.length} selected)</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border p-2">
              {templates?.map(t => (
                <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, personaIds: f.personaIds.includes(t.id) ? f.personaIds.filter(p => p !== t.id) : [...f.personaIds, t.id] }))}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${form.personaIds.includes(t.id) ? 'border-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:border-border'}`}>
                  <span className="text-base">{t.emoji}</span><span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!canSubmit || create.isPending} onClick={() => create.mutate(
            { name: form.name, url: form.url, tasks: [{ description: form.task }], persona_template_ids: form.personaIds, cron_expression: form.cron || undefined },
            { onSuccess: () => { setOpen(false); setForm({ name: '', url: '', task: '', cron: '', personaIds: [] }); toast.success('Schedule created'); } }
          )}>{create.isPending ? 'Creating...' : 'Create Schedule'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SchedulesPage() {
  const { data, isLoading } = useSchedules();
  if (isLoading) return <PageSkeleton />;
  const schedules = data?.items ?? [];

  return (
    <div className="space-y-6 px-[100px] pt-[40px] pb-[100px]">
      <div className="flex items-center justify-between">
        <div />
        <CreateDialog />
      </div>
      {schedules.length > 0 ? (
        <div className="space-y-3">{schedules.map(s => <ScheduleRow key={s.id} s={s} />)}</div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <ScheduleIllustration />
          <div>
            <p className="text-sm font-medium">No schedules yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Create a schedule to continuously monitor your website.</p>
          </div>
          <CreateDialog />
        </div>
      )}
    </div>
  );
}
