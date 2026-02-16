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
  TabletSmartphone,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TERMS } from '@/lib/constants';
import { MirorLogo } from '@/components/common/miror-logo';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tests', label: TERMS.pluralCap, icon: TabletSmartphone },
  { href: '/personas', label: 'Testers', icon: Users },
];

export function useNavHistory() {
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
  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-border bg-[#F9F9FC] dark:bg-[#161616]">
      {/* Logo — h-[42px] matches PageHeaderBar */}
      <div className="px-5">
        <div className="flex h-[42px] items-center">
          <Link href="/" className="text-[22px] translate-y-[3px] opacity-95 transition-all duration-200 hover:opacity-100 hover:scale-[1.02]">
            <MirorLogo iconSize={22} />
          </Link>
        </div>
        <p className="mt-6 text-sm leading-tight text-muted-foreground">
          Our AI testers don&apos;t just analyze websites. They become people.
        </p>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-6">
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
