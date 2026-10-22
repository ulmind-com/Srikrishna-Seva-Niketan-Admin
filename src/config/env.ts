/** Typed access to Vite environment variables. */
export const env = {
  API_BASE_URL:
    (import.meta.env.VITE_API_BASE_URL as string) ??
    "http://localhost:8000/api/v1",
  APP_NAME:
    (import.meta.env.VITE_APP_NAME as string) ??
    "Nupun Home Health Care Services",
} as const;

export const STORAGE_KEYS = {
  accessToken: "nupun.access_token",
  refreshToken: "nupun.refresh_token",
  user: "nupun.user",
  theme: "nupun.theme",
  sidebar: "nupun.sidebar_collapsed",
} as const;
