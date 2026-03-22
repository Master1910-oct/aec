type Status =
  | 'critical' | 'high' | 'medium' | 'low'
  | 'pending' | 'allocated' | 'en_route' | 'arrived'
  | 'completed' | 'cancelled' | 'escalated'
  | 'AVAILABLE' | 'ON_CALL' | 'MAINTENANCE'
  | string;

interface StatusBadgeProps {
  status: Status;
}

const MAP: Record<string, string> = {
  // Emergency severity
  critical:    'badge badge-critical',
  high:        'badge badge-high',
  medium:      'badge badge-medium',
  low:         'badge badge-low',
  // Emergency status
  pending:     'badge badge-pending',
  allocated:   'badge badge-allocated',
  en_route:    'badge badge-en-route',
  arrived:     'badge badge-arrived',
  completed:   'badge badge-completed',
  cancelled:   'badge badge-cancelled',
  escalated:   'badge badge-escalated',
  // Ambulance status
  AVAILABLE:   'badge badge-available',
  ON_CALL:     'badge badge-on-call',
  MAINTENANCE: 'badge badge-maintenance',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = MAP[status] ?? 'badge badge-cancelled';
  const label = status.replace(/_/g, ' ');
  return <span className={cls}>{label}</span>;
}
