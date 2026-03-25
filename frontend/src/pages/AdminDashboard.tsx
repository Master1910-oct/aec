import { useState, useEffect, useCallback, Fragment } from 'react';
import { useStore } from '@/store/useStore';
import {
  Ambulance, Building2, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, Clock, MapPin, Activity, X, Truck
} from 'lucide-react';

import { api } from '@/lib/api';
import LiveMap from '@/components/map/LiveMap';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

// Shared components
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { SLACountdown } from '@/components/shared/SLACountdown';
import { EmptyState } from '@/components/shared/EmptyState';

// ─── Static chart data ────────────────────────────────────────────────────────
const RESPONSE_DATA = [
  { t: '00:00', v: 6.2 }, { t: '04:00', v: 7.1 }, { t: '08:00', v: 9.4 },
  { t: '10:00', v: 10.2 }, { t: '12:00', v: 9.8 }, { t: '16:00', v: 8.6 },
  { t: '20:00', v: 7.3 },
];
const WEEKLY_DATA = [
  { d: 'Mon', c: 14, h: 8 }, { d: 'Tue', c: 18, h: 11 }, { d: 'Wed', c: 22, h: 15 },
  { d: 'Thu', c: 27, h: 18 }, { d: 'Fri', c: 23, h: 14 }, { d: 'Sat', c: 16, h: 10 }, { d: 'Sun', c: 12, h: 7 },
];

const ALL_SPECIALITIES = [
  'trauma', 'cardiac', 'respiratory', 'neurological',
  'orthopaedic', 'maternity', 'ophthalmology', 'ent',
  'paediatric', 'oncology', 'dermatology', 'urology',
  'psychiatry', 'other',
];

const EMERGENCY_TYPE_OPTIONS = [
  ['trauma', 'Trauma'],
  ['cardiac', 'Cardiac'],
  ['respiratory', 'Respiratory'],
  ['neurological', 'Neurological'],
  ['orthopaedic', 'Orthopaedic'],
  ['maternity', 'Maternity'],
  ['ophthalmology', 'Ophthalmology (Eye)'],
  ['ent', 'ENT'],
  ['paediatric', 'Paediatric'],
  ['oncology', 'Oncology'],
  ['dermatology', 'Dermatology'],
  ['urology', 'Urology'],
  ['psychiatry', 'Psychiatry'],
  ['other', 'Other'],
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const {
    stats, emergencies, hospitals, ambulances, adminUsers, slaBreaches,
    fetchDashboardStats, fetchEmergencies, fetchHospitals, fetchAmbulances, fetchAdminUsers,
    createUser, deactivateUser, updateSpecialities, dismissSlaBreach,
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'fleet' | 'users' | 'hospitals' | 'dispatch'>('overview');
  const [expandedEmergency, setExpandedEmergency] = useState<number | null>(null);

  // ── User creation
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'ambulance', entity_id: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // ── Password reset
  const [resettingPassword, setResettingPassword] = useState<number | null>(null);
  const [resetResult, setResetResult] = useState<{ userId: number; password: string; name: string } | null>(null);

  // ── Speciality editor
  const [editingHospitalId, setEditingHospitalId] = useState<number | null>(null);
  const [editingSpecs, setEditingSpecs] = useState<string[]>([]);
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [specError, setSpecError] = useState('');

  // ── 108 Dispatch
  const [dispatchForm, setDispatchForm] = useState({
    patient_name: '',
    description: '',
    emergency_type: 'trauma',
    severity: 'high',
    caller_location: '',
  });
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const [dispatchResult, setDispatchResult] = useState<any>(null);

  // ─────────────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardStats(), fetchEmergencies(), fetchHospitals(), fetchAmbulances(), fetchAdminUsers()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchDashboardStats, fetchEmergencies, fetchHospitals, fetchAmbulances, fetchAdminUsers]);

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => {
      fetchDashboardStats(); fetchEmergencies(); fetchAmbulances();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadAll, fetchDashboardStats, fetchEmergencies, fetchAmbulances]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newUser.name || !newUser.email || !newUser.password) {
      setCreateError('Name, email and password are required'); return;
    }
    setCreating(true);
    try {
      await createUser({
        name: newUser.name, email: newUser.email, password: newUser.password,
        role: newUser.role as 'admin' | 'hospital' | 'ambulance',
        entity_id: newUser.entity_id ? parseInt(newUser.entity_id) : undefined,
      });
      setShowCreateUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'ambulance', entity_id: '' });
    } catch (err: any) { setCreateError(err.message || 'Failed to create user'); }
    finally { setCreating(false); }
  };

  const handleResetPassword = async (userId: number) => {
    if (!confirm('Reset password for this user? The new password will be shown once.')) return;
    setResettingPassword(userId);
    setResetResult(null);
    try {
      const res = await api.post(`/api/v1/admin/users/${userId}/reset-password`, {});
      setResetResult({ userId, password: res.data.new_password, name: res.data.name });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResettingPassword(null);
    }
  };

  const handleEditSpecs = (hospital: any) => {
    setEditingHospitalId(hospital.hospital_id);
    setEditingSpecs(hospital.specialities ?? []);
    setSpecError('');
  };

  const handleToggleSpec = (spec: string) => {
    setEditingSpecs(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]);
  };

  const handleSaveSpecs = async () => {
    if (!editingHospitalId) return;
    if (editingSpecs.length === 0) { setSpecError('Select at least one speciality'); return; }
    setSavingSpecs(true);
    setSpecError('');
    try {
      await updateSpecialities(editingHospitalId, editingSpecs);
      setEditingHospitalId(null);
    } catch (err: any) { setSpecError(err.message || 'Failed to update specialities'); }
    finally { setSavingSpecs(false); }
  };


  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatchError('');
    setDispatchResult(null);
    if (!dispatchForm.caller_location) {
      setDispatchError('Location description is required'); return;
    }
    setDispatching(true);
    try {
      const res = await api.post('/api/v1/admin/dispatch', {
        patient_name: dispatchForm.patient_name || 'Unknown Caller',
        description: dispatchForm.description,
        emergency_type: dispatchForm.emergency_type,
        severity: dispatchForm.severity,
        caller_location: dispatchForm.caller_location,
      });
      setDispatchResult(res.data);
      setDispatchForm({ patient_name: '', description: '', emergency_type: 'trauma', severity: 'high', caller_location: '' });
      await loadAll();
    } catch (err: any) {
      setDispatchError(err.response?.data?.message || err.message || 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--critical)' }} />
      </div>
    );
  }

  const criticalCount = emergencies.filter(e => e.severity === 'critical' && !['completed', 'cancelled'].includes(e.status)).length;
  const activeEmergencies = emergencies.filter(e => !['completed', 'cancelled'].includes(e.status));
  const activeAmbulances = ambulances.filter(a => a.status === 'ON_CALL').length;
  const readyHospitals = hospitals.filter(h => (h.available_beds ?? 0) > 0).length;

  const severityData = [
    { name: 'Critical', value: emergencies.filter(e => e.severity === 'critical').length, color: 'var(--critical)' },
    { name: 'High', value: emergencies.filter(e => e.severity === 'high').length, color: '#F59E0B' },
    { name: 'Medium', value: emergencies.filter(e => e.severity === 'medium').length, color: 'var(--info)' },
    { name: 'Low', value: emergencies.filter(e => e.severity === 'low').length, color: 'var(--safe)' },
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col gap-5 animate-slide-in-up pb-10">

      {/* ── Alert Banners for SLA Breaches ── */}
      {slaBreaches.length > 0 && (
        <div className="flex flex-col gap-2">
          {slaBreaches.map(breach => (
            <AlertBanner
              key={breach.emergency_id}
              message={`SLA Breach on ASG-${String(breach.emergency_id).padStart(3, '0')} (${breach.type.toUpperCase()})`}
              time={new Date(breach.received_at).toLocaleTimeString('en-IN')}
              onDismiss={() => dismissSlaBreach(breach.emergency_id)}
            />
          ))}
        </div>
      )}

      {/* ── Stats Row — 2-col mobile, 4-col md+ ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Active Emergencies"
          value={activeEmergencies.length}
          icon={AlertTriangle}
          sub={criticalCount > 0 ? `${criticalCount} critical` : 'All clear'}
          accentColor={criticalCount > 0 ? 'red' : 'blue'}
        />
        <StatCard
          label="Ambulances Deployed"
          value={activeAmbulances}
          icon={Ambulance}
          sub={`of ${ambulances.length} total units`}
          accentColor="amber"
        />
        <StatCard
          label="Hospitals Ready"
          value={readyHospitals}
          icon={Building2}
          sub={`of ${hospitals.length} network hospitals`}
          accentColor="green"
        />
        <StatCard
          label="Avg Response Time"
          value="8.4m"
          icon={Clock}
          sub="Target < 10 mins"
          accentColor="blue"
        />
      </div>

      {/* ── Section Tabs ── */}
      <div className="flex items-center gap-1 p-1 rounded-md overflow-x-auto custom-scrollbar" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {(['overview', 'fleet', 'users', 'hospitals', 'dispatch'] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className="flex-shrink-0 px-4 py-2 transition-colors relative font-['Barlow_Condensed',sans-serif] font-bold tracking-widest uppercase text-xs rounded"
            style={{
              color: activeSection === s ? 'var(--text)' : 'var(--text-dim)',
              background: activeSection === s ? 'var(--bg-raised)' : 'transparent',
            }}
          >
            {s === 'dispatch' ? '108 Dispatch' : s}
            {s === 'dispatch' && <div className="absolute top-2 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--critical)] animate-pulse" />}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={loadAll}
          disabled={refreshing}
          className="p-2 mr-1 rounded hidden md:flex hover:bg-[var(--bg-raised)] transition-colors"
          style={{ color: 'var(--text-dim)' }}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ════ OVERVIEW SECTION ════ */}
      {activeSection === 'overview' && (
        <div className="flex flex-col gap-5">
          {/* ── Overview Section: Map + Assignments — stack on mobile, side-by-side lg+ ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
            {/* Live Map */}
            <div className="lg:col-span-3 card p-0 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: 'var(--bg-surface)' }}>
                <span className="section-label">Live Network Map</span>
                <span className="badge badge-allocated gap-1" style={{ fontSize: 9 }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--info)] animate-pulse" /> Live Tracking
                </span>
              </div>
              {ambulances.length === 0 && hospitals.length === 0 ? (
                <EmptyState icon={MapPin} title="No GPS Data" message="No nodes found in the network." />
              ) : (
                <LiveMap
                  emergencies={(emergencies ?? []).map(e => ({
                    emergency_id: e.emergency_id, emergency_type: e.emergency_type,
                    severity: e.severity, latitude: e.latitude, longitude: e.longitude,
                    status: e.status, ambulance_id: e.ambulance_id,
                  }))}
                  ambulances={(ambulances ?? []).map(a => ({
                    ambulance_id: a.ambulance_id, vehicle_number: a.vehicle_number,
                    driver_name: a.driver_name ?? null, latitude: a.latitude ?? null,
                    longitude: a.longitude ?? null, status: a.status,
                  }))}
                  hospitals={(hospitals ?? []).map(h => ({
                    hospital_id: h.hospital_id, name: h.name,
                    available_beds: h.available_beds ?? 0, latitude: h.latitude ?? null,
                    longitude: h.longitude ?? null, status: (h.available_beds ?? 0) > 0 ? 'GREEN' : 'RED',
                  }))}
                  className="w-full h-[45vh] md:h-[400px]"
                />
              )}
            </div>

            {/* Active Assignments List */}
            <div className="lg:col-span-2 card p-0 flex flex-col overflow-hidden max-h-[445px]">
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: 'var(--bg-surface)' }}>
                <span className="section-label">Active Emergencies ({activeEmergencies.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {activeEmergencies.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <EmptyState icon={CheckCircle2} title="No Active Emergencies" message="All operations are normal." />
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className="th-cell">ID & Type</th>
                        <th className="th-cell">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeEmergencies.map(e => {
                        const isCrit = e.severity === 'critical';
                        return (
                          <Fragment key={e.emergency_id}>
                            <tr 
                              className={`tr-hover ${isCrit ? 'tr-critical' : ''} ${e.needs_transfer ? 'cursor-pointer' : ''}`}
                              onClick={() => { if (e.needs_transfer) setExpandedEmergency(expandedEmergency === e.emergency_id ? null : e.emergency_id); }}
                            >
                              <td className="td-cell">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--text)' }}>
                                      ASG-{String(e.emergency_id).padStart(3, '0')}
                                    </span>
                                    {e.needs_transfer && (
                                      <span className="badge" style={{ background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info-br)', fontSize: 9 }}>TRANSFER</span>
                                    )}
                                    <SeverityBadge severity={e.severity} />
                                  </div>
                                  <span className="capitalize text-xs">{e.emergency_type}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    {e.hospital && <span className="badge badge-hospital" style={{ fontSize: 9 }}>H: {e.hospital.name.split(' ')[0]}</span>}
                                    {e.ambulance && <span className="badge badge-ambulance" style={{ fontSize: 9 }}>A: {e.ambulance.vehicle_number}</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="td-cell align-top text-right">
                                <div className="flex flex-col items-end gap-1.5">
                                  <StatusBadge status={e.status} />
                                  <SLACountdown dispatchSla={e.dispatch_sla_deadline} transportSla={e.transport_sla_deadline} status={e.status} />
                                </div>
                              </td>
                            </tr>
                            {e.needs_transfer && expandedEmergency === e.emergency_id && (
                              <tr style={{ background: 'var(--bg-raised)' }}>
                                <td colSpan={2} className="px-4 py-3 border-b border-[var(--border)]">
                                  <div className="flex flex-col gap-2">
                                    <span className="text-xs font-bold" style={{ color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '1px' }}>Transfer Journey Logs</span>
                                    {(() => {
                                      try {
                                        const legs = JSON.parse(e.transfer_legs || '[]');
                                        if (legs.length === 0) return <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Pending generation once on scene...</span>;
                                        return legs.map((leg: any, i: number) => (
                                          <div key={i} className="text-xs p-2 rounded flex items-center gap-2" style={{ background: 'var(--bg-base)', border: '1px dashed var(--border)' }}>
                                            <Activity size={12} style={{ color: 'var(--info)' }} />
                                            <span style={{ color: 'var(--text)' }}>Leg {leg.leg}: {leg.from_location} ➔ {leg.hospital_name}</span>
                                          </div>
                                        ));
                                      } catch(err) { return null; }
                                    })()}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row — hidden on mobile (too small), visible md+ */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="card flex flex-col gap-3">
              <span className="section-label">Response Time (24H)</span>
              {/* Chart height: 180px tablet, 220px lg+ via class on container */}
              <div className="h-32 lg:h-40 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={RESPONSE_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-dim)', fontFamily: 'Barlow' }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={[4, 14]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} itemStyle={{ color: 'var(--info)' }} />
                    <Line type="monotone" dataKey="v" stroke="var(--info)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card flex flex-col gap-3">
              <span className="section-label">Weekly Volume</span>
              <div className="h-32 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={WEEKLY_DATA} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} barSize={10}>
                    <XAxis dataKey="d" tick={{ fontSize: 10, fill: 'var(--text-dim)', fontFamily: 'Barlow' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} />
                    <Bar dataKey="c" stackId="a" fill="var(--info)" radius={[0, 0, 2, 2]} />
                    <Bar dataKey="h" stackId="a" fill="var(--safe)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card flex flex-col gap-3">
              <span className="section-label">Severity Distribution</span>
              {severityData.length > 0 ? (
                <div className="flex items-center h-32">
                  <ResponsiveContainer width="45%" height="100%">
                    <PieChart>
                      <Pie data={severityData} cx="50%" cy="50%" innerRadius={30} outerRadius={46} dataKey="value" stroke="var(--bg-card)" strokeWidth={2}>
                        {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 flex flex-col gap-2 justify-center pl-2">
                    {severityData.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'Barlow', color: 'var(--text-muted)' }}>
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="flex-1">{d.name}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center"><EmptyState icon={Activity} title="No Data" /></div>
              )}
            </div>
          </div>{/* /Charts Row */}
        </div>
      )}

      {/* ════ FLEET SECTION ════ */}
      {activeSection === 'fleet' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ background: 'var(--bg-surface)' }}>
            <span className="section-label">Ambulance Units ({ambulances.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="th-cell">Unit ID</th>
                  <th className="th-cell">Status</th>
                  <th className="th-cell">Driver</th>
                  <th className="th-cell hidden md:table-cell">Last Position</th>
                </tr>
              </thead>
              <tbody>
                {ambulances.map(a => (
                  <tr key={a.ambulance_id} className="tr-hover">
                    <td className="td-cell">
                      <div className="flex flex-col gap-1">
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                          {a.vehicle_number}
                        </span>
                        <span className="text-[10px] uppercase">ID: {a.ambulance_id}</span>
                      </div>
                    </td>
                    <td className="td-cell"><StatusBadge status={a.status} /></td>
                    <td className="td-cell">{a.driver_name || '—'}</td>
                    <td className="td-cell hidden md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {a.latitude && a.longitude ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : 'UNKNOWN'}
                    </td>
                  </tr>
                ))}
                {ambulances.length === 0 && (
                  <tr><td colSpan={4}><EmptyState icon={Truck} title="No Fleet Data" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════ USERS SECTION ════ */}
      {activeSection === 'users' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateUser(!showCreateUser)}
              className="btn-base"
              style={{
                background: 'var(--bg-raised)', color: 'var(--text)', border: '1px solid var(--border)',
                height: 40, padding: '0 16px', borderRadius: 'var(--radius)'
              }}
            >
              {showCreateUser ? 'Cancel' : '+ Add User'}
            </button>
          </div>

          {showCreateUser && (
            <div className="card animate-slide-in-up flex flex-col gap-4">
              <span className="section-label">Create Identity</span>
              <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
                {createError && (
                  <div className="p-3 text-sm rounded bg-[var(--critical-bg)] text-[var(--critical)] border border-[var(--critical-br)]">
                    {createError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="section-label">Name</label>
                    <input type="text" className="input-aes" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="section-label">Email</label>
                    <input type="email" className="input-aes" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="section-label">Password</label>
                    <input type="password" className="input-aes" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="section-label">Role</label>
                    <select className="input-aes" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                      <option value="ambulance">Ambulance</option>
                      <option value="hospital">Hospital</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-4 lg:w-1/4">
                    <label className="section-label">Entity Link ID (Optional)</label>
                    <input type="number" className="input-aes" placeholder="Hospital/Ambulance ID" value={newUser.entity_id} onChange={e => setNewUser(p => ({ ...p, entity_id: e.target.value }))} />
                  </div>
                </div>
                <button type="submit" disabled={creating} className="btn-base btn-primary w-fit mt-2">
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            </div>
          )}

          {resetResult && (
            <div className="p-4 rounded border" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning)', color: 'var(--text)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="section-label" style={{ color: 'var(--warning)' }}>Password Reset Success</span>
                <span className="text-sm font-semibold">{resetResult.name}</span>
              </div>
              <div className="flex items-center gap-4 bg-[var(--bg-base)] border p-2 rounded w-fit">
                <span className="font-mono text-lg tracking-wider ms-2">{resetResult.password}</span>
                <button onClick={() => navigator.clipboard.writeText(resetResult.password)} className="badge badge-pending cursor-pointer">Copy</button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--warning)' }}>Give this password to the user. It will not be shown again.</p>
              <button onClick={() => setResetResult(null)} className="absolute top-4 right-4"><X size={16} /></button>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b" style={{ background: 'var(--bg-surface)' }}>
              <span className="section-label">System Identities ({adminUsers.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="th-cell">ID & Name</th>
                    <th className="th-cell">Access</th>
                    <th className="th-cell">Email</th>
                    <th className="th-cell text-right">Settings</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map(u => {
                    const deact = u.email.startsWith('DEACTIVATED_');
                    return (
                      <tr key={u.user_id} className={`tr-hover ${deact ? 'opacity-50' : ''}`}>
                        <td className="td-cell">
                          <div className="flex flex-col gap-1">
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{u.name}</span>
                            <span className="text-[10px] uppercase">ID: {u.user_id}</span>
                          </div>
                        </td>
                        <td className="td-cell">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`badge badge-${u.role}`}>{u.role}</span>
                            {u.entity_id && <span className="text-[10px]">LNK: {u.entity_id}</span>}
                          </div>
                        </td>
                        <td className="td-cell font-mono text-[11px] max-w-[150px] truncate" title={u.email}>{u.email}</td>
                        <td className="td-cell align-middle text-right min-w-[180px]">
                          {!deact ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleResetPassword(u.user_id)} disabled={resettingPassword === u.user_id}
                                className="badge hover:opacity-80 transition-opacity" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', cursor: 'pointer', border: '1px solid rgba(245,158,11,0.3)' }}>
                                {resettingPassword === u.user_id ? 'WAIT..' : 'RESET PWD'}
                              </button>
                              {u.role !== 'admin' && (
                                <button onClick={() => deactivateUser(u.user_id)}
                                  className="badge hover:opacity-80 transition-opacity" style={{ background: 'var(--critical-bg)', color: 'var(--critical)', cursor: 'pointer', border: '1px solid var(--critical-br)' }}>
                                  REVOKE
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="badge badge-cancelled">REVOKED</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════ HOSPITALS SECTION ════ */}
      {activeSection === 'hospitals' && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: 'var(--bg-surface)' }}>
            <span className="section-label">Medical Facilities ({hospitals.length})</span>
          </div>
          <div className="flex flex-col">
            {hospitals.map(h => (
              <div key={h.hospital_id} className="p-4 border-b hover:bg-[rgba(255,255,255,0.015)] transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--text)', fontSize: 16 }}>{h.name}</span>
                      <span className="badge" style={{ background: 'var(--bg-raised)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>ID: {h.hospital_id}</span>
                      <span className={h.available_beds > 0 ? 'badge badge-available' : 'badge badge-critical'}>
                        {h.available_beds > 0 ? `${h.available_beds} BEDS` : 'AT CAPACITY'}
                      </span>
                    </div>
                    {editingHospitalId === h.hospital_id ? (
                      <div className="mt-2 flex flex-col gap-3 p-3 rounded bg-[var(--bg-raised)] border">
                        <span className="section-label">Edit Specialities Matrix</span>
                        <div className="flex flex-wrap gap-2">
                          {ALL_SPECIALITIES.map(spec => {
                            const active = editingSpecs.includes(spec);
                            return (
                              <button key={spec} onClick={() => handleToggleSpec(spec)}
                                className={active ? 'badge badge-allocated' : 'badge'}
                                style={!active ? { background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-dim)' } : { cursor: 'pointer' }}>
                                {active ? '✓ ' : '+ '}{spec}
                              </button>
                            );
                          })}
                        </div>
                        {specError && <span className="text-xs" style={{ color: 'var(--critical)' }}>{specError}</span>}
                        <div className="flex gap-2.5 pt-2 border-t mt-1">
                          <button onClick={handleSaveSpecs} disabled={savingSpecs} className="btn-base" style={{ height: 32, padding: '0 12px', fontSize: 12, background: 'var(--info)', color: '#fff', borderRadius: 4 }}>
                            {savingSpecs ? 'SAVING..' : 'CONFIRM UPDATE'}
                          </button>
                          <button onClick={() => setEditingHospitalId(null)} className="btn-base" style={{ height: 32, padding: '0 12px', fontSize: 12, background: 'var(--bg-base)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4 }}>
                            CANCEL
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(h.specialities ?? []).length > 0 ? (
                          h.specialities.map(s => (
                            <span key={s} className="badge" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text)' }}>{s}</span>
                          ))
                        ) : (
                          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>NO SPECIALITIES DECLARED</span>
                        )}
                      </div>
                    )}
                  </div>
                  {editingHospitalId !== h.hospital_id && (
                    <button onClick={() => handleEditSpecs(h)} className="btn-base shrink-0" style={{ height: 32, padding: '0 12px', fontSize: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4 }}>
                      EDIT CAPABILITIES
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ DISPATCH SECTION ════ */}
      {activeSection === 'dispatch' && (
        <div className="card card-critical p-0 overflow-hidden max-w-2xl mx-auto w-full">
          <div className="p-5 border-b flex flex-col gap-1" style={{ background: 'var(--critical-bg)' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--critical)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              108 Dispatch Terminal
            </span>
            <span style={{ fontFamily: 'Barlow', fontSize: 13, color: 'var(--text-muted)' }}>
              Direct inject to automated assignment engine.
            </span>
          </div>

          <form onSubmit={handleDispatch} className="p-6 flex flex-col gap-5 bg-[var(--bg-surface)]">
            {dispatchError && (
              <AlertBanner message={dispatchError} onDismiss={() => setDispatchError('')} />
            )}

            {dispatchResult && (
              <div className="p-4 rounded border flex flex-col gap-3" style={{ background: 'var(--safe-bg)', borderColor: 'rgba(22,163,74,0.3)' }}>
                <span className="section-label" style={{ color: 'var(--safe)' }}>Dispatch Confirmed</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase" style={{ color: 'var(--text-dim)' }}>Assign ID</span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16 }}>ASG-{String(dispatchResult.emergency_id).padStart(3, '0')}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase" style={{ color: 'var(--text-dim)' }}>Ambulance</span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16 }}>{dispatchResult.allocated_ambulance ?? 'AWAITING'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase" style={{ color: 'var(--text-dim)' }}>Hospital</span>
                    <span className="truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16 }}>{dispatchResult.allocated_hospital ?? 'AWAITING'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="section-label">Caller / Patient Name</label>
                <input type="text" className="input-aes" value={dispatchForm.patient_name} onChange={e => setDispatchForm(p => ({ ...p, patient_name: e.target.value }))} placeholder="E.g. John Doe / Bystander" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="section-label">Condition / Protocol</label>
                <select className="input-aes relative" value={dispatchForm.emergency_type} onChange={e => setDispatchForm(p => ({ ...p, emergency_type: e.target.value }))}>
                  {EMERGENCY_TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="section-label">Severity Override</label>
                <select className="input-aes" value={dispatchForm.severity} onChange={e => setDispatchForm(p => ({ ...p, severity: e.target.value }))}>
                  <option value="critical">CRITICAL (5 MIN SLA)</option>
                  <option value="high">HIGH (10 MIN SLA)</option>
                  <option value="medium">MEDIUM (20 MIN SLA)</option>
                  <option value="low">LOW (30 MIN SLA)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="section-label">Incident Description</label>
                <textarea className="input-aes py-3 resize-none h-20" value={dispatchForm.description} onChange={e => setDispatchForm(p => ({ ...p, description: e.target.value }))} placeholder="Injuries, landmarks, hazards..." />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="section-label">Location (as described by caller)</label>
                <input 
                  type="text" 
                  className="input-aes" 
                  value={dispatchForm.caller_location} 
                  onChange={e => setDispatchForm(p => ({ ...p, caller_location: e.target.value }))} 
                  placeholder="Street name, landmark, or area described by caller" 
                  required 
                />
              </div>
            </div>

            <button type="submit" disabled={dispatching} className="btn-base btn-primary w-full mt-2" style={{ height: 52, fontSize: 16 }}>
              {dispatching ? 'ROUTING TO NETWORK...' : 'DISPATCH EMERGENCY'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}