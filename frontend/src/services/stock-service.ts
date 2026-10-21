import { apiRequest } from './api-client';
import type { HistoryInterval, HistoryRange, StockHistoryView, StockView } from '@/types/api';

export const stockService = {
  async listStocks(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    exchange?: string,
    sector?: string
  ): Promise<StockView[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (search) params.append('search', search);
    if (exchange) params.append('exchange', exchange);
    if (sector) params.append('sector', sector);

    return apiRequest<StockView[]>(`/stocks?${params.toString()}`);
  },

  async getStock(symbol: string): Promise<StockView> {
    return apiRequest<StockView>(`/stocks/${encodeURIComponent(symbol)}`);
  },

  async getStockHistory(
    symbol: string,
    range: HistoryRange = '1y',
    interval: HistoryInterval = '1d',
    startDate?: string,
    endDate?: string
  ): Promise<StockHistoryView> {
    const params = new URLSearchParams({ range, interval });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    return apiRequest<StockHistoryView>(`/stocks/${encodeURIComponent(symbol)}/history?${params.toString()}`);
  },
};
