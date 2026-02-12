'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonaBuilderForm } from '@/components/persona/persona-builder-form';

export default function PersonaBuilderPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/personas" aria-label="Back to persona library">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Persona Builder</h1>
      </div>
      <PersonaBuilderForm />
    </div>
  );
}
