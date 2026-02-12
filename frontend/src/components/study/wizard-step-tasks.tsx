'use client';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface WizardStepTasksProps {
  tasks: string[];
  onChange: (tasks: string[]) => void;
}

export function WizardStepTasks({ tasks, onChange }: WizardStepTasksProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm uppercase text-foreground/50">Task</Label>
      <Textarea
        placeholder='e.g., "Find and add a product to cart"'
        value={tasks[0] ?? ''}
        onChange={(e) => onChange([e.target.value])}
        className="min-h-[80px] resize-none text-base placeholder:text-foreground/30"
      />
    </div>
  );
}
