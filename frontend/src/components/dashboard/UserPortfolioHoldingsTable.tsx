import React, { useState, useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Unlock, 
  Clock, 
  Briefcase,
  BarChart3,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { SimulatedUserPortfolio } from '@/types/dashboard';

interface UserPortfolioHoldingsTableProps {
  portfolio: SimulatedUserPortfolio;
  onSelectStock?: (ticker: string) => void;
  onOpenOrderModal?: (action: 'BUY' | 'SELL', ticker?: string) => void;
}

type SortField = 'ticker' | 'weight' | 'shares' | 'cost' | 'price' | 'value' | 'pnl' | 'status';
type SortDirection = 'asc' | 'desc';

export const UserPortfolioHoldingsTable: React.FC<UserPortfolioHoldingsTableProps> = ({
  portfolio,
  onSelectStock,
  onOpenOrderModal,
}) => {
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' đ';
  };

  // State điều khiển phân trang & bộ sắp xếp
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [sortField, setSortField] = useState<SortField>('weight');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const initialLimit = portfolio.holdings.length > 2 ? 2 : 1;
  const hasMore = portfolio.holdings.length > initialLimit;

  // Tính toán sắp xếp danh mục linh hoạt theo trường và chiều sắp xếp
  const sortedHoldings = useMemo(() => {
    const list = [...portfolio.holdings];
    list.sort((a, b) => {
      const valA = a.so_co_phieu * a.gia_hien_tai;
      const costA = a.so_co_phieu * a.gia_von;
      const pnlPctA = costA > 0 ? ((valA - costA) / costA) * 100 : 0;
      const weightA = portfolio.current_nav > 0 ? (valA / portfolio.current_nav) * 100 : 0;

      const valB = b.so_co_phieu * b.gia_hien_tai;
      const costB = b.so_co_phieu * b.gia_von;
      const pnlPctB = costB > 0 ? ((valB - costB) / costB) * 100 : 0;
      const weightB = portfolio.current_nav > 0 ? (valB / portfolio.current_nav) * 100 : 0;

      let diff = 0;
      switch (sortField) {
        case 'ticker':
          diff = a.ma_co_phieu.localeCompare(b.ma_co_phieu);
          break;
        case 'weight':
          diff = weightA - weightB;
          break;
        case 'shares':
          diff = a.so_co_phieu - b.so_co_phieu;
          break;
        case 'cost':
          diff = a.gia_von - b.gia_von;
          break;
        case 'price':
          diff = a.gia_hien_tai - b.gia_hien_tai;
          break;
        case 'value':
          diff = valA - valB;
          break;
        case 'pnl':
          diff = pnlPctA - pnlPctB;
          break;
        case 'status':
          diff = a.status.localeCompare(b.status);
          break;
        default:
          diff = 0;
      }
      return sortDirection === 'asc' ? diff : -diff;
    });
    return list;
  }, [portfolio.holdings, portfolio.current_nav, sortField, sortDirection]);

  const displayedHoldings = isExpanded 
    ? sortedHoldings 
    : sortedHoldings.slice(0, initialLimit);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'ticker' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover/th:text-slate-600 transition-colors shrink-0" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      : <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
  };

  const totalStockVal = portfolio.holdings.reduce(
    (sum, h) => sum + h.so_co_phieu * h.gia_hien_tai, 
    0
  );
  const totalCostVal = portfolio.holdings.reduce(
    (sum, h) => sum + h.so_co_phieu * h.gia_von, 
    0
  );
  const totalShares = portfolio.holdings.reduce(
    (sum, h) => sum + h.so_co_phieu, 
    0
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Table Header Controls - Hoàn toàn một hàng ngang */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 whitespace-nowrap">
        <div className="flex items-center gap-3 whitespace-nowrap">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
            Danh Mục Cổ Phiếu Cá Nhân ({portfolio.holdings.length} Mã Đang Nắm Giữ)
          </h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            Vốn {portfolio.initial_capital >= 1_000_000 ? `${(portfolio.initial_capital / 1_000_000).toFixed(0)} Triệu` : formatVND(portfolio.initial_capital)}
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-xs whitespace-nowrap overflow-x-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold whitespace-nowrap">
            <span>Giá trị cổ phiếu:</span>
            <span className="font-mono font-bold text-slate-900">{formatVND(totalStockVal)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold whitespace-nowrap">
            <span>Tiền mặt khả dụng:</span>
            <span className="font-mono font-bold text-emerald-600">{formatVND(portfolio.cash_left)}</span>
          </div>
          {onOpenOrderModal && (
            <button
              onClick={() => onOpenOrderModal('BUY')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Ghi Lệnh Mua / Bán</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container - 100% Full Width Horizontal Scroll */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap select-none">
              {/* Cột Ticker */}
              <th 
                onClick={() => handleSort('ticker')} 
                className="px-6 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                title="Bấm để sắp xếp theo Mã cổ phiếu"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'ticker' ? 'text-blue-600 font-black' : ''}>Mã Cổ Phiếu / Doanh Nghiệp</span>
                  {renderSortIcon('ticker')}
                </div>
              </th>

              {/* Cột Tỷ trọng */}
              <th 
                onClick={() => handleSort('weight')} 
                className="px-4 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                title="Bấm để sắp xếp theo Tỷ trọng NAV"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'weight' ? 'text-blue-600 font-black' : ''}>Tỷ Trọng / NAV</span>
                  {renderSortIcon('weight')}
                </div>
              </th>

              {/* Cột Khối lượng */}
              <th 
                onClick={() => handleSort('shares')} 
                className="px-4 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                title="Bấm để sắp xếp theo Khối lượng cổ phiếu"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'shares' ? 'text-blue-600 font-black' : ''}>Khối Lượng</span>
                  {renderSortIcon('shares')}
                </div>
              </th>

              {/* Cột Giá vốn */}
              <th 
                onClick={() => handleSort('cost')} 
                className="px-4 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                title="Bấm để sắp xếp theo Giá vốn"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'cost' ? 'text-blue-600 font-black' : ''}>Giá Vốn</span>
                  {renderSortIcon('cost')}
                </div>
              </th>

              {/* Cột Giá hiện tại */}
              <th 
                onClick={() => handleSort('price')} 
                className="px-4 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                title="Bấm để sắp xếp theo Giá hiện tại"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'price' ? 'text-blue-600 font-black' : ''}>Giá Hiện Tại</span>
                  {renderSortIcon('price')}
                </div>
              </th>

              {/* Cột Tổng giá trị */}
              <th 
                onClick={() => handleSort('value')} 
                className="px-4 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                title="Bấm để sắp xếp theo Tổng giá trị vị thế"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'value' ? 'text-blue-600 font-black' : ''}>Tổng Giá Trị</span>
                  {renderSortIcon('value')}
                </div>
              </th>

              {/* Cột Lãi / Lỗ */}
              <th 
                onClick={() => handleSort('pnl')} 
                className="px-4 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                title="Bấm để sắp xếp theo Lãi / Lỗ"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'pnl' ? 'text-blue-600 font-black' : ''}>Lãi / Lỗ</span>
                  {renderSortIcon('pnl')}
                </div>
              </th>

              {/* Cột Trạng thái T+ */}
              <th 
                onClick={() => handleSort('status')} 
                className="px-4 py-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                title="Bấm để sắp xếp theo Trạng thái T+"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'status' ? 'text-blue-600 font-black' : ''}>Trạng Thái T+</span>
                  {renderSortIcon('status')}
                </div>
              </th>

              <th className="px-6 py-3.5 text-right whitespace-nowrap">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-medium whitespace-nowrap">
            {displayedHoldings.map((h) => {
              const totalVal = h.so_co_phieu * h.gia_hien_tai;
              const costVal = h.so_co_phieu * h.gia_von;
              const pnl = totalVal - costVal;
              const pnlPct = costVal > 0 ? (pnl / costVal) * 100 : 0;
              const isProfit = pnl >= 0;
              const navWeight = portfolio.current_nav > 0 
                ? (totalVal / portfolio.current_nav) * 100 
                : 0;

              return (
                <tr key={h.ma_co_phieu} className="hover:bg-blue-50/30 transition-colors group whitespace-nowrap">
                  {/* Mã CP & Tên - Ngang hoàn toàn */}
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5 whitespace-nowrap">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-600/20 text-blue-700 font-black font-mono text-xs flex items-center justify-center shrink-0">
                        {h.ma_co_phieu}
                      </div>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{h.ma_co_phieu}</span>
                        <span className="text-xs text-slate-500 font-normal">• {h.name || 'Sàn HOSE'}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                          HOSE
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Tỷ trọng NAV - Ngang */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-xs font-mono font-bold text-slate-800">{navWeight.toFixed(1)}%</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                        <div 
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, navWeight * 3)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Khối lượng - Ngang */}
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                    {new Intl.NumberFormat('vi-VN').format(h.so_co_phieu)} CP
                  </td>

                  {/* Giá vốn - Ngang */}
                  <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                    {formatVND(h.gia_von)}
                  </td>

                  {/* Giá thị trường - Ngang */}
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {formatVND(h.gia_hien_tai)}
                  </td>

                  {/* Tổng giá trị - Ngang */}
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {formatVND(totalVal)}
                  </td>

                  {/* Lãi / Lỗ - Ngang */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-mono whitespace-nowrap">
                      <span
                        className={`inline-flex items-center text-xs font-extrabold px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                          isProfit
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : 'text-rose-700 bg-rose-50 border border-rose-200'
                        }`}
                      >
                        {isProfit ? (
                          <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                        )}
                        {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
                      </span>
                      <span className={`text-xs font-semibold whitespace-nowrap ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ({isProfit ? '+' : ''}{formatVND(pnl)})
                      </span>
                    </div>
                  </td>

                  {/* Trạng thái T+ - Ngang */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {h.status === 'UNLOCKED' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                        <Unlock className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Khả dụng ({h.shares_unlocked} CP)</span>
                      </span>
                    ) : h.status === 'LOCKED_T1' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Chờ về T+1 ({h.shares_t1} CP)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>Chờ về T+2 ({h.shares_t2} CP)</span>
                      </span>
                    )}
                  </td>

                  {/* Nút hành động - Ngang */}
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      {/* Nút Bán nhanh */}
                      {h.shares_unlocked > 0 ? (
                        <button
                          onClick={() => onOpenOrderModal && onOpenOrderModal('SELL', h.ma_co_phieu)}
                          title={`Bán tối đa ${h.shares_unlocked} cp khả dụng`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <TrendingDown className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>Bán</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          title="Cổ phiếu chưa về tài khoản (chờ chu kỳ T+)"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 whitespace-nowrap"
                        >
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Bán</span>
                        </button>
                      )}

                      {/* Nút Mua thêm */}
                      <button
                        onClick={() => onOpenOrderModal && onOpenOrderModal('BUY', h.ma_co_phieu)}
                        title="Mua thêm mã này"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Mua</span>
                      </button>

                      {/* Nút Phân Tích */}
                      <button
                        onClick={() => onSelectStock && onSelectStock(h.ma_co_phieu)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                        <span>Phân Tích</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Dòng Xem Thêm / Thu Gọn Toàn Bộ Mã */}
            {hasMore && (
              <tr className="bg-slate-50/70 hover:bg-blue-50/40 transition-colors border-t border-slate-200 whitespace-nowrap">
                <td colSpan={9} className="py-3 px-6 text-start whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-700  hover:bg-blue-50  shadow-xs transition-all cursor-pointer hover:scale-[1.01] whitespace-nowrap"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Thu gọn danh mục</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          Xem thêm 
                        </span>
                      </>
                    )}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
          {/* Table Footer Summary Row - Ngang */}
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200 font-bold text-xs text-slate-800 whitespace-nowrap">
              <td className="px-6 py-3.5 whitespace-nowrap">TỔNG CỘNG ({portfolio.holdings.length} MÃ)</td>
              <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                {((totalStockVal / (portfolio.current_nav || 1)) * 100).toFixed(1)}% NAV
              </td>
              <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                {new Intl.NumberFormat('vi-VN').format(totalShares)} CP
              </td>
              <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">{formatVND(totalCostVal)}</td>
              <td className="px-4 py-3.5 font-mono whitespace-nowrap">-</td>
              <td className="px-4 py-3.5 font-mono text-slate-900 whitespace-nowrap">{formatVND(totalStockVal)}</td>
              <td className="px-4 py-3.5 font-mono text-emerald-600 whitespace-nowrap">
                {totalCostVal > 0 ? (((totalStockVal - totalCostVal) / totalCostVal) * 100).toFixed(2) : '0.00'}% ({formatVND(totalStockVal - totalCostVal)})
              </td>
              <td colSpan={2} className="px-4 py-3.5 text-right text-slate-500 font-normal whitespace-nowrap">
                Tiền mặt khả dụng: <strong className="text-emerald-600 font-mono font-bold">{formatVND(portfolio.cash_left)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default UserPortfolioHoldingsTable;
