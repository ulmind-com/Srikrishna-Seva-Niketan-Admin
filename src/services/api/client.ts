import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import type { ApiEnvelope } from "@/types/api";
import { tokenStore } from "./tokens";

/**
 * Central Axios client with:
 *  - automatic Bearer token attachment
 *  - transparent refresh-token rotation on 401 (single-flight)
 *  - unwrapping of the backend `{ success, data, ... }` envelope
 *  - a global error normaliser
 */

const rawClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// ---- Request: attach access token ----
rawClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Response: transparent refresh on 401 ----
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

/** Called when refresh fails — forces a logout + redirect to /login. */
let onAuthFailure: () => void = () => {
  tokenStore.clear();
  if (!window.location.pathname.startsWith("/login")) {
    window.location.assign("/login");
  }
};

export function registerAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
}

rawClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const status = error.response?.status;
    const isAuthEndpoint = original?.url?.includes("/auth/");

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      const refresh = tokenStore.getRefresh();
      if (!refresh) {
        onAuthFailure();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait for the in-flight refresh, then replay this request.
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (!token) return reject(error);
            original.headers.Authorization = `Bearer ${token}`;
            original._retry = true;
            resolve(rawClient(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post<
          ApiEnvelope<{ access_token: string; refresh_token: string }>
        >(`${env.API_BASE_URL}/auth/refresh`, { refresh_token: refresh });
        const access = data.data.access_token;
        const newRefresh = data.data.refresh_token;
        tokenStore.set(access, newRefresh);
        flushQueue(access);
        original.headers.Authorization = `Bearer ${access}`;
        return rawClient(original);
      } catch (refreshErr) {
        flushQueue(null);
        onAuthFailure();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/** Normalised error thrown to callers / react-query. */
export interface NormalizedError {
  status: number;
  message: string;
  fields?: Record<string, string>;
  raw: unknown;
}

export function normalizeError(error: unknown): NormalizedError {
  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as ApiEnvelope | undefined;
    const fields: Record<string, string> = {};
    if (envelope && Array.isArray(envelope.errors)) {
      for (const e of envelope.errors) {
        if (e.field) fields[e.field] = e.message;
      }
    }
    return {
      status: error.response?.status ?? 0,
      message:
        envelope?.message ||
        error.message ||
        "Something went wrong. Please try again.",
      fields: Object.keys(fields).length ? fields : undefined,
      raw: error,
    };
  }
  return {
    status: 0,
    message: error instanceof Error ? error.message : "Unexpected error",
    raw: error,
  };
}

/** Perform a request and unwrap the `data` field of the envelope. */
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await rawClient.request<ApiEnvelope<T>>(config);
  return response.data.data;
}

/** Perform a request and return the full envelope (message, etc.). */
export async function apiRequestEnvelope<T>(
  config: AxiosRequestConfig
): Promise<ApiEnvelope<T>> {
  const response = await rawClient.request<ApiEnvelope<T>>(config);
  return response.data;
}

export { rawClient };
