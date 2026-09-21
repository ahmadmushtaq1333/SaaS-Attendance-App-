import { useState } from 'react';
import { authApi, LoginCredentials } from '../api/auth-api';
import { secureStorage, TOKEN_KEYS } from '@/shared/lib/storage';
import { useAuthStore, userApi } from '@/entities/user';
import { ENV } from '@/shared/config/env';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setUser = useAuthStore((state) => state.setUser);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Read any previously saved device_token from the vault
      //    so the backend's device binding check passes on repeat logins
      const savedDeviceToken = await secureStorage.getItem(TOKEN_KEYS.DEVICE);
      
      // 2. Call the backend, attaching device_token in body if we have one
      const response = await authApi.login({
        ...credentials,
        ...(savedDeviceToken ? { device_token: savedDeviceToken } : {}),
      });
      
      // 3. Save auth tokens securely
      await secureStorage.setItem(TOKEN_KEYS.ACCESS, response.access);
      await secureStorage.setItem(TOKEN_KEYS.REFRESH, response.refresh);
      
      // 4. If backend returned a device_token (first-time student binding), save it
      //    On subsequent logins, the same token is echoed back — we just overwrite.
      if (response.device_token) {
        await secureStorage.setItem(TOKEN_KEYS.DEVICE, response.device_token);
      }
      
      // 5. Fetch the user's full profile using the new access token
      const userProfile = await userApi.getCurrentUser();
      
      // 6. Push to global Zustand store — navigation reacts automatically
      setUser(userProfile);
      
      return true;
    } catch (err: any) {
      // Distinguish between network errors (no response) and server errors
      let errorMessage: string;
      if (!err.response) {
        errorMessage = `Cannot reach server at ${ENV.API_URL}.\n\nMake sure:\n1. Backend is running\n2. Both devices are on the same Wi-Fi\n3. Windows Firewall allows port 8000`;
      } else if (err.response?.data?.device_mismatch) {
        // Device binding mismatch — explicit, user-friendly message
        errorMessage = 'This account is linked to a different device. Please use your original device or contact your administrator to reset the binding.';
      } else {
        errorMessage =
          err.response?.data?.detail ||
          err.response?.data?.error ||
          `Server error (${err.response?.status})`;
      }
      setError(errorMessage);
      return false;
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
