import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  const navigate   = useNavigate();
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

      <div className="relative flex flex-col items-center text-center gap-8 max-w-md animate-slide-in-up">
        {/* Icon */}
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

        {/* 404 */}
        <div className="flex flex-col items-center gap-2">
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 96,
              lineHeight: 1,
              color: 'var(--critical)',
              letterSpacing: '-2px',
              textShadow: '0 0 60px rgba(232,0,29,0.3)',
            }}
          >
            404
          </span>
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
            The route you requested doesn't exist or you don't have permission to access it.
          </p>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(homeRoute)}
          className="btn-base btn-primary"
          style={{ minWidth: 200, height: 50, fontSize: 14, letterSpacing: '2.5px' }}
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
          AES Emergency System — v1.0.0
        </span>
      </div>
    </div>
  );
}
