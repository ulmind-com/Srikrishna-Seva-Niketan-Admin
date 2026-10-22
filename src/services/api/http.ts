import type { ListParams, Paginated } from "@/types/api";
import { apiRequest } from "./client";

/** Thin typed helpers over the central client. */
export const http = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    apiRequest<T>({ method: "GET", url, params }),

  list: <T>(url: string, params?: ListParams) =>
    apiRequest<Paginated<T>>({ method: "GET", url, params }),

  post: <T>(url: string, data?: unknown) =>
    apiRequest<T>({ method: "POST", url, data }),

  put: <T>(url: string, data?: unknown) =>
    apiRequest<T>({ method: "PUT", url, data }),

  patch: <T>(url: string, data?: unknown) =>
    apiRequest<T>({ method: "PATCH", url, data }),

  del: <T>(url: string, params?: Record<string, unknown>) =>
    apiRequest<T>({ method: "DELETE", url, params }),
};
