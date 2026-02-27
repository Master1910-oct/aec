import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmergencyBannerProps {
  message: string;
  level?: 'critical' | 'high';
  className?: string;
}

export function EmergencyBanner({ message, level = 'critical', className }: EmergencyBannerProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border px-4 py-3 emergency-flash',
      level === 'critical' ? 'border-emergency/40' : 'border-warning/40',
      className
    )}>
      <AlertTriangle className={cn(
        'h-5 w-5 shrink-0',
        level === 'critical' ? 'text-emergency' : 'text-warning'
      )} />
      <p className="text-sm font-semibold font-mono tracking-wide">
        {message}
      </p>
    </div>
  );
}
