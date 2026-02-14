'use client';

import { useState, useMemo } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { usePersonaTemplates } from '@/hooks/use-personas';
import { PersonaGrid } from '@/components/persona/persona-grid';
import { PersonaBuilderForm } from '@/components/persona/persona-builder-form';
import { CategoryFilter } from '@/components/persona/category-filter';
import { EmptyState } from '@/components/common/empty-state';
import { PageSkeleton } from '@/components/common/page-skeleton';
import { PageHeaderBar } from '@/components/layout/page-header-bar';

export default function PersonaLibraryPage() {
  const [category, setCategory] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
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

  const headerChips = templates
    ? [
        { label: 'Testers', value: templates.length },
        { label: 'Categories', value: categories.length },
      ]
    : [];

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      {headerChips.length > 0 && (
        <PageHeaderBar
          chips={headerChips}
          right={
            <Button size="sm" className="h-[30px] text-sm" onClick={() => setBuilderOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Tester
            </Button>
          }
        />
      )}
    <div className="space-y-6 p-6">

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

      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Add Tester</DialogTitle>
          <PersonaBuilderForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
