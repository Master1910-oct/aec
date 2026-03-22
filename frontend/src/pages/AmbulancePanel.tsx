import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore, BackendEmergency } from '@/store/useStore';
import {
  MapPin, Radio, AlertTriangle, CheckCircle2, Navigation,
  Loader2, Send, User, Ambulance as AmbulanceIcon, Activity
} from 'lucide-react';
import { haversineDistance, estimateEta } from '@/lib/utils';
import LiveMap from '@/components/map/LiveMap';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';

// ── Tables ────────────────────────────────────────────────────────────────────
const EMERGENCY_TYPES = [
  'trauma', 'cardiac', 'respiratory', 'neurological',
  'orthopaedic', 'maternity', 'ophthalmology', 'ent',
  'paediatric', 'oncology', 'dermatology', 'urology',
  'psychiatry', 'other',
] as const;

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

const TYPE_LABELS: Record<string, string> = {
  trauma: 'Trauma', cardiac: 'Cardiac', respiratory: 'Respiratory',
  neurological: 'Neurological', orthopaedic: 'Orthopaedic', maternity: 'Maternity',
  ophthalmology: 'Ophthalmology (Eye)', ent: 'ENT', paediatric: 'Paediatric',
  oncology: 'Oncology', dermatology: 'Dermatology', urology: 'Urology',
  psychiatry: 'Psychiatry', other: 'Other',
};

const STATUS_NEXT: Record<string, string | null> = {
  allocated: 'en_route', en_route: 'arrived', arrived: 'completed',
};
const STATUS_LABEL: Record<string, string> = {
  allocated: '→ Mark En Route', en_route: '→ Mark Arrived', arrived: '✓ Mark Completed',
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AmbulancePanel() {
  const {
    currentUser, submitEmergency, updateEmergencyStatus,
    updateAmbulanceLocation, emergencies, fetchEmergencies,
  } = useStore();

  const [description,    setDescription]    = useState('');
  const [emergencyType,  setEmergencyType]  = useState<string>('trauma');
  const [severity,       setSeverity]       = useState<string>('medium');
  const [lat,            setLat]            = useState('');
  const [lon,            setLon]            = useState('');
  const [gpsLoading,     setGpsLoading]     = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [formError,      setFormError]      = useState('');
  const [submitted,      setSubmitted]      = useState<BackendEmergency | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [myAmbulance,    setMyAmbulance]    = useState<any>(null);

  const { ambulances, fetchAmbulances, fetchMyAmbulance } = useStore();
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<number | null>(null);

  const effectiveAmbulanceId =
    currentUser?.role === 'ambulance' ? currentUser.entity_id : selectedAmbulanceId;
  const isReadOnly =
    currentUser?.role === 'hospital' ||
    (currentUser?.role === 'admin' && currentUser.entity_id !== effectiveAmbulanceId);

  const myActiveEmergency =
    submitted ??
    emergencies.find(
      e => e.ambulance_id === effectiveAmbulanceId &&
        !['completed', 'cancelled'].includes(e.status)
    ) ?? null;

  // Real-time distance & ETA
  const { distanceKm, etaMin } = useMemo(() => {
    const aLat = parseFloat(lat);
    const aLon = parseFloat(lon);
    if (!myActiveEmergency || isNaN(aLat) || isNaN(aLon) ||
      !myActiveEmergency.latitude || !myActiveEmergency.longitude) {
      return { distanceKm: null, etaMin: null };
    }
    const dist = haversineDistance(aLat, aLon, myActiveEmergency.latitude, myActiveEmergency.longitude);
    return { distanceKm: dist, etaMin: estimateEta(dist, myActiveEmergency.severity) };
  }, [lat, lon, myActiveEmergency]);

  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(6));
        setLon(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 8000 }
    );
  }, []);

  const fetchStoreData = useCallback(async () => {
    if (currentUser?.role !== 'ambulance' && ambulances.length === 0) await fetchAmbulances();
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

  const currentAmbulance =
    currentUser?.role === 'ambulance'
      ? (myAmbulance || { ambulance_id: currentUser.entity_id, driver_name: currentUser.name, vehicle_number: `Unit #${currentUser.entity_id}` })
      : ambulances.find(a => a.ambulance_id === effectiveAmbulanceId);

  // Periodic GPS broadcast
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myActiveEmergency?.status, lat, lon, isReadOnly, effectiveAmbulanceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!description.trim()) { setFormError('Please provide a description'); return; }
    if (!lat || !lon)        { setFormError('Location is required. Use GPS or enter coordinates.'); return; }
    const latitude  = parseFloat(lat);
    const longitude = parseFloat(lon);
    if (isNaN(latitude)  || latitude  < -90  || latitude  > 90)  { setFormError('Invalid latitude');  return; }
    if (isNaN(longitude) || longitude < -180 || longitude > 180)  { setFormError('Invalid longitude'); return; }
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

  // Map data
  const mapAmbulances = lat && lon && effectiveAmbulanceId ? [{
    ambulance_id: effectiveAmbulanceId,
    vehicle_number: currentAmbulance?.vehicle_number ?? `Unit #${effectiveAmbulanceId}`,
    driver_name: currentAmbulance?.driver_name ?? null,
    latitude: parseFloat(lat), longitude: parseFloat(lon),
    status: 'ON_CALL' as const,
  }] : [];

  const mapHospitals = myActiveEmergency?.hospital ? [{
    hospital_id: myActiveEmergency.hospital.hospital_id,
    name: myActiveEmergency.hospital.name,
    available_beds: 1,
    latitude: myActiveEmergency.hospital.latitude,
    longitude: myActiveEmergency.hospital.longitude,
    status: 'GREEN' as const,
  }] : [];

  const mapEmergencies = myActiveEmergency?.latitude && myActiveEmergency?.longitude ? [{
    emergency_id: myActiveEmergency.emergency_id,
    emergency_type: myActiveEmergency.emergency_type,
    severity: myActiveEmergency.severity,
    latitude: myActiveEmergency.latitude,
    longitude: myActiveEmergency.longitude,
    status: myActiveEmergency.status,
    ambulance_id: effectiveAmbulanceId ?? undefined,
  }] : [];

  const isCritical = myActiveEmergency?.severity === 'critical';

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 animate-slide-in-up pb-10">

      {/* ── Ambulance Selector (non-ambulance roles) ────────────────────────── */}
      {currentUser?.role !== 'ambulance' && (
        <div
          className="flex items-center flex-wrap gap-3 p-3 rounded"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <span className="section-label">Viewing:</span>
          <select
            className="input-aes"
            style={{ maxWidth: 280 }}
            onChange={e => setSelectedAmbulanceId(Number(e.target.value))}
            value={selectedAmbulanceId ?? ''}
          >
            <option value="" disabled>
              {ambulances.length > 0 ? 'Select unit...' : 'No ambulances found'}
            </option>
            {ambulances.map(a => (
              <option key={a.ambulance_id} value={a.ambulance_id}>
                {a.vehicle_number} ({a.driver_name ?? 'No Driver'})
              </option>
            ))}
          </select>
          {isReadOnly && <span className="badge badge-pending">READ ONLY</span>}
        </div>
      )}

      {/* ── No ambulance selected ───────────────────────────────────────────── */}
      {!effectiveAmbulanceId && currentUser?.role !== 'ambulance' ? (
        <EmptyState icon={AmbulanceIcon} title="No Unit Selected" message="Select an ambulance unit above to view its panel." />
      ) : (
        <>
          {/* ── Status Bar ─────────────────────────────────────────────────── */}
          <div
            className="flex items-center flex-wrap gap-4 px-4 py-3 rounded"
            style={{
              background: myActiveEmergency
                ? (isCritical ? 'var(--critical-bg)' : 'rgba(29,111,232,0.07)')
                : 'var(--safe-bg)',
              border: `1px solid ${myActiveEmergency
                ? (isCritical ? 'var(--critical-br)' : 'rgba(29,111,232,0.3)')
                : 'rgba(22,163,74,0.3)'}`,
            }}
          >
            {/* Unit identity */}
            <div className="flex items-center gap-2">
              <AmbulanceIcon size={16} style={{ color: myActiveEmergency ? (isCritical ? 'var(--critical)' : 'var(--info)') : 'var(--safe)', flexShrink: 0 }} />
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                  fontSize: 16, letterSpacing: '1px',
                  color: myActiveEmergency ? (isCritical ? 'var(--critical)' : 'var(--text)') : 'var(--safe)',
                }}
              >
                {currentAmbulance?.vehicle_number ?? `Unit #${effectiveAmbulanceId}`}
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-dim)' }}>
              <User size={12} />
              <span>{currentAmbulance?.driver_name ?? '—'}</span>
            </div>

            {/* Status pill */}
            {myActiveEmergency ? (
              <StatusBadge status={myActiveEmergency.status} />
            ) : (
              <span className="badge badge-available">AVAILABLE</span>
            )}

            {/* GPS broadcast indicator */}
            {isBroadcasting && (
              <span
                className="flex items-center gap-1.5 animate-pulse"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                  fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase',
                  color: 'var(--critical)',
                  border: '1px solid var(--critical-br)', padding: '2px 8px', borderRadius: 4,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--critical)' }} />
                Transmitting
              </span>
            )}

            {/* GPS coordinates */}
            <div className="flex items-center gap-2 ml-auto">
              <Radio size={12} style={{ color: lat ? 'var(--safe)' : 'var(--text-dim)' }} />
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                  fontSize: 12, letterSpacing: '1px',
                  color: lat ? 'var(--safe)' : 'var(--text-dim)',
                }}
              >
                {lat && lon
                  ? `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`
                  : 'No GPS Lock'}
              </span>
              {!lat && !isReadOnly && (
                <button
                  onClick={detectGPS}
                  className="badge badge-info"
                  style={{ cursor: 'pointer', fontSize: 10, border: '1px solid rgba(29,111,232,0.3)' }}
                >
                  {gpsLoading ? 'LOCKING...' : 'LOCK GPS'}
                </button>
              )}
            </div>
          </div>

          {/* ── Active Assignment Card ─────────────────────────────────────── */}
          {myActiveEmergency && (
            <div
              className="card p-0 overflow-hidden"
              style={{ borderTop: `3px solid ${isCritical ? 'var(--critical)' : 'var(--info)'}` }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ background: isCritical ? 'var(--critical-bg)' : 'rgba(29,111,232,0.07)' }}
              >
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                    fontSize: 14, letterSpacing: '2px', textTransform: 'uppercase',
                    color: isCritical ? 'var(--critical)' : 'var(--info)',
                  }}
                >
                  Active Assignment — ASG-{String(myActiveEmergency.emergency_id).padStart(3, '0')}
                </span>
                <SeverityBadge severity={myActiveEmergency.severity} />
              </div>

              <div className="p-4 flex flex-col gap-4" style={{ background: 'var(--bg-surface)' }}>
                {/* 4-column stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Assignment', value: `ASG-${String(myActiveEmergency.emergency_id).padStart(3, '0')}` },
                    { label: 'ETA',        value: etaMin != null ? `${etaMin} min` : '— min' },
                    { label: 'Distance',   value: distanceKm != null ? `${distanceKm.toFixed(1)} km` : '— km' },
                    { label: 'Hospital Ack', value: myActiveEmergency.acknowledged ? 'Accepted' : 'Pending' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <span className="section-label" style={{ fontSize: 9 }}>{label}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Patient info */}
                <div
                  className="rounded p-3 grid grid-cols-2 sm:grid-cols-4 gap-4"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="section-label" style={{ fontSize: 9 }}>Condition</span>
                    <span className="capitalize text-sm" style={{ color: 'var(--text-muted)' }}>
                      {TYPE_LABELS[myActiveEmergency.emergency_type] ?? myActiveEmergency.emergency_type}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <span className="section-label" style={{ fontSize: 9 }}>Description</span>
                    <span className="text-xs line-clamp-3" style={{ color: 'var(--text-dim)' }}>
                      {myActiveEmergency.accident_description || '—'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="section-label" style={{ fontSize: 9 }}>Severity</span>
                    <SeverityBadge severity={myActiveEmergency.severity} />
                  </div>
                </div>

                {/* Hospital destination */}
                {myActiveEmergency.hospital && (
                  <div
                    className="flex items-center gap-3 rounded p-3"
                    style={{ background: 'var(--safe-bg)', border: '1px solid rgba(22,163,74,0.3)' }}
                  >
                    <Navigation size={16} style={{ color: 'var(--safe)', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                        {myActiveEmergency.hospital.name}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        {myActiveEmergency.hospital.address}
                      </p>
                    </div>
                  </div>
                )}

                {/* SLA breach */}
                {myActiveEmergency.is_overdue && (
                  <div
                    className="flex items-center gap-2 p-3 rounded animate-pulse"
                    style={{ background: 'var(--critical-bg)', border: '1px solid var(--critical-br)', color: 'var(--critical)' }}
                  >
                    <AlertTriangle size={16} />
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                      SLA Deadline Breached
                    </span>
                  </div>
                )}

                {/* Status update button */}
                {!isReadOnly &&
                  !['completed', 'cancelled', 'escalated'].includes(myActiveEmergency.status) &&
                  STATUS_NEXT[myActiveEmergency.status] && (
                    <button
                      onClick={() => handleStatusUpdate(STATUS_NEXT[myActiveEmergency.status]!)}
                      disabled={statusUpdating}
                      className="btn-base btn-primary w-full"
                      style={{ height: 52, fontSize: 14, letterSpacing: '2px' }}
                    >
                      {statusUpdating
                        ? <Loader2 size={18} className="animate-spin" />
                        : STATUS_LABEL[myActiveEmergency.status]
                      }
                    </button>
                  )}

                {myActiveEmergency.status === 'completed' && (
                  <div className="flex items-center justify-center gap-2" style={{ color: 'var(--safe)' }}>
                    <CheckCircle2 size={16} />
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>
                      Emergency Completed — Ready for Next Dispatch
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Navigation Map ─────────────────────────────────────────────── */}
          {myActiveEmergency && (
            <div className="card p-0 overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ background: 'var(--bg-surface)' }}
              >
                <span className="section-label flex items-center gap-2">
                  <MapPin size={12} /> Navigation Map
                </span>
                <div className="flex items-center gap-2">
                  <span className="relative flex" style={{ width: 8, height: 8 }}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{ background: 'var(--safe)', opacity: 0.6 }} />
                    <span className="relative inline-flex rounded-full" style={{ width: 8, height: 8, background: 'var(--safe)' }} />
                  </span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '1.5px', color: 'var(--safe)', textTransform: 'uppercase' }}>
                    GPS Lock
                  </span>
                </div>
              </div>
              <LiveMap
                ambulances={mapAmbulances}
                hospitals={mapHospitals}
                emergencies={mapEmergencies}
                className="w-full h-[280px] sm:h-[340px]"
              />
              <div
                className="flex items-center gap-5 px-4 py-2 border-t text-xs"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-dim)', borderColor: 'var(--border)' }}
              >
                <span>🚑 Your Location</span>
                <span>🚨 Emergency Scene</span>
                <span>🏥 Destination Hospital</span>
              </div>
            </div>
          )}

          {/* ── No Active Assignment — Submit Form ─────────────────────────── */}
          {!myActiveEmergency && !isReadOnly && (
            <div className="card p-0 overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 border-b"
                style={{ background: 'var(--critical-bg)', borderBottom: '1px solid var(--critical-br)' }}
              >
                <AmbulanceIcon size={16} style={{ color: 'var(--critical)' }} />
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                    fontSize: 16, letterSpacing: '2px', textTransform: 'uppercase',
                    color: 'var(--critical)',
                  }}
                >
                  Report Emergency
                </span>
              </div>
              <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5" style={{ background: 'var(--bg-surface)' }}>
                {formError && (
                  <div
                    className="p-3 text-sm rounded"
                    style={{ background: 'var(--critical-bg)', border: '1px solid var(--critical-br)', color: 'var(--critical)' }}
                  >
                    {formError}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="section-label">Incident / Condition Notes</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe the accident, visible injuries, patient condition..."
                    rows={3}
                    className="input-aes"
                    style={{ height: 'auto', paddingTop: 10, paddingBottom: 10, resize: 'none' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="section-label">Condition Protocol</label>
                    <select className="input-aes" value={emergencyType} onChange={e => setEmergencyType(e.target.value)}>
                      {EMERGENCY_TYPES.map(t => (
                        <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="section-label">Severity</label>
                    <select className="input-aes" value={severity} onChange={e => setSeverity(e.target.value)}>
                      {SEVERITIES.map(s => (
                        <option key={s} value={s}>{s.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* GPS location input */}
                <div
                  className="flex flex-col gap-3 p-4 rounded"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between">
                    <label className="section-label flex items-center gap-2"><MapPin size={12} /> Location</label>
                    <button
                      type="button"
                      onClick={detectGPS}
                      className="flex items-center gap-1"
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                        fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase',
                        color: 'var(--info)',
                      }}
                    >
                      {gpsLoading ? <Loader2 size={12} className="animate-spin" /> : <Radio size={12} />}
                      {gpsLoading ? 'Detecting...' : 'Auto-detect GPS'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number" step="any" inputMode="decimal"
                      value={lat} onChange={e => setLat(e.target.value)}
                      placeholder="Latitude"
                      className="input-aes font-['Barlow_Condensed'] font-bold text-base"
                    />
                    <input
                      type="number" step="any" inputMode="decimal"
                      value={lon} onChange={e => setLon(e.target.value)}
                      placeholder="Longitude"
                      className="input-aes font-['Barlow_Condensed'] font-bold text-base"
                    />
                  </div>
                  {lat && lon && (
                    <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--safe)' }}>
                      <MapPin size={10} />
                      {parseFloat(lat).toFixed(4)}, {parseFloat(lon).toFixed(4)} — GPS Locked
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-base btn-primary w-full"
                  style={{ height: 52, fontSize: 14, letterSpacing: '2.5px' }}
                >
                  {submitting
                    ? <Loader2 size={18} className="animate-spin" />
                    : <><Send size={15} style={{ marginRight: 8 }} />Submit Emergency</>
                  }
                </button>
              </form>
            </div>
          )}

          {/* ── Read-only empty state ────────────────────────────────────── */}
          {!myActiveEmergency && isReadOnly && (
            <EmptyState icon={Activity} title="No Active Assignment" message="This unit currently has no active emergencies." />
          )}
        </>
      )}
    </div>
  );
}