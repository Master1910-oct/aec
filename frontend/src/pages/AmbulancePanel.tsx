import { useState, useEffect, useCallback } from 'react';
import { useStore, BackendEmergency } from '@/store/useStore';
import {
  MapPin, Radio, AlertTriangle, CheckCircle2, Navigation,
  Loader2, Send, User, Gauge, Ambulance as AmbulanceIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LiveMap from '@/components/map/LiveMap';

const EMERGENCY_TYPES = ['trauma', 'cardiac', 'respiratory', 'neurological', 'other'] as const;
const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border border-red-500/40',
    high: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
    medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
    low: 'bg-green-500/20 text-green-400 border border-green-500/40',
  };
  return <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider', map[severity] ?? 'bg-muted')}>{severity}</span>;
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">{label}</p>
      {children}
    </div>
  );
}

export default function AmbulancePanel() {
  const { currentUser, submitEmergency, updateEmergencyStatus, updateAmbulanceLocation, emergencies, fetchEmergencies } = useStore();

  const [description, setDescription] = useState('');
  const [emergencyType, setEmergencyType] = useState<string>('trauma');
  const [severity, setSeverity] = useState<string>('medium');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState<BackendEmergency | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [myAmbulance, setMyAmbulance] = useState<any>(null);

  const { ambulances, fetchAmbulances, fetchMyAmbulance } = useStore();
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<number | null>(null);

  const effectiveAmbulanceId = currentUser?.role === 'ambulance' ? currentUser.entity_id : selectedAmbulanceId;
  const isReadOnly = currentUser?.role === 'hospital' || (currentUser?.role === 'admin' && currentUser.entity_id !== effectiveAmbulanceId);

  const myActiveEmergency = submitted ?? emergencies.find(
    e => e.ambulance_id === effectiveAmbulanceId && !['completed', 'cancelled'].includes(e.status)
  ) ?? null;

  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toFixed(6)); setLon(pos.coords.longitude.toFixed(6)); setGpsLoading(false); },
      () => setGpsLoading(false),
      { timeout: 8000 }
    );
  }, []);

  const fetchStoreData = useCallback(async () => {
    if (currentUser?.role !== 'ambulance' && ambulances.length === 0) {
      await fetchAmbulances();
    }
    if (currentUser?.role === 'ambulance') {
      const amb = await fetchMyAmbulance();
      setMyAmbulance(amb);
    }
  }, [currentUser?.role, ambulances.length, fetchAmbulances, fetchMyAmbulance]);

  useEffect(() => {
    fetchStoreData();
    if (!isReadOnly) detectGPS();
    fetchEmergencies();
  }, [fetchStoreData, detectGPS, isReadOnly, fetchEmergencies]);

  const currentAmbulance = currentUser?.role === 'ambulance'
    ? (myAmbulance || { ambulance_id: currentUser.entity_id, driver_name: currentUser.name, vehicle_number: `Unit #${currentUser.entity_id}` })
    : ambulances.find(a => a.ambulance_id === effectiveAmbulanceId);

  // Periodic GPS Broadcast
  useEffect(() => {
    if (isReadOnly || !effectiveAmbulanceId || !lat || !lon) return;
    const activeStatuses = ['allocated', 'en_route', 'arrived'];
    if (myActiveEmergency && activeStatuses.includes(myActiveEmergency.status)) {
      setIsBroadcasting(true);
      const interval = setInterval(() => {
        updateAmbulanceLocation(parseFloat(lat), parseFloat(lon));
      }, 12000);
      return () => { clearInterval(interval); setIsBroadcasting(false); };
    } else {
      setIsBroadcasting(false);
    }
  }, [myActiveEmergency?.status, lat, lon, isReadOnly, effectiveAmbulanceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!description.trim()) { setFormError('Please provide a description'); return; }
    if (!lat || !lon) { setFormError('Location is required. Please use GPS or enter coordinates manually.'); return; }
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    if (isNaN(latitude) || latitude < -90 || latitude > 90) { setFormError('Invalid latitude (-90 to 90)'); return; }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) { setFormError('Invalid longitude (-180 to 180)'); return; }
    setSubmitting(true);
    try {
      const result = await submitEmergency({ accident_description: description, emergency_type: emergencyType, severity, latitude, longitude });
      setSubmitted(result);
    } catch (err: any) { setFormError(err.message || 'Failed to submit emergency'); }
    finally { setSubmitting(false); }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (isReadOnly || !myActiveEmergency) return;
    setStatusUpdating(true);
    try {
      await updateEmergencyStatus(myActiveEmergency.emergency_id, newStatus);
      if (submitted) setSubmitted(prev => prev ? { ...prev, status: newStatus } : prev);
    } catch (err: any) { alert(err.message || 'Failed to update status'); }
    finally { setStatusUpdating(false); }
  };

  const getNextStatus = (current: string) => {
    const map: Record<string, string> = { allocated: 'en_route', en_route: 'arrived', arrived: 'completed' };
    return map[current] ?? null;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { allocated: 'Mark En Route', en_route: 'Mark Arrived', arrived: 'Mark Completed' };
    return map[status] ?? status;
  };

  const statusColor: Record<string, string> = {
    AVAILABLE: '#22c55e', ON_CALL: '#f97316', MAINTENANCE: '#6b7280',
    allocated: '#3b82f6', en_route: '#a855f7', arrived: '#06b6d4', completed: '#22c55e',
  };

  // ─────────────────────────────────────────
  // Build map data
  // ─────────────────────────────────────────

  // Ambulance marker — use current GPS position
  const mapAmbulances = lat && lon && effectiveAmbulanceId ? [{
    ambulance_id: effectiveAmbulanceId,
    vehicle_number: currentAmbulance?.vehicle_number ?? `Unit #${effectiveAmbulanceId}`,
    driver_name: currentAmbulance?.driver_name ?? null,
    latitude: parseFloat(lat),
    longitude: parseFloat(lon),
    status: 'ON_CALL' as const,
  }] : [];

  // Hospital marker — destination hospital from active emergency
  const mapHospitals = myActiveEmergency?.hospital ? [{
    hospital_id: myActiveEmergency.hospital.hospital_id,
    name: myActiveEmergency.hospital.name,
    available_beds: 1,
    latitude: myActiveEmergency.hospital.latitude,
    longitude: myActiveEmergency.hospital.longitude,
    status: 'GREEN' as const,
  }] : [];

  // ✅ Emergency marker — the scene location with ambulance_id so LiveMap draws the road route
  const mapEmergencies = myActiveEmergency &&
    myActiveEmergency.latitude &&
    myActiveEmergency.longitude ? [{
      emergency_id: myActiveEmergency.emergency_id,
      emergency_type: myActiveEmergency.emergency_type,
      severity: myActiveEmergency.severity,
      latitude: myActiveEmergency.latitude,
      longitude: myActiveEmergency.longitude,
      status: myActiveEmergency.status,
      ambulance_id: effectiveAmbulanceId ?? undefined, // ← links ambulance to emergency so road route is drawn
    }] : [];

  return (
    <div className="space-y-4 animate-slide-in-up">

      {/* ── Ambulance Selector for Admins/Hospital ── */}
      {currentUser?.role !== 'ambulance' && (
        <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Viewing:</span>
          <select
            className="h-8 px-2 rounded-md bg-input border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setSelectedAmbulanceId(Number(e.target.value))}
            value={selectedAmbulanceId ?? ''}
          >
            <option value="" disabled>
              {ambulances.length > 0 ? 'Select an ambulance...' : 'No ambulances found — check backend connection'}
            </option>
            {ambulances.map(a => <option key={a.ambulance_id} value={a.ambulance_id}>{a.vehicle_number} ({a.driver_name ?? 'No Driver'})</option>)}
          </select>
          {isReadOnly && <span className="ml-auto text-[10px] font-mono text-orange-400 border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 rounded tracking-wider uppercase">Read Only</span>}
        </div>
      )}

      {(!effectiveAmbulanceId && currentUser?.role !== 'ambulance') ? (
        <div className="flex items-center justify-center p-10 bg-card border border-border rounded-lg text-muted-foreground font-mono text-sm">
          Please select an ambulance to view its panel.
        </div>
      ) : (
        <>
          {/* ── Top Info Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoCard label="Ambulance Identity">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
                  <AmbulanceIcon className="h-4 w-4" />
                  <span>{myAmbulance?.vehicle_number ?? currentAmbulance?.vehicle_number ?? 'Identifying...'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{myAmbulance?.driver_name ?? currentAmbulance?.driver_name ?? (effectiveAmbulanceId ? `Unit #${effectiveAmbulanceId}` : '—')}</span>
                </div>
              </div>
            </InfoCard>

            <InfoCard label="Current Position">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono text-sm">
                    {lat && lon ? `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}` : 'Acquiring...'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <Radio className={cn('h-3 w-3', lat ? 'text-green-400' : 'text-muted-foreground')} />
                  <span className={lat ? 'text-green-400' : 'text-muted-foreground'}>
                    {lat ? 'GPS Active' : (isReadOnly ? 'GPS Offline' : 'GPS Searching...')}
                    {isBroadcasting && (
                      <span className="flex items-center gap-1 ml-2 text-[9px] text-primary animate-pulse border border-primary/30 px-1.5 py-0.5 rounded">
                        BROADCASTING
                      </span>
                    )}
                  </span>
                  {!lat && !isReadOnly && (
                    <button onClick={detectGPS} className="text-primary hover:text-primary/80 text-xs ml-1">
                      {gpsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Detect'}
                    </button>
                  )}
                </div>
              </div>
            </InfoCard>

            <InfoCard label="Vehicle Info">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">Type</span>
                  <span className="text-xs font-mono">ALS</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">Status</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border"
                    style={{ color: statusColor[myActiveEmergency?.status ?? 'available'] ?? '#6b7280', borderColor: `${statusColor[myActiveEmergency?.status ?? 'available']}40`, background: `${statusColor[myActiveEmergency?.status ?? 'available']}15` }}>
                    {myActiveEmergency ? myActiveEmergency.status.replace('_', ' ') : 'Available'}
                  </span>
                </div>
                {myActiveEmergency && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">ETA</span>
                    <span className="text-xs font-mono text-cyan-400">—</span>
                  </div>
                )}
              </div>
            </InfoCard>
          </div>

          {/* ── Active Assignment ── */}
          {myActiveEmergency && (
            <div className={cn(
              'rounded-lg border bg-card overflow-hidden',
              myActiveEmergency.severity === 'critical' ? 'border-red-500/50' : 'border-border'
            )}>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-secondary/20">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Active Assignment</span>
                <SeverityBadge severity={myActiveEmergency.severity} />
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Assignment</p>
                    <p className="font-mono font-bold text-sm text-cyan-400">ASG-{String(myActiveEmergency.emergency_id).padStart(3, '0')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">ETA</p>
                    <p className="font-mono font-bold text-sm text-cyan-400">— min</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Distance</p>
                    <p className="font-mono font-bold text-sm">— km</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Status</p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border"
                      style={{ color: myActiveEmergency.acknowledged ? '#22c55e' : '#eab308', borderColor: myActiveEmergency.acknowledged ? '#22c55e40' : '#eab30840', background: myActiveEmergency.acknowledged ? '#22c55e15' : '#eab30815' }}>
                      {myActiveEmergency.acknowledged ? 'Accepted' : 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="rounded-md border border-border p-3 bg-secondary/10">
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3">Patient Information</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-mono mb-1">Condition</p>
                      <p className="capitalize font-medium">{myActiveEmergency.emergency_type}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-mono mb-1">Description</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{myActiveEmergency.accident_description || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-mono mb-1">Severity</p>
                      <SeverityBadge severity={myActiveEmergency.severity} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-mono mb-1">Acknowledged</p>
                      {myActiveEmergency.acknowledged
                        ? <span className="flex items-center gap-1 text-green-400 text-xs font-mono"><CheckCircle2 className="h-3 w-3" /> Yes</span>
                        : <span className="text-xs font-mono text-muted-foreground">Waiting...</span>}
                    </div>
                  </div>
                </div>

                {myActiveEmergency.hospital && (
                  <div className="flex items-center gap-3">
                    <Navigation className="h-4 w-4 text-green-400 shrink-0" />
                    <div>
                      <p className="font-bold text-sm">{myActiveEmergency.hospital.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{myActiveEmergency.hospital.address} · Beds: {myActiveEmergency.hospital.hospital_id}</p>
                    </div>
                  </div>
                )}

                {myActiveEmergency.is_overdue && (
                  <div className="flex items-center gap-2 text-red-400 text-xs font-mono py-2 px-3 bg-red-500/10 rounded border border-red-500/30">
                    <AlertTriangle className="h-4 w-4 animate-pulse" />
                    SLA Deadline Breached
                  </div>
                )}

                {!isReadOnly && !['completed', 'cancelled', 'escalated'].includes(myActiveEmergency.status) && getNextStatus(myActiveEmergency.status) && (
                  <div className="pt-2 border-t border-border">
                    <Button onClick={() => handleStatusUpdate(getNextStatus(myActiveEmergency.status)!)} disabled={statusUpdating}
                      className="bg-primary hover:bg-primary/80 font-mono tracking-wider">
                      {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {getStatusLabel(myActiveEmergency.status)}
                    </Button>
                  </div>
                )}
                {myActiveEmergency.status === 'completed' && (
                  <p className="text-green-400 text-sm font-mono flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Emergency completed. Ready for next dispatch.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Navigation Map ── */}
          {myActiveEmergency && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/20">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Navigation Map</span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-green-400 uppercase">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                  </span>
                  GPS Lock
                </span>
              </div>

              {/* ✅ Now passes emergencies so road route is drawn from ambulance → emergency scene */}
              <LiveMap
                ambulances={mapAmbulances}
                hospitals={mapHospitals}
                emergencies={mapEmergencies}
                className="w-full h-[320px]"
              />

              {/* Legend */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-secondary/10 text-[10px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5">🚑 Your Location</span>
                <span className="flex items-center gap-1.5">🚨 Emergency Scene</span>
                <span className="flex items-center gap-1.5">🏥 Destination Hospital</span>
              </div>
            </div>
          )}

          {/* ── Emergency Dispatch Form ── */}
          {!myActiveEmergency && !isReadOnly && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/20 flex items-center gap-2">
                <AmbulanceIcon className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Report Emergency</span>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-5">
                {formError && <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{formError}</div>}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Accident / Condition Notes</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Describe the accident, patient condition, visible injuries..."
                    rows={3} className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Emergency Type</label>
                    <select value={emergencyType} onChange={e => setEmergencyType(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                      {EMERGENCY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Severity</label>
                    <select value={severity} onChange={e => setSeverity(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                      {SEVERITIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Location</label>
                    <button type="button" onClick={detectGPS}
                      className="flex items-center gap-1 text-[10px] font-mono text-primary hover:text-primary/80 transition-colors">
                      {gpsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />}
                      {gpsLoading ? 'Detecting...' : 'Auto-detect GPS'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude"
                      className="w-full h-10 px-3 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                    <input type="number" step="any" value={lon} onChange={e => setLon(e.target.value)} placeholder="Longitude"
                      className="w-full h-10 px-3 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                  </div>
                  {lat && lon && (
                    <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {parseFloat(lat).toFixed(4)}, {parseFloat(lon).toFixed(4)}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-11 font-mono tracking-wider">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Dispatching...</> : <><Send className="h-4 w-4 mr-2" />Submit Emergency</>}
                </Button>
              </form>
            </div>
          )}
        </>)}
    </div>
  );
}