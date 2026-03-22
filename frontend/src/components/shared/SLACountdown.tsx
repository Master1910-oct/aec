import { useEffect, useState, useCallback } from 'react';
import { Timer } from 'lucide-react';

interface SLACountdownProps {
  deadline: string | null;
  status?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SLACountdown({ deadline, status }: SLACountdownProps) {
  const terminal = ['completed', 'cancelled'].includes(status ?? '');

  const calc = useCallback(() => {
    if (!deadline) return null;
    return Math.floor((new Date(deadline).getTime() - Date.now()) / 1000);
  }, [deadline]);

  const [left, setLeft] = useState<number | null>(calc);

  useEffect(() => {
    if (terminal || !deadline) return;
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [deadline, terminal, calc]);

  if (terminal || !deadline || left === null) return null;

  if (left <= 0) {
    return (
      <span
        className="badge badge-critical animate-pulse flex items-center gap-1"
        style={{ fontSize: 10 }}
      >
        <Timer size={10} /> BREACHED
      </span>
    );
  }

  const mins = Math.floor(left / 60);
  const colorStyle =
    mins >= 5
      ? { color: 'var(--safe)', borderColor: 'rgba(22,163,74,0.3)', background: 'var(--safe-bg)' }
      : mins >= 2
      ? { color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)', background: 'var(--warning-bg)' }
      : { color: 'var(--critical)', borderColor: 'var(--critical-br)', background: 'var(--critical-bg)' };

  return (
    <span
      className={`badge flex items-center gap-1 ${mins < 2 ? 'animate-pulse' : ''}`}
      style={{ ...colorStyle, fontSize: 10, border: `1px solid ${colorStyle.borderColor}` }}
    >
      <Timer size={10} />
      {formatTime(left)}
    </span>
  );
}
