import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Study name helper ─────────────────────────────────

/** Derive a short name from a URL: google.com → Google, app.hord.fi → Hord */
export function studyBaseName(url: string): string {
  let hostname: string;
  try { hostname = new URL(url).hostname; } catch { return 'test'; }
  const parts = hostname.split('.');
  let name: string;
  if (parts.length >= 3) {
    // app.hord.fi → hord  (strip before first dot, after last dot)
    name = parts.slice(1, -1).join('.');
  } else {
    // google.com → google
    name = parts[0];
  }
  if (name === 'www' && parts.length >= 3) name = parts[1];
  return name.toLowerCase();
}

/** Full study name: Google1, Hord2, Claude3 */
export function studyName(url: string, index: number): string {
  return `${studyBaseName(url)}-${index}`;
}

// ── Score display helpers ─────────────────────────────

export function scoreColor(score: number) {
  if (score >= 80) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', bgLight: 'bg-emerald-100 dark:bg-emerald-900/40', ring: 'stroke-emerald-500' };
  if (score >= 60) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', bgLight: 'bg-amber-100 dark:bg-amber-900/40', ring: 'stroke-amber-500' };
  if (score >= 40) return { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', bgLight: 'bg-orange-100 dark:bg-orange-900/40', ring: 'stroke-orange-500' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', bgLight: 'bg-red-100 dark:bg-red-900/40', ring: 'stroke-red-500' };
}

export function scoreLabel(score: number) {
  if (score >= 80) return 'Great';
  if (score >= 60) return 'Okay';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

// ── Date formatting ─────────────────────────────────

export function formatDistanceToNow(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
