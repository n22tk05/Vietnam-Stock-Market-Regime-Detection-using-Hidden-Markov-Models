import { apiRequest, clearTokens, getStoredRefreshToken, storeTokens } from './api-client';
import type {
  AuthSessionRead,
  MessageRead,
  UserRead,
} from '@/types/api';

export const authService = {
  async register(
    payload: { email: string; password: string; fullName: string },
    rememberMe: boolean = true
  ): Promise<AuthSessionRead> {
    const res = await apiRequest<AuthSessionRead>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    storeTokens(res.tokens, rememberMe);
    return res;
  },

  async login(
    payload: { email: string; password: string },
    rememberMe: boolean = true
  ): Promise<AuthSessionRead> {
    const res = await apiRequest<AuthSessionRead>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    storeTokens(res.tokens, rememberMe);
    return res;
  },

  async logout(): Promise<MessageRead> {
    const refreshToken = getStoredRefreshToken();
    try {
      if (refreshToken) {
        await apiRequest<MessageRead>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      clearTokens();
    }
    return { message: 'Logged out successfully' };
  },

  async getMe(): Promise<UserRead> {
    return apiRequest<UserRead>('/auth/me');
  },

  async forgotPassword(email: string): Promise<MessageRead> {
    return apiRequest<MessageRead>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(payload: { token: string; newPassword: string }): Promise<MessageRead> {
    return apiRequest<MessageRead>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<MessageRead> {
    return apiRequest<MessageRead>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
