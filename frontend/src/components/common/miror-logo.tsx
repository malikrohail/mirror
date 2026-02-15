/**
 * Browser Reflect icon — the miror brand mark.
 * A browser window with a faint reflection beneath.
 */
export function MirorIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <circle cx="5.5" cy="5" r="0.7" fill="currentColor" opacity="0.3" />
      <circle cx="8" cy="5" r="0.7" fill="currentColor" opacity="0.3" />
      <rect x="5" y="18" width="14" height="3" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.15" />
    </svg>
  );
}

/** Full logo lockup: icon + wordmark in Red Hat Display */
export function MirorLogo({ iconSize = 20, className }: { iconSize?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <MirorIcon size={iconSize} />
      <span
        className="leading-none"
        style={{ fontFamily: '"Red Hat Display", sans-serif', fontWeight: 500 }}
      >
        miror
      </span>
    </span>
  );
}
