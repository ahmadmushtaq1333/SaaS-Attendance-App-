import axios from "axios";

const TOKEN_KEY = "quorum_access_token";
const REFRESH_KEY = "quorum_refresh_token";

let inMemoryToken = null;
let inMemoryRefresh = null;

export const getAccessToken = () => {
  if (inMemoryToken) return inMemoryToken;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getRefreshToken = () => {
  if (inMemoryRefresh) return inMemoryRefresh;
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
};

export const setAuthTokens = ({ access, refresh }) => {
  if (access) {
    inMemoryToken = access;
    try {
      localStorage.setItem(TOKEN_KEY, access);
    } catch {
      // Ignore storage errors in private mode
    }
  }
  if (refresh) {
    inMemoryRefresh = refresh;
    try {
      localStorage.setItem(REFRESH_KEY, refresh);
    } catch {
      // Ignore storage errors
    }
  }
};

export const clearAuthTokens = () => {
  inMemoryToken = null;
  inMemoryRefresh = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Ignore storage errors
  }
};

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  // Always send cookies (HTTPOnly access_token + refresh_token) with every request
  withCredentials: true,
});

// Dual-auth: Attach Authorization header if access token exists (vital for iOS Safari ITP cross-site)
API.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Auto-refresh on 401 — sends refresh token via both cookie & body for iOS compatibility
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Refresh itself failed → force logout
      if (originalRequest.url?.includes("/auth/refresh/")) {
        clearAuthTokens();
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until the in-flight refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh = getRefreshToken();
        // POST to refresh — cookies are sent automatically, and refresh body is sent for iOS Safari
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || "/api"}/auth/refresh/`,
          refresh ? { refresh } : {},
          { withCredentials: true }
        );

        const newAccess = res.data?.access;
        const newRefresh = res.data?.refresh || refresh;
        if (newAccess) {
          setAuthTokens({ access: newAccess, refresh: newRefresh });
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }

        processQueue(null, newAccess);
        return API(originalRequest);
      } catch (refreshError) {
        clearAuthTokens();
        processQueue(refreshError, null);
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default API;
