'use client';

import { useState, useRef, useCallback, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, ChevronDown, ChevronRight, FileText, Lock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeaderBar } from '@/components/layout/page-header-bar';

interface DocEntry {
  slug: string;
  title: string;
  section: 'guides' | 'internal';
  category: string;
  description: string;
  content: string;
}

const INTERNAL_CATEGORY_ORDER = ['Product', 'Architecture', 'Development', 'Debugging'];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function childrenToText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(childrenToText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return childrenToText((children as { props: { children?: React.ReactNode } }).props.children);
  }
  return '';
}

function HeadingWithId(Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') {
  return function Heading(props: ComponentPropsWithoutRef<typeof Tag>) {
    const id = slugify(childrenToText(props.children));
    return <Tag {...props} id={id} />;
  };
}

const mdComponents = {
  h1: HeadingWithId('h1'),
  h2: HeadingWithId('h2'),
  h3: HeadingWithId('h3'),
  h4: HeadingWithId('h4'),
  h5: HeadingWithId('h5'),
  h6: HeadingWithId('h6'),
};

export function DocsViewer({ docs }: { docs: DocEntry[] }) {
  const [activeSlug, setActiveSlug] = useState(docs[0]?.slug ?? '');
  const [search, setSearch] = useState('');
  const [internalOpen, setInternalOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeDoc = docs.find((d) => d.slug === activeSlug) ?? docs[0];

  const filtered = search.trim()
    ? docs.filter(
        (d) =>
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.description.toLowerCase().includes(search.toLowerCase()) ||
          d.content.toLowerCase().includes(search.toLowerCase()),
      )
    : docs;

  const guides = filtered.filter((d) => d.section === 'guides');
  const internalDocs = filtered.filter((d) => d.section === 'internal');

  const internalGrouped = INTERNAL_CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: internalDocs.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

  // Auto-expand internal section when search matches internal docs or active doc is internal
  const showInternal = search.trim()
    ? internalDocs.length > 0
    : internalOpen || activeDoc?.section === 'internal';

  const breadcrumbCategory =
    activeDoc?.section === 'internal'
      ? `Internal / ${activeDoc.category}`
      : activeDoc?.category ?? '';

  // Handle anchor link clicks — scroll inside the content container
  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href?.startsWith('#')) return;

    e.preventDefault();
    const id = href.slice(1);
    const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="flex h-full flex-col">
      <PageHeaderBar
        icon={BookOpen}
        title="Documentation"
        chips={[{ label: 'Docs', value: String(docs.length) }]}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r border-border overflow-y-auto bg-muted/20">
          {/* Search */}
          <div className="sticky top-0 z-10 bg-muted/20 p-3 backdrop-blur-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search docs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <nav className="px-3 pb-6 space-y-5">
            {/* Guides */}
            {guides.length > 0 && (
              <div>
                <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-foreground/30">
                  Guides
                </p>
                <div className="space-y-0.5">
                  {guides.map((doc) => (
                    <DocNavItem
                      key={doc.slug}
                      doc={doc}
                      isActive={activeSlug === doc.slug}
                      onClick={() => setActiveSlug(doc.slug)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Internal — collapsible */}
            {(internalDocs.length > 0 || !search.trim()) && (
              <div>
                <button
                  onClick={() => setInternalOpen((o) => !o)}
                  className="mb-1 flex w-full items-center gap-1 px-2 text-[11px] font-medium uppercase tracking-wider text-foreground/30 transition-colors hover:text-foreground/50"
                >
                  {showInternal ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <Lock className="h-2.5 w-2.5" />
                  Internal
                </button>

                {showInternal && (
                  <div className="space-y-3 pt-1">
                    {internalGrouped.map((group) => (
                      <div key={group.category}>
                        <p className="mb-0.5 px-2 pl-5 text-[10px] font-medium uppercase tracking-wider text-foreground/20">
                          {group.category}
                        </p>
                        <div className="space-y-0.5">
                          {group.items.map((doc) => (
                            <DocNavItem
                              key={doc.slug}
                              doc={doc}
                              isActive={activeSlug === doc.slug}
                              onClick={() => setActiveSlug(doc.slug)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto"
          onClick={handleContentClick}
        >
          {activeDoc ? (
            <div className="mx-auto max-w-4xl px-12 py-10">
              {/* Breadcrumb */}
              <div className="mb-6 flex items-center gap-1.5 text-[12px] text-muted-foreground/60">
                <span>Docs</span>
                <ChevronRight className="h-3 w-3" />
                <span>{breadcrumbCategory}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground/60">{activeDoc.title}</span>
              </div>

              {/* Description */}
              <p className="mb-8 text-sm text-muted-foreground">
                {activeDoc.description}
              </p>

              {/* Markdown */}
              <article className="prose prose-neutral dark:prose-invert prose-sm max-w-none prose-headings:font-medium prose-h1:text-2xl prose-h1:border-b prose-h1:border-border prose-h1:pb-3 prose-h1:mb-6 prose-h2:text-lg prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-p:text-foreground/70 prose-p:leading-relaxed prose-li:text-foreground/70 prose-strong:text-foreground prose-code:text-[13px] prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:text-foreground/80 prose-pre:border prose-pre:border-border prose-table:text-[13px] prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-a:text-foreground prose-a:underline-offset-2 prose-hr:border-border">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={mdComponents}
                >
                  {activeDoc.content}
                </ReactMarkdown>
              </article>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center py-20">
              <p className="text-sm text-muted-foreground">
                {search ? 'No docs match your search.' : 'Select a document from the sidebar.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocNavItem({
  doc,
  isActive,
  onClick,
}: {
  doc: DocEntry;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
        isActive
          ? 'bg-foreground/[0.06] text-foreground font-medium'
          : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
      )}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{doc.title}</span>
    </button>
  );
}
