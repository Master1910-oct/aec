import { useEffect, useState, useCallback } from 'react';
import { Timer } from 'lucide-react';

export interface SLACountdownProps {
  dispatchSla?: string | null;
  transportSla?: string | null;
  status?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SLACountdown({ dispatchSla, transportSla, status }: SLACountdownProps) {
  const terminal = ['completed', 'cancelled', 'escalated'].includes(status ?? '');
  
  const isDispatch = ['pending', 'allocated', 'en_route'].includes(status ?? '');
  const isTransport = ['arrived', 'first_aid', 'transfer_en_route'].includes(status ?? '');

  const activeDeadline = isDispatch ? dispatchSla : (isTransport ? transportSla : null);

  const calc = useCallback(() => {
    if (!activeDeadline) return null;
    return Math.floor((new Date(activeDeadline).getTime() - Date.now()) / 1000);
  }, [activeDeadline]);

  const [left, setLeft] = useState<number | null>(calc);

  useEffect(() => {
    if (terminal || !activeDeadline) return;
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [activeDeadline, terminal, calc]);

  if (terminal || !activeDeadline || left === null) return null;

  if (left <= 0) {
    return (
      <span
        className="badge badge-critical animate-pulse flex items-center gap-1"
        style={{ fontSize: 10, background: 'var(--critical-bg)', color: 'var(--critical)', border: '1px solid var(--critical-br)' }}
      >
        <Timer size={10} /> {isDispatch ? 'DISPATCH BREACHED' : 'TRANSPORT BREACHED'}
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
    <div className="flex flex-col items-end gap-0.5">
        <span
          className={`badge flex items-center gap-1 ${mins < 2 ? 'animate-pulse' : ''}`}
          style={{ ...colorStyle, fontSize: 10, border: `1px solid ${colorStyle.borderColor}` }}
        >
          <Timer size={10} />
          {formatTime(left)}
        </span>
        <span style={{ fontSize: 8, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            {isDispatch ? 'DISPATCH SLA' : 'TRANSPORT SLA'}
        </span>
    </div>
  );
}
