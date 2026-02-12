'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ScoreCardProps {
  label: string;
  value: string | number;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantClasses = {
  default: '',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
};

export function ScoreCard({ label, value, description, variant = 'default' }: ScoreCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn('mt-1 tabular-nums text-2xl font-semibold', variantClasses[variant])}>
          {value}
        </p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
