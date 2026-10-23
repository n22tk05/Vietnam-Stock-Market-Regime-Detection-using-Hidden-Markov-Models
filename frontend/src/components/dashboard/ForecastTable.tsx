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
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Table Header Controls - Ngang hoàn toàn */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 whitespace-nowrap">
        <div className="flex items-center gap-3 whitespace-nowrap">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
            Bảng Dự Báo Biến Động & Khuyến Nghị Phiên Kế Tiếp
          </h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            <Sparkles className="w-3 h-3 shrink-0" /> VN30 AI Inference
          </span>
        </div>

        {/* Action Filter Pills - Đều nằm ngang một hàng */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-1 px-2 text-xs font-semibold text-slate-600 shrink-0 whitespace-nowrap">
            <Filter className="w-3.5 h-3.5 shrink-0" /> Bộ Lọc:
          </div>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất Cả ({stocks.length})
          </button>
          <button
            onClick={() => setActiveFilter('buy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'buy'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Khuyến Nghị Mua ({stocks.filter((s) => s.category === 'buy').length})
          </button>
          <button
            onClick={() => setActiveFilter('hold')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'hold'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            Nắm Giữ ({stocks.filter((s) => s.category === 'hold').length})
          </button>
          <button
            onClick={() => setActiveFilter('sell')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'sell'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            Hạ Tỷ Trọng ({stocks.filter((s) => s.category === 'sell').length})
          </button>
        </div>
      </div>

      {/* Table Container - 100% Full Width Horizontal Scroll */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
              <th className="px-6 py-3.5 whitespace-nowrap">Mã Cổ Phiếu / Doanh Nghiệp</th>
              <th className="px-6 py-3.5 whitespace-nowrap">Giá Hiện Tại</th>
              <th className="px-6 py-3.5 whitespace-nowrap">Dự Báo Phiên Tới</th>
              <th className="px-6 py-3.5 whitespace-nowrap">Vùng Cắt Lỗ Kỷ Luật</th>
              <th className="px-6 py-3.5 whitespace-nowrap">Tín Hiệu Hành Động</th>
              <th className="px-6 py-3.5 whitespace-nowrap">Tỷ Trọng / Phân Bổ Vốn</th>
              <th className="px-6 py-3.5 text-right whitespace-nowrap">Chi Tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-medium whitespace-nowrap">
            {isLoading ? (
              <LoadingSkeleton variant="table-row" count={6} />
            ) : filteredStocks.length === 0 ? (
              <tr className="whitespace-nowrap">
                <td colSpan={7} className="px-6 py-12 text-center text-slate-600 text-sm whitespace-nowrap">
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
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer whitespace-nowrap"
                    onClick={() => onSelectStock(stock)}
                  >
                    {/* Ticker & Name - Hoàn toàn một hàng ngang */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black font-mono text-xs text-slate-900 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors shrink-0">
                          {stock.ticker}
                        </div>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {stock.ticker}
                          </span>
                          <span className="text-xs text-slate-500 font-normal">
                            • {stock.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                            {stock.sector.split('•')[0].trim()}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Current Price - Ngang */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900">{formatVND(stock.price)}</span>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">HOSE</span>
                      </div>
                    </td>

                    {/* Predicted Price & Expected Return - Ngang */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900">
                          {formatVND(stock.predictedPrice)}
                        </span>
                        <span
                          className={`inline-flex items-center text-xs font-extrabold px-1.5 py-0.5 rounded whitespace-nowrap ${
                            stock.isPositive
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                              : 'text-rose-700 bg-rose-50 border border-rose-200'
                          }`}
                        >
                          {stock.isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                          )}
                          {stock.expectedPct}
                        </span>
                      </div>
                    </td>

                    {/* Stop Loss Rule - Ngang */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-semibold text-rose-600 flex items-center gap-1.5 whitespace-nowrap">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatVND(stock.stopLoss)}</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Cắt lỗ cứng)</span>
                      </div>
                    </td>

                    {/* Action Signal - Ngang */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black tracking-wide border whitespace-nowrap ${
                          stock.category === 'buy'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : stock.category === 'hold'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {stock.category === 'buy' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        )}
                        {stock.category === 'hold' && <Minus className="w-3 h-3 shrink-0" />}
                        {stock.category === 'sell' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        )}
                        <span>{stock.actionText}</span>
                      </span>
                    </td>

                    {/* Target Weight & Capital Allocation - Ngang */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 whitespace-nowrap font-mono">
                        <span className="font-bold text-slate-900">{(stock.targetWeight * 100).toFixed(1)}%</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-700 font-bold">{formatVND(stockAlloc)}</span>
                        {volumeEst > 0 && (
                          <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-sans font-semibold">
                            ~{new Intl.NumberFormat('vi-VN').format(volumeEst)} CP
                          </span>
                        )}
                      </div>
                    </td>

                    {/* View Button */}
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStock(stock);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>Chi Tiết</span>
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
