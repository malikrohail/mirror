'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface WizardStepTasksProps {
  tasks: string[];
  onChange: (tasks: string[]) => void;
}

export function WizardStepTasks({ tasks, onChange }: WizardStepTasksProps) {
  const addTask = () => {
    if (tasks.length < 3) {
      onChange([...tasks, '']);
    }
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      onChange(tasks.filter((_, i) => i !== index));
    }
  };

  const updateTask = (index: number, value: string) => {
    const updated = [...tasks];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-medium">Tasks</Label>
        <p className="text-sm text-muted-foreground">
          Define 1-3 tasks for the AI personas to attempt on your site.
        </p>
      </div>

      <div className="space-y-3">
        {tasks.map((task, i) => (
          <div key={i} className="flex gap-2">
            <Textarea
              placeholder={`Task ${i + 1}: e.g., "Find and add a product to cart"`}
              value={task}
              onChange={(e) => updateTask(i, e.target.value)}
              className="min-h-[80px] flex-1 resize-none text-base"
            />
            {tasks.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeTask(i)}
                aria-label={`Remove task ${i + 1}`}
                className="mt-1 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {tasks.length < 3 && (
        <Button variant="outline" size="sm" onClick={addTask}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      )}
    </div>
  );
}
