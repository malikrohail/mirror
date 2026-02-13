'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ChevronDown, ClipboardList, Users, BookOpen, Moon, Sun, User, Calendar, TrendingUp, Monitor, Cloud } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TERMS } from '@/lib/constants';

type BrowserMode = 'local' | 'cloud';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [browserMode, setBrowserMode] = useState<BrowserMode>('local');

  useEffect(() => {
    const stored = localStorage.getItem('mirror-browser-mode');
    if (stored === 'local' || stored === 'cloud') {
      setBrowserMode(stored);
    }
  }, []);

  const toggleBrowserMode = (mode: BrowserMode) => {
    setBrowserMode(mode);
    localStorage.setItem('mirror-browser-mode', mode);
  };

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-14 items-center gap-3 border-b border-border/50 px-4 backdrop-blur-xl bg-background/60">
      <Link href="/" className="flex items-center gap-3">
        <span className="font-bold text-lg">Mirror</span>
        <span className="text-sm text-muted-foreground">Find UX issues before your users do.</span>
      </Link>

      <div className="ml-auto flex items-center gap-3">
        {/* Browser engine toggle */}
        <div className="flex rounded-md border p-0.5">
          <button
            onClick={() => toggleBrowserMode('local')}
            className={`flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors ${
              browserMode === 'local'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Monitor className="h-3 w-3" />
            Local
          </button>
          <button
            onClick={() => toggleBrowserMode('cloud')}
            className={`flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors ${
              browserMode === 'cloud'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cloud className="h-3 w-3" />
            Cloud
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <User className="h-4 w-4" />
              <span>Profile</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/tests" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Previous Tests
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/personas" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                All Testers
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/schedules" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Scheduled Tests
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/history" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Score History
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/docs" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Docs
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex items-center gap-2">
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
              <span className="dark:hidden">Dark Mode</span>
              <span className="hidden dark:inline">Light Mode</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
