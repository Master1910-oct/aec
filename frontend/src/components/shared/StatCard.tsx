import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'emergency' | 'success' | 'warning' | 'info';
  className?: string;
}

const variantStyles = {
  default: 'border-border',
  emergency: 'border-emergency/30 glow-emergency',
  success: 'border-success/30 glow-success',
  warning: 'border-warning/30',
  info: 'border-info/30',
};

const iconVariantStyles = {
  default: 'text-primary',
  emergency: 'text-emergency',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
};

export function StatCard({ title, value, subtitle, icon: Icon, variant = 'default', className }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-lg border bg-card p-4 transition-all duration-300 hover:bg-secondary/50',
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="panel-header mb-1">{title}</p>
          <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn('p-2 rounded-md bg-secondary/50', iconVariantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
