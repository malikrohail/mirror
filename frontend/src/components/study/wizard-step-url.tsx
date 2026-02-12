'use client';

import { Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WizardStepUrlProps {
  url: string;
  onChange: (url: string) => void;
}

export function WizardStepUrl({ url, onChange }: WizardStepUrlProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="study-url" className="text-base font-medium">
          Website URL
        </Label>
        <p className="text-sm text-muted-foreground">
          Enter the URL you want to test.
        </p>
      </div>
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="study-url"
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 text-base"
          autoFocus
        />
      </div>
    </div>
  );
}
