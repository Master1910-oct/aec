import { Outlet } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { Clock, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';

export function DashboardLayout() {
  const [time, setTime] = useState(new Date());
  const isSocketConnected = useStore(s => s.isSocketConnected);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── GAP 1: Connection Lost Banner ─────────────────────────────── */}
        {!isSocketConnected && (
          <div className="flex items-center justify-center gap-2 bg-red-500/90 text-white text-xs font-mono tracking-wider py-1.5 px-4 shrink-0 animate-pulse">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>CONNECTION LOST — RECONNECTING TO EMERGENCY NETWORK...</span>
          </div>
        )}

        {/* Top bar */}
        <header className="h-10 border-b border-border bg-card/50 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
              EMERGENCY NETWORK
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[11px] font-mono tracking-wider">
                {time.toLocaleTimeString('en-IN', { hour12: false })}
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
