import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authService } from "@/services/auth.service";
import { tokenStore } from "@/services/api/tokens";
import { registerAuthFailureHandler } from "@/services/api/client";
import { STORAGE_KEYS } from "@/config/env";
import type { User } from "@/types/models";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(readStoredUser);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(tokenStore.getAccess()));

  const setUser = useCallback((next: User) => {
    setUserState(next);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(next));
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUserState(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authService.login(email, password);
      tokenStore.set(res.access_token, res.refresh_token);
      setUser(res.user);
    },
    [setUser]
  );

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    try {
      if (refresh) await authService.logout(refresh);
    } catch {
      /* ignore network errors on logout */
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const me = await authService.me();
    setUser(me);
  }, [setUser]);

  const hasPermission = useCallback(
    (perm: string) => {
      if (!user) return false;
      if (user.is_superuser) return true;
      const [resource] = perm.split(":");
      // Effective permissions (role + direct) when provided by the API,
      // falling back to directly-granted permissions.
      const granted = user.permissions ?? user.extra_permissions;
      return (
        granted.includes("*") ||
        granted.includes(perm) ||
        granted.includes(`${resource}:*`)
      );
    },
    [user]
  );

  // Hydrate the current user on mount when a token exists.
  useEffect(() => {
    registerAuthFailureHandler(clearSession);
    if (!tokenStore.getAccess()) {
      setIsLoading(false);
      return;
    }
    let active = true;
    authService
      .me()
      .then((me) => active && setUser(me))
      .catch(() => active && clearSession())
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [clearSession, setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      refreshUser,
      setUser,
      hasPermission,
    }),
    [user, isLoading, login, logout, refreshUser, setUser, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
