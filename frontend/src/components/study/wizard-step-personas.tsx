'use client';

import { PersonaSelector } from '@/components/persona/persona-selector';

interface WizardStepPersonasProps {
  selected: string[];
  onToggle: (id: string) => void;
}

export function WizardStepPersonas({ selected, onToggle }: WizardStepPersonasProps) {
  return <PersonaSelector selected={selected} onToggle={onToggle} />;
}
