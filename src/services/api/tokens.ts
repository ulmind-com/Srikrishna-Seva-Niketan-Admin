import { STORAGE_KEYS } from "@/config/env";

/** In-memory access token cache for the active admin session. */
let accessToken: string | null = null;

const ACCESS_KEY = "ssn_admin_access";
const REFRESH_KEY = "ssn_admin_refresh";

export function getStoredAccess(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function setStoredAccess(token: string | null): void {
  try {
    if (token) localStorage.setItem(ACCESS_KEY, token);
    else localStorage.removeItem(ACCESS_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function getStoredRefresh(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setStoredRefresh(token: string | null): void {
  try {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export const tokenStore = {
  getAccess(): string | null {
    return accessToken || getStoredAccess();
  },
  setAccess(access: string): void {
    accessToken = access;
    setStoredAccess(access);
  },
  clear(): void {
    accessToken = null;
    setStoredAccess(null);
    setStoredRefresh(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.user);
    } catch {
      /* ignore storage errors */
    }
  },
};

/**
 * Read the double-submit CSRF token from its cookie so it can be
 * echoed in the `X-CSRF-Token` header on refresh/logout.
 */
export function getCsrfToken(): string | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)ssn_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
