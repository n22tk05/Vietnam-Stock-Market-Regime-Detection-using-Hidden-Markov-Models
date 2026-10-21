import React from 'react';
import type { MarketRegimeCode } from '@/types/api';
import { getRegimeMeta } from '@/utils/formatters';

interface MarketRegimeBadgeProps {
  code: MarketRegimeCode | string | undefined;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const MarketRegimeBadge: React.FC<MarketRegimeBadgeProps> = ({
  code,
  showDot = true,
  size = 'md',
}) => {
  const meta = getRegimeMeta(code);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-bold rounded-md',
    md: 'px-3 py-1 text-xs font-bold rounded-full border',
    lg: 'px-4 py-1.5 text-sm font-extrabold rounded-full border',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${meta.badgeBg} ${sizeClasses[size]} shadow-xs transition-all`}>
      {showDot && <span className={`w-2 h-2 rounded-full ${meta.dotBg} animate-pulse`} />}
      <span>{meta.label}</span>
    </div>
  );
};
