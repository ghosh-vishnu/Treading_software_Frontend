import axios from "axios";
import type { AxiosRequestConfig } from "axios";

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth";

const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

// Don't throw at module import time (Next build/prerender evaluates modules).
// We still want a clear failure when the client actually performs requests.
const API_BASE_URL = rawApiBaseUrl ? rawApiBaseUrl.replace(/\/+$/, "") : "";

export const api = axios.create({
  // Provide a harmless default to keep builds working when env isn't injected yet.
  // Real deployments must set NEXT_PUBLIC_API_BASE_URL.
  baseURL: API_BASE_URL || "http://localhost:8000/api/v1",
  timeout: 10000,
});

api.defaults.withCredentials = false;

type HeadersWithOptionalSet = Record<string, string> & { set?: (key: string, value: string) => void };
type RetriableAxiosRequestConfig = AxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use((config) => {
  if (!rawApiBaseUrl && typeof window !== "undefined") {
    throw new Error("Missing required env: NEXT_PUBLIC_API_BASE_URL");
  }
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    const headers = config.headers as unknown as HeadersWithOptionalSet;
    if (typeof headers.set === "function") headers.set("Authorization", `Bearer ${token}`);
    else headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetriableAxiosRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

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
        const headers = originalRequest.headers as unknown as HeadersWithOptionalSet;
        if (typeof headers.set === "function") headers.set("Authorization", `Bearer ${refreshResponse.data.access_token}`);
        else headers.Authorization = `Bearer ${refreshResponse.data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();

        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.replace("/login");
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
