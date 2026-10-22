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
  registerStaffAuthFailureHandler,
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
  }) => Promise<Employee>;
  logout: () => void;
  /** Re-read the profile after saving or submitting. */
  refresh: () => Promise<void>;
  setStaff: (staff: Employee) => void;
}

const StaffAuthContext = createContext<StaffAuthValue | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    staffTokenStore.clear();
    setStaff(null);
  }, []);

  // Restore the session on first mount if a token is present.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!staffTokenStore.getAccess()) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await staffPortalService.me();
        if (!cancelled) setStaff(profile);
      } catch {
        // Token expired or revoked — drop it and show the login screen.
        if (!cancelled) staffTokenStore.clear();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // A failed refresh inside the Axios interceptor must clear React state too.
  useEffect(() => {
    registerStaffAuthFailureHandler(() => {
      staffTokenStore.clear();
      setStaff(null);
      if (!window.location.pathname.startsWith("/staff/login")) {
        window.location.assign("/staff/login");
      }
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await staffPortalService.login(email, password);
    staffTokenStore.set(session.access_token, session.refresh_token);
    setStaff(session.staff);
    return session.staff;
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      location_id: string;
    }) => {
      const session = await staffPortalService.register(payload);
      staffTokenStore.set(session.access_token, session.refresh_token);
      setStaff(session.staff);
      return session.staff;
    },
    [],
  );

  const refresh = useCallback(async () => {
    const profile = await staffPortalService.me();
    setStaff(profile);
  }, []);

  const value = useMemo<StaffAuthValue>(
    () => ({
      staff,
      isAuthenticated: Boolean(staff),
      isLoading,
      login,
      register,
      logout,
      refresh,
      setStaff,
    }),
    [staff, isLoading, login, register, logout, refresh],
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
