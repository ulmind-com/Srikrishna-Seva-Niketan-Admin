import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getStoredStaffAccess,
  getStoredStaffProfile,
  getStoredStaffRefresh,
  refreshStaffAccessToken,
  registerStaffAuthFailureHandler,
  setStoredStaffProfile,
  setStoredStaffRefresh,
  staffTokenStore,
} from "@/services/api/staff-client";
import { staffPortalService } from "@/services/staff-portal.service";
import type { Employee } from "@/types/models";

interface StaffAuthValue {
  staff: Employee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Employee>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    location_id: string;
    otp?: string;
  }) => Promise<Employee>;
  logout: () => void;
  /** Re-read the profile after saving or submitting. */
  refresh: () => Promise<void>;
  setStaff: (staff: Employee | null) => void;
}

const StaffAuthContext = createContext<StaffAuthValue | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const initialStaff = getStoredStaffProfile<Employee>();
  const [staff, setStaffState] = useState<Employee | null>(initialStaff);
  const [isLoading, setIsLoading] = useState<boolean>(
    !initialStaff && Boolean(getStoredStaffAccess() || getStoredStaffRefresh())
  );

  const setStaff = useCallback((val: Employee | null) => {
    setStaffState(val);
    setStoredStaffProfile(val);
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget server revoke; clear local state regardless.
    staffPortalService.logout().catch(() => {
      /* ignore network errors on logout */
    });
    staffTokenStore.clear();
    setStaff(null);
  }, [setStaff]);

  // Seamless session restore on boot / reload:
  // 1. If stored profile exists, render immediately with 0 delay (no blank flash).
  // 2. Validate session via /me or refresh token in background.
  // 3. Keeps nurse permanently logged in across page refreshes.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const hasToken = getStoredStaffAccess() || getStoredStaffRefresh();
      if (!hasToken) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await staffPortalService.me();
        if (!cancelled) setStaff(profile);
      } catch {
        // Access token might need rotation; try refresh token
        try {
          await refreshStaffAccessToken();
          const profile = await staffPortalService.me();
          if (!cancelled) setStaff(profile);
        } catch {
          // Truly expired or invalid session
          if (!cancelled) {
            staffTokenStore.clear();
            setStaff(null);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [setStaff]);

  // A failed refresh inside the Axios interceptor must clear React state too.
  useEffect(() => {
    registerStaffAuthFailureHandler(() => {
      staffTokenStore.clear();
      setStaff(null);
      if (!window.location.pathname.startsWith("/staff/login")) {
        window.location.assign("/staff/login");
      }
    });
  }, [setStaff]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await staffPortalService.login(email, password);
    staffTokenStore.setAccess(session.access_token);
    if (session.refresh_token) setStoredStaffRefresh(session.refresh_token);
    setStaff(session.staff);
    return session.staff;
  }, [setStaff]);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      location_id: string;
      otp?: string;
    }) => {
      const session = await staffPortalService.register(payload);
      staffTokenStore.setAccess(session.access_token);
      if (session.refresh_token) setStoredStaffRefresh(session.refresh_token);
      setStaff(session.staff);
      return session.staff;
    },
    [setStaff],
  );

  const refresh = useCallback(async () => {
    const profile = await staffPortalService.me();
    setStaff(profile);
  }, [setStaff]);

  const value = useMemo<StaffAuthValue>(
    () => ({
      staff,
      isAuthenticated: Boolean(staff && staffTokenStore.getAccess()),
      isLoading,
      login,
      register,
      logout,
      refresh,
      setStaff,
    }),
    [staff, isLoading, login, register, logout, refresh, setStaff],
  );

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuth(): StaffAuthValue {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) {
    throw new Error("useStaffAuth must be used inside a <StaffAuthProvider>");
  }
  return ctx;
}
