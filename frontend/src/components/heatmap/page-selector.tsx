'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PageSelectorProps {
  pages: string[];
  selected: string;
  onSelect: (page: string) => void;
}

export function PageSelector({ pages, selected, onSelect }: PageSelectorProps) {
  if (pages.length === 0) return null;

  return (
    <Select value={selected} onValueChange={onSelect}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a page" />
      </SelectTrigger>
      <SelectContent>
        {pages.map((page) => (
          <SelectItem key={page} value={page}>
            <span className="truncate">{page}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
