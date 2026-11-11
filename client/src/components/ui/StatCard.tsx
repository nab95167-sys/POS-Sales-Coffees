import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: React.ReactNode;
  icon: React.ReactNode;
  accent?: 'amber' | 'emerald' | 'blue' | 'purple' | 'red';
}

const ACCENT_MAP: Record<NonNullable<StatCardProps['accent']>, { iconBox: string; valueText: string; border: string }> = {
  amber: {
    iconBox: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    valueText: 'text-amber-300',
    border: 'hover:border-amber-500/40',
  },
  emerald: {
    iconBox: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    valueText: 'text-emerald-400',
    border: 'hover:border-emerald-500/40',
  },
  blue: {
    iconBox: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
    valueText: 'text-sky-300',
    border: 'hover:border-sky-500/40',
  },
  purple: {
    iconBox: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    valueText: 'text-purple-300',
    border: 'hover:border-purple-500/40',
  },
  red: {
    iconBox: 'bg-red-500/15 text-red-400 border-red-500/25',
    valueText: 'text-red-400',
    border: 'hover:border-red-500/40',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  badge,
  icon,
  accent = 'amber',
}) => {
  const styles = ACCENT_MAP[accent];

  return (
    <div className={`glass-card rounded-2xl p-4 sm:p-5 space-y-3 transition-colors shadow-lg ${styles.border}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 truncate">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${styles.iconBox}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <h3 className={`text-2xl font-black font-mono tabular-nums tracking-tight ${styles.valueText}`}>
          {value}
        </h3>
        {badge && <div className="flex-shrink-0">{badge}</div>}
      </div>

      {subtext && (
        <p className="text-[11px] text-zinc-400 truncate pt-1 border-t border-white/5">{subtext}</p>
      )}
    </div>
  );
};
