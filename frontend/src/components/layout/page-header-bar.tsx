'use client';

import { type ReactNode, isValidElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNavHistory } from '@/components/layout/sidebar';
import { cn } from '@/lib/utils';

export type HeaderChip = {
  label: string;
  value: ReactNode;
  tooltip?: string;
};

type PageHeaderBarProps = {
  icon?: LucideIcon | ReactNode;
  title?: string;
  chips?: HeaderChip[];
  right?: ReactNode;
};

export function PageHeaderBar({ icon, title, chips = [], right }: PageHeaderBarProps) {
  const { canGoBack, canGoForward, goBack, goForward } = useNavHistory();

  return (
    <div className="sticky top-0 z-30">
      <div className="flex h-[42px] items-center gap-3 pl-3 pr-6 text-[14px] bg-[#F9F9FC] dark:bg-[#161616]">
        {/* Back / Forward arrows */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className={cn(
              'rounded p-1 transition-colors',
              canGoBack
                ? 'text-muted-foreground/40 hover:text-muted-foreground'
                : 'text-muted-foreground/15 cursor-default',
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            className={cn(
              'rounded p-1 transition-colors',
              canGoForward
                ? 'text-muted-foreground/40 hover:text-muted-foreground'
                : 'text-muted-foreground/15 cursor-default',
            )}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {icon && (
          isValidElement(icon)
            ? icon
            : (() => { const Icon = icon as LucideIcon; return <Icon className="h-5 w-5 text-foreground/30" />; })()
        )}
        {title && (
          <>
            <span className="text-[16px] font-normal leading-none text-foreground/30">
              {title}
            </span>
            <div className="self-stretch w-px bg-foreground/15 mx-2" />
          </>
        )}
        {chips.map((chip, i) => {
          const inner = (
            <>
              <span className="text-foreground/30">{chip.label}</span>
              <span className="-ml-2 font-normal text-foreground inline-flex items-center">{chip.value}</span>
            </>
          );

          return (
            <span key={i} className="contents">
              {i > 0 && <div className="self-stretch w-px bg-foreground/5" />}
              {chip.tooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-3 cursor-default py-2.5">
                      {inner}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {chip.tooltip}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="flex items-center gap-3 py-2.5">
                  {inner}
                </span>
              )}
            </span>
          );
        })}
        {right && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {right}
          </div>
        )}
      </div>
      <div className="border-b border-border" />
    </div>
  );
}
