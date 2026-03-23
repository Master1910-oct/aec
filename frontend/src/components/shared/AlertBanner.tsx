interface AlertBannerProps {
  message: string;
  time?: string;
  onDismiss: () => void;
}

export function AlertBanner({ message, time, onDismiss }: AlertBannerProps) {
  return (
    /* Mobile: flex-col (dot+text row + dismiss below), sm+: flex-row side-by-side */
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-4 py-3 rounded-md"
      style={{
        background: 'var(--critical-bg)',
        border: '1px solid var(--critical-br)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Pulsing dot */}
        <span className="relative flex shrink-0" style={{ width: 8, height: 8 }}>
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full"
            style={{ background: 'var(--critical)', opacity: 0.7 }}
          />
          <span
            className="relative inline-flex rounded-full"
            style={{ width: 8, height: 8, background: 'var(--critical)' }}
          />
        </span>

        <p
          className="text-sm truncate"
          style={{ color: 'var(--critical)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.5px' }}
        >
          {message}
        </p>

        {time && (
          <span className="text-xs shrink-0" style={{ color: 'var(--text-dim)' }}>
            {time}
          </span>
        )}
      </div>

      {/* Dismiss — min 44px touch on mobile */}
      <button
        onClick={onDismiss}
        className="self-end sm:self-auto shrink-0 flex items-center justify-center rounded transition-colors"
        style={{ minWidth: 44, minHeight: 44, color: 'var(--text-dim)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--critical)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        title="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

