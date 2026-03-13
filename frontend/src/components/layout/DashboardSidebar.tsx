import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import {
  LayoutDashboard,
  Building2,
  Ambulance,
  Radio,
  Activity,
  Shield,
  LogOut,
} from 'lucide-react';

// Every nav item declares which roles can see it
const NAV_ITEMS = [
  { to: '/', label: 'Command Center', icon: LayoutDashboard, roles: ['admin'] },
  { to: '/hospital', label: 'Hospital Panel', icon: Building2, roles: ['admin', 'hospital', 'ambulance'] },
  { to: '/ambulance', label: 'Ambulance Unit', icon: Ambulance, roles: ['admin', 'ambulance'] },
];

export function DashboardSidebar() {
  const { stats, currentUser, logout } = useStore();
  const navigate = useNavigate();

  const role = currentUser?.role ?? 'ambulance';

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">AES CONTROL</h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider">EMERGENCY SYSTEM</p>
          </div>
        </div>
      </div>

      {/* Live Status */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-[10px] font-mono tracking-wider text-success uppercase">System Online</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-secondary/50 rounded p-2">
            <p className="text-lg font-bold font-mono">{stats?.on_call_ambulances ?? 0}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Active Units</p>
          </div>
          <div className="bg-secondary/50 rounded p-2">
            <p className="text-lg font-bold font-mono">{stats?.sla_breached ?? 0}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Alerts</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="panel-header px-3 mb-2">Navigation</p>
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-border space-y-3">
        {currentUser && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium truncate max-w-[140px]">{currentUser.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{currentUser.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-muted-foreground hover:text-red-400 transition-colors text-xs font-mono"
              title="Log out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Radio className="h-3.5 w-3.5 animate-pulse-slow text-primary" />
            <span className="text-[10px] font-mono tracking-wider">FREQ: 462.5 MHz</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono tracking-wider">UPTIME: 99.97%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
