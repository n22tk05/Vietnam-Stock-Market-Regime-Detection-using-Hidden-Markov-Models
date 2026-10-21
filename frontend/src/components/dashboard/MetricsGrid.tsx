import React from 'react';
import { TrendingUp, ShieldCheck, Wallet, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { MetricCardData } from '@/types/dashboard';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

interface MetricsGridProps {
  metrics: MetricCardData;
  isLoading?: boolean;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, isLoading = false }) => {
  if (isLoading) {
    return <LoadingSkeleton variant="card" count={3} className="mb-6" />;
  }

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
      {/* Card 1: Tổng Giá Trị Tài Sản / NAV */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Tổng Giá Trị Tài Sản (NAV)</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <ArrowUpRight className="w-3.5 h-3.5" /> +{metrics.navProfitPct}% YTD
          </span>
        </div>
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono mb-2">
          {formatVND(metrics.nav)}
        </div>
        <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Vốn cơ sở tính toán theo khẩu vị cá nhân
        </div>
      </div>

      {/* Card 2: Giá Trị Khuyến Nghị Giải Ngân */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Giá Trị Khuyến Nghị Giải Ngân</span>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            {metrics.nav > 0 ? ((metrics.totalAllocated / metrics.nav) * 100).toFixed(1) : '0.0'}% Danh mục
          </span>
        </div>
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono mb-2">
          {formatVND(metrics.totalAllocated)}
        </div>
        <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          Phân bổ định lượng theo mô hình PPO & HMM
        </div>
      </div>

      {/* Card 3: Tiền Mặt Dự Phòng An Toàn */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
            <Wallet className="w-4 h-4 text-amber-600" />
            <span>Tiền Mặt Dự Phòng An Toàn</span>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            {metrics.cashRatioPct}% Vốn
          </span>
        </div>
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono mb-2">
          {formatVND(metrics.availableCash)}
        </div>
        <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Bộ đệm rủi ro khi thị trường biến động
        </div>
      </div>
    </div>
  );
};

export default MetricsGrid;
