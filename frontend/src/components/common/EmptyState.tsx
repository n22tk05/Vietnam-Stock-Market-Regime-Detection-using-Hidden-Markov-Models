import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có dữ liệu nào để hiển thị trong mục này.',
  actionText,
  onAction,
}) => {
  return (
    <div className="w-full flex flex-col items-center justify-center text-center p-10 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
        <FolderOpen className="w-8 h-8" />
      </div>
      <div className="max-w-md space-y-1">
        <h4 className="text-lg font-extrabold text-slate-900">{title}</h4>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="btn-primary text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-md hover:-translate-y-0.5 transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
