import React from 'react';
import { X, TrendingUp, ShieldAlert, BarChart3, Activity, Cpu, Calendar } from 'lucide-react';
import { StockItem } from '@/types/dashboard';
import { StockPriceChart } from '../charts/StockPriceChart';

interface StockDetailModalProps {
  stock: StockItem | null;
  capital: number;
  onClose: () => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  stock,
  capital,
  onClose,
}) => {
  if (!stock) return null;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  const stockAlloc = Math.round(capital * stock.targetWeight);
  const volumeEst =
    stock.price > 0 && stockAlloc > 0
      ? Math.floor(stockAlloc / stock.price / 100) * 100
      : 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-stock-ticker"
    >
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black font-mono text-xl shadow-md shadow-blue-500/20">
              {stock.ticker}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="modal-stock-ticker" className="text-xl font-bold text-slate-900 tracking-tight">
                  {stock.name}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                  {stock.sector}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Biên độ phiên gần nhất: <span className="font-semibold text-slate-800">{stock.dayRange}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ chi tiết cổ phiếu"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Giá & Mục Tiêu Dự Báo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs text-slate-600 mb-1">Giá Khớp Gần Nhất</div>
              <div className="text-lg font-bold font-mono text-slate-900">
                {formatVND(stock.price)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Dự Báo Phiên Tới</div>
              <div className="text-lg font-bold font-mono text-emerald-600 flex items-center gap-1">
                {formatVND(stock.predictedPrice)}
                <span className="text-xs font-semibold text-emerald-700">({stock.expectedPct})</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Cắt Lỗ Kỷ Luật</div>
              <div className="text-lg font-bold font-mono text-rose-600">
                {formatVND(stock.stopLoss)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Tín Hiệu Hành Động</div>
              <span
                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  stock.category === 'buy'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : stock.category === 'hold'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {stock.actionText}
              </span>
            </div>
          </div>

          {/* Section 2: Biểu Đồ 7 Phiên Gần Nhất (Ngày Tháng & Số Tiền) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Biến Động Giá & Vùng Dự Báo (7 Phiên Gần Nhất)</span>
              </div>
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Cập nhật phiên ngày 20/10/2026
              </span>
            </div>

            <StockPriceChart
              ticker={stock.ticker}
              history={
                stock.history || [
                  { date: "14/10", price: Math.round(stock.price * 0.97) },
                  { date: "15/10", price: Math.round(stock.price * 0.98) },
                  { date: "16/10", price: Math.round(stock.price * 0.975) },
                  { date: "17/10", price: Math.round(stock.price * 0.99) },
                  { date: "18/10", price: Math.round(stock.price * 0.995) },
                  { date: "19/10", price: Math.round(stock.price * 0.99) },
                  { date: "20/10", price: stock.price }
                ]
              }
              predictedPrice={stock.predictedPrice}
              stopLoss={stock.stopLoss}
            />
          </div>

          {/* Section 3: 4 Chỉ Số Định Lượng Cốt Lõi */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" /> Định giá P/E
              </div>
              <div className="text-base font-bold font-mono text-slate-900">{stock.pe}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                <Activity className="w-3.5 h-3.5 text-slate-400" /> Tỷ suất ROE
              </div>
              <div className="text-base font-bold font-mono text-slate-900">{stock.roe}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" /> Chỉ báo RSI
              </div>
              <div className="text-base font-bold font-mono text-slate-900">{stock.rsi}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                <Cpu className="w-3.5 h-3.5 text-blue-600" /> Điểm Attention
              </div>
              <div className="text-base font-bold font-mono text-blue-600">{stock.attention}</div>
            </div>
          </div>

          {/* Section 4: Luận Điểm Mô Hình AI & Phân Bổ Vốn Khuyến Nghị */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-sm space-y-2">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-600" />
              Luận Điểm Khuyến Nghị HMM - PPO:
            </div>
            <p className="text-slate-700 leading-relaxed text-xs">
              {stock.reason}
            </p>
            <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-xs text-slate-700">
              <span>Hạn mức phân bổ khuyến nghị ({ (stock.targetWeight * 100).toFixed(1) }%):</span>
              <span className="font-mono font-bold text-blue-700">
                {formatVND(stockAlloc)} ({volumeEst > 0 ? `${new Intl.NumberFormat('vi-VN').format(volumeEst)} CP` : 'Chưa phân bổ'})
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Khuyến nghị thuần toán học, không thay thế quyết định cá nhân.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;
