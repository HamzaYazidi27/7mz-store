import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiError, AuthTokens } from "@7mz/shared";
import { useAuthStore } from "@/stores/auth-store";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * API client — attaches the bearer token on every request and transparently
 * refreshes expired sessions with a single-flight refresh queue, so ten
 * simultaneous 401s produce exactly one refresh call.
 */
export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<AuthTokens>(
      `${BASE_URL}/api/v1/auth/refresh`,
      { refreshToken },
      { timeout: 15_000 },
    );
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  } catch {
    clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes("/auth/")
    ) {
      original._retried = true;
      refreshPromise ??= refreshTokens().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);

/** Extracts a human-readable message from any API error. */
export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const data = error.response?.data;
    if (data?.details?._errors?.length) return data.details._errors[0]!;
    if (typeof data?.message === "string") return data.message;
    if (error.code === "ECONNABORTED") return "Request timed out — try again";
    if (!error.response) return "Network error — check your connection";
  }
  return fallback;
}
