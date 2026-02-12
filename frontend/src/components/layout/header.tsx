'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ChevronDown, ClipboardList, Users, BookOpen, Moon, Sun, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <span className="font-bold text-lg">Mirror</span>
      <span className="text-sm text-muted-foreground">Find UX issues before your users do.</span>

      <div className="ml-auto">
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
