import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Đã xảy ra lỗi',
  message = 'Không thể tải dữ liệu. Vui lòng kiểm tra lại kết nối và thử lại.',
  onRetry,
}) => {
  return (
    <div className="w-full flex flex-col items-center justify-center text-center p-8 bg-rose-50/50 rounded-3xl border border-rose-200/80 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <div className="max-w-md space-y-1">
        <h4 className="text-lg font-extrabold text-rose-950">{title}</h4>
        <p className="text-sm text-rose-700">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-6 py-2.5 rounded-full flex items-center gap-2 shadow-md transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Thử lại</span>
        </button>
      )}
    </div>
  );
};
