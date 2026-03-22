import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { LiveClock } from '@/components/shared/LiveClock';
import { SocketIndicator } from '@/components/shared/SocketIndicator';
import { useStore } from '@/store/useStore';
import { Menu, X, WifiOff } from 'lucide-react';

export function DashboardLayout() {
  const isSocketConnected = useStore(s => s.isSocketConnected);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ── Desktop Sidebar ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:shrink-0">
        <DashboardSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Mobile Sidebar Overlay ──────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.65)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 flex shrink-0">
            <DashboardSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main Area ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Socket disconnected banner */}
        {!isSocketConnected && (
          <div
            className="flex items-center justify-center gap-2 py-2 px-4 shrink-0 animate-pulse"
            style={{ background: 'var(--critical)', color: '#fff' }}
          >
            <WifiOff size={13} />
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              Connection Lost — Reconnecting to Emergency Network...
            </span>
          </div>
        )}

        {/* Top bar */}
        <header
          className="flex items-center justify-between px-4 shrink-0"
          style={{
            height: 52,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Left: mobile hamburger + title */}
          <div className="flex items-center gap-3">
            <button
              className="flex lg:hidden items-center justify-center rounded w-9 h-9 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Open menu"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span
              className="hidden sm:block"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: 'var(--text-dim)',
              }}
            >
              AES Control Room
            </span>
          </div>

          {/* Right: clock + socket indicator */}
          <div className="flex items-center gap-5">
            <SocketIndicator connected={isSocketConnected} />
            <LiveClock />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
