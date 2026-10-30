import { STORAGE_KEYS } from "@/config/env";

/**
 * Access-token store — **in memory only**.
 *
 * The access token is short-lived and kept in a module variable so it never
 * touches localStorage (XSS-reachable). The refresh token is not stored here at
 * all: it lives solely in a Secure, HttpOnly cookie the browser manages and
 * JavaScript cannot read. A page reload therefore starts with no access token
 * and the app silently calls `/auth/refresh` (cookie) to restore the session.
 */
let accessToken: string | null = null;

// Cross-site fallback: when the HttpOnly refresh cookie is blocked (Vercel admin
// + Render API are different sites, and Brave/modern Chrome block the resulting
// third-party cookie), the refresh token is kept here in localStorage and sent
// via the X-Refresh-Token header instead. Where the cookie works, this stays
// null and the cookie is used.
const REFRESH_KEY = "ssn_admin_refresh";

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
    return accessToken;
  },
  setAccess(access: string): void {
    accessToken = access;
  },
  clear(): void {
    accessToken = null;
    setStoredRefresh(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.user);
    } catch {
      /* ignore storage errors */
    }
  },
};

/**
 * Read the double-submit CSRF token from its (non-HttpOnly) cookie so it can be
 * echoed in the `X-CSRF-Token` header on refresh/logout.
 */
export function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)ssn_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
