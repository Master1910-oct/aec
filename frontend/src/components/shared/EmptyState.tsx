import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
}

export function EmptyState({ icon: Icon, title, message }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center"
      style={{ color: 'var(--text-dim)' }}
    >
      <Icon
        size={36}
        style={{ color: 'var(--text-dim)', opacity: 0.5 }}
        strokeWidth={1.5}
      />
      <p
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: '0.5px',
          color: 'var(--text-muted)',
        }}
      >
        {title}
      </p>
      {message && (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', maxWidth: 300 }}>{message}</p>
      )}
    </div>
  );
}
