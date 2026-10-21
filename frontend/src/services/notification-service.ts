import { apiRequest } from './api-client';
import type {
  NotificationActionResponse,
  NotificationListResponse,
  NotificationResponse,
  NotificationStatus,
} from '@/types/api';

export const notificationService = {
  async list(
    page: number = 1,
    pageSize: number = 20,
    status?: NotificationStatus
  ): Promise<NotificationListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (status) params.append('status', status);

    return apiRequest<NotificationListResponse>(`/notifications?${params.toString()}`);
  },

  async get(id: string): Promise<NotificationResponse> {
    return apiRequest<NotificationResponse>(`/notifications/${id}`);
  },

  async markRead(id: string): Promise<NotificationResponse> {
    return apiRequest<NotificationResponse>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async apply(id: string): Promise<NotificationActionResponse> {
    return apiRequest<NotificationActionResponse>(`/notifications/${id}/apply`, {
      method: 'POST',
    });
  },

  async dismiss(id: string): Promise<NotificationActionResponse> {
    return apiRequest<NotificationActionResponse>(`/notifications/${id}/dismiss`, {
      method: 'POST',
    });
  },
};
