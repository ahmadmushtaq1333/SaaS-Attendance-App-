import { apiClient } from '@/shared/api';

export interface LoginCredentials {
  email: string;
  password: string;
  device_fingerprint?: string;
  device_token?: string; // Sent by mobile to satisfy device binding check
  client_platform?: string;
}

export interface LoginResponse {
  access?: string;
  refresh?: string;
  device_token?: string; // Returned by backend on first student login (binding creation)
  requires_webauthn?: boolean;
  pre_auth_token?: string;
  is_registered?: boolean;
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login/', {
      ...credentials,
      client_platform: 'mobile',
    });
    return response.data;
  }
};
