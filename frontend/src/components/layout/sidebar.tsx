'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LayoutDashboard, Users, Moon, Sun, X, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui-store';
import { BackendStatus } from '@/components/common/backend-status';

const navItems = [
  { href: '/tests', label: 'My Tests', icon: LayoutDashboard },
  { href: '/personas', label: 'Testers', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const { theme, setTheme } = useTheme();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[var(--z-overlay)] w-64 border-r bg-sidebar lg:static lg:z-auto',
          'transform lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ transitionProperty: 'transform', transitionDuration: '200ms', transitionTimingFunction: 'ease-out' }}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center justify-between border-b px-4">
            <Link href="/" className="font-semibold text-lg">
              Mirror
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Nav */}
          <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="border-t px-3 py-3 space-y-1">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
              <span className="dark:hidden">Light Mode</span>
              <span className="hidden dark:inline">Dark Mode</span>
            </button>
            <Link
              href="/docs"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                pathname.startsWith('/docs')
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground',
              )}
            >
              <BookOpen className="h-4 w-4" />
              Docs
            </Link>
            <BackendStatus />
          </div>
        </div>
      </aside>
    </>
  );
}
