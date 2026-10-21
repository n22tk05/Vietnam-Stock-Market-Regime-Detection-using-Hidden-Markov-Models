import { apiRequest } from './api-client';
import type { HistoryDetailResponse, HistoryListResponse } from '@/types/api';

export const historyService = {
  async list(page: number = 1, pageSize: number = 20): Promise<HistoryListResponse> {
    return apiRequest<HistoryListResponse>(`/history?page=${page}&page_size=${pageSize}`);
  },

  async get(id: string): Promise<HistoryDetailResponse> {
    return apiRequest<HistoryDetailResponse>(`/history/${id}`);
  },
};
