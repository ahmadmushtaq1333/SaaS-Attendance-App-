import { apiClient } from '@/shared/api';

export const passwordResetApi = {
  requestReset: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post('/auth/request-password-reset/', {
      email: email.trim().toLowerCase(),
    });
    return res.data;
  },

  confirmReset: async (email: string, code: string, newPassword: string): Promise<{ message: string }> => {
    const res = await apiClient.post('/auth/confirm-password-reset/', {
      email: email.trim().toLowerCase(),
      code: code.trim(),
      new_password: newPassword,
    });
    return res.data;
  },
};
