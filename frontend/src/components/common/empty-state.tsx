'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  illustration?: ReactNode;
  /** @deprecated Use `illustration` instead */
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ illustration, icon, title, description, action }: EmptyStateProps) {
  const visual = illustration ?? icon;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
      {visual && <div className="text-muted-foreground">{visual}</div>}
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
