import { apiRequest } from './api-client';
import type { MarketRegimeView } from '@/types/api';

export const marketService = {
  async getCurrentRegime(): Promise<MarketRegimeView> {
    return apiRequest<MarketRegimeView>('/market/regime/current');
  },

  async listRegimes(page: number = 1, pageSize: number = 20): Promise<MarketRegimeView[]> {
    return apiRequest<MarketRegimeView[]>(`/market/regimes?page=${page}&page_size=${pageSize}`);
  },
};
