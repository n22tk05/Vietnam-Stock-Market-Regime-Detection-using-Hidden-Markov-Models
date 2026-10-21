import { apiRequest } from './api-client';
import type {
  InvestmentProfileCreatePayload,
  InvestmentProfileRead,
  InvestmentProfileUpdatePayload,
} from '@/types/api';

export const profileService = {
  async getActive(): Promise<InvestmentProfileRead | null> {
    try {
      return await apiRequest<InvestmentProfileRead>('/investment-profile');
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 404) {
        return null;
      }
      throw err;
    }
  },

  async create(payload: InvestmentProfileCreatePayload): Promise<InvestmentProfileRead> {
    return apiRequest<InvestmentProfileRead>('/investment-profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(payload: InvestmentProfileUpdatePayload): Promise<InvestmentProfileRead> {
    return apiRequest<InvestmentProfileRead>('/investment-profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
