import { ReactNode } from 'react';

interface DashboardCardProps {
  icon: ReactNode;
  title: string;
  value: number | string;
  accentColor: string;
  onClick?: () => void;
}

export default function DashboardCard({ icon, title, value, accentColor, onClick }: DashboardCardProps) {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (!isClickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`bg-white rounded-lg shadow-sm border border-neutral-200 p-3 sm:p-4 md:p-5 ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-teal-300 transition-all focus:outline-none focus:ring-2 focus:ring-teal-400' : ''}`}
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="p-2 sm:p-3 rounded-lg" style={{ backgroundColor: `${accentColor}20` }}>
          <div style={{ color: accentColor }} className="w-6 h-6 sm:w-8 sm:h-8">{icon}</div>
        </div>
      </div>
      <h3 className="text-neutral-600 text-xs sm:text-sm font-medium mb-1">{title}</h3>
      <p className="text-xl sm:text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

