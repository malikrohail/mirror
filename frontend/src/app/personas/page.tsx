'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePersonaTemplates } from '@/hooks/use-personas';
import { PersonaGrid } from '@/components/persona/persona-grid';
import { CategoryFilter } from '@/components/persona/category-filter';
import { EmptyState } from '@/components/common/empty-state';
import { PageSkeleton } from '@/components/common/page-skeleton';

export default function PersonaLibraryPage() {
  const [category, setCategory] = useState<string | null>(null);
  const { data: templates, isLoading } = usePersonaTemplates();

  const categories = useMemo(() => {
    if (!templates) return [];
    return Array.from(new Set(templates.map((t) => t.category))).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    if (!templates) return [];
    if (!category) return templates;
    return templates.filter((t) => t.category === category);
  }, [templates, category]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div />
        <Button asChild>
          <Link href="/personas/builder">
            <Plus className="mr-2 h-4 w-4" />
            Build Custom
          </Link>
        </Button>
      </div>

      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          selected={category}
          onSelect={setCategory}
        />
      )}

      {filtered.length > 0 ? (
        <PersonaGrid templates={filtered} />
      ) : (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No personas found"
          description="No persona templates match your filter."
        />
      )}
    </div>
  );
}
