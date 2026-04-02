import axios from "axios";

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth";

const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!rawApiBaseUrl) {
  throw new Error("Missing required env: NEXT_PUBLIC_API_BASE_URL");
}

const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.defaults.withCredentials = false;

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    if (typeof (config.headers as any).set === "function") {
      (config.headers as any).set("Authorization", `Bearer ${token}`);
    } else {
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        setTokens(refreshResponse.data.access_token, refreshResponse.data.refresh_token);
        originalRequest.headers = originalRequest.headers ?? {};
        if (typeof (originalRequest.headers as any).set === "function") {
          (originalRequest.headers as any).set("Authorization", `Bearer ${refreshResponse.data.access_token}`);
        } else {
          (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${refreshResponse.data.access_token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
