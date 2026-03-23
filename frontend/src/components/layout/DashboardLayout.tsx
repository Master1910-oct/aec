/**
 * DashboardLayout.tsx — Responsive shell
 *
 * Breakpoints:
 *   Mobile  (<640px)   — bottom tab nav, no sidebar, hamburger top-right
 *   Tablet  (640-1023) — collapsible icon sidebar (64px → 200px toggle)
 *   Laptop  (1024+)    — always-visible 220px sidebar
 *
 * Test sizes: 375, 390, 768, 1024, 1280, 1920px
 * □ No horizontal scroll on mobile
 * □ Bottom tab nav appears only below sm (640px)
 * □ Sidebar hidden on mobile, icon-only collapsed on tablet
 * □ LiveClock hidden on mobile
 * □ SocketIndicator: dot-only on mobile, dot+label on desktop
 */

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { LiveClock } from '@/components/shared/LiveClock';
import { SocketIndicator } from '@/components/shared/SocketIndicator';
import { useStore } from '@/store/useStore';
import { Menu, X, WifiOff, LayoutDashboard, Building2, Truck, LogOut } from 'lucide-react';

// ── Bottom tab nav data (mobile only) ────────────────────────────────────────

const BOTTOM_TABS_ADMIN = [
  { to: '/',          label: 'Command', icon: LayoutDashboard, end: true  },
  { to: '/hospital',  label: 'Hospitals', icon: Building2,     end: false },
  { to: '/ambulance', label: 'Fleet',     icon: Truck,         end: false },
];
const BOTTOM_TABS_HOSPITAL  = [{ to: '/hospital',  label: 'Dashboard', icon: Building2,     end: true  }];
const BOTTOM_TABS_AMBULANCE = [
  { to: '/ambulance', label: 'My Panel',  icon: Truck,         end: true  },
  { to: '/hospital',  label: 'Hospitals', icon: Building2,     end: false },
];
const BOTTOM_TABS_FOR_ROLE: Record<string, typeof BOTTOM_TABS_ADMIN> = {
  admin:     BOTTOM_TABS_ADMIN,
  hospital:  BOTTOM_TABS_HOSPITAL,
  ambulance: BOTTOM_TABS_AMBULANCE,
};

export function DashboardLayout() {
  const isSocketConnected = useStore(s => s.isSocketConnected);
  const currentUser       = useStore(s => s.currentUser);
  const logout            = useStore(s => s.logout);
  const navigate          = useNavigate();

  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // tablet icon↔full toggle

  const role     = currentUser?.role ?? 'admin';
  const bottomTabs = BOTTOM_TABS_FOR_ROLE[role] ?? BOTTOM_TABS_ADMIN;

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <div className="flex h-dvh w-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ── Desktop sidebar (lg+): always visible ──────────────────────────── */}
      <div className="hidden lg:flex lg:shrink-0">
        <DashboardSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Tablet sidebar (sm–lg): icon-only (64px) by default, expands to 200px ── */}
      <div
        className="hidden sm:flex lg:hidden flex-col shrink-0 transition-all duration-200"
        style={{
          width: sidebarExpanded ? 200 : 64,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setSidebarExpanded(v => !v)}
          className="flex items-center justify-center h-[52px] w-full shrink-0 transition-colors"
          style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}
          aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarExpanded ? <X size={16} /> : <Menu size={16} />}
        </button>
        {/* Tablet nav items */}
        <nav className="flex-1 flex flex-col py-3 px-2 gap-1">
          {bottomTabs.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-2 transition-colors ${isActive ? 'nav-link-active' : ''}`
              }
              style={({ isActive }) => ({
                height: 44,
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                fontFamily: "'Barlow', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              })}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={16}
                    style={{ color: isActive ? 'var(--critical)' : 'var(--text-dim)', flexShrink: 0 }}
                  />
                  {sidebarExpanded && item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        {/* Logout at bottom of tablet sidebar */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-2 py-3 transition-colors shrink-0"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-dim)', overflow: 'hidden', whiteSpace: 'nowrap' }}
          title="Log out"
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {sidebarExpanded && <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13 }}>Logout</span>}
        </button>
      </div>

      {/* ── Mobile full-screen sidebar overlay (< sm) ────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden">
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

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Socket disconnected banner — always visible, critical */}
        {!isSocketConnected && (
          <div
            className="flex items-center justify-center py-1.5 px-4 shrink-0 bg-amber-500/15 border-b border-amber-500/30 text-amber-400"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-2 flex-shrink-0" />
            <span className="text-xs font-semibold tracking-widest uppercase">
              RECONNECTING TO EMERGENCY NETWORK...
            </span>
          </div>
        )}

        {/* Top bar */}
        <header
          className="flex items-center justify-between px-3 sm:px-4 shrink-0"
          style={{
            height: 52,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Left: mobile hamburger + title */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger: visible only below sm (tablet sidebar has its own toggle) */}
            <button
              className="flex sm:hidden items-center justify-center rounded w-9 h-9 transition-colors"
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
            {/* Role badge on mobile in place of title */}
            <span
              className={`sm:hidden badge badge-${role}`}
              style={{ fontSize: 10 }}
            >
              {role.toUpperCase()}
            </span>
          </div>

          {/* Right: clock (hidden mobile) + socket indicator */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* SocketIndicator: dot-only mobile, dot+label sm+ */}
            <div className="sm:hidden">
              <span
                className={`inline-flex rounded-full ${isSocketConnected ? 'animate-ping' : 'animate-pulse'}`}
                style={{
                  width: 8, height: 8,
                  background: isSocketConnected ? 'var(--safe)' : 'var(--critical)',
                  display: 'inline-block',
                }}
              />
            </div>
            <div className="hidden sm:flex">
              <SocketIndicator connected={isSocketConnected} />
            </div>
            {/* LiveClock: hidden on mobile */}
            <div className="hidden md:flex">
              <LiveClock />
            </div>
          </div>
        </header>

        {/* Page content */}
        {/* pb-14 on mobile to clear the fixed bottom tab bar (56px) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-5 pb-16 sm:pb-4">
          <Outlet />
        </main>

        {/* ── Bottom Tab Navigation (mobile only, < sm = 640px) ──────────────── */}
        <nav
          className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
          style={{
            height: 56,
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {bottomTabs.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={({ isActive }) => ({
                color: isActive ? 'var(--critical)' : 'var(--text-dim)',
                borderTop: isActive ? '2px solid var(--critical)' : '2px solid transparent',
                minHeight: 44,
              })}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} style={{ color: isActive ? 'var(--critical)' : 'var(--text-dim)' }} />
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, fontWeight: 600 }}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          {/* Logout tab on mobile */}
          <button
            onClick={handleLogout}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
            style={{ color: 'var(--text-dim)', borderTop: '2px solid transparent', minHeight: 44 }}
            aria-label="Log out"
          >
            <LogOut size={18} />
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, fontWeight: 600 }}>Logout</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
