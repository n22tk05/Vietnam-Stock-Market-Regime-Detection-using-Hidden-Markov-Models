import { apiRequest } from './api-client';
import type {
  PortfolioPerformanceResponse,
  PortfolioResponse,
  PortfolioVersionsResponse,
  RecommendationResponse,
} from '@/types/api';

export const portfolioService = {
  async getCurrent(): Promise<PortfolioResponse | null> {
    try {
      return await apiRequest<PortfolioResponse>('/portfolios/current');
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 404) {
        return null;
      }
      throw err;
    }
  },

  async getPerformance(): Promise<PortfolioPerformanceResponse | null> {
    try {
      return await apiRequest<PortfolioPerformanceResponse>('/portfolios/current/performance');
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 404) {
        return null;
      }
      throw err;
    }
  },

  async getVersions(): Promise<PortfolioVersionsResponse> {
    return apiRequest<PortfolioVersionsResponse>('/portfolios/current/versions');
  },

  async recalculate(): Promise<RecommendationResponse> {
    return apiRequest<RecommendationResponse>('/portfolios/current/recalculate', {
      method: 'POST',
    });
  },

  async rebalance(): Promise<RecommendationResponse> {
    return apiRequest<RecommendationResponse>('/portfolios/current/rebalance', {
      method: 'POST',
    });
  },
};
