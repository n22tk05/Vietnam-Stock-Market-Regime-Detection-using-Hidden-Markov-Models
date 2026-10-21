import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'table-row';
  type?: 'card' | 'text' | 'table-row' | 'table' | 'chart';
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant,
  type,
  count = 1
}) => {
  const effectiveVariant = variant || (type === 'table' ? 'table-row' : type) || 'text';
  const items = Array.from({ length: count });

  if (effectiveVariant === 'card') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="p-6 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-8 w-44 bg-slate-200 rounded" />
            <div className="h-4 w-36 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (effectiveVariant === 'table-row') {
    return (
      <>
        {items.map((_, i) => (
          <tr key={i} className="animate-pulse border-b border-slate-100">
            <td className="px-6 py-4">
              <div className="h-5 w-16 bg-slate-200 rounded mb-1" />
              <div className="h-3.5 w-32 bg-slate-100 rounded" />
            </td>
            <td className="px-6 py-4">
              <div className="h-5 w-24 bg-slate-200 rounded" />
            </td>
            <td className="px-6 py-4">
              <div className="h-5 w-20 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-16 bg-slate-100 rounded" />
            </td>
            <td className="px-6 py-4">
              <div className="h-5 w-20 bg-slate-200 rounded" />
            </td>
            <td className="px-6 py-4">
              <div className="h-7 w-28 bg-slate-200 rounded-lg" />
            </td>
            <td className="px-6 py-4">
              <div className="h-5 w-16 bg-slate-200 rounded mb-1" />
              <div className="h-3.5 w-24 bg-slate-100 rounded" />
            </td>
            <td className="px-6 py-4 text-right">
              <div className="h-8 w-20 bg-slate-200 rounded-lg ml-auto" />
            </td>
          </tr>
        ))}
      </>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((_, i) => (
        <div key={i} className="h-4 bg-slate-200 rounded animate-pulse" />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
