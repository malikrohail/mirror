'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Fake navigation targets ──────────────────────────────

const PAGES = [
  { label: 'Home', color: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { label: 'Testers', color: 'bg-blue-50 dark:bg-blue-950/30' },
  { label: 'Results', color: 'bg-purple-50 dark:bg-purple-950/30' },
  { label: 'Settings', color: 'bg-amber-50 dark:bg-amber-950/30' },
];

function useSimulatedNav(duration: number) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);

  const navigate = useCallback(
    (pageIndex: number) => {
      if (isLoading) return;
      setIsLoading(true);
      setProgress(0);
      startRef.current = performance.now();

      const tick = () => {
        const elapsed = performance.now() - startRef.current;
        const p = Math.min(elapsed / duration, 1);
        // Ease-out curve for realistic feel
        setProgress(1 - Math.pow(1 - p, 3));
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setIsLoading(false);
          setCurrentPage(pageIndex);
          setProgress(0);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [isLoading, duration],
  );

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { isLoading, currentPage, progress, navigate };
}

// ── Page nav buttons ──────────────────────────────────────

function NavButtons({
  currentPage,
  onNavigate,
  disabled,
}: {
  currentPage: number;
  onNavigate: (i: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      {PAGES.map((page, i) => (
        <button
          key={i}
          disabled={disabled || i === currentPage}
          onClick={() => onNavigate(i)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
            i === currentPage
              ? 'bg-foreground text-background'
              : 'bg-foreground/5 text-foreground/60 hover:bg-foreground/10 hover:text-foreground disabled:opacity-40',
          )}
        >
          {page.label}
        </button>
      ))}
    </div>
  );
}

function PageContent({ pageIndex }: { pageIndex: number }) {
  const page = PAGES[pageIndex];
  return (
    <div
      className={cn(
        'flex h-full items-center justify-center rounded-lg text-sm font-medium text-foreground/50',
        page.color,
      )}
    >
      {page.label} page content
    </div>
  );
}

// ── Option 1: Top Progress Bar (YouTube / GitHub style) ──

function TopProgressBar() {
  const { isLoading, currentPage, progress, navigate } = useSimulatedNav(1200);

  return (
    <DemoCard
      number={1}
      title="Top Progress Bar"
      description="Thin animated bar at the top of the viewport. Non-intrusive, universally recognized. Used by YouTube, GitHub, and most SaaS apps."
    >
      <div className="relative h-48 overflow-hidden rounded-lg border border-border">
        {/* Progress bar */}
        <div className="absolute inset-x-0 top-0 z-10 h-[3px] bg-foreground/5">
          {isLoading && (
            <motion.div
              className="h-full bg-foreground origin-left"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress }}
              transition={{ duration: 0.1, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
            />
          )}
        </div>

        {/* Fake page area */}
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <NavButtons currentPage={currentPage} onNavigate={navigate} disabled={isLoading} />
          </div>
          <div className="flex-1 p-3">
            <PageContent pageIndex={currentPage} />
          </div>
        </div>
      </div>
    </DemoCard>
  );
}

// ── Option 2: Skeleton Shimmer ───────────────────────────

function SkeletonShimmer() {
  const { isLoading, currentPage, progress, navigate } = useSimulatedNav(1400);

  return (
    <DemoCard
      number={2}
      title="Skeleton Shimmer"
      description="Content area replaced with animated placeholder shapes. Shows expected layout before content loads. Feels fast and intentional."
    >
      <div className="relative h-48 overflow-hidden rounded-lg border border-border">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <NavButtons currentPage={currentPage} onNavigate={navigate} disabled={isLoading} />
          </div>
          <div className="flex-1 p-3">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex h-full flex-col gap-2.5"
                >
                  <div className="h-4 w-1/3 animate-pulse rounded-md bg-foreground/[0.08]" />
                  <div className="h-3 w-2/3 animate-pulse rounded-md bg-foreground/[0.06]" />
                  <div className="h-3 w-1/2 animate-pulse rounded-md bg-foreground/[0.06]" />
                  <div className="mt-auto flex gap-2">
                    <div className="h-8 w-20 animate-pulse rounded-md bg-foreground/[0.06]" />
                    <div className="h-8 w-20 animate-pulse rounded-md bg-foreground/[0.06]" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`page-${currentPage}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <PageContent pageIndex={currentPage} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DemoCard>
  );
}

// ── Option 3: Centered Spinner with Dimmed Overlay ───────

function SpinnerOverlay() {
  const { isLoading, currentPage, progress, navigate } = useSimulatedNav(1000);

  return (
    <DemoCard
      number={3}
      title="Spinner Overlay"
      description="Semi-transparent overlay with a centered spinner. Clearly blocks interaction. Simple and unambiguous, but can feel heavy on fast transitions."
    >
      <div className="relative h-48 overflow-hidden rounded-lg border border-border">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <NavButtons currentPage={currentPage} onNavigate={navigate} disabled={isLoading} />
          </div>
          <div className="relative flex-1 p-3">
            <PageContent pageIndex={currentPage} />

            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
                    <span className="text-xs text-foreground/40">Loading...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DemoCard>
  );
}

// ── Option 4: Slide Transition ───────────────────────────

function SlideTransition() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(1);

  const navigate = useCallback(
    (pageIndex: number) => {
      if (isLoading) return;
      setDirection(pageIndex > currentPage ? 1 : -1);
      setIsLoading(true);
      setTimeout(() => {
        setCurrentPage(pageIndex);
        setIsLoading(false);
      }, 600);
    },
    [isLoading, currentPage],
  );

  return (
    <DemoCard
      number={4}
      title="Slide Transition"
      description="Current page slides out, new page slides in from the navigation direction. Creates a sense of spatial navigation. Feels app-like and polished."
    >
      <div className="relative h-48 overflow-hidden rounded-lg border border-border">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <NavButtons currentPage={currentPage} onNavigate={navigate} disabled={isLoading} />
          </div>
          <div className="relative flex-1 overflow-hidden p-3">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentPage}
                custom={direction}
                initial={{ x: direction * 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction * -60, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-full"
              >
                <PageContent pageIndex={currentPage} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DemoCard>
  );
}

// ── Option 5: Top Bar + Fade (Hybrid) ────────────────────

function HybridTopBarFade() {
  const { isLoading, currentPage, progress, navigate } = useSimulatedNav(1000);
  const [displayPage, setDisplayPage] = useState(0);

  useEffect(() => {
    if (!isLoading) setDisplayPage(currentPage);
  }, [isLoading, currentPage]);

  return (
    <DemoCard
      number={5}
      title="Progress Bar + Content Fade"
      description="Combines a top progress bar with a subtle content fade. The bar shows progress while the fade signals content is changing. Best of both worlds."
    >
      <div className="relative h-48 overflow-hidden rounded-lg border border-border">
        {/* Progress bar */}
        <div className="absolute inset-x-0 top-0 z-10 h-[2px]">
          {isLoading && (
            <motion.div
              className="h-full bg-foreground"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress }}
              transition={{ duration: 0.1, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
            />
          )}
        </div>

        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <NavButtons currentPage={displayPage} onNavigate={navigate} disabled={isLoading} />
          </div>
          <div className="flex-1 p-3">
            <motion.div
              className="h-full"
              animate={{ opacity: isLoading ? 0.3 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={displayPage}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <PageContent pageIndex={displayPage} />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </DemoCard>
  );
}

// ── DemoCard wrapper ─────────────────────────────────────

function DemoCard({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
            {number}
          </span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed ml-[30px]">{description}</p>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────

export default function LoadingStatesDemo() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-lg font-semibold">Page Transition Loading States</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Click the nav buttons in each demo to see the loading behavior. Compare which feels best for Miror.
        </p>
      </div>

      <div className="grid gap-5">
        <TopProgressBar />
        <SkeletonShimmer />
        <SpinnerOverlay />
        <SlideTransition />
        <HybridTopBarFade />
      </div>
    </div>
  );
}
