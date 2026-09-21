import { apiClient } from '@/shared/api';
import { User } from '../model/types';

export const userApi = {
  /**
   * Fetches the current logged-in user's profile.
   * Relies on the apiClient having a valid Bearer token attached.
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me/');
    return response.data;
  }
};
