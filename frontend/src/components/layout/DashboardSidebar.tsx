import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import {
  LayoutDashboard, Building2, Truck,
  LogOut, AlertTriangle, Activity,
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

const NAV_ADMIN = [
  { to: '/',          label: 'Command Center', icon: LayoutDashboard, end: true  },
  { to: '/hospital',  label: 'Hospitals',      icon: Building2,        end: false },
  { to: '/ambulance', label: 'Fleet',           icon: Truck,            end: false },
];

const NAV_HOSPITAL = [
  { to: '/hospital',  label: 'My Dashboard',   icon: LayoutDashboard, end: true  },
];

const NAV_AMBULANCE = [
  { to: '/ambulance', label: 'My Panel',        icon: Truck,           end: true  },
  { to: '/hospital',  label: 'Hospitals',       icon: Building2,       end: false },
];

const NAV_FOR_ROLE: Record<string, typeof NAV_ADMIN> = {
  admin:     NAV_ADMIN,
  hospital:  NAV_HOSPITAL,
  ambulance: NAV_AMBULANCE,
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin:     'badge badge-admin',
  hospital:  'badge badge-hospital',
  ambulance: 'badge badge-ambulance',
};

export function DashboardSidebar({ onClose }: SidebarProps) {
  const { currentUser, stats, slaBreaches, logout } = useStore();
  const navigate = useNavigate();

  const role = currentUser?.role ?? 'ambulance';
  const navItems = NAV_FOR_ROLE[role] ?? NAV_ADMIN;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className="flex flex-col h-full shrink-0"
      style={{
        width: 220,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* ── Logo ──────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 shrink-0"
        style={{ height: 52, borderBottom: '1px solid var(--border)' }}
      >
        {/* Red square logo mark */}
        <div
          className="flex items-center justify-center rounded"
          style={{ width: 28, height: 28, background: 'var(--critical)' }}
        >
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '1px',
              color: '#fff',
            }}
          >
            AES
          </span>
        </div>
        <div>
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '1px',
              color: 'var(--text)',
              lineHeight: 1.1,
            }}
          >
            AES
          </p>
          <p
            style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 10,
              color: 'var(--text-dim)',
              letterSpacing: '0.5px',
              lineHeight: 1.2,
            }}
          >
            Emergency System
          </p>
        </div>
      </div>

      {/* ── Live Stats Chip Row ────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="flex-1 rounded flex flex-col items-center py-2"
          style={{ background: 'var(--bg-card)' }}
        >
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: 'var(--text)',
            }}
          >
            {stats?.on_call_ambulances ?? 0}
          </span>
          <span className="section-label" style={{ fontSize: 9 }}>Active</span>
        </div>
        <div
          className="flex-1 rounded flex flex-col items-center py-2"
          style={{
            background: slaBreaches.length > 0 ? 'var(--critical-bg)' : 'var(--bg-card)',
            border: slaBreaches.length > 0 ? '1px solid var(--critical-br)' : 'none',
          }}
        >
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: slaBreaches.length > 0 ? 'var(--critical)' : 'var(--text)',
            }}
          >
            {slaBreaches.length}
          </span>
          <span className="section-label" style={{ fontSize: 9 }}>Alerts</span>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        <p className="section-label px-2 mb-3">Navigation</p>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded px-3 transition-colors',
                isActive ? 'nav-link-active' : '',
              ].join(' ')
            }
            style={({ isActive }) => ({
              height: 44,
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              fontFamily: "'Barlow', sans-serif",
              fontWeight: 500,
              fontSize: 14,
            })}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={16}
                  style={{ color: isActive ? 'var(--critical)' : 'var(--text-dim)', flexShrink: 0 }}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}

        {/* SLA breach quick-link shown to admins */}
        {role === 'admin' && slaBreaches.length > 0 && (
          <div
            className="flex items-center gap-3 px-3 mt-2 rounded"
            style={{
              height: 40,
              background: 'var(--critical-bg)',
              border: '1px solid var(--critical-br)',
            }}
          >
            <AlertTriangle size={14} style={{ color: 'var(--critical)', flexShrink: 0 }} />
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '1px',
                color: 'var(--critical)',
                textTransform: 'uppercase',
              }}
            >
              {slaBreaches.length} SLA Breach{slaBreaches.length > 1 ? 'es' : ''}
            </span>
          </div>
        )}
      </nav>

      {/* ── User footer ───────────────────────────── */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-2 shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex flex-col gap-1 min-w-0">
          <p
            className="truncate"
            style={{
              fontFamily: "'Barlow', sans-serif",
              fontWeight: 500,
              fontSize: 13,
              color: 'var(--text)',
              maxWidth: 130,
            }}
          >
            {currentUser?.name ?? 'User'}
          </p>
          <span className={ROLE_BADGE_CLASS[role] ?? 'badge badge-ambulance'} style={{ fontSize: 10, alignSelf: 'flex-start' }}>
            {role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center rounded transition-colors"
          style={{ width: 36, height: 36, color: 'var(--text-dim)', flexShrink: 0 }}
          title="Log out"
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--critical)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* ── Uptime strip ──────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <Activity size={11} style={{ color: 'var(--text-dim)' }} />
        <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: 'var(--text-dim)' }}>
          UPTIME 99.97%
        </span>
      </div>
    </aside>
  );
}
