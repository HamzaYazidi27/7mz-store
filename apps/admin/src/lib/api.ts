import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiError, AuthTokens } from "@7mz/shared";
import { useAdminAuth } from "@/stores/admin-auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAdminAuth.getState().accessToken;
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refresh(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = useAdminAuth.getState();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<AuthTokens>(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  } catch {
    clear();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried && !original.url?.includes("/auth/")) {
      original._retried = true;
      refreshing ??= refresh().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export function apiError(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const d = error.response?.data;
    if (d?.details?._errors?.length) return d.details._errors[0]!;
    if (typeof d?.message === "string") return d.message;
  }
  return fallback;
}
