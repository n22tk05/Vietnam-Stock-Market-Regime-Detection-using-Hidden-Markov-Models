import { apiRequest } from './api-client';
import type {
  PortfolioResponse,
  RecommendationListResponse,
  RecommendationResponse,
  RecommendationType,
} from '@/types/api';

export const recommendationService = {
  async generate(type: RecommendationType = 'INITIAL'): Promise<RecommendationResponse> {
    return apiRequest<RecommendationResponse>('/recommendations', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  },

  async list(page: number = 1, pageSize: number = 20): Promise<RecommendationListResponse> {
    return apiRequest<RecommendationListResponse>(`/recommendations?page=${page}&page_size=${pageSize}`);
  },

  async get(id: string): Promise<RecommendationResponse> {
    return apiRequest<RecommendationResponse>(`/recommendations/${id}`);
  },

  async confirm(id: string): Promise<PortfolioResponse> {
    return apiRequest<PortfolioResponse>(`/recommendations/${id}/confirm`, {
      method: 'POST',
    });
  },

  async dismiss(id: string): Promise<RecommendationResponse> {
    return apiRequest<RecommendationResponse>(`/recommendations/${id}/dismiss`, {
      method: 'POST',
    });
  },
};
