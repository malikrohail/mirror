'use client';

import { Button } from '@/components/ui/button';

interface CategoryFilterProps {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selected === null ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelect(null)}
      >
        All
      </Button>
      {categories.map((cat) => (
        <Button
          key={cat}
          variant={selected === cat ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(cat)}
          className="capitalize"
        >
          {cat}
        </Button>
      ))}
    </div>
  );
}
