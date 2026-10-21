import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Info, 
  Sparkles, 
  ShieldAlert, 
  Filter
} from 'lucide-react';
import { StockItem } from '@/types/dashboard';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

interface ForecastTableProps {
  stocks: StockItem[];
  capital: number;
  isLoading?: boolean;
  onSelectStock: (stock: StockItem) => void;
}

export const ForecastTable: React.FC<ForecastTableProps> = ({
  stocks,
  capital,
  isLoading = false,
  onSelectStock,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'buy' | 'hold' | 'sell'>('all');

  const filteredStocks = stocks.filter((stock) => {
    if (activeFilter === 'all') return true;
    return stock.category === activeFilter;
  });

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Table Header Controls */}
      <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Bảng Dự Báo Biến Động & Khuyến Nghị Phiên Kế Tiếp
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3" /> VN30 AI Inference
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Dữ liệu dự phóng bởi mạng nơ-ron PPO kết hợp nhận diện trạng thái thị trường Markov (HMM).
          </p>
        </div>

        {/* Action Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1 px-2 text-xs font-semibold text-slate-600 mr-1">
            <Filter className="w-3.5 h-3.5" /> Bộ Lọc:
          </div>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất Cả ({stocks.length})
          </button>
          <button
            onClick={() => setActiveFilter('buy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'buy'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Khuyến Nghị Mua ({stocks.filter((s) => s.category === 'buy').length})
          </button>
          <button
            onClick={() => setActiveFilter('hold')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'hold'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            Nắm Giữ ({stocks.filter((s) => s.category === 'hold').length})
          </button>
          <button
            onClick={() => setActiveFilter('sell')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'sell'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            Hạ Tỷ Trọng ({stocks.filter((s) => s.category === 'sell').length})
          </button>
        </div>
      </div>

      {/* Table Container - 100% Full Width */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <th className="px-6 py-4">Mã Cổ Phiếu / Doanh Nghiệp</th>
              <th className="px-6 py-4">Giá Hiện Tại</th>
              <th className="px-6 py-4">Dự Báo Phiên Tới</th>
              <th className="px-6 py-4">Vùng Cắt Lỗ Kỷ Luật</th>
              <th className="px-6 py-4">Tín Hiệu Hành Động</th>
              <th className="px-6 py-4">Tỷ Trọng / Phân Bổ Vốn</th>
              <th className="px-6 py-4 text-right">Chi Tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-medium">
            {isLoading ? (
              <LoadingSkeleton variant="table-row" count={6} />
            ) : filteredStocks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-600 text-sm">
                  Không tìm thấy mã cổ phiếu nào theo bộ lọc được chọn.
                </td>
              </tr>
            ) : (
              filteredStocks.map((stock) => {
                const stockAlloc = Math.round(capital * stock.targetWeight);
                const volumeEst =
                  stock.price > 0 && stockAlloc > 0
                    ? Math.floor(stockAlloc / stock.price / 100) * 100
                    : 0;

                return (
                  <tr
                    key={stock.ticker}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectStock(stock)}
                  >
                    {/* Ticker & Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black font-mono text-slate-900 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                          {stock.ticker}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            {stock.ticker}
                            <span className="text-xs font-normal text-slate-600 hidden sm:inline">
                              • {stock.sector.split('•')[0]}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 truncate max-w-[200px]">
                            {stock.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Current Price */}
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-slate-900">
                        {formatVND(stock.price)}
                      </div>
                      <div className="text-xs text-slate-600">Khớp lệnh sàn</div>
                    </td>

                    {/* Predicted Price & Expected Return */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">
                          {formatVND(stock.predictedPrice)}
                        </span>
                        <span
                          className={`inline-flex items-center text-xs font-extrabold px-1.5 py-0.5 rounded ${
                            stock.isPositive
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                              : 'text-rose-700 bg-rose-50 border border-rose-200'
                          }`}
                        >
                          {stock.isPositive ? (
                            <ArrowUpRight className="w-3 h-3 mr-0.5" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 mr-0.5" />
                          )}
                          {stock.expectedPct}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">Độ tin cậy: {stock.attention}</div>
                    </td>

                    {/* Stop Loss Rule */}
                    <td className="px-6 py-4">
                      <div className="font-mono font-semibold text-rose-600 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {formatVND(stock.stopLoss)}
                      </div>
                      <div className="text-xs text-slate-600">Cắt lỗ cứng kỷ luật</div>
                    </td>

                    {/* Action Signal */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                          stock.category === 'buy'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : stock.category === 'hold'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {stock.category === 'buy' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        {stock.category === 'hold' && <Minus className="w-3 h-3" />}
                        {stock.category === 'sell' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        )}
                        {stock.actionText}
                      </span>
                    </td>

                    {/* Target Weight & Capital Allocation */}
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-slate-900">
                        {(stock.targetWeight * 100).toFixed(1)}% ({formatVND(stockAlloc)})
                      </div>
                      <div className="text-xs text-slate-600">
                        {volumeEst > 0 ? `Ước tính: ${new Intl.NumberFormat('vi-VN').format(volumeEst)} CP` : 'Chưa phân bổ'}
                      </div>
                    </td>

                    {/* View Button */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStock(stock);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" /> Chi Tiết
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ForecastTable;
