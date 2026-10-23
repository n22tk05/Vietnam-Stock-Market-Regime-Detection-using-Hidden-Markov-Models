import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Wallet,
  ArrowRight,
  Info
} from 'lucide-react';
import { SimulatedHolding, StockItem, INITIAL_TOP_STOCKS } from '@/types/dashboard';

export interface OrderSubmitPayload {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  notes?: string;
  realizedPnl?: number;
}

interface OrderEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAction?: 'BUY' | 'SELL';
  defaultSymbol?: string;
  cashAvailable: number;
  holdings: SimulatedHolding[];
  availableStocks?: StockItem[];
  onSubmitOrder: (order: OrderSubmitPayload) => Promise<boolean> | boolean;
}

export const OrderEntryModal: React.FC<OrderEntryModalProps> = ({
  isOpen,
  onClose,
  defaultAction = 'BUY',
  defaultSymbol = '',
  cashAvailable,
  holdings,
  availableStocks = INITIAL_TOP_STOCKS,
  onSubmitOrder,
}) => {
  if (!isOpen) return null;

  const [action, setAction] = useState<'BUY' | 'SELL'>(defaultAction);
  const [symbol, setSymbol] = useState<string>(defaultSymbol || (holdings[0]?.ma_co_phieu || 'HPG'));
  const [quantity, setQuantity] = useState<number>(100);
  const [price, setPrice] = useState<number>(20000);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Danh sách các mã cổ phiếu hỗ trợ
  const allStockOptions = useMemo(() => {
    const symbolsSet = new Set<string>();
    holdings.forEach((h) => symbolsSet.add(h.ma_co_phieu));
    availableStocks.forEach((s) => symbolsSet.add(s.ticker));
    ['HPG', 'SSI', 'VND', 'FPT', 'MWG', 'DIG', 'VSC', 'DPM', 'GEX', 'HT1'].forEach((s) => symbolsSet.add(s));
    return Array.from(symbolsSet);
  }, [holdings, availableStocks]);

  // Cổ phiếu đang chọn trong danh mục (nếu có)
  const currentHolding = useMemo(() => {
    return holdings.find((h) => h.ma_co_phieu.toUpperCase() === symbol.toUpperCase());
  }, [holdings, symbol]);

  // Giá tham chiếu mặc định cho mã đang chọn
  useEffect(() => {
    if (currentHolding) {
      setPrice(currentHolding.gia_hien_tai);
    } else {
      const foundStock = availableStocks.find((s) => s.ticker.toUpperCase() === symbol.toUpperCase());
      if (foundStock) {
        setPrice(foundStock.price);
      } else {
        setPrice(25000);
      }
    }
    setErrorMsg(null);
  }, [symbol, currentHolding, availableStocks]);

  // Cập nhật lại action nếu defaultAction đổi
  useEffect(() => {
    setAction(defaultAction);
    if (defaultSymbol) setSymbol(defaultSymbol);
  }, [defaultAction, defaultSymbol]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' đ';
  };

  const totalValue = quantity * price;
  const estimatedFee = Math.round(totalValue * 0.001); // Phí 0.1%
  const totalCostBuy = totalValue + estimatedFee;

  // Tính số lượng tối đa
  const maxBuyQuantity = useMemo(() => {
    if (price <= 0) return 0;
    const maxQty = Math.floor(cashAvailable / price);
    return Math.floor(maxQty / 100) * 100; // Làm tròn theo lô 100
  }, [cashAvailable, price]);

  const maxSellQuantity = useMemo(() => {
    if (!currentHolding) return 0;
    return currentHolding.shares_unlocked;
  }, [currentHolding]);

  // Tính Lãi/Lỗ thực hiện ước tính khi Bán
  const estimatedPnL = useMemo(() => {
    if (action !== 'SELL' || !currentHolding) return null;
    const costOfShares = quantity * currentHolding.gia_von;
    const revenue = quantity * price;
    return revenue - costOfShares;
  }, [action, currentHolding, quantity, price]);

  // Kiểm tra tính hợp lệ
  const validateForm = (): boolean => {
    setErrorMsg(null);

    if (!symbol) {
      setErrorMsg('Vui lòng chọn hoặc nhập mã cổ phiếu.');
      return false;
    }
    if (quantity <= 0) {
      setErrorMsg('Khối lượng đặt lệnh phải lớn hơn 0.');
      return false;
    }
    if (quantity % 100 !== 0) {
      setErrorMsg('Quy định sàn HOSE/HNX: Khối lượng giao dịch bắt buộc là bội số của lô 100 cổ phiếu (ví dụ: 100, 200, 500...).');
      return false;
    }
    if (price <= 0) {
      setErrorMsg('Mức giá khớp lệnh phải lớn hơn 0.');
      return false;
    }

    if (action === 'BUY') {
      if (totalCostBuy > cashAvailable) {
        setErrorMsg(`Số dư tiền mặt khả dụng không đủ. Cần ${formatVND(totalCostBuy)} nhưng tài khoản chỉ còn ${formatVND(cashAvailable)}.`);
        return false;
      }
    } else {
      // SELL
      if (!currentHolding) {
        setErrorMsg(`Bạn hiện không nắm giữ mã ${symbol} trong danh mục để thực hiện lệnh bán.`);
        return false;
      }
      if (quantity > currentHolding.shares_unlocked) {
        const pendingT = currentHolding.shares_t1 + currentHolding.shares_t2;
        setErrorMsg(`Số lượng bán vượt quá số cổ phiếu khả dụng. Bạn chỉ có ${currentHolding.shares_unlocked} cp khả dụng${pendingT > 0 ? ` (${pendingT} cp đang chờ chu kỳ T+ chưa về)` : ''}.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: OrderSubmitPayload = {
        symbol: symbol.toUpperCase().trim(),
        action,
        quantity,
        price,
        notes: notes.trim() || undefined,
        realizedPnl: estimatedPnL !== null ? estimatedPnL : undefined,
      };

      const ok = await onSubmitOrder(payload);
      if (ok) {
        setSuccessMsg(`Lệnh ${action === 'BUY' ? 'MUA' : 'BÁN'} ${quantity} cp ${symbol} đã được ghi nhận thành công!`);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi gửi lệnh. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Ghi Nhận Lệnh Giao Dịch</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Lô 100 VSD
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật tức thời số dư tiền mặt, danh mục và chu kỳ quay vòng T+.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Chuyển Đổi Mua / Bán */}
        <div className="grid grid-cols-2 gap-2 my-5 p-1.5 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setAction('BUY');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              action === 'BUY'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>LỆNH MUA (BUY)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAction('SELL');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              action === 'SELL'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>LỆNH BÁN (SELL)</span>
          </button>
        </div>

        {/* Form Nhập Lệnh */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Mã Cổ Phiếu */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Mã Cổ Phiếu</label>
              {currentHolding && (
                <span className="text-[11px] font-medium text-slate-500">
                  Đang nắm giữ: <strong className="text-slate-900">{currentHolding.so_co_phieu} CP</strong> (Khả dụng: <strong className="text-emerald-600">{currentHolding.shares_unlocked}</strong>)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="VD: HPG, VND, FPT..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 uppercase"
                required
              />
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-blue-500"
              >
                {allStockOptions.map((stk) => (
                  <option key={stk} value={stk}>
                    {stk}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Khối Lượng */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Khối Lượng (Bội số lô 100)</label>
              <div className="text-[11px] font-semibold text-slate-500">
                {action === 'BUY' ? (
                  <span>Sức mua tối đa: <strong className="text-blue-600 font-mono">{maxBuyQuantity} CP</strong></span>
                ) : (
                  <span>Khả dụng tối đa: <strong className="text-rose-600 font-mono">{maxSellQuantity} CP</strong></span>
                )}
              </div>
            </div>
            <input
              type="number"
              step={100}
              min={100}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              required
            />
            {/* Quick Quantity Buttons */}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 100)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
              >
                +100
              </button>
              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 500)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
              >
                +500
              </button>
              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 1000)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
              >
                +1,000
              </button>
              <button
                type="button"
                onClick={() => setQuantity(action === 'BUY' ? Math.max(100, maxBuyQuantity) : maxSellQuantity)}
                className="ml-auto px-3 py-1 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer transition-colors"
              >
                Tối Đa
              </button>
            </div>
          </div>

          {/* Mức Giá Khớp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Giá Khớp Lệnh (VNĐ / Cổ phiếu)</label>
              <span className="text-[11px] font-mono text-slate-500">
                Bước giá: 50 đ (HOSE)
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                step={50}
                min={100}
                value={price}
                onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => {
                  if (currentHolding) setPrice(currentHolding.gia_hien_tai);
                }}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap cursor-pointer transition-colors"
              >
                Giá thị trường
              </button>
            </div>
          </div>

          {/* Ghi Chú Tùy Chọn */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi Chú Giao Dịch (Tùy chọn)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Mua theo khuyến nghị HMM, Chốt lời sóng ngắn..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Bảng Ước Tính & Tác Động Tài Sản */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>Tổng giá trị khớp:</span>
              <span className="font-mono font-bold text-slate-900">{formatVND(totalValue)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Phí & Thuế ước tính (0.1%):</span>
              <span className="font-mono text-slate-700">{formatVND(estimatedFee)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/80">
              <span className="font-bold text-slate-700">
                {action === 'BUY' ? 'Tiền mặt còn lại sau mua:' : 'Tiền mặt sau khi nhận bán:'}
              </span>
              <span className="font-mono font-extrabold text-blue-600">
                {formatVND(action === 'BUY' ? Math.max(0, cashAvailable - totalCostBuy) : cashAvailable + totalValue)}
              </span>
            </div>

            {/* Cảnh báo chu kỳ T+ hoặc Lãi/Lỗ */}
            {action === 'BUY' ? (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-2">
                <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>Cổ phiếu mua mới sẽ vào trạng thái chờ về <strong>T+2</strong> (dự kiến giao dịch bán vào 11:30 ngày kia).</span>
              </div>
            ) : (
              estimatedPnL !== null && (
                <div className={`flex items-center gap-1.5 text-[11px] p-2 rounded-xl border mt-2 ${
                  estimatedPnL >= 0 
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                    : 'text-rose-700 bg-rose-50 border-rose-200'
                }`}>
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Lãi/lỗ thực tế ước tính: <strong>{estimatedPnL >= 0 ? '+' : ''}{formatVND(estimatedPnL)}</strong> (Giá vốn: {formatVND(currentHolding?.gia_von || 0)}).
                  </span>
                </div>
              )
            )}
          </div>

          {/* Error & Success Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-1/3 py-3 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-2/3 py-3 rounded-xl font-bold text-xs text-white transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                action === 'BUY'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <span>Đang xử lý khớp lệnh...</span>
              ) : (
                <>
                  <span>{action === 'BUY' ? 'XÁC NHẬN MUA CỔ PHIẾU' : 'XÁC NHẬN BÁN CỔ PHIẾU'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderEntryModal;
