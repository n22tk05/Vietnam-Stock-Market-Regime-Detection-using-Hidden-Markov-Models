import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { stockService } from '@/services/stock-service';
import type { HistoryRange, StockHistoryView, StockView } from '@/types/api';
import { formatPercent, formatVND } from '@/utils/formatters';
import { StockPriceChart } from '@/components/charts/StockPriceChart';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ArrowLeft } from 'lucide-react';

export const StockDetailPage: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [stock, setStock] = useState<StockView | null>(null);
  const [history, setHistory] = useState<StockHistoryView | null>(null);
  const [activeRange, setActiveRange] = useState<HistoryRange>('1y');

  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadStockDetail = async () => {
    if (!symbol) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setNotFound(false);

      const sData = await stockService.getStock(symbol);
      setStock(sData);

      const hData = await stockService.getStockHistory(symbol, activeRange);
      setHistory(hData);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 404) {
        setNotFound(true);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage(`Không thể tải thông tin mã cổ phiếu ${symbol}.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRangeChange = async (rangeStr: string) => {
    const range = rangeStr as HistoryRange;
    setActiveRange(range);
    if (!symbol) return;
    try {
      setIsHistoryLoading(true);
      const hData = await stockService.getStockHistory(symbol, range);
      setHistory(hData);
    } catch (err) {
      console.error('Failed to change stock history range:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadStockDetail();
  }, [symbol]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="card" count={3} />
        <LoadingSkeleton type="chart" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link
          to="/app/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Dashboard</span>
        </Link>
        <EmptyState
          title={`Không tìm thấy cổ phiếu ${symbol}`}
          description="Mã cổ phiếu này không tồn tại hoặc đã ngừng giao dịch trên hệ thống."
        />
      </div>
    );
  }

  if (errorMessage || !stock) {
    return <ErrorState title="Lỗi thông tin cổ phiếu" message={errorMessage || 'Không tìm thấy dữ liệu'} onRetry={loadStockDetail} />;
  }

  const features = stock.latestFeatures;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <Link
        to="/app/dashboard"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Dashboard</span>
      </Link>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-black shrink-0 shadow-lg shadow-blue-500/20">
            {stock.symbol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900">{stock.symbol}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 uppercase">
                {stock.exchange}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-600">{stock.companyName}</p>
            <p className="text-xs text-slate-400 font-medium">
              Nghành: {stock.sector || 'Chưa phân loại'} • {stock.industry || ''}
            </p>
          </div>
        </div>

        <div className="text-left md:text-right">
          <div className="text-xs text-slate-400 font-semibold uppercase">Giá tham chiếu gần nhất</div>
          <div className="text-3xl font-black text-slate-900">
            {formatVND(features?.referencePrice || 0)}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900">Biểu đồ Lịch sử Biến động Giá</h3>
        {isHistoryLoading ? (
          <LoadingSkeleton type="chart" />
        ) : (
          <StockPriceChart
            ticker={stock.symbol}
            history={
              history?.prices?.map((p) => ({
                date: p.tradeDate ? p.tradeDate.split('T')[0] : '',
                price: Number(p.closePrice) || 0,
              })) || []
            }
            predictedPrice={features?.referencePrice ? Math.round(Number(features.referencePrice) * 1.05) : 0}
            stopLoss={features?.referencePrice ? Math.round(Number(features.referencePrice) * 0.95) : 0}
          />
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900">Chỉ số Kỹ thuật & Định lượng AI</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs text-slate-400 font-bold uppercase">Lợi nhuận 5 ngày</div>
            <div className="text-lg font-black text-slate-900">
              {features?.return5d ? formatPercent(features.return5d) : 'N/A'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs text-slate-400 font-bold uppercase">Lợi nhuận 20 ngày</div>
            <div className="text-lg font-black text-slate-900">
              {features?.return20d ? formatPercent(features.return20d) : 'N/A'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs text-slate-400 font-bold uppercase">Biến động 20 ngày</div>
            <div className="text-lg font-black text-slate-900">
              {features?.volatility20d ? formatPercent(features.volatility20d) : 'N/A'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs text-slate-400 font-bold uppercase">Chỉ số Sharpe Ratio</div>
            <div className="text-lg font-black text-emerald-600">
              {features?.sharpeRatio ? parseFloat(features.sharpeRatio.toString()).toFixed(2) : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
