'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useNavLoadingStore } from '@/stores/ui-store';

/**
 * Intercepts all <a> clicks for internal navigation and marks navigation
 * as started. The pathname effect below marks it as ended.
 */
function useNavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startNavigation, endNavigation } = useNavLoadingStore();
  const currentUrl = useRef(pathname);

  // End navigation when pathname/searchParams change (page rendered)
  useEffect(() => {
    const newUrl = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    if (currentUrl.current !== newUrl) {
      currentUrl.current = newUrl;
    }
    endNavigation();
  }, [pathname, searchParams, endNavigation]);

  // Intercept internal link clicks to detect navigation start
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;

      // Skip external links, hash links, new-tab links
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
      if (anchor.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Same page — don't show loading
      const newPath = href.split('?')[0].split('#')[0];
      const currentPath = currentUrl.current.split('?')[0].split('#')[0];
      if (newPath === currentPath) return;

      startNavigation();
    }

    // Also detect browser back/forward
    function handlePopState() {
      startNavigation();
    }

    document.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('popstate', handlePopState);
    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('popstate', handlePopState);
    };
  }, [startNavigation]);
}

/**
 * Animated progress bar with smooth completion.
 * Uses refs for phase/animation state to avoid effect re-trigger loops.
 */
function ProgressBar() {
  const isNavigating = useNavLoadingStore((s) => s.isNavigating);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const phaseRef = useRef<'idle' | 'loading' | 'completing' | 'fading'>('idle');

  const cleanup = () => {
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    if (isNavigating) {
      // Start loading
      cleanup();
      phaseRef.current = 'loading';
      setVisible(true);
      setFading(false);
      setProgress(0);

      const start = performance.now();
      const tick = () => {
        const elapsed = performance.now() - start;
        const p = Math.min(elapsed / 8000, 0.95);
        setProgress(1 - Math.pow(1 - p, 2.5));
        if (phaseRef.current === 'loading') {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } else if (phaseRef.current === 'loading') {
      // Navigation ended — smoothly fill to 100%, then fade out
      cleanup();
      phaseRef.current = 'completing';

      // Read current progress via a one-shot ref capture
      setProgress((currentProgress) => {
        const from = currentProgress;
        const fillStart = performance.now();
        const fillDuration = 300;

        const tick = () => {
          const elapsed = performance.now() - fillStart;
          const t = Math.min(elapsed / fillDuration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setProgress(from + (1 - from) * eased);

          if (t < 1) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            // Filled — start fade out
            phaseRef.current = 'fading';
            setFading(true);
            timerRef.current = setTimeout(() => {
              phaseRef.current = 'idle';
              setVisible(false);
              setFading(false);
              setProgress(0);
            }, 400);
          }
        };
        rafRef.current = requestAnimationFrame(tick);

        return currentProgress; // don't change yet, RAF will handle it
      });
    }

    return cleanup;
  }, [isNavigating]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-[2px]">
      <div
        className="h-full bg-foreground"
        style={{
          transform: `scaleX(${progress})`,
          transformOrigin: 'left',
          opacity: fading ? 0 : 1,
          transition: fading ? 'opacity 400ms ease-out' : undefined,
        }}
      />
    </div>
  );
}

/**
 * Wraps page content and fades it slightly during navigation.
 */
export function NavigationFade({ children }: { children: React.ReactNode }) {
  const isNavigating = useNavLoadingStore((s) => s.isNavigating);

  return (
    <div
      className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]"
      style={{
        opacity: isNavigating ? 0.4 : 1,
        transition: isNavigating
          ? 'opacity 150ms ease-out'
          : 'opacity 350ms ease-in-out',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Top-level component — mount once in Providers or layout.
 */
export function NavigationProgress() {
  useNavigationEvents();
  return <ProgressBar />;
}
