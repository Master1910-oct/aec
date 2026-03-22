import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sub?: string;
  accentColor?: 'red' | 'amber' | 'green' | 'blue';
}

const accentMap = {
  red:   { top: 'card-critical', icon: 'text-[var(--critical)]', value: 'text-[var(--critical)]' },
  amber: { top: 'card-warning',  icon: 'text-[#F59E0B]',          value: 'text-[#F59E0B]' },
  green: { top: 'card-safe',     icon: 'text-[var(--safe)]',       value: 'text-[var(--safe)]' },
  blue:  { top: 'card-info',     icon: 'text-[var(--info)]',       value: 'text-[var(--info)]' },
};

export function StatCard({ label, value, icon: Icon, sub, accentColor = 'blue' }: StatCardProps) {
  const theme = accentMap[accentColor];
  return (
    <div className={`card ${theme.top} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <Icon className={`w-4 h-4 shrink-0 ${theme.icon}`} />
      </div>
      <p className={`stat-value ${theme.value}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--text-dim)] font-['Barlow',sans-serif]">{sub}</p>}
    </div>
  );
}
