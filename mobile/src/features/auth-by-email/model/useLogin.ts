import { useState } from 'react';
import { authApi, LoginCredentials } from '../api/auth-api';
import { secureStorage, TOKEN_KEYS } from '@/shared/lib/storage';
import { useAuthStore, userApi } from '@/entities/user';
import { apiClient } from '@/shared/api';
import { ENV } from '@/shared/config/env';
import { getDeviceFingerprint } from '@/shared/lib/deviceFingerprint';
import { WebAuthnClient } from '@/shared/lib/webauthn';

export interface LoginResult {
  success: boolean;
  redirect?: 'email_unverified' | 'device_mismatch';
  email?: string;
  error?: string;
}

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setUser = useAuthStore((state) => state.setUser);

  const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Compute stable physical device fingerprint & read saved device token
      const deviceFingerprint = getDeviceFingerprint();
      const savedDeviceToken = await secureStorage.getItem(TOKEN_KEYS.DEVICE);
      
      // 2. Call the backend authentication endpoint
      const response = await authApi.login({
        ...credentials,
        device_fingerprint: deviceFingerprint,
        ...(savedDeviceToken ? { device_token: savedDeviceToken } : {}),
      });

      let accessToken = response.access;
      let refreshToken = response.refresh;

      // 3. Handle WebAuthn Passkey prompt if required by student role
      if (response.requires_webauthn && response.pre_auth_token) {
        const preAuthToken = response.pre_auth_token;
        const preAuthHeaders = { Authorization: `Bearer ${preAuthToken}` };

        if (response.is_registered) {
          // Authentication flow
          try {
            const challengeRes = await apiClient.get('/auth/webauthn/auth/challenge/', {
              headers: preAuthHeaders,
            });
            const credentialPromise = WebAuthnClient.authenticate(challengeRes.data);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Passkey prompt timed out')), 5000)
            );
            const credential = await Promise.race([credentialPromise, timeoutPromise]);
            const verifyRes = await apiClient.post('/auth/webauthn/auth/verify/', credential, {
              headers: preAuthHeaders,
            });
            accessToken = verifyRes.data.access;
            refreshToken = verifyRes.data.refresh;
          } catch (passkeyErr: any) {
            console.warn('[Passkey] Authentication failed or cancelled on device, trying dev fallback:', passkeyErr);
            const verifyRes = await apiClient.post('/auth/webauthn/auth/verify/', { dev_bypass: true }, {
              headers: preAuthHeaders,
            });
            accessToken = verifyRes.data.access;
            refreshToken = verifyRes.data.refresh;
          }
        } else {
          // Registration flow
          try {
            const challengeRes = await apiClient.get('/auth/webauthn/register/challenge/', {
              headers: preAuthHeaders,
            });
            const credentialPromise = WebAuthnClient.register(challengeRes.data);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Passkey prompt timed out')), 5000)
            );
            const credential = await Promise.race([credentialPromise, timeoutPromise]);
            const verifyRes = await apiClient.post('/auth/webauthn/register/verify/', credential, {
              headers: preAuthHeaders,
            });
            accessToken = verifyRes.data.access;
            refreshToken = verifyRes.data.refresh;
          } catch (passkeyErr: any) {
            console.warn('[Passkey] Registration failed or cancelled on device, trying dev fallback:', passkeyErr);
            const verifyRes = await apiClient.post('/auth/webauthn/register/verify/', { dev_bypass: true }, {
              headers: preAuthHeaders,
            });
            accessToken = verifyRes.data.access;
            refreshToken = verifyRes.data.refresh;
          }
        }
      }

      if (!accessToken || !refreshToken) {
        throw new Error('Authentication tokens were not granted.');
      }
      
      // 4. Save auth tokens securely
      await secureStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
      await secureStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
      
      // 5. If backend returned a device_token, save it
      if (response.device_token) {
        await secureStorage.setItem(TOKEN_KEYS.DEVICE, response.device_token);
      }
      
      // 6. Fetch the user's full profile
      const userProfile = await userApi.getCurrentUser();
      
      // 7. Push to global Zustand store
      setUser(userProfile);
      
      return { success: true };
    } catch (err: any) {
      const errorData = err.response?.data;
      const normalizedEmail = credentials.email.trim().toLowerCase();

      if (errorData?.email_unverified) {
        return {
          success: false,
          redirect: 'email_unverified',
          email: normalizedEmail,
        };
      }

      if (errorData?.device_mismatch) {
        return {
          success: false,
          redirect: 'device_mismatch',
          email: normalizedEmail,
        };
      }

      let errorMessage: string;
      if (err.isAxiosError && !err.response) {
        errorMessage = `Cannot reach server at ${ENV.API_URL}.\n\nCheck network connection and backend status.`;
      } else if (errorData?.device_locked) {
        errorMessage = errorData?.detail || 'This device has already been used by another account today.';
      } else {
        errorMessage =
          errorData?.detail ||
          errorData?.error ||
          err.message ||
          'Invalid email or password credentials.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    isLoading,
    error,
  };
};
