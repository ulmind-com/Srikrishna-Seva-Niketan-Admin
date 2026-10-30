import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import type { ApiEnvelope } from "@/types/api";
import { getCsrfToken } from "./tokens";
import { endpoints } from "./endpoints";

/**
 * A dedicated Axios client for the self-service staff portal.
 *
 * It mirrors the admin client (bearer attach, single-flight refresh, envelope
 * unwrapping) but keeps its **own** access token. Staff tokens carry a
 * `scope: "staff"` claim and resolve to an Employee, not a User — mixing them
 * with the admin client's tokens would sign one session out of the other. The
 * staff refresh token lives only in its own Secure/HttpOnly cookie (scoped to
 * `/api/v1/staff-portal`); the access token stays in memory.
 */

/** In-memory access token for the staff session. */
let staffAccess: string | null = null;

// Persistent keys: used to maintain persistent staff session across page
// reloads on mobile and desktop without frequent logouts.
const STAFF_ACCESS_KEY = "ssn_staff_access";
const STAFF_REFRESH_KEY = "ssn_staff_refresh";
const STAFF_PROFILE_KEY = "ssn_staff_profile";

export function getStoredStaffAccess(): string | null {
  try {
    return localStorage.getItem(STAFF_ACCESS_KEY);
  } catch {
    return null;
  }
}

export function setStoredStaffAccess(token: string | null): void {
  try {
    if (token) localStorage.setItem(STAFF_ACCESS_KEY, token);
    else localStorage.removeItem(STAFF_ACCESS_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function getStoredStaffRefresh(): string | null {
  try {
    return localStorage.getItem(STAFF_REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setStoredStaffRefresh(token: string | null): void {
  try {
    if (token) localStorage.setItem(STAFF_REFRESH_KEY, token);
    else localStorage.removeItem(STAFF_REFRESH_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function getStoredStaffProfile<T = any>(): T | null {
  try {
    const raw = localStorage.getItem(STAFF_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredStaffProfile(profile: any): void {
  try {
    if (profile) localStorage.setItem(STAFF_PROFILE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(STAFF_PROFILE_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export const staffTokenStore = {
  getAccess: (): string | null => staffAccess || getStoredStaffAccess(),
  setAccess(access: string): void {
    staffAccess = access;
    setStoredStaffAccess(access);
  },
  clear(): void {
    staffAccess = null;
    setStoredStaffAccess(null);
    setStoredStaffRefresh(null);
    setStoredStaffProfile(null);
  },
};

const rawStaffClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

rawStaffClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = staffTokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const csrf = getCsrfToken();
  if (csrf) config.headers["X-CSRF-Token"] = csrf;
  return config;
});

/**
 * Exchange the staff HttpOnly refresh cookie for a new access token. Shared by
 * the 401 interceptor and app-boot restore; uses a bare axios call so it cannot
 * recurse through the interceptor.
 */
export async function refreshStaffAccessToken(): Promise<string> {
  const stored = getStoredStaffRefresh();
  const { data } = await axios.post<
    ApiEnvelope<{ access_token: string; refresh_token?: string }>
  >(`${env.API_BASE_URL}${endpoints.staffPortal.refresh}`, null, {
    withCredentials: true,
    headers: {
      "X-CSRF-Token": getCsrfToken() ?? "",
      ...(stored ? { "X-Refresh-Token": stored } : {}),
    },
  });
  const access = data.data.access_token;
  if (data.data.refresh_token) setStoredStaffRefresh(data.data.refresh_token);
  staffTokenStore.setAccess(access);
  return access;
}

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

/** Called when refresh fails — clears the staff session and returns to login. */
let onStaffAuthFailure: () => void = () => {
  staffTokenStore.clear();
  if (!window.location.pathname.startsWith("/staff/login")) {
    window.location.assign("/staff/login");
  }
};

export function registerStaffAuthFailureHandler(handler: () => void) {
  onStaffAuthFailure = handler;
}

rawStaffClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    // Never try to refresh the auth calls themselves — that would loop.
    const isAuthCall =
      original?.url?.includes(endpoints.staffPortal.login) ||
      original?.url?.includes(endpoints.staffPortal.register) ||
      original?.url?.includes(endpoints.staffPortal.refresh);

    if (status !== 401 || !original || original._retry || isAuthCall) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Queue behind the in-flight refresh instead of firing another one.
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) return reject(error);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(rawStaffClient(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const access = await refreshStaffAccessToken();
      flushQueue(access);
      original.headers.Authorization = `Bearer ${access}`;
      return rawStaffClient(original);
    } catch (refreshError) {
      flushQueue(null);
      onStaffAuthFailure();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

/** Issue a request and unwrap the backend `{ success, data }` envelope. */
export async function staffRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await rawStaffClient.request<ApiEnvelope<T>>(config);
  const body = response.data;
  // Some endpoints (uploads) return the asset directly rather than wrapped.
  if (body && typeof body === "object" && "data" in body) {
    return (body as ApiEnvelope<T>).data;
  }
  return body as unknown as T;
}
