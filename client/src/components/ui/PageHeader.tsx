import React from 'react';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  subtitle,
  badge,
  actions,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-inner">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-zinc-100 tracking-tight truncate">
              {title}
            </h2>
            {badge && (
              <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
};
