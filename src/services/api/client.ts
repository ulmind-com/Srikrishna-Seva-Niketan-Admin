import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import type { ApiEnvelope } from "@/types/api";
import { getCsrfToken, getStoredRefresh, setStoredRefresh, tokenStore } from "./tokens";

/**
 * Central Axios client with:
 *  - automatic in-memory Bearer token attachment
 *  - transparent refresh on 401 via the HttpOnly refresh cookie (single-flight)
 *  - CSRF header attachment for cookie-authenticated auth calls
 *  - unwrapping of the backend `{ success, data, ... }` envelope
 *  - a global error normaliser
 *
 * `withCredentials` is on so the browser sends the cross-site refresh/CSRF
 * cookies on every request to the API.
 */

const rawClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ---- Request: attach access token + CSRF header ----
rawClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // The double-submit CSRF check guards cookie-authed auth calls (refresh,
  // logout). Echo the cookie value in the header; harmless elsewhere.
  const csrf = getCsrfToken();
  if (csrf) config.headers["X-CSRF-Token"] = csrf;
  return config;
});

/**
 * Exchange the HttpOnly refresh cookie for a new access token.
 *
 * Shared by the 401 interceptor and app-boot session restore. Uses a bare axios
 * call (not `rawClient`) so it cannot recurse through the interceptor. Returns
 * the new access token; throws if the refresh session is invalid/expired.
 */
export async function refreshAccessToken(): Promise<string> {
  const stored = getStoredRefresh();
  const { data } = await axios.post<
    ApiEnvelope<{ access_token: string; refresh_token?: string }>
  >(`${env.API_BASE_URL}/auth/refresh`, null, {
    withCredentials: true,
    headers: {
      "X-CSRF-Token": getCsrfToken() ?? "",
      // Cross-site fallback when the refresh cookie is blocked by the browser.
      ...(stored ? { "X-Refresh-Token": stored } : {}),
    },
  });
  const access = data.data.access_token;
  // Rotation: persist the new refresh token for the next reload.
  if (data.data.refresh_token) setStoredRefresh(data.data.refresh_token);
  tokenStore.setAccess(access);
  return access;
}

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
      if (isRefreshing) {
        // Wait for the in-flight refresh, then replay this request. This is
        // what stops concurrent 401s from each firing their own refresh.
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
        // Refresh reads the HttpOnly cookie; no token travels in JS.
        const access = await refreshAccessToken();
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
    const fieldMsg = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v.replace(/^Value error,\s*/i, "")}`)
      .join(" · ");

    return {
      status: error.response?.status ?? 0,
      message:
        (envelope?.message === "Validation failed" && fieldMsg
          ? fieldMsg
          : envelope?.message) ||
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

/**
 * A message worth showing the user.
 *
 * The backend answers a failed validation with a generic `"Validation failed"`
 * and puts the useful part in `errors[].message`. Showing only the envelope
 * message tells the user nothing, so field messages win when present.
 */
export function describeError(error: unknown): string {
  const normalized = normalizeError(error);
  const fieldMessages = Object.values(normalized.fields ?? {}).map((message) =>
    // Pydantic prefixes custom validator failures with "Value error, ".
    message.replace(/^Value error,\s*/i, ""),
  );
  if (fieldMessages.length) {
    return fieldMessages.join(" · ");
  }
  return normalized.message;
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
