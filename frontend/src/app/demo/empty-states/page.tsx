'use client';

import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TestsIllustration, TeamIllustration } from '@/components/common/empty-illustrations';

// ── Shared card shell (mirrors SectionCard from home) ────

function CardShell({
  title,
  count,
  linkLabel = 'View all',
  children,
}: {
  title: string;
  count?: number;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {count !== undefined && (
            <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        <Link
          href="#"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-1">{children}</div>
    </div>
  );
}

// ── Empty states ────────────────────────────────────────

function EmptyTests() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <TestsIllustration />
      <div>
        <p className="text-sm font-medium">No tests yet</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Run your first test to see results here
        </p>
      </div>
      <Button variant="outline" size="sm" className="mt-1">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Run your first test
      </Button>
    </div>
  );
}

function EmptyTeam() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <TeamIllustration />
      <div>
        <p className="text-sm font-medium">Build your team</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Add AI testers to run usability tests on your site
        </p>
      </div>
      <Button variant="outline" size="sm" className="mt-1">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Browse testers
      </Button>
    </div>
  );
}

// ── Demo page ───────────────────────────────────────────

export default function EmptyStatesDemoPage() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold">Empty States — Home Page</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What a first-time user sees when they have no tests and no team.
        </p>
      </div>

      {/* Preview — side by side like the real home page */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardShell title="Recent Tests" count={0}>
          <EmptyTests />
        </CardShell>
        <CardShell title="Your Team" count={0} linkLabel="Manage">
          <EmptyTeam />
        </CardShell>
      </div>
    </div>
  );
}
