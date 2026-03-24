import { useState, useEffect } from 'react';
import { useStore, BackendEmergency, BackendHospital } from '@/store/useStore';
import {
  Building2, Bed, CheckCircle2, Minus, Plus,
  Clock, AlertTriangle, Loader2, MapPin, Activity
} from 'lucide-react';
import LiveMap from '@/components/map/LiveMap';
import { haversineKm } from '@/utils/haversine';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { SLACountdown } from '@/components/shared/SLACountdown';

// ── Capacity bar ───────────────────────────────────────────────────────────────
function CapacityBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden mt-2" style={{ background: 'var(--border)' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Bed control card ───────────────────────────────────────────────────────────
function BedCard({
  label, value, max, color, onDec, onInc, disabled, loading,
}: {
  label: string; value: number; max: number; color: string;
  onDec?: () => void; onInc?: () => void; disabled?: boolean; loading?: boolean;
}) {
  return (
    // Mobile: compact padding. Desktop: full size.
    <div className="card flex flex-col gap-2 p-3 md:p-4">
      <span className="section-label text-[10px] md:text-[11px]">{label}</span>
      {/* Mobile: text-2xl, Desktop: stat-value (text-4xl) */}
      <p className="font-['Barlow_Condensed',sans-serif] font-bold leading-none text-2xl md:text-4xl" style={{ color }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>of {max} capacity</p>
      <CapacityBar value={value} max={max} color={color} />
      {(onDec || onInc) && (
        <div className="flex items-center justify-center gap-3 mt-1">
          {/* Touch targets: min 44×44px on mobile */}
          <button
            onClick={onDec}
            disabled={disabled || value <= 0}
            className="flex items-center justify-center rounded transition-colors"
            style={{
              minWidth: 44, minHeight: 44, border: '1px solid var(--border)',
              color: 'var(--text-dim)', background: 'var(--bg-raised)',
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Minus size={14} />}
          </button>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, minWidth: 32, textAlign: 'center' }}>
            {value}
          </span>
          <button
            onClick={onInc}
            disabled={disabled}
            className="flex items-center justify-center rounded transition-colors"
            style={{
              minWidth: 44, minHeight: 44, border: '1px solid var(--border)',
              color: 'var(--text-dim)', background: 'var(--bg-raised)',
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function HospitalDashboard() {
  const {
    currentUser, emergencies, fetchHospitalEmergencies,
    acknowledgeEmergency, updateBeds, fetchMyHospital,
  } = useStore();

  const [activeEmergencies, setActiveEmergencies] = useState<BackendEmergency[]>([]);
  const [resolvedEmergencies, setResolvedEmergencies] = useState<BackendEmergency[]>([]);
  const [hospital, setHospital] = useState<BackendHospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<number | null>(null);
  const [bedsUpdating, setBedsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'transfers' | 'resolved'>('active');

  const { hospitals, fetchHospitals } = useStore();
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);

  const effectiveHospitalId =
    currentUser?.role === 'hospital' ? currentUser.entity_id : selectedHospitalId;
  const isReadOnly =
    currentUser?.role === 'ambulance' ||
    (currentUser?.role === 'admin' && currentUser.entity_id !== effectiveHospitalId);

  const totalBeds  = hospital?.available_beds ?? 0;
  const generalBeds = Math.round(totalBeds * 0.7);
  const icuBeds     = Math.round(totalBeds * 0.2);
  const erBeds      = Math.round(totalBeds * 0.1);

  const loadData = async () => {
    if (currentUser?.role !== 'hospital' && hospitals.length === 0) await fetchHospitals();
    const hospitalId =
      currentUser?.role === 'hospital' ? currentUser.entity_id : selectedHospitalId;
    if (!hospitalId) { setLoading(false); return; }

    setLoading(true);
    try {
      const hospData =
        currentUser?.role === 'hospital'
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveHospitalId, hospitals.length]);

  // Sync ambulance positions from socket updates
  useEffect(() => {
    if (emergencies.length === 0) return;
    setActiveEmergencies(prev =>
      prev.map(local => {
        const updated = emergencies.find(e => e.emergency_id === local.emergency_id);
        if (!updated?.ambulance) return local;
        return {
          ...local,
          ambulance: {
            ...local.ambulance!,
            latitude: updated.ambulance.latitude,
            longitude: updated.ambulance.longitude,
          },
        };
      })
    );
  }, [emergencies]);

  const handleAcknowledge = async (emergencyId: number) => {
    setAcknowledging(emergencyId);
    try {
      await acknowledgeEmergency(emergencyId);
      setActiveEmergencies(prev =>
        prev.map(e => e.emergency_id === emergencyId ? { ...e, acknowledged: true } : e)
      );
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
      setHospital(prev =>
        prev ? { ...prev, available_beds: newBeds, status: newBeds > 0 ? 'GREEN' : 'RED' } : prev
      );
    } catch (err: any) { alert(err.message || 'Failed to update beds'); }
    finally { setBedsUpdating(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--critical)' }} />
      </div>
    );
  }

  const isAvailable = hospital?.status === 'GREEN';

  // ── Hospital selector for non-hospital roles ─────────────────────────────────
  if (!effectiveHospitalId && currentUser?.role !== 'hospital') {
    return (
      <div className="flex flex-col gap-4 max-w-lg animate-slide-in-up">
        <div className="card flex flex-col gap-4">
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 18, color: 'var(--text)', letterSpacing: '1px',
            }}
          >
            Select a Medical Facility
          </span>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Choose a hospital to view its dashboard.
          </p>
          <select
            className="input-aes"
            onChange={e => setSelectedHospitalId(Number(e.target.value))}
            value={selectedHospitalId ?? ''}
          >
            <option value="" disabled>
              {hospitals.length > 0 ? 'Select a hospital...' : 'No hospitals found'}
            </option>
            {hospitals.map(h => (
              <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-slide-in-up pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded shrink-0"
            style={{ width: 40, height: 40, background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.3)' }}
          >
            <Building2 size={20} style={{ color: 'var(--safe)' }} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: 22, color: 'var(--text)', lineHeight: 1,
              }}
            >
              {hospital?.name ?? 'Hospital Dashboard'}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              {hospital?.address ?? '—'}  ·  {hospital?.contact_number ?? '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isReadOnly && (
            <span className="badge badge-pending">READ ONLY</span>
          )}
          <div
            className="flex items-center gap-2 px-3 rounded"
            style={{
              height: 32,
              background: isAvailable ? 'var(--safe-bg)' : 'var(--critical-bg)',
              border: `1px solid ${isAvailable ? 'rgba(22,163,74,0.3)' : 'var(--critical-br)'}`,
            }}
          >
            <span
              className={isAvailable ? 'dot dot-safe' : 'dot dot-critical'}
              style={isAvailable ? {} : { animation: 'pulse-dot 1.4s ease-in-out infinite' }}
            />
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase',
                color: isAvailable ? 'var(--safe)' : 'var(--critical)',
              }}
            >
              {isAvailable ? 'Beds Available' : 'At Capacity'}
            </span>
          </div>
          {/* Live bed count badge */}
          <div
            className="flex flex-col items-center justify-center rounded px-3 py-1"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: 22, color: isAvailable ? 'var(--safe)' : 'var(--critical)', lineHeight: 1,
              }}
            >
              {totalBeds}
            </span>
            <span className="section-label" style={{ fontSize: 9 }}>Total Beds</span>
          </div>
        </div>
      </div>

      {/* ── Hospital selector for admins ────────────────────────────────────── */}
      {currentUser?.role !== 'hospital' && (
        <div
          className="flex items-center gap-3 p-3 rounded"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <span className="section-label">Viewing:</span>
          <select
            className="input-aes"
            style={{ maxWidth: 240 }}
            onChange={e => setSelectedHospitalId(Number(e.target.value))}
            value={selectedHospitalId ?? ''}
          >
            {hospitals.map(h => (
              <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Stat Cards — 2-col mobile, 4-col md+ ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Active Cases"
          value={activeEmergencies.length}
          icon={AlertTriangle}
          accentColor={activeEmergencies.length > 0 ? 'red' : 'green'}
          sub={activeEmergencies.length === 0 ? 'No active assignments' : undefined}
        />
        <StatCard
          label="Resolved Today"
          value={resolvedEmergencies.length}
          icon={CheckCircle2}
          accentColor="green"
        />
        <StatCard
          label="Available Beds"
          value={totalBeds}
          icon={Bed}
          accentColor={totalBeds > 10 ? 'green' : totalBeds > 0 ? 'amber' : 'red'}
          sub={hospital?.max_capacity ? `Max ${hospital.max_capacity}` : undefined}
        />
        <StatCard
          label="Network Position"
          value={`#${hospital?.hospital_id ?? '—'}`}
          icon={Activity}
          accentColor="blue"
          sub="AES Network"
        />
      </div>

      {/* ── Bed Management — single col mobile, 3-col md+ ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <BedCard
          label="General Beds"
          value={generalBeds}
          max={Math.round(generalBeds * 3.5)}
          color="#F59E0B"
          onDec={() => handleBedChange(-1)}
          onInc={() => handleBedChange(1)}
          disabled={bedsUpdating || isReadOnly}
          loading={bedsUpdating}
        />
        <BedCard
          label="ICU Beds"
          value={icuBeds}
          max={Math.round(icuBeds * 4)}
          color="var(--safe)"
        />
        <BedCard
          label="Emergency Room"
          value={erBeds}
          max={Math.round(erBeds * 10)}
          color="var(--info)"
        />
      </div>

      {/* ── Assignments ─────────────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b gap-3"
          style={{ background: 'var(--bg-surface)' }}
        >
          <span className="section-label">Incoming Assignments</span>
          {/* Tab switcher */}
          <div
            className="flex gap-0.5 rounded p-0.5"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'nowrap' }}
          >
            {(['active', 'transfers', 'resolved'] as const).map(tab => {
              let count = 0;
              if (tab === 'active') count = activeEmergencies.filter(e => !e.needs_transfer).length;
              if (tab === 'transfers') count = activeEmergencies.filter(e => e.needs_transfer).length;
              return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1 rounded transition-colors"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                  fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase',
                  background: activeTab === tab ? 'var(--bg-raised)' : 'transparent',
                  color: activeTab === tab ? 'var(--text)' : 'var(--text-dim)',
                }}
              >
                {tab} {count > 0 ? `(${count})` : ''}
              </button>
            )})}
          </div>
        </div>

        {/* Active & Transfers assignments */}
        {['active', 'transfers'].includes(activeTab) && (
          <div>
            {(() => {
                const list = activeTab === 'active' ? activeEmergencies.filter(e => !e.needs_transfer) : activeEmergencies.filter(e => e.needs_transfer);
                if (list.length === 0) return <EmptyState icon={CheckCircle2} title={`No ${activeTab === 'transfers' ? 'Incoming Transfers' : 'Active Emergencies'}`} message="All cases have been resolved or no assignments exist." />;
                return list.map(e => {
                  const isCrit = e.severity === 'critical';
                  const isTransfer = e.needs_transfer;
                  return (
                    <div
                      key={e.emergency_id}
                      className="px-4 py-4 border-b"
                      style={{
                        borderLeft: isCrit ? '3px solid var(--critical)' : (isTransfer ? '3px solid var(--info)' : undefined),
                        background: isCrit ? 'var(--critical-bg)' : (isTransfer ? 'var(--info-bg)' : undefined),
                      }}
                    >
                      {/* Mobile: stack info then button; sm+: side by side */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              style={{
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontWeight: 700, fontSize: 14, color: isTransfer ? 'var(--info)' : 'var(--text)',
                              }}
                            >
                              ASG-{String(e.emergency_id).padStart(3, '0')} {isTransfer ? '(TRANSFER)' : ''}
                            </span>
                            <SeverityBadge severity={e.severity} />
                            <StatusBadge status={e.status} />
                            {e.acknowledged && (
                              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--safe)' }}>
                                <CheckCircle2 size={11} /> Accepted
                              </span>
                            )}
                            <SLACountdown 
                              dispatchSla={e.dispatch_sla_deadline} 
                              transportSla={e.transport_sla_deadline} 
                              status={e.status} 
                            />
                          </div>
  
                          <p
                            className="capitalize"
                            style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}
                          >
                            {e.emergency_type} Emergency
                          </p>
  
                          {e.accident_description && (
                            <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{e.accident_description}</p>
                          )}
                          
                          {isTransfer && e.transfer_legs && (
                            <div className="text-xs mt-1 p-2 border-[1px solid rgba(29,111,232,0.3)] rounded text-[#1D6FE8]" style={{ background: 'rgba(29,111,232,0.1)' }}>
                               Specialist Transfer Request: {e.required_speciality || e.emergency_type}
                            </div>
                          )}
  
                          <div className="flex flex-wrap gap-4 text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                            {e.ambulance && (
                              <span className="flex items-center gap-1">
                                🚑 {e.ambulance.vehicle_number} ({e.ambulance.driver_name})
                                {hospital?.latitude && hospital.longitude && e.ambulance?.latitude && e.ambulance?.longitude && (
                                  <span style={{ color: '#06B6D4', marginLeft: 4 }}>
                                    · {haversineKm(hospital.latitude, hospital.longitude, e.ambulance.latitude, e.ambulance.longitude).toFixed(1)} km
                                  </span>
                                )}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {e.created_at ? new Date(e.created_at).toLocaleTimeString('en-IN') : '—'}
                            </span>
                          </div>
                        </div>
  
                        {!e.acknowledged && !isReadOnly && (
                          /* Mobile: full-width button stacked below info; sm+: inline */
                          <button
                            onClick={() => handleAcknowledge(e.emergency_id)}
                            disabled={acknowledging === e.emergency_id}
                            className="btn-base w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 mt-2 sm:mt-0"
                            style={{
                              minHeight: 48, padding: '0 14px', fontSize: 13,
                              background: 'var(--safe)', color: '#fff',
                              borderRadius: 'var(--radius)', border: 'none',
                            }}
                          >
                            {acknowledging === e.emergency_id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <><CheckCircle2 size={13} /> Acknowledge</>
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
            })()}
          </div>
        )}

        {/* Resolved assignments */}
        {activeTab === 'resolved' && (
          <div>
            {resolvedEmergencies.length === 0 ? (
              <EmptyState icon={Activity} title="No Resolved Cases" message="Completed and cancelled cases appear here." />
            ) : (
              resolvedEmergencies.map(e => (
                <div
                  key={e.emergency_id}
                  className="px-4 py-3 border-b flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700, fontSize: 14, color: 'var(--text)',
                        }}
                      >
                        ASG-{String(e.emergency_id).padStart(3, '0')}
                      </span>
                      <SeverityBadge severity={e.severity} />
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="capitalize text-sm" style={{ color: 'var(--text-muted)' }}>
                      {e.emergency_type} Emergency
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {e.created_at ? new Date(e.created_at).toLocaleString('en-IN') : '—'}
                    </p>
                  </div>
                  {e.ambulance && (
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      🚑 {e.ambulance.vehicle_number}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Specialities ────────────────────────────────────────────────────────── */}
      {hospital && (
        <div className="card flex flex-col gap-3">
          <span className="section-label">Speciality Matrix</span>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(hospital.specialities) && hospital.specialities.length > 0
              ? hospital.specialities.map(s => (
                <span
                  key={s}
                  className="badge"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text)', textTransform: 'capitalize', letterSpacing: '0.5px' }}
                >
                  {s}
                </span>
              ))
              : <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>No specialities declared</span>
            }
          </div>
        </div>
      )}

      {/* ── Live Map ─────────────────────────────────────────────────────────────── */}
      {hospital && (
        <div className="card p-0 overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ background: 'var(--bg-surface)' }}
          >
            <span className="section-label flex items-center gap-2">
              <MapPin size={12} /> Live Tracking
              <span className="relative flex" style={{ width: 8, height: 8, marginLeft: 4 }}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{ background: 'var(--safe)', opacity: 0.6 }} />
                <span className="relative inline-flex rounded-full" style={{ width: 8, height: 8, background: 'var(--safe)' }} />
              </span>
            </span>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-dim)' }}>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-1 rounded" style={{ background: '#f97316' }} />
                Ambulance → Incident
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-1 rounded" style={{ background: 'var(--safe)' }} />
                Incident → Hospital
              </span>
            </div>
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
              ambulance_latitude: e.ambulance?.latitude ?? null,
              ambulance_longitude: e.ambulance?.longitude ?? null,
              hospital_latitude: e.hospital?.latitude ?? hospital.latitude,
              hospital_longitude: e.hospital?.longitude ?? hospital.longitude,
            }))}
            ambulances={activeEmergencies
              .filter(e => e.ambulance?.latitude && e.ambulance?.longitude)
              .map(e => ({
                ambulance_id: e.ambulance!.ambulance_id,
                vehicle_number: e.ambulance!.vehicle_number,
                driver_name: e.ambulance!.driver_name,
                latitude: e.ambulance!.latitude!,
                longitude: e.ambulance!.longitude!,
                status: 'ON_CALL' as const,
              }))}
            className="w-full h-[45vh] md:h-[380px]"
          />
        </div>
      )}
    </div>
  );
}