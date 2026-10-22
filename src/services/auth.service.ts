import { endpoints } from "./api/endpoints";
import { http } from "./api/http";
import { apiRequest } from "./api/client";
import type { User } from "@/types/models";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export const authService = {
  login: (email: string, password: string) =>
    http.post<LoginResponse>(endpoints.auth.login, { email, password }),

  logout: (refresh_token: string) =>
    http.post<null>(endpoints.auth.logout, { refresh_token }),

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
