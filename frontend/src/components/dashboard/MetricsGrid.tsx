import React from 'react';
import { TrendingUp, ShieldCheck, Wallet, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { MetricCardData } from '@/types/dashboard';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

interface MetricsGridProps {
  metrics: MetricCardData;
  isLoading?: boolean;
  userPortfolio?: {
    initial_capital: number;
    current_nav: number;
    cash_left: number;
    pnl_cash: number;
    pnl_pct: number;
  };
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ 
  metrics, 
  isLoading = false,
  userPortfolio 
}) => {
  if (isLoading) {
    return <LoadingSkeleton variant="card" count={3} className="mb-6" />;
  }

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' đ';
  };

  const navDisplay = userPortfolio ? userPortfolio.current_nav : metrics.nav;
  const initialCap = userPortfolio ? userPortfolio.initial_capital : metrics.nav;
  const pnlPct = userPortfolio ? userPortfolio.pnl_pct : metrics.navProfitPct;
  const cashDisplay = userPortfolio ? userPortfolio.cash_left : metrics.availableCash;
  const stockVal = userPortfolio ? (userPortfolio.current_nav - userPortfolio.cash_left) : metrics.totalAllocated;
  const isProfit = pnlPct >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
      {/* Card 1: Tổng Giá Trị Tài Sản / NAV */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Tổng Giá Trị Tài Sản (NAV)</span>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
            isProfit 
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
              : 'text-rose-700 bg-rose-50 border-rose-200'
          }`}>
            <ArrowUpRight className="w-3.5 h-3.5" /> {isProfit ? '+' : ''}{pnlPct.toFixed(2)}% PnL
          </span>
        </div>
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono mb-2">
          {formatVND(navDisplay)}
        </div>
        <div className="text-xs text-slate-600 flex items-center justify-between font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Vốn ban đầu: <strong className="text-slate-800 font-mono">{formatVND(initialCap)}</strong>
          </span>
          {userPortfolio && (
            <span className="text-rose-600 font-bold font-mono">
              ({formatVND(userPortfolio.pnl_cash)})
            </span>
          )}
        </div>
      </div>

      {/* Card 2: Giá Trị Khuyến Nghị / Đang Nắm Giữ */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Giá Trị Danh Mục Cổ Phiếu</span>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            {navDisplay > 0 ? ((stockVal / navDisplay) * 100).toFixed(1) : '0.0'}% NAV
          </span>
        </div>
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono mb-2">
          {formatVND(stockVal)}
        </div>
        <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          {userPortfolio ? 'Nắm giữ 6 mã cổ phiếu thực tế' : 'Phân bổ định lượng theo mô hình PPO & HMM'}
        </div>
      </div>

      {/* Card 3: Tiền Mặt Dự Phòng An Toàn */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
            <Wallet className="w-4 h-4 text-amber-600" />
            <span>Tiền Mặt Khả Dụng</span>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            {navDisplay > 0 ? ((cashDisplay / navDisplay) * 100).toFixed(1) : '0.0'}% Vốn
          </span>
        </div>
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono mb-2">
          {formatVND(cashDisplay)}
        </div>
        <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Tiền mặt sẵn sàng cho phiên giao dịch kế tiếp
        </div>
      </div>
    </div>
  );
};

export default MetricsGrid;
