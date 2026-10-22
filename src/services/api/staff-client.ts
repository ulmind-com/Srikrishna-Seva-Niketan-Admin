import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env, STORAGE_KEYS } from "@/config/env";
import type { ApiEnvelope } from "@/types/api";
import { endpoints } from "./endpoints";

/**
 * A dedicated Axios client for the self-service staff portal.
 *
 * It mirrors the admin client (bearer attach, single-flight refresh, envelope
 * unwrapping) but keeps its **own** token storage. Staff tokens carry a
 * `scope: "staff"` claim and resolve to an Employee, not a User — mixing them
 * with the admin client's tokens would sign one session out of the other.
 */

/** Tokens for the staff session only. */
export const staffTokenStore = {
  getAccess: (): string | null => localStorage.getItem(STORAGE_KEYS.staffAccessToken),
  getRefresh: (): string | null => localStorage.getItem(STORAGE_KEYS.staffRefreshToken),
  set(access: string, refresh: string): void {
    localStorage.setItem(STORAGE_KEYS.staffAccessToken, access);
    localStorage.setItem(STORAGE_KEYS.staffRefreshToken, refresh);
  },
  setAccess(access: string): void {
    localStorage.setItem(STORAGE_KEYS.staffAccessToken, access);
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEYS.staffAccessToken);
    localStorage.removeItem(STORAGE_KEYS.staffRefreshToken);
  },
};

const rawStaffClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

rawStaffClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = staffTokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

    const refreshToken = staffTokenStore.getRefresh();
    if (!refreshToken) {
      onStaffAuthFailure();
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
      const { data } = await axios.post<ApiEnvelope<{ access_token: string; refresh_token: string }>>(
        `${env.API_BASE_URL}${endpoints.staffPortal.refresh}`,
        { refresh_token: refreshToken },
        { headers: { "Content-Type": "application/json" } },
      );
      const tokens = data.data;
      staffTokenStore.set(tokens.access_token, tokens.refresh_token);
      flushQueue(tokens.access_token);
      original.headers.Authorization = `Bearer ${tokens.access_token}`;
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
