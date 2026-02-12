'use client';

import { useEffect, useState, useCallback, useRef, KeyboardEvent } from 'react';
import {
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCw,
  Star,
  Bookmark,
  Lock,
  X,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const FAVORITES_KEY = 'mirror-browser-favorites';

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}

function normalizeUrl(str: string): string {
  const trimmed = str.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function loadFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favs: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

type PreviewState = 'idle' | 'loading' | 'loaded' | 'failed';

interface WebsitePreviewProps {
  url: string;
  onUrlChange?: (url: string) => void;
}

export function WebsitePreview({ url, onUrlChange }: WebsitePreviewProps) {
  const [debouncedUrl, setDebouncedUrl] = useState('');
  const [barValue, setBarValue] = useState(url);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [iframeKey, setIframeKey] = useState(0);
  const [previewState, setPreviewState] = useState<PreviewState>('idle');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setBarValue(url);
  }, [url]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUrl(url);
    }, 500);
    return () => clearTimeout(timer);
  }, [url]);

  const validUrl = isValidUrl(debouncedUrl) ? debouncedUrl : '';

  // Reset state when URL changes
  useEffect(() => {
    if (!validUrl) {
      setPreviewState('idle');
      return;
    }

    setPreviewState('loading');

    // Safety timeout: proxy itself times out at 15s, give a bit of extra margin
    const timeout = setTimeout(() => {
      setPreviewState((prev) => (prev === 'loading' ? 'failed' : prev));
    }, 20000);

    return () => clearTimeout(timeout);
  }, [validUrl, iframeKey]);

  const isFavorited = validUrl ? favorites.includes(validUrl) : false;

  const commitBarValue = () => {
    const normalized = normalizeUrl(barValue);
    if (normalized && onUrlChange && normalized !== url) {
      onUrlChange(normalized);
    }
  };

  const handleBarKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitBarValue();
    }
  };

  const handleRefresh = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setPreviewState((prev) => (prev === 'loading' ? 'loaded' : prev));
  }, []);

  const handleIframeError = useCallback(() => {
    setPreviewState('failed');
  }, []);

  const toggleFavorite = useCallback(() => {
    if (!validUrl) return;
    setFavorites((prev) => {
      const next = prev.includes(validUrl)
        ? prev.filter((f) => f !== validUrl)
        : [...prev, validUrl];
      saveFavorites(next);
      return next;
    });
  }, [validUrl]);

  const removeFavorite = (fav: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.filter((f) => f !== fav);
      saveFavorites(next);
      return next;
    });
  };

  const navigateToFavorite = (fav: string) => {
    if (onUrlChange) onUrlChange(fav);
  };

  const renderContent = () => {
    if (!validUrl) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center">
          <Globe className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Enter a URL to preview the website
          </p>
        </div>
      );
    }

    return (
      <div className="relative flex-1">
        {/* Always render iframe, but only make visible when loaded */}
        <iframe
          ref={iframeRef}
          key={`${validUrl}-${iframeKey}`}
          src={`/api/v1/proxy?url=${encodeURIComponent(validUrl)}`}
          title="Website preview"
          className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${
            previewState === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          sandbox="allow-scripts allow-forms allow-popups"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />

        {/* Loading state */}
        {previewState === 'loading' && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Connecting to {getHostname(validUrl)}...
            </p>
          </div>
        )}

        {/* Failed state */}
        {previewState === 'failed' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <ShieldAlert className="h-10 w-10 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium text-foreground/70">
                This site can&apos;t be previewed
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Some sites block embedding. Don&apos;t worry — your test
                runs in a real browser and will work perfectly.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-background">
      {/* Browser toolbar */}
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-2">
        <div className="mr-1.5 flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>

        <button className="rounded p-1 text-muted-foreground/60 hover:bg-muted" disabled>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button className="rounded p-1 text-muted-foreground/60 hover:bg-muted" disabled>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          onClick={handleRefresh}
          title="Refresh"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        {/* Address bar */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-background px-3 py-1.5 text-sm">
          {validUrl ? (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          ) : (
            <Globe className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          )}
          <input
            type="text"
            value={barValue}
            onChange={(e) => setBarValue(e.target.value)}
            onKeyDown={handleBarKeyDown}
            onBlur={commitBarValue}
            placeholder="Your website"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <button
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={toggleFavorite}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={`h-3.5 w-3.5 ${isFavorited ? 'fill-yellow-400 text-yellow-400' : ''}`}
            />
          </button>
        </div>

        {/* Bookmarks dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Bookmark className="h-3.5 w-3.5" />
              <span>Bookmarks</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {favorites.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No bookmarks yet
              </p>
            ) : (
              favorites.map((fav) => (
                <DropdownMenuItem
                  key={fav}
                  className="group flex items-center justify-between"
                  onClick={() => navigateToFavorite(fav)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">{getHostname(fav)}</span>
                  </div>
                  <X
                    className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                    onClick={(e) => removeFavorite(fav, e)}
                  />
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content area */}
      {renderContent()}
    </div>
  );
}
