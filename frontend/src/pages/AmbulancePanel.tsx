import { useStore } from '@/store/useStore';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmergencyBanner } from '@/components/shared/EmergencyBanner';
import { LiveMap } from '@/components/map/LiveMap';
import { Ambulance as AmbulanceIcon, Navigation, User, Clock, MapPin, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AmbulancePanel() {
  const { ambulances, assignments, hospitals, selectedAmbulanceId } = useStore();
  const ambulance = ambulances.find((a) => a.id === selectedAmbulanceId) ?? ambulances[0];
  const currentAssignment = assignments.find((a) => a.ambulanceId === ambulance.id && a.status !== 'completed');
  const assignedHospital = currentAssignment ? hospitals.find((h) => h.id === currentAssignment.hospitalId) : null;

  return (
    <div className="space-y-4 animate-slide-in-up">
      {/* Active Assignment Alert */}
      {currentAssignment && currentAssignment.patientInfo.emergencyLevel === 'critical' && (
        <EmergencyBanner message={`CRITICAL RESPONSE — ${currentAssignment.patientInfo.condition.toUpperCase()}`} />
      )}

      {/* Unit Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-12 w-12 rounded-lg flex items-center justify-center',
            ambulance.status === 'available' ? 'bg-success/20' : ambulance.status === 'offline' ? 'bg-muted' : 'bg-primary/20'
          )}>
            <AmbulanceIcon className={cn(
              'h-6 w-6',
              ambulance.status === 'available' ? 'text-success' : ambulance.status === 'offline' ? 'text-muted-foreground' : 'text-primary'
            )} />
          </div>
          <div>
            <h2 className="text-xl font-bold font-mono">{ambulance.callSign}</h2>
            <p className="text-xs text-muted-foreground font-mono">{ambulance.id} · {ambulance.vehicleType}</p>
          </div>
        </div>
        <StatusBadge status={ambulance.status} pulse={ambulance.status === 'en-route'} />
      </div>

      {/* Crew & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="panel-header">Crew On Duty</span>
          <div className="mt-3 space-y-2">
            {ambulance.crew.map((member) => (
              <div key={member} className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{member}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <span className="panel-header">Current Position</span>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-mono">{ambulance.location.lat.toFixed(4)}, {ambulance.location.lng.toFixed(4)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-primary animate-pulse-slow" />
              <span className="text-xs text-muted-foreground font-mono">GPS ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <span className="panel-header">Vehicle Info</span>
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-mono font-medium">{ambulance.vehicleType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={ambulance.status} />
            </div>
            {ambulance.eta && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ETA</span>
                <span className="font-mono font-bold text-primary">{ambulance.eta} min</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Assignment */}
      {currentAssignment && (
        <div className={cn(
          'rounded-lg border bg-card overflow-hidden',
          currentAssignment.patientInfo.emergencyLevel === 'critical' ? 'border-emergency/50 glow-emergency' : 'border-border'
        )}>
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <span className="panel-header">Active Assignment</span>
            <StatusBadge status={currentAssignment.patientInfo.emergencyLevel} pulse />
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Assignment</p>
                <p className="text-sm font-mono font-bold mt-0.5">{currentAssignment.id}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">ETA</p>
                <p className="text-2xl font-bold font-mono text-primary mt-0.5">{currentAssignment.eta}<span className="text-sm text-muted-foreground ml-1">min</span></p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Distance</p>
                <p className="text-sm font-mono font-bold mt-0.5">{currentAssignment.distance} km</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Status</p>
                <StatusBadge status={currentAssignment.status} className="mt-1" />
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">Patient Information</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Condition</span>
                  <p className="font-medium">{currentAssignment.patientInfo.condition}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Age</span>
                  <p className="font-mono">{currentAssignment.patientInfo.age} yrs</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Gender</span>
                  <p className="font-mono">{currentAssignment.patientInfo.gender}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Severity</span>
                  <StatusBadge status={currentAssignment.patientInfo.emergencyLevel} />
                </div>
              </div>
            </div>

            {assignedHospital && (
              <div className="border-t border-border pt-3">
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">Destination Hospital</p>
                <div className="flex items-center gap-3">
                  <Navigation className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-bold">{assignedHospital.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{assignedHospital.code} · Beds: {assignedHospital.availableBeds}/{assignedHospital.totalBeds}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <span className="panel-header">Navigation Map</span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
            </span>
            <span className="text-[10px] font-mono text-success tracking-wider">GPS LOCK</span>
          </div>
        </div>
        <LiveMap className="h-[300px]" />
      </div>
    </div>
  );
}
