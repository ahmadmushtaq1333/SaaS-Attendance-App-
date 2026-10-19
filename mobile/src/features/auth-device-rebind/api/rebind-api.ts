import { apiClient } from '@/shared/api';

export const rebindApi = {
  requestRebind: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post('/auth/rebind/request/', {
      email: email.trim().toLowerCase(),
    });
    return res.data;
  },

  confirmRebind: async (email: string, code: string): Promise<{ message: string }> => {
    const res = await apiClient.post('/auth/rebind/confirm/', {
      email: email.trim().toLowerCase(),
      code: code.trim(),
    });
    return res.data;
  },
};
