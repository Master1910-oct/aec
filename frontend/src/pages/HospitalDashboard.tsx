import { useState, useEffect } from 'react';
import { useStore, BackendEmergency, BackendHospital } from '@/store/useStore';
import { Building2, Bed, CheckCircle2, Minus, Plus, Clock, AlertTriangle, Loader2, Power, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LiveMap from '@/components/map/LiveMap';
import { haversineKm } from '@/utils/haversine';

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border border-red-500/40',
    high: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
    medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
    low: 'bg-green-500/20 text-green-400 border border-green-500/40',
  };
  return <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider', map[severity] ?? 'bg-muted')}>{severity}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    allocated: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
    en_route: 'bg-purple-500/20 text-purple-400 border border-purple-500/40',
    arrived: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40',
    completed: 'bg-green-500/20 text-green-400 border border-green-500/40',
    cancelled: 'bg-muted text-muted-foreground border-border',
    escalated: 'bg-red-500/20 text-red-400 border border-red-500/40',
    pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  };
  return <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border', map[status] ?? 'bg-muted')}>{status.replace('_', ' ')}</span>;
}

function CapacityBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden mt-2">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function HospitalDashboard() {
  const { currentUser, ambulances, fetchHospitalEmergencies, acknowledgeEmergency, updateBeds, fetchMyHospital } = useStore();
  const [activeEmergencies, setActiveEmergencies] = useState<BackendEmergency[]>([]);
  const [resolvedEmergencies, setResolvedEmergencies] = useState<BackendEmergency[]>([]);
  const [hospital, setHospital] = useState<BackendHospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<number | null>(null);
  const [bedsUpdating, setBedsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');

  // For Admin and Ambulance, allow selecting a hospital to view
  const { hospitals, fetchHospitals } = useStore();
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);

  const effectiveHospitalId = currentUser?.role === 'hospital' ? currentUser.entity_id : selectedHospitalId;
  const isReadOnly = currentUser?.role === 'ambulance' || (currentUser?.role === 'admin' && currentUser.entity_id !== effectiveHospitalId);

  // We split available_beds into 3 visual categories (70% General, 20% ICU, 10% ER)
  const totalBeds = hospital?.available_beds ?? 0;
  const generalBeds = Math.round(totalBeds * 0.7);
  const icuBeds = Math.round(totalBeds * 0.2);
  const erBeds = Math.round(totalBeds * 0.1);

  const loadData = async () => {
    // Admins and Ambulances need to see all hospitals to pick from
    if (currentUser?.role !== 'hospital' && hospitals.length === 0) {
      await fetchHospitals();
    }
    
    // Determine which hospital ID to fetch data for
    const hospitalId = currentUser?.role === 'hospital' ? currentUser.entity_id : selectedHospitalId;
    
    if (!hospitalId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // If we are a hospital user, fetch our own data specificially
      const hospData = currentUser?.role === 'hospital' 
        ? await fetchMyHospital()
        : hospitals.find(h => h.hospital_id === hospitalId) ?? null;
        
      const emergData = await fetchHospitalEmergencies(hospitalId);
      
      setHospital(hospData);
      setActiveEmergencies(emergData.active ?? []);
      setResolvedEmergencies(emergData.resolved ?? []);
    } catch (err) {
      console.error('Failed to load hospital data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [effectiveHospitalId, hospitals.length]);

  const handleAcknowledge = async (emergencyId: number) => {
    setAcknowledging(emergencyId);
    try {
      await acknowledgeEmergency(emergencyId);
      setActiveEmergencies(prev => prev.map(e => e.emergency_id === emergencyId ? { ...e, acknowledged: true } : e));
    } catch (err: any) { alert(err.message || 'Failed to acknowledge'); }
    finally { setAcknowledging(null); }
  };

  const handleBedChange = async (delta: number) => {
    if (isReadOnly || !hospital || !effectiveHospitalId) return;
    if (delta > 0 && hospital.max_capacity && hospital.available_beds >= hospital.max_capacity) {
      alert(`Cannot exceed maximum capacity of ${hospital.max_capacity} beds.`);
      return;
    }
    const newBeds = Math.max(0, hospital.available_beds + delta);
    setBedsUpdating(true);
    try {
      await updateBeds(effectiveHospitalId, newBeds);
      setHospital(prev => prev ? { ...prev, available_beds: newBeds, status: newBeds > 0 ? 'GREEN' : 'RED' } : prev);
    } catch (err: any) { alert(err.message || 'Failed to update beds'); }
    finally { setBedsUpdating(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isAvailable = hospital?.status === 'GREEN';

  // If no hospital is selected and we are not a hospital user
  if (!effectiveHospitalId && currentUser?.role !== 'hospital') {
    return (
      <div className="space-y-4 animate-slide-in-up">
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
          <div>
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider">Select Hospital</h2>
            <p className="text-xs text-muted-foreground mt-1">Choose a hospital to view its dashboard.</p>
          </div>
          <select 
            className="h-10 px-3 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
            onChange={(e) => setSelectedHospitalId(Number(e.target.value))}
            value={selectedHospitalId ?? ''}
          >
            <option value="" disabled>
              {hospitals.length > 0 ? 'Select a hospital...' : 'No hospitals found — check backend connection'}
            </option>
            {hospitals.map(h => <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-in-up">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{hospital?.name ?? 'Hospital Dashboard'}</h2>
            <p className="text-[11px] font-mono text-muted-foreground">{hospital?.address ?? '—'} · {hospital?.contact_number ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono uppercase tracking-wider border',
            isAvailable ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-red-500/20 text-red-400 border-red-500/40'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', isAvailable ? 'bg-green-400' : 'bg-red-400')} />
            {isAvailable ? 'Available' : 'At Capacity'}
          </span>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Power className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Readiness</span>
          </div>
        </div>
      </div>

      {/* ── Hospital Selector for Admins/Ambulance ── */}
      {currentUser?.role !== 'hospital' && (
        <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Viewing:</span>
          <select 
            className="h-8 px-2 rounded-md bg-input border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setSelectedHospitalId(Number(e.target.value))}
            value={selectedHospitalId ?? ''}
          >
            {hospitals.map(h => <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>)}
          </select>
          {isReadOnly && <span className="ml-auto text-[10px] font-mono text-orange-400 border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 rounded tracking-wider uppercase">Read Only</span>}
        </div>
      )}

      {/* ── Capacity Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* General Beds */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Bed className="h-3.5 w-3.5" /> General Beds
            </span>
          </div>
          <p className="text-3xl font-bold font-mono">{generalBeds}</p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">of {Math.round(generalBeds * 3.5)} available</p>
          <CapacityBar value={generalBeds} max={Math.round(generalBeds * 3.5)} color="#f59e0b" />
          <div className="flex items-center justify-center gap-3 mt-3">
            <button onClick={() => handleBedChange(-1)} disabled={bedsUpdating || totalBeds <= 0 || isReadOnly}
              className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40 transition-colors">
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-sm font-mono w-8 text-center">{generalBeds}</span>
            <button onClick={() => handleBedChange(1)} disabled={bedsUpdating || isReadOnly}
              className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-40">
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* ICU Beds */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              ❤️ ICU Beds
            </span>
          </div>
          <p className="text-3xl font-bold font-mono">{icuBeds}</p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">of {Math.round(icuBeds * 4)} available</p>
          <CapacityBar value={icuBeds} max={Math.round(icuBeds * 4)} color="#22c55e" />
          <div className="flex items-center justify-center gap-3 mt-3">
            <button disabled className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground opacity-40"><Minus className="h-3 w-3" /></button>
            <span className="text-sm font-mono w-8 text-center">{icuBeds}</span>
            <button disabled className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground opacity-40"><Plus className="h-3 w-3" /></button>
          </div>
        </div>

        {/* Emergency Room */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              📞 Emergency Room
            </span>
          </div>
          <p className="text-3xl font-bold font-mono">{erBeds}</p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">of {Math.round(erBeds * 10)} occupied</p>
          <CapacityBar value={erBeds} max={Math.round(erBeds * 10)} color="#3b82f6" />
          <p className="text-center text-[10px] text-muted-foreground font-mono mt-2">
            {erBeds > 0 ? `${Math.round(erBeds /  (erBeds * 10) * 100 * 10)}% Capacity` : '0% Capacity'}
          </p>
        </div>
      </div>

      {/* ── Incoming Assignments ── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/20">
          <span className="text-xs font-mono font-bold uppercase tracking-wider">Incoming Assignments</span>
          <div className="flex gap-0.5 rounded-md bg-secondary/50 p-0.5">
            {(['active', 'resolved'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn('px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors',
                  activeTab === tab ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}>{tab} {tab === 'active' && activeEmergencies.length > 0 ? `(${activeEmergencies.length})` : ''}</button>
            ))}
          </div>
        </div>

        {activeTab === 'active' && (
          <div>
            {activeEmergencies.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm font-mono flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
                No active emergencies
              </div>
            ) : activeEmergencies.map(e => (
              <div key={e.emergency_id} className={cn('px-4 py-4 border-b border-border', e.severity === 'critical' && 'border-l-2 border-red-500')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">ASG-{String(e.emergency_id).padStart(3, '0')}</span>
                      <SeverityBadge severity={e.severity} />
                      <StatusBadge status={e.status} />
                      {e.acknowledged && <span className="text-[10px] font-mono text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Accepted</span>}
                    </div>
                    <p className="text-sm font-medium capitalize">{e.emergency_type} Emergency</p>
                    {e.accident_description && <p className="text-xs text-muted-foreground">{e.accident_description}</p>}
                    <div className="flex gap-4 text-xs font-mono text-muted-foreground flex-wrap">
                      {e.ambulance && (
                        <span className="flex items-center gap-1">
                          🚑 {e.ambulance.vehicle_number} ({e.ambulance.driver_name})
                          {hospital?.latitude && hospital?.longitude && e.ambulance_id && ambulances.find(a => a.ambulance_id === e.ambulance_id) && (
                            <span className="text-cyan-400 ml-1">
                              · {haversineKm(
                                hospital.latitude,
                                hospital.longitude,
                                ambulances.find(a => a.ambulance_id === e.ambulance_id)!.latitude,
                                ambulances.find(a => a.ambulance_id === e.ambulance_id)!.longitude
                              ).toFixed(1)} km
                            </span>
                          )}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {e.created_at ? new Date(e.created_at).toLocaleTimeString() : '—'}</span>
                      {e.is_overdue && <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="h-3 w-3" /> SLA Breached</span>}
                    </div>
                  </div>
                  {!e.acknowledged && !isReadOnly && (
                    <Button size="sm" onClick={() => handleAcknowledge(e.emergency_id)} disabled={acknowledging === e.emergency_id}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs shrink-0">
                      {acknowledging === e.emergency_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Accept</>}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'resolved' && (
          <div>
            {resolvedEmergencies.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm font-mono">No resolved emergencies</div>
            ) : resolvedEmergencies.map(e => (
              <div key={e.emergency_id} className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">ASG-{String(e.emergency_id).padStart(3, '0')}</span>
                    <SeverityBadge severity={e.severity} />
                    <StatusBadge status={e.status} />
                  </div>
                  <p className="text-sm capitalize">{e.emergency_type} Emergency</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{e.created_at ? new Date(e.created_at).toLocaleString() : '—'}</p>
                </div>
                {e.ambulance && <span className="text-xs font-mono text-muted-foreground">🚑 {e.ambulance.vehicle_number}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Specialties ── */}
      {hospital && (
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-3">Specialties</span>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(hospital.specialities) && hospital.specialities.length > 0
              ? hospital.specialities.map(s => (
                <span key={s} className="px-3 py-1 rounded-md bg-secondary text-xs font-mono text-secondary-foreground capitalize">{s}</span>
              ))
              : <span className="text-xs text-muted-foreground">No specialities listed</span>}
          </div>
        </div>
      )}

      {/* ── Live Map (Hospitals & Incoming Ambulances) ── */}
      {hospital && (
        <div className="rounded-lg border border-border overflow-hidden bg-card mt-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
            <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Tracking Map
            </span>
          </div>
          <LiveMap
            hospitals={[hospital]}
            emergencies={activeEmergencies.map(e => ({
              emergency_id: e.emergency_id,
              emergency_type: e.emergency_type,
              severity: e.severity,
              latitude: e.latitude,
              longitude: e.longitude,
              status: e.status,
              ambulance_id: e.ambulance_id,
            }))}
            ambulances={ambulances.filter(a => 
              activeEmergencies.some(e => e.ambulance_id === a.ambulance_id)
            ).map(a => ({
              ambulance_id: a.ambulance_id,
              vehicle_number: a.vehicle_number,
              driver_name: a.driver_name,
              latitude: a.latitude,
              longitude: a.longitude,
              status: a.status,
            }))}
            className="w-full h-[350px]"
          />
        </div>
      )}
    </div>
  );
}
