/** Typed access to Vite environment variables. */
export const env = {
  API_BASE_URL:
    (import.meta.env.VITE_API_BASE_URL as string) ??
    "https://srikrishna-seva-niketan-backend-y3fe.onrender.com/api/v1",
  APP_NAME:
    (import.meta.env.VITE_APP_NAME as string) ?? "Srikrishna Seva Niketan",
} as const;

export const STORAGE_KEYS = {
  accessToken: "nupun.access_token",
  refreshToken: "nupun.refresh_token",
  user: "nupun.user",
  theme: "nupun.theme",
  sidebar: "nupun.sidebar_collapsed",
  // Staff-portal session, kept under separate keys so a staff member and an
  // admin can be signed in in the same browser without clobbering each other.
  staffAccessToken: "ssn.staff.access_token",
  staffRefreshToken: "ssn.staff.refresh_token",
} as const;
