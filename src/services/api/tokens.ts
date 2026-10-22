import { STORAGE_KEYS } from "@/config/env";

/** Small wrapper around localStorage for auth tokens. */
export const tokenStore = {
  getAccess(): string | null {
    return localStorage.getItem(STORAGE_KEYS.accessToken);
  },
  getRefresh(): string | null {
    return localStorage.getItem(STORAGE_KEYS.refreshToken);
  },
  set(access: string, refresh: string): void {
    localStorage.setItem(STORAGE_KEYS.accessToken, access);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
  },
  setAccess(access: string): void {
    localStorage.setItem(STORAGE_KEYS.accessToken, access);
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
  },
};
