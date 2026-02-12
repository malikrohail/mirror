'use client';

import { Badge } from '@/components/ui/badge';
import { STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { StudyStatus } from '@/types';

interface StatusBadgeProps {
  status: StudyStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn('capitalize', STATUS_COLORS[status])}>
      {status}
    </Badge>
  );
}
