import { apiClient } from '@/shared/api';

export const verificationApi = {
  sendOtp: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post('/auth/send-otp/', {
      email: email.trim().toLowerCase(),
    });
    return res.data;
  },

  verifyEmail: async (email: string, code: string): Promise<{ message: string }> => {
    const res = await apiClient.post('/auth/verify-email/', {
      email: email.trim().toLowerCase(),
      code: code.trim(),
    });
    return res.data;
  },
};
