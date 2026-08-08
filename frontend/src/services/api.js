import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  // Always send cookies (HTTPOnly access_token + refresh_token) with every request
  withCredentials: true,
});

// ── No Authorization header needed — the HttpOnly cookie is sent automatically ──
// We keep a minimal request interceptor only for future custom header needs.
API.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

// Auto-refresh on 401 — hits /auth/refresh/ which reads the HTTPOnly refresh cookie
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Refresh itself failed → force logout
      if (originalRequest.url?.includes("/auth/refresh/")) {
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until the in-flight refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => API(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // POST to refresh — cookies are sent automatically, new access cookie is set in response
        await axios.post(
          `${import.meta.env.VITE_API_URL || "/api"}/auth/refresh/`,
          {},
          { withCredentials: true }
        );

        processQueue(null);
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
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
