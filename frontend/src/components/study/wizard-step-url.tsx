'use client';

import { Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WizardStepUrlProps {
  url: string;
  onChange: (url: string) => void;
}

export function WizardStepUrl({ url, onChange }: WizardStepUrlProps) {
  const hasValue = url.replace(/^https?:\/\//, '').length > 0;

  return (
    <div className="space-y-2">
      <Label htmlFor="study-url" className="text-sm uppercase text-foreground/50">
        Website URL
      </Label>
      <div className="relative">
        <span
          className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${hasValue ? '' : 'text-foreground/30'}`}
        >
          https://
        </span>
        <Input
          id="study-url"
          type="text"
          placeholder="example.com"
          value={url.replace(/^https?:\/\//, '')}
          onChange={(e) => onChange(`https://${e.target.value.replace(/^https?:\/\//, '')}`)}
          className="pl-[3.75rem] text-base placeholder:text-foreground/30"
          autoFocus
        />
      </div>
    </div>
  );
}
