import { apiRequest } from './api-client';
import type {
  UserPreferenceRead,
  UserPreferenceUpdatePayload,
  UserRead,
  UserUpdatePayload,
} from '@/types/api';

export const userService = {
  async getMe(): Promise<UserRead> {
    return apiRequest<UserRead>('/users/me');
  },

  async updateMe(payload: UserUpdatePayload): Promise<UserRead> {
    return apiRequest<UserRead>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getPreferences(): Promise<UserPreferenceRead> {
    return apiRequest<UserPreferenceRead>('/users/me/preferences');
  },

  async updatePreferences(payload: UserPreferenceUpdatePayload): Promise<UserPreferenceRead> {
    return apiRequest<UserPreferenceRead>('/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
