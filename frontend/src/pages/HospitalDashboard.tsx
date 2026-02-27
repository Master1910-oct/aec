import { useStore } from '@/store/useStore';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmergencyBanner } from '@/components/shared/EmergencyBanner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Building2, Bed, Heart, Minus, Plus, Check, X, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HospitalDashboard() {
  const { hospitals, assignments, ambulances, selectedHospitalId, updateHospitalBeds, toggleHospitalReadiness, updateAssignmentStatus } = useStore();
  const hospital = hospitals.find((h) => h.id === selectedHospitalId) ?? hospitals[0];
  const incomingAssignments = assignments.filter((a) => a.hospitalId === hospital.id && (a.status === 'pending' || a.status === 'accepted'));

  const bedPercent = Math.round(((hospital.totalBeds - hospital.availableBeds) / hospital.totalBeds) * 100);
  const erPercent = Math.round((hospital.erOccupied / hospital.erCapacity) * 100);

  return (
    <div className="space-y-4 animate-slide-in-up">
      {/* Pending alert */}
      {incomingAssignments.some((a) => a.status === 'pending') && (
        <EmergencyBanner message="INCOMING PATIENT — REVIEW ASSIGNMENT BELOW" />
      )}

      {/* Hospital Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{hospital.name}</h2>
            <p className="text-xs font-mono text-muted-foreground">{hospital.code} · {hospital.contactNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={hospital.status} pulse={hospital.readiness} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">READINESS</span>
            <Switch checked={hospital.readiness} onCheckedChange={() => toggleHospitalReadiness(hospital.id)} />
          </div>
        </div>
      </div>

      {/* Bed Management Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* General Beds */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="panel-header">General Beds</span>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-center mb-3">
            <p className="text-3xl font-bold font-mono">{hospital.availableBeds}</p>
            <p className="text-xs text-muted-foreground">of {hospital.totalBeds} available</p>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-3">
            <div
              className={cn('h-full rounded-full transition-all', bedPercent > 90 ? 'bg-emergency' : bedPercent > 70 ? 'bg-warning' : 'bg-success')}
              style={{ width: `${bedPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => updateHospitalBeds(hospital.id, 'availableBeds', Math.max(0, hospital.availableBeds - 1))}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm font-mono w-8 text-center">{hospital.availableBeds}</span>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => updateHospitalBeds(hospital.id, 'availableBeds', Math.min(hospital.totalBeds, hospital.availableBeds + 1))}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* ICU Beds */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="panel-header">ICU Beds</span>
            <Heart className="h-4 w-4 text-emergency" />
          </div>
          <div className="text-center mb-3">
            <p className="text-3xl font-bold font-mono">{hospital.icuAvailable}</p>
            <p className="text-xs text-muted-foreground">of {hospital.icuBeds} available</p>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-3">
            <div
              className={cn('h-full rounded-full transition-all', hospital.icuAvailable === 0 ? 'bg-emergency' : hospital.icuAvailable <= 2 ? 'bg-warning' : 'bg-success')}
              style={{ width: `${Math.round(((hospital.icuBeds - hospital.icuAvailable) / hospital.icuBeds) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => updateHospitalBeds(hospital.id, 'icuAvailable', Math.max(0, hospital.icuAvailable - 1))}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm font-mono w-8 text-center">{hospital.icuAvailable}</span>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => updateHospitalBeds(hospital.id, 'icuAvailable', Math.min(hospital.icuBeds, hospital.icuAvailable + 1))}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* ER Status */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="panel-header">Emergency Room</span>
            <Phone className="h-4 w-4 text-warning" />
          </div>
          <div className="text-center mb-3">
            <p className="text-3xl font-bold font-mono">{hospital.erOccupied}</p>
            <p className="text-xs text-muted-foreground">of {hospital.erCapacity} occupied</p>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-3">
            <div
              className={cn('h-full rounded-full transition-all', erPercent > 90 ? 'bg-emergency' : erPercent > 70 ? 'bg-warning' : 'bg-info')}
              style={{ width: `${erPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-center font-mono text-muted-foreground tracking-wider">
            {erPercent}% CAPACITY
          </p>
        </div>
      </div>

      {/* Incoming Assignments */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <span className="panel-header">Incoming Assignments</span>
        </div>
        {incomingAssignments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No incoming assignments</div>
        ) : (
          <div className="divide-y divide-border">
            {incomingAssignments.map((asg) => {
              const amb = ambulances.find((a) => a.id === asg.ambulanceId);
              return (
                <div key={asg.id} className={cn('p-4', asg.status === 'pending' && 'emergency-flash')}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold">{asg.id}</span>
                        <StatusBadge status={asg.patientInfo.emergencyLevel} pulse />
                        <StatusBadge status={asg.status} />
                      </div>
                      <p className="text-sm font-medium">{asg.patientInfo.condition}</p>
                      <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                        <span>Patient: {asg.patientInfo.age}{asg.patientInfo.gender.charAt(0)} </span>
                        <span>🚑 {amb?.callSign ?? asg.ambulanceId}</span>
                        <span>ETA: {asg.eta} min</span>
                        <span>{asg.distance} km</span>
                      </div>
                    </div>
                    {asg.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-success hover:bg-success/80 text-success-foreground gap-1" onClick={() => updateAssignmentStatus(asg.id, 'accepted')}>
                          <Check className="h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateAssignmentStatus(asg.id, 'rejected')}>
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Specialties */}
      <div className="rounded-lg border border-border bg-card p-4">
        <span className="panel-header">Specialties</span>
        <div className="flex flex-wrap gap-2 mt-3">
          {hospital.specialties.map((s) => (
            <span key={s} className="px-3 py-1 rounded-md bg-secondary text-xs font-mono text-secondary-foreground">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
