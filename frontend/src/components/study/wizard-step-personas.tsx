'use client';

import { Label } from '@/components/ui/label';
import { PersonaSelector } from '@/components/persona/persona-selector';

interface WizardStepPersonasProps {
  selected: string[];
  onToggle: (id: string) => void;
}

export function WizardStepPersonas({ selected, onToggle }: WizardStepPersonasProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-medium">Select Personas</Label>
        <p className="text-sm text-muted-foreground">
          Choose 1-10 AI personas. Each has different characteristics
          and will navigate your site differently.
        </p>
        <p className="text-xs text-muted-foreground">
          {selected.length} of 10 selected
        </p>
      </div>
      <PersonaSelector selected={selected} onToggle={onToggle} />
    </div>
  );
}
