import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  const navigate        = useNavigate();
  const { currentUser } = useStore();

  const homeRoute =
    currentUser?.role === 'hospital'  ? '/hospital'  :
    currentUser?.role === 'ambulance' ? '/ambulance' : '/';

  return (
    <div
      className="min-h-dvh w-full flex items-center justify-center p-6"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.2,
        }}
      />

      {/* Content card — single centred column */}
      <div className="relative flex flex-col items-center text-center gap-8 max-w-md animate-slide-in-up">

        {/* Alert icon */}
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 80, height: 80,
            background: 'var(--critical-bg)',
            border: '1px solid var(--critical-br)',
          }}
        >
          <AlertTriangle size={36} style={{ color: 'var(--critical)' }} />
        </div>

        {/* 404 — scales: text-7xl mobile → text-9xl desktop */}
        <span
          className="font-bold leading-none text-7xl sm:text-8xl lg:text-9xl"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: 'var(--critical)',
            letterSpacing: '-2px',
            textShadow: '0 0 60px rgba(232,0,29,0.3)',
          }}
        >
          404
        </span>

        {/* Headline + description */}
        <div className="flex flex-col gap-3">
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 26,
              color: 'var(--text)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            Page Not Found
          </h1>
          <p
            style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 14,
              color: 'var(--text-dim)',
              maxWidth: 320,
              lineHeight: 1.6,
            }}
          >
            The route you requested does not exist or you lack permission to access it.
          </p>
        </div>

        {/* Back button — full-width on mobile, auto on sm+ */}
        <button
          onClick={() => navigate(homeRoute)}
          className="btn-base btn-primary w-full sm:w-auto"
          style={{ minWidth: 200, height: 52, fontSize: 14, letterSpacing: '2.5px' }}
        >
          Return to Base
        </button>

        {/* Build ref */}
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
          }}
        >
          AES Emergency System v1.0.0
        </span>

      </div>
    </div>
  );
}
