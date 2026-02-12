'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGeneratePersona } from '@/hooks/use-personas';

export function PersonaBuilderForm() {
  const [description, setDescription] = useState('');
  const generatePersona = useGeneratePersona();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }
    try {
      const result = await generatePersona.mutateAsync(description.trim());
      toast.success(result.message || 'Persona generated');
      setDescription('');
    } catch (err) {
      toast.error('Failed to generate persona', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Build a Custom Persona</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="persona-description">Describe your persona</Label>
            <Textarea
              id="persona-description"
              placeholder="e.g., A 65-year-old retiree who is not very tech-savvy, has difficulty reading small text, and prefers simple navigation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] resize-none text-base"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters. Describe the persona&apos;s demographics, abilities, and motivations.
            </p>
          </div>
          <Button
            type="submit"
            disabled={generatePersona.isPending || description.trim().length < 10}
          >
            {generatePersona.isPending ? 'Generating...' : 'Generate Persona'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
