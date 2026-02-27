import { type EmergencyLevel, type AmbulanceStatus, type HospitalStatus, type AssignmentStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: EmergencyLevel | AmbulanceStatus | HospitalStatus | AssignmentStatus;
  className?: string;
  pulse?: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Emergency levels
  critical: { label: 'CRITICAL', className: 'bg-emergency/20 text-emergency border-emergency/40' },
  high: { label: 'HIGH', className: 'bg-warning/20 text-warning border-warning/40' },
  medium: { label: 'MEDIUM', className: 'bg-info/20 text-info border-info/40' },
  low: { label: 'LOW', className: 'bg-muted text-muted-foreground border-border' },
  // Ambulance status
  available: { label: 'AVAILABLE', className: 'bg-success/20 text-success border-success/40' },
  'en-route': { label: 'EN ROUTE', className: 'bg-warning/20 text-warning border-warning/40' },
  'at-scene': { label: 'AT SCENE', className: 'bg-info/20 text-info border-info/40' },
  transporting: { label: 'TRANSPORTING', className: 'bg-critical/20 text-critical border-critical/40' },
  offline: { label: 'OFFLINE', className: 'bg-muted text-muted-foreground border-border' },
  // Hospital status
  busy: { label: 'BUSY', className: 'bg-warning/20 text-warning border-warning/40' },
  full: { label: 'FULL', className: 'bg-emergency/20 text-emergency border-emergency/40' },
  // Assignment status
  pending: { label: 'PENDING', className: 'bg-warning/20 text-warning border-warning/40' },
  accepted: { label: 'ACCEPTED', className: 'bg-success/20 text-success border-success/40' },
  rejected: { label: 'REJECTED', className: 'bg-emergency/20 text-emergency border-emergency/40' },
  completed: { label: 'COMPLETED', className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'CANCELLED', className: 'bg-muted text-muted-foreground border-border' },
};

export function StatusBadge({ status, className, pulse }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status.toUpperCase(), className: 'bg-muted text-muted-foreground border-border' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider uppercase',
        config.className,
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', 
            status === 'critical' ? 'bg-emergency' : status === 'available' ? 'bg-success' : 'bg-warning'
          )} />
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5',
            status === 'critical' ? 'bg-emergency' : status === 'available' ? 'bg-success' : 'bg-warning'
          )} />
        </span>
      )}
      {config.label}
    </span>
  );
}
