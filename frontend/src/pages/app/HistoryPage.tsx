import React, { useEffect, useState } from 'react';
import { historyService } from '@/services/history-service';
import { marketService } from '@/services/market-service';
import type { HistoryItemResponse, MarketRegimeView } from '@/types/api';
import { formatDate, formatVND, getRecommendationStatusMeta, getRecommendationTypeLabel } from '@/utils/formatters';
import { MarketRegimeBadge } from '@/components/common/MarketRegimeBadge';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { History as HistoryIcon, Clock } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItemResponse[]>([]);
  const [currentRegime, setCurrentRegime] = useState<MarketRegimeView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const [res, regime] = await Promise.all([
        historyService.list(1, 50),
        marketService.getCurrentRegime().catch(() => null),
      ]);
      setHistoryItems(res.items || []);
      setCurrentRegime(regime);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage('Không thể tải lịch sử hoạt động.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="table" count={5} />
      </div>
    );
  }

  if (errorMessage) {
    return <ErrorState title="Lỗi lịch sử" message={errorMessage} onRetry={loadHistory} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Lịch Sử Hoạt Động &amp; Khuyến Nghị</h1>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Nhật ký các quyết định tư vấn, tái cân bằng và cập nhật tín hiệu thị trường — minh bạch theo từng thời điểm.
          </p>
        </div>
        {currentRegime && <MarketRegimeBadge code={currentRegime.code} />}
      </div>

      {historyItems.length === 0 ? (
        <EmptyState title="Chưa có lịch sử" description="Chưa tìm thấy nhật ký hoạt động nào." />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <HistoryIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-extrabold text-slate-900">Nhật ký Hoạt động Chi tiết</h3>
          </div>

          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 py-2">
            {historyItems.map((item) => {
              const statusMeta = getRecommendationStatusMeta(item.status);

              return (
                <div key={item.id} className="relative pl-6 space-y-2 group">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-xs group-hover:scale-125 transition-transform" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {getRecommendationTypeLabel(item.recommendationType)}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.bg}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {formatDate(item.generatedAt)}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                    <div className="flex items-center gap-4">
                      <span>Chế độ thị trường: <MarketRegimeBadge code={item.regime} size="sm" /></span>
                      <span>Vốn: <strong>{formatVND(item.capital)}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
