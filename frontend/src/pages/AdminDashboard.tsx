import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import {
  Ambulance, Building2, AlertTriangle, CheckCircle2,
  Activity, Loader2, UserPlus, Ban, RefreshCw, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LiveMap from '@/components/map/LiveMap';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

// ─── Mini components ──────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border border-red-500/40',
    high: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
    medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
    low: 'bg-green-500/20 text-green-400 border border-green-500/40',
  };
  return <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider', map[severity] ?? 'bg-muted text-muted-foreground')}>{severity}</span>;
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    allocated: 'bg-blue-500/20 text-blue-400',
    en_route: 'bg-purple-500/20 text-purple-400',
    arrived: 'bg-cyan-500/20 text-cyan-400',
    completed: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-muted text-muted-foreground',
    escalated: 'bg-red-500/20 text-red-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
  };
  return <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono uppercase', map[status] ?? 'text-muted-foreground')}>{status.replace('_', ' ')}</span>;
}

function AmbulanceStatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    AVAILABLE: 'bg-green-500/20 text-green-400 border border-green-500/40',
    ON_CALL: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
    MAINTENANCE: 'bg-gray-500/20 text-gray-400 border border-gray-500/40',
  };
  return <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider', map[status] ?? 'bg-muted text-muted-foreground')}>{status.replace('_', ' ')}</span>;
}

// Static chart data (augmented with real summary later)
const RESPONSE_DATA = [
  { t: '00:00', v: 6.2 }, { t: '04:00', v: 7.1 }, { t: '08:00', v: 9.4 },
  { t: '10:00', v: 10.2 }, { t: '12:00', v: 9.8 }, { t: '16:00', v: 8.6 },
  { t: '20:00', v: 7.3 },
];
const WEEKLY_DATA = [
  { d: 'Mon', c: 14, h: 8 }, { d: 'Tue', c: 18, h: 11 }, { d: 'Wed', c: 22, h: 15 },
  { d: 'Thu', c: 27, h: 18 }, { d: 'Fri', c: 23, h: 14 }, { d: 'Sat', c: 16, h: 10 }, { d: 'Sun', c: 12, h: 7 },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const {
    stats, emergencies, hospitals, ambulances, adminUsers,
    fetchDashboardStats, fetchEmergencies, fetchHospitals, fetchAmbulances, fetchAdminUsers,
    createUser, deactivateUser,
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'fleet' | 'users'>('overview');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'ambulance', entity_id: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardStats(), fetchEmergencies(), fetchHospitals(), fetchAmbulances(), fetchAdminUsers()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => { fetchDashboardStats(); fetchEmergencies(); fetchAmbulances(); }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newUser.name || !newUser.email || !newUser.password) { setCreateError('Name, email and password are required'); return; }
    setCreating(true);
    try {
      await createUser({ name: newUser.name, email: newUser.email, password: newUser.password, role: newUser.role, entity_id: newUser.entity_id ? parseInt(newUser.entity_id) : undefined });
      setShowCreateUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'ambulance', entity_id: '' });
    } catch (err: any) { setCreateError(err.message || 'Failed to create user'); }
    finally { setCreating(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const criticalEmergencies = emergencies.filter(e => e.severity === 'critical' && !['completed', 'cancelled'].includes(e.status));
  const activeEmergencies = emergencies.filter(e => !['completed', 'cancelled'].includes(e.status));

  const severityData = [
    { name: 'Critical', value: emergencies.filter(e => e.severity === 'critical').length, color: '#ef4444' },
    { name: 'High', value: emergencies.filter(e => e.severity === 'high').length, color: '#f97316' },
    { name: 'Medium', value: emergencies.filter(e => e.severity === 'medium').length, color: '#eab308' },
    { name: 'Low', value: emergencies.filter(e => e.severity === 'low').length, color: '#22c55e' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4 animate-slide-in-up">

      {/* ── Critical Alert Banner ── */}
      {criticalEmergencies.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 emergency-flash">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-sm font-mono font-bold text-red-400 uppercase tracking-wider">
            {criticalEmergencies.length} Critical Assignment{criticalEmergencies.length > 1 ? 's' : ''} Active — Immediate Response Required
          </span>
        </div>
      )}

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Active Units', icon: Ambulance,
            value: ambulances.filter(a => a.status === 'ON_CALL').length,
            sub: `of ${ambulances.length} total`,
            color: 'text-cyan-400',
          },
          {
            label: 'Available Hospitals', icon: Building2,
            value: hospitals.filter(h => (h.available_beds ?? 0) > 0).length,
            sub: `of ${hospitals.length} total`,
            color: 'text-blue-400',
          },
          {
            label: 'Avg Response', icon: Clock,
            value: '—',
            sub: 'Target < 8 min',
            color: 'text-yellow-400',
          },
          {
            label: 'Critical Alerts', icon: AlertTriangle,
            value: criticalEmergencies.length,
            sub: criticalEmergencies.length > 0 ? 'Requires attention' : 'All clear',
            color: criticalEmergencies.length > 0 ? 'text-red-400' : 'text-muted-foreground',
          },
        ].map(card => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{card.label}</span>
              <card.icon className={cn('h-4 w-4 shrink-0', card.color)} />
            </div>
            <p className={cn('text-3xl font-bold font-mono', card.color)}>{card.value}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Section Tabs ── */}
      <div className="flex items-center gap-0.5 rounded-lg bg-secondary/50 p-1 w-fit">
        {(['overview', 'fleet', 'users'] as const).map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={cn('px-4 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-colors',
              activeSection === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >{s}</button>
        ))}
        <button onClick={loadAll} disabled={refreshing} className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground">
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* ════ OVERVIEW ════ */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          {/* Map + Assignments */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Live Map */}
            <div className="lg:col-span-3 rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between bg-secondary/20 px-4 py-2.5 border-b border-border">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Live Tracking</span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-green-400 uppercase">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" /></span>
                  Live
                </span>
              </div>
              {ambulances.length === 0 && hospitals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[380px] bg-secondary/10 text-muted-foreground font-mono">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  No location data available
                </div>
              ) : (
                <LiveMap
                  emergencies={(emergencies ?? []).map(e => ({
                    emergency_id: e.emergency_id,
                    emergency_type: e.emergency_type,
                    severity: e.severity,
                    latitude: e.latitude,
                    longitude: e.longitude,
                    status: e.status,
                    ambulance_id: e.ambulance_id,
                  }))}
                  ambulances={(ambulances ?? []).map(a => ({
                    ambulance_id: a.ambulance_id,
                    vehicle_number: a.vehicle_number,
                    driver_name: a.driver_name ?? null,
                    latitude: a.latitude ?? null,
                    longitude: a.longitude ?? null,
                    status: a.status,
                  }))}
                  hospitals={(hospitals ?? []).map(h => ({
                    hospital_id: h.hospital_id,
                    name: h.name,
                    available_beds: h.available_beds ?? 0,
                    latitude: h.latitude ?? null,
                    longitude: h.longitude ?? null,
                    status: (h.available_beds ?? 0) > 0 ? 'GREEN' : 'RED',
                  }))}
                  className="w-full h-[380px]"
                />
              )}
            </div>

            {/* Active Assignments Panel */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-card flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-secondary/20">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Active Assignments</span>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {activeEmergencies.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center gap-2 text-green-400">
                    <CheckCircle2 className="h-6 w-6" />
                    <span className="text-xs font-mono">No active emergencies</span>
                  </div>
                ) : activeEmergencies.slice(0, 10).map(e => (
                  <div key={e.emergency_id} className={cn('px-4 py-3 space-y-2', e.severity === 'critical' && 'border-l-2 border-red-500')}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground">ASG-{String(e.emergency_id).padStart(3, '0')}</span>
                      <StatusChip status={e.status} />
                    </div>
                    <p className="text-sm font-medium capitalize">{e.emergency_type} Emergency</p>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={e.severity} />
                      {e.ambulance && <span className="text-[10px] font-mono text-muted-foreground">🚑 {e.ambulance.vehicle_number}</span>}
                      {e.hospital && <span className="text-[10px] font-mono text-muted-foreground">🏥 {e.hospital.name.split(' ')[0]}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fleet Overview Table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/20">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">Fleet Overview</span>
              <span className="text-[10px] font-mono text-muted-foreground">{ambulances.length} Units</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/10">
                    {['Call Sign', 'Type', 'Status', 'Driver', 'Position'].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-mono text-muted-foreground uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ambulances.map(a => (
                    <tr key={a.ambulance_id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-cyan-400">{a.vehicle_number}</td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">Emergency</td>
                      <td className="px-4 py-2.5"><AmbulanceStatusChip status={a.status} /></td>
                      <td className="px-4 py-2.5">{a.driver_name ?? 'Unknown'}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">
                        {a.latitude && a.longitude 
                          ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` 
                          : 'No GPS'}
                      </td>
                    </tr>
                  ))}
                  {ambulances.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-mono">No ambulances in fleet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Response Time */}
            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-3">Response Time (24H)</span>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={RESPONSE_DATA}>
                  <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[4, 14]} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', color: '#e2e8f0' }} />
                  <Line type="monotone" dataKey="v" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Weekly Assignments */}
            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-3">Weekly Assignments</span>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={WEEKLY_DATA} barSize={8}>
                  <XAxis dataKey="d" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', color: '#e2e8f0' }} />
                  <Bar dataKey="c" fill="#22d3ee" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="h" fill="#22c55e" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Severity Distribution */}
            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-3">Severity Distribution</span>
              {severityData.length > 0 ? (
                <div className="flex items-center gap-3">
                  <ResponsiveContainer width={90} height={90}>
                    <PieChart>
                      <Pie data={severityData} cx="50%" cy="50%" innerRadius={28} outerRadius={42} dataKey="value" strokeWidth={0}>
                        {severityData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 flex-1">
                    {severityData.map(d => (
                      <div key={d.name} className="flex items-center justify-between text-[10px] font-mono">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />{d.name}</span>
                        <span style={{ color: d.color }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[90px] flex items-center justify-center text-xs text-muted-foreground font-mono">No data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ FLEET ════ */}
      {activeSection === 'fleet' && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/20">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Ambulance Fleet</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border bg-secondary/10">
                {['#ID', 'Vehicle', 'Driver', 'Status', 'Location'].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-mono text-muted-foreground tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {ambulances.map(a => (
                  <tr key={a.ambulance_id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono">{a.ambulance_id}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-cyan-400">{a.vehicle_number}</td>
                    <td className="px-4 py-2.5">{a.driver_name ?? '—'}</td>
                    <td className="px-4 py-2.5"><AmbulanceStatusChip status={a.status} /></td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground text-[10px]">{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════ USERS ════ */}
      {activeSection === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateUser(!showCreateUser)} className="gap-2 text-xs">
              <UserPlus className="h-4 w-4" />
              {showCreateUser ? 'Cancel' : 'Create User'}
            </Button>
          </div>
          {showCreateUser && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs font-mono font-bold mb-4 uppercase tracking-wider">New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                {createError && <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{createError}</div>}
                <div className="grid grid-cols-2 gap-4">
                  {['name', 'email', 'password'].map(field => (
                    <div key={field} className="space-y-1.5">
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{field}</label>
                      <input type={field === 'password' ? 'password' : 'text'} value={(newUser as any)[field]}
                        onChange={e => setNewUser(p => ({ ...p, [field]: e.target.value }))}
                        className="w-full h-10 px-3 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Role</label>
                    <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="ambulance">Ambulance</option>
                      <option value="hospital">Hospital</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Entity ID (optional)</label>
                    <input type="number" value={newUser.entity_id} onChange={e => setNewUser(p => ({ ...p, entity_id: e.target.value }))}
                      placeholder="Hospital or Ambulance ID"
                      className="w-full h-10 px-3 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <Button type="submit" disabled={creating} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create User
                </Button>
              </form>
            </div>
          )}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/20">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">All Users ({adminUsers.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border bg-secondary/10">
                  {['#ID', 'Name', 'Email', 'Role', 'Entity ID', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-mono text-muted-foreground tracking-wider">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {adminUsers.map(u => (
                    <tr key={u.user_id} className={cn('transition-colors', u.email.startsWith('DEACTIVATED_') ? 'opacity-40' : 'hover:bg-secondary/20')}>
                      <td className="px-4 py-2.5 font-mono">{u.user_id}</td>
                      <td className="px-4 py-2.5">{u.name}</td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('font-mono text-xs capitalize', u.role === 'admin' ? 'text-primary' : u.role === 'hospital' ? 'text-blue-400' : 'text-green-400')}>{u.role}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono">{u.entity_id ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {!u.email.startsWith('DEACTIVATED_') && u.role !== 'admin' && (
                          <button onClick={() => deactivateUser(u.user_id)} className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors text-xs font-mono">
                            <Ban className="h-3 w-3" /> Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adminUsers.length === 0 && <div className="p-8 text-center text-muted-foreground font-mono text-sm">No users found</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
