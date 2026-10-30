import { endpoints } from "./api/endpoints";
import { http } from "./api/http";
import { apiRequest } from "./api/client";
import { getStoredRefresh } from "./api/tokens";
import type { User } from "@/types/models";

export interface LoginResponse {
  access_token: string;
  // Cross-site fallback token (also set as an HttpOnly cookie where allowed).
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export const authService = {
  login: (email: string, password: string) =>
    http.post<LoginResponse>(endpoints.auth.login, { email, password }),

  // Cookie path uses the refresh cookie + CSRF; the X-Refresh-Token header is
  // the fallback that lets a cross-site session be revoked when the cookie is
  // blocked by the browser.
  logout: () =>
    apiRequest<null>({
      method: "POST",
      url: endpoints.auth.logout,
      data: {},
      headers: { "X-Refresh-Token": getStoredRefresh() ?? "" },
    }),

  me: () => http.get<User>(endpoints.auth.me),

  updateProfile: (data: { name?: string; phone?: string }) =>
    http.put<User>(endpoints.auth.me, data),

  changePassword: (current_password: string, new_password: string) =>
    apiRequest<null>({
      method: "POST",
      url: endpoints.auth.changePassword,
      data: { current_password, new_password },
    }),

  forgotPassword: (email: string) =>
    http.post<null>(endpoints.auth.forgotPassword, { email }),

  resetPassword: (token: string, new_password: string) =>
    http.post<null>(endpoints.auth.resetPassword, { token, new_password }),
};
