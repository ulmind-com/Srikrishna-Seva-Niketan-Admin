/** Typed access to Vite environment variables. */
export const env = {
  API_BASE_URL:
    (import.meta.env.VITE_API_BASE_URL as string) ??
    "https://srikrishna-seva-niketan-backend-99zi.onrender.com/api/v1",
  APP_NAME:
    (import.meta.env.VITE_APP_NAME as string) ?? "Srikrishna Seva Niketan",
} as const;

export const STORAGE_KEYS = {
  // Auth tokens are NOT stored here: the access token lives in memory and the
  // refresh token only in a Secure/HttpOnly cookie. These keys are UX state.
  user: "nupun.user",
  theme: "nupun.theme",
  sidebar: "nupun.sidebar_collapsed",
} as const;
