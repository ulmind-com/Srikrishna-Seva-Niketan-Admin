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
import {
  getStoredAccess,
  getStoredRefresh,
  setStoredRefresh,
  tokenStore,
} from "@/services/api/tokens";
import {
  refreshAccessToken,
  registerAuthFailureHandler,
} from "@/services/api/client";
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
  const initialUser = readStoredUser();
  const [user, setUserState] = useState<User | null>(initialUser);
  const hasStoredSession = Boolean(
    initialUser && (getStoredAccess() || getStoredRefresh())
  );
  // If user and tokens already exist in localStorage, never block UI on refresh
  const [isLoading, setIsLoading] = useState<boolean>(!hasStoredSession);

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
      const res = await authService.login(email.trim(), password);
      tokenStore.setAccess(res.access_token);
      if (res.refresh_token) setStoredRefresh(res.refresh_token);
      setUser(res.user);
    },
    [setUser]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
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

  // Persistent session restore (like Facebook / Instagram / Google):
  // 1. Immediately hydrate from localStorage on reload.
  // 2. Silently verify or refresh session in the background.
  // 3. User stays logged in permanently across page refreshes.
  useEffect(() => {
    registerAuthFailureHandler(clearSession);
    let active = true;

    async function restoreSession() {
      const hasAuth = getStoredAccess() || getStoredRefresh();
      if (!hasAuth) {
        if (active) {
          clearSession();
          setIsLoading(false);
        }
        return;
      }

      // 1. If we already have a valid access token in storage, verify silently with me()
      if (tokenStore.getAccess()) {
        try {
          const me = await authService.me();
          if (active) setUser(me);
          if (active) setIsLoading(false);
          return;
        } catch {
          // Token might have expired, try refresh below
        }
      }

      // 2. Try transparent refresh using refresh token
      try {
        await refreshAccessToken();
        const me = await authService.me();
        if (active) setUser(me);
      } catch {
        // Both access token and refresh token failed -> session truly expired
        if (active) clearSession();
      } finally {
        if (active) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, [clearSession, setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && tokenStore.getAccess()),
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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
