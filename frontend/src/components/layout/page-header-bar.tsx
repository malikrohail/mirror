import type { ReactNode } from 'react';

export type HeaderChip = {
  label: string;
  value: ReactNode;
};

type PageHeaderBarProps = {
  chips: HeaderChip[];
  right?: ReactNode;
};

export function PageHeaderBar({ chips, right }: PageHeaderBarProps) {
  return (
    <div className="sticky top-0 z-30">
      <div className="flex h-[42px] items-center gap-3 pl-3 pr-6 text-[14px] bg-[#F9F9FC]">
        {chips.map((chip, i) => (
          <span key={i} className="contents">
            {i > 0 && <div className="self-stretch w-px bg-foreground/5" />}
            <span className="text-foreground/30 py-2.5">{chip.label}</span>
            <span className="-ml-2 font-normal text-foreground py-2.5">{chip.value}</span>
          </span>
        ))}
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
