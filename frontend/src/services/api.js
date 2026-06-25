import axios from "axios";

const API = axios.create({
  baseURL: "/api",
});

// Attach JWT access token to requests automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Auto refresh JWT token on 401 error
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post("/api/auth/refresh/", { refresh: refreshToken });
          localStorage.setItem("access_token", res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return API(originalRequest);
        } catch (refreshError) {
          // Token expired or invalid, sign out
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
