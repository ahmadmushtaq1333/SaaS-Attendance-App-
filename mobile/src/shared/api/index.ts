import axios from 'axios';
import { ENV } from '../config/env';
import { secureStorage, TOKEN_KEYS } from '../lib/storage';

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // We do NOT use withCredentials: true on mobile because we are manually handling JWTs in SecureStore
});

// Request Interceptor: Attach the access token to every request
apiClient.interceptors.request.use(
  async (config) => {
    const accessToken = await secureStorage.getItem(TOKEN_KEYS.ACCESS);
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized (Token Expiration)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If it's a 401 and we haven't already tried to retry it
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If a refresh is already happening, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await secureStorage.getItem(TOKEN_KEYS.REFRESH);
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call the backend to get a new access token
        const response = await axios.post(`${ENV.API_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        // The backend also provides a new refresh token (rotated)
        const newRefreshToken = response.data.refresh;

        if (newAccessToken) {
          await secureStorage.setItem(TOKEN_KEYS.ACCESS, newAccessToken);
          // Only update refresh token if the backend provided a rotated one
          if (newRefreshToken) {
            await secureStorage.setItem(TOKEN_KEYS.REFRESH, newRefreshToken);
          }

          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh failed, no access token returned');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // If refresh fails, we must clear tokens (effectively logging the user out)
        await secureStorage.removeItem(TOKEN_KEYS.ACCESS);
        await secureStorage.removeItem(TOKEN_KEYS.REFRESH);
        // Note: Global state (Zustand) logout action should ideally be triggered here,
        // but to maintain layer purity, we'll emit an event or handle it in the store.
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
