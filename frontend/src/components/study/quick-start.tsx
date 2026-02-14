'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  Check,
  Pencil,
  Play,
  X,
  Plus,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCreateStudy, useRunStudy } from '@/hooks/use-study';
import * as api from '@/lib/api-client';
import { TERMS } from '@/lib/constants';
import type { StudyPlanResponse, StudyPlanTask, StudyPlanPersona } from '@/types';

type QuickStartPhase = 'input' | 'loading' | 'review' | 'modify';

export function QuickStart() {
  const router = useRouter();
  const [phase, setPhase] = useState<QuickStartPhase>('input');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);
  const [editableTasks, setEditableTasks] = useState<StudyPlanTask[]>([]);
  const [editablePersonas, setEditablePersonas] = useState<StudyPlanPersona[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const createStudy = useCreateStudy();
  const runStudy = useRunStudy();

  const canGenerate = description.trim().length > 10 && url.trim().length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setPhase('loading');
    try {
      const normalizedUrl = url.trim().startsWith('http')
        ? url.trim()
        : `https://${url.trim()}`;
      const result = await api.generateStudyPlan({
        description: description.trim(),
        url: normalizedUrl,
      });
      setPlan(result);
      setEditableTasks(result.tasks);
      setEditablePersonas(result.personas);
      setPhase('review');
    } catch (err) {
      toast.error('Failed to generate plan', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      setPhase('input');
    }
  };

  const handleAcceptAndRun = async () => {
    if (!plan) return;
    setSubmitting(true);
    try {
      const tasks = editableTasks.slice(0, 10).map((t, i) => ({
        description: t.description,
        order_index: i,
      }));
      const personaIds = editablePersonas
        .map((p) => p.template_id)
        .filter((id): id is string => id != null && id.length > 0);

      if (personaIds.length === 0) {
        toast.error('No valid personas matched. Try manual setup instead.');
        setSubmitting(false);
        return;
      }

      const study = await createStudy.mutateAsync({
        url: plan.url,
        tasks,
        persona_template_ids: personaIds,
      });
      const browserMode = localStorage.getItem('mirror-browser-mode') || 'local';
      await runStudy.mutateAsync({ studyId: study.id, browserMode });
      router.push(`/study/${study.id}/running`);
    } catch (err) {
      toast.error(`Failed to create ${TERMS.singular}`, {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      setSubmitting(false);
    }
  };

  const handleModify = () => {
    setPhase('modify');
  };

  const handleSaveModifications = () => {
    setPhase('review');
  };

  const handleReset = () => {
    setPhase('input');
    setPlan(null);
    setEditableTasks([]);
    setEditablePersonas([]);
  };

  const addTask = () => {
    setEditableTasks((prev) => [
      ...prev,
      { description: '', order_index: prev.length },
    ]);
  };

  const removeTask = (index: number) => {
    if (editableTasks.length <= 1) return;
    setEditableTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, description: string) => {
    setEditableTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, description } : t)),
    );
  };

  const removePersona = (index: number) => {
    if (editablePersonas.length <= 1) return;
    setEditablePersonas((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Quick Start</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Describe what you want to test and we will generate a plan for you.
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <AnimatePresence mode="wait">
          {/* Phase: Input */}
          {phase === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="example.com"
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  Describe what you want to test...
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. I want to test if new users can easily find the pricing page, understand the different plans, and successfully sign up for a free trial."
                  className="min-h-24 resize-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Be specific about goals, user flows, or pain points you suspect.
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Plan
              </Button>
            </motion.div>
          )}

          {/* Phase: Loading */}
          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-4 py-12"
            >
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-2 border-primary/20" />
                <Loader2 className="absolute inset-0 h-12 w-12 animate-spin text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Generating your test plan...</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  AI is analyzing the URL and crafting tasks + personas
                </p>
              </div>
            </motion.div>
          )}

          {/* Phase: Review */}
          {(phase === 'review' && plan) && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Summary */}
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-foreground/80">{plan.summary}</p>
              </div>

              {/* Generated Tasks */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground/70">
                  Tasks ({editableTasks.length})
                </h3>
                <div className="space-y-2">
                  {editableTasks.map((task, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2.5 rounded-lg border p-3"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                        {i + 1}
                      </span>
                      <p className="text-sm text-foreground">{task.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recommended Personas */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground/70">
                  Recommended Personas ({editablePersonas.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {editablePersonas.map((persona, i) => (
                    <motion.div
                      key={persona.template_id ?? `persona-${i}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="group relative rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{persona.emoji}</span>
                          <div>
                            <p className="text-sm font-medium">{persona.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {persona.reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Estimate */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Estimated</span>
                <span>
                  <span className="text-foreground/40">~</span>{' '}
                  {editablePersonas.length * 2} min &middot; ${(editablePersonas.length * 0.5).toFixed(2)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleAcceptAndRun}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Accept & Run
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleModify} disabled={submitting}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modify
                </Button>
                <Button variant="ghost" size="icon" onClick={handleReset} disabled={submitting}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Phase: Modify */}
          {(phase === 'modify' && plan) && (
            <motion.div
              key="modify"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Edit Tasks */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground/70">
                  Tasks
                </h3>
                <div className="space-y-2">
                  {editableTasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                        {i + 1}
                      </span>
                      <Input
                        value={task.description}
                        onChange={(e) => updateTask(i, e.target.value)}
                        placeholder={`Task ${i + 1}`}
                        className="flex-1"
                      />
                      {editableTasks.length > 1 && (
                        <button
                          onClick={() => removeTask(i)}
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {editableTasks.length < 5 && (
                    <button
                      onClick={addTask}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                      Add another task
                    </button>
                  )}
                </div>
              </div>

              {/* Edit Personas */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground/70">
                  Personas
                </h3>
                <div className="space-y-2">
                  {editablePersonas.map((persona, i) => (
                    <div
                      key={persona.template_id ?? `persona-${i}`}
                      className="flex items-center justify-between rounded-lg border p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{persona.emoji}</span>
                        <div>
                          <p className="text-sm font-medium">{persona.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {persona.reason}
                          </p>
                        </div>
                      </div>
                      {editablePersonas.length > 1 && (
                        <button
                          onClick={() => removePersona(i)}
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-2">
                <Button onClick={handleSaveModifications} className="flex-1">
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setPhase('review')}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
