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
    // Mobile: tighter padding (p-3), smaller text. Desktop: full size.
    <div className={`card ${theme.top} flex flex-col gap-2 md:gap-3 p-3 md:p-4`}>
      <div className="flex items-center justify-between">
        {/* section-label stays consistent */}
        <span className="section-label text-[10px] md:text-[11px]">{label}</span>
        <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${theme.icon}`} />
      </div>
      {/* Mobile: text-2xl (24px), Desktop: text-4xl (36px) */}
      <p className={`font-['Barlow_Condensed',sans-serif] font-bold leading-none text-2xl md:text-4xl ${theme.value}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--text-dim)] font-['Barlow',sans-serif]">{sub}</p>}
    </div>
  );
}

