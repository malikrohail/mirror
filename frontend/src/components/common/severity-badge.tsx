'use client';

import { Badge } from '@/components/ui/badge';
import { SEVERITY_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Severity } from '@/types';

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <Badge variant="outline" className={cn('capitalize', SEVERITY_COLORS[severity])}>
      {severity}
    </Badge>
  );
}
