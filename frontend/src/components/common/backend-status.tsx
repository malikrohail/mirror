'use client';

import { useHealth } from '@/hooks/use-health';
import { cn } from '@/lib/utils';
import { Circle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function BackendStatus() {
  const { data, isError } = useHealth();

  const isOk = data?.status === 'ok';
  const isDegraded = data?.status === 'degraded';
  const isDown = isError;

  const label = isDown ? 'Backend offline' : isDegraded ? 'Backend degraded' : 'Backend online';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground"
          role="status"
          aria-label={label}
        >
          <span className="flex h-4 w-4 items-center justify-center">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isOk && 'bg-green-500',
                isDegraded && 'bg-yellow-500',
                isDown && 'bg-red-500',
              )}
            />
          </span>
          <span>{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {data ? (
          <div className="text-xs">
            <p>DB: {data.db}</p>
            <p>Redis: {data.redis}</p>
          </div>
        ) : (
          <p className="text-xs">Unable to reach backend</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
