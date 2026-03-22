interface SocketIndicatorProps {
  connected: boolean;
}

export function SocketIndicator({ connected }: SocketIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {connected ? (
        <>
          <span className="relative flex" style={{ width: 8, height: 8 }}>
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full"
              style={{ background: 'var(--safe)', opacity: 0.6 }}
            />
            <span
              className="relative inline-flex rounded-full"
              style={{ width: 8, height: 8, background: 'var(--safe)' }}
            />
          </span>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--safe)',
            }}
          >
            Live
          </span>
        </>
      ) : (
        <>
          <span
            className="animate-pulse inline-flex rounded-full"
            style={{ width: 8, height: 8, background: 'var(--critical)', flexShrink: 0 }}
          />
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--critical)',
            }}
          >
            Disconnected
          </span>
        </>
      )}
    </div>
  );
}
