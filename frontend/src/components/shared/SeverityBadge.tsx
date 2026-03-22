type Severity = 'critical' | 'high' | 'medium' | 'low';

interface SeverityBadgeProps {
  severity: Severity | string;
}

const MAP: Record<string, string> = {
  critical: 'badge badge-critical',
  high:     'badge badge-high',
  medium:   'badge badge-medium',
  low:      'badge badge-low',
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const cls = MAP[severity?.toLowerCase()] ?? 'badge badge-low';
  return <span className={cls}>{severity}</span>;
}
