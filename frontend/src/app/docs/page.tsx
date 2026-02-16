import fs from 'fs';
import path from 'path';
import { DocsViewer } from '@/components/docs-viewer';

interface DocConfig {
  file: string;
  title: string;
  section: 'guides' | 'internal';
  category: string;
  description: string;
}

const DOC_MANIFEST: DocConfig[] = [
  // ── Guides (user-facing) ──────────────────────────────────
  {
    file: 'how-it-works.md',
    title: 'How it works',
    section: 'guides',
    category: 'Guides',
    description:
      'An overview of how Mirror runs AI-powered usability tests — from pasting a URL to receiving a full UX report.',
  },
  {
    file: 'architecture-overview.md',
    title: 'Architecture',
    section: 'guides',
    category: 'Guides',
    description:
      'System design overview — three-layer architecture, real-time data flow, and the navigation agent loop.',
  },
  {
    file: 'ai-and-llm-pipeline.md',
    title: 'AI & LLM pipeline',
    section: 'guides',
    category: 'Guides',
    description:
      'How Mirror uses Claude across 5 pipeline stages — from persona generation to report synthesis.',
  },
  {
    file: 'technical-decisions.md',
    title: 'Tech decisions',
    section: 'guides',
    category: 'Guides',
    description:
      '12 key technology choices — what was picked, what alternatives were considered, and why.',
  },
  {
    file: 'cost-and-performance.md',
    title: 'Cost & performance',
    section: 'guides',
    category: 'Guides',
    description:
      'Per-study cost breakdown, performance profile, scaling characteristics, and optimization strategies.',
  },
  {
    file: 'api-reference.md',
    title: 'API reference',
    section: 'guides',
    category: 'Guides',
    description:
      'Full REST and WebSocket API contract — endpoints, request/response schemas, and example payloads.',
  },

  // ── Internal: Product ─────────────────────────────────────
  {
    file: 'use-cases.md',
    title: 'Use cases',
    section: 'internal',
    category: 'Product',
    description:
      'Real-world scenarios showing how Mirror helps teams find UX issues — from signup pages killing conversions to accessibility audits.',
  },
  {
    file: 'competitive-analysis.md',
    title: 'Competitive analysis',
    section: 'internal',
    category: 'Product',
    description:
      'Landscape analysis of AI-powered UX testing tools, identifying the market gap Mirror fills.',
  },
  {
    file: 'v10-masterplan.md',
    title: 'v10 masterplan',
    section: 'internal',
    category: 'Product',
    description:
      'The full product vision and 3-month implementation roadmap for Mirror v10.',
  },

  // ── Internal: Architecture ────────────────────────────────
  {
    file: 'benchmark-pipeline-design.md',
    title: 'Benchmark pipeline',
    section: 'internal',
    category: 'Architecture',
    description:
      'End-to-end design for evaluating Mirror\'s UX issue detection accuracy against a ground truth corpus.',
  },
  {
    file: 'browserbase-live-view-plan.md',
    title: 'Live view architecture',
    section: 'internal',
    category: 'Architecture',
    description:
      'Plan for embedding live browser iframes so users can watch AI personas navigate in real-time.',
  },

  // ── Internal: Development ─────────────────────────────────
  {
    file: 'simple-changes-and-testing-guide.md',
    title: 'Testing guide',
    section: 'internal',
    category: 'Development',
    description:
      'Step-by-step end-to-end testing guide covering how to start the app, run a test, and verify behavior.',
  },
  {
    file: 'fix-plan-post-db-isolation.md',
    title: 'Post-DB fix plan',
    section: 'internal',
    category: 'Development',
    description:
      'Five-issue fix plan addressing session replay, heatmaps, screenshots, issue linking, and worker hot-reload.',
  },
  {
    file: 'TASKS.md',
    title: 'Task checklist',
    section: 'internal',
    category: 'Development',
    description:
      'Pre-push checklist tracking P0/P1/P2 priorities and completion status across all layers.',
  },

  // ── Internal: Debugging ───────────────────────────────────
  {
    file: 'debug-browserbase-live-view.md',
    title: 'Debug: browserbase',
    section: 'internal',
    category: 'Debugging',
    description:
      'Three specific bugs causing the running page to appear stuck, with precise fixes for each.',
  },
  {
    file: 'debug-live-view-streaming.md',
    title: 'Debug: live streaming',
    section: 'internal',
    category: 'Debugging',
    description:
      'Debugging real-time events not reaching the frontend despite successful session creation.',
  },
];

function loadDocs() {
  const docsDir = path.join(process.cwd(), '..', 'docs');

  return DOC_MANIFEST.map((config) => {
    const filePath = path.join(docsDir, config.file);
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      content = `> Could not load \`${config.file}\`. File may have been moved or deleted.`;
    }
    return {
      slug: config.file.replace(/\.md$/, ''),
      title: config.title,
      section: config.section,
      category: config.category,
      description: config.description,
      content,
    };
  });
}

export default function DocsPage() {
  const docs = loadDocs();
  return <DocsViewer docs={docs} />;
}
