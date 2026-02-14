'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Users,
  Moon,
  Sun,
  BookOpen,
  Plus,
  ClipboardList,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TERMS } from '@/lib/constants';

const navItems = [
  { href: '/', label: `New ${TERMS.singularCap}`, icon: Plus },
  { href: '/tests', label: `My ${TERMS.plural}`, icon: ClipboardList },
  { href: '/personas', label: 'Testers', icon: Users },
];

function useNavHistory() {
  const pathname = usePathname();
  const router = useRouter();
  const historyRef = useRef<string[]>([]);
  const indexRef = useRef(-1);
  const navigatingRef = useRef(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (navigatingRef.current) {
      navigatingRef.current = false;
      setTick((t) => t + 1);
      return;
    }
    historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
    historyRef.current.push(pathname);
    indexRef.current = historyRef.current.length - 1;
    setTick((t) => t + 1);
  }, [pathname]);

  const canGoBack = indexRef.current > 0;
  const canGoForward = indexRef.current < historyRef.current.length - 1;

  const goBack = useCallback(() => {
    if (indexRef.current > 0) {
      navigatingRef.current = true;
      indexRef.current--;
      router.back();
    }
  }, [router]);

  const goForward = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) {
      navigatingRef.current = true;
      indexRef.current++;
      router.forward();
    }
  }, [router]);

  return { canGoBack, canGoForward, goBack, goForward };
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { canGoBack, canGoForward, goBack, goForward } = useNavHistory();

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-border bg-[#F9F9FC]">
      {/* Logo + navigation arrows */}
      <div className="px-5 pt-2 pb-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-bold text-base">
            Mirror
          </Link>
          <div className="flex items-center gap-0.5">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className={cn(
                'rounded p-1 transition-colors',
                canGoBack
                  ? 'text-muted-foreground/40 hover:text-muted-foreground'
                  : 'text-muted-foreground/15 cursor-default',
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={goForward}
              disabled={!canGoForward}
              className={cn(
                'rounded p-1 transition-colors',
                canGoForward
                  ? 'text-muted-foreground/40 hover:text-muted-foreground'
                  : 'text-muted-foreground/15 cursor-default',
              )}
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="mt-6 text-sm leading-tight text-muted-foreground">
          Find UX issues before your users do
        </p>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-4">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-foreground/[0.06] text-foreground'
                  : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-3 py-3 space-y-0.5">
        <Link
          href="/docs"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
            pathname.startsWith('/docs')
              ? 'bg-foreground/[0.06] text-foreground'
              : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
          )}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          Docs
        </Link>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <Sun className="h-4 w-4 shrink-0 dark:hidden" />
          <Moon className="hidden h-4 w-4 shrink-0 dark:block" />
          <span className="dark:hidden">Light</span>
          <span className="hidden dark:inline">Dark</span>
        </button>
      </div>
    </aside>
  );
}
