import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { StaffAuthProvider } from "@/contexts/StaffAuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry transient failures with exponential backoff (caps at 10s) so a
      // single slow/cold backend response recovers instead of erroring.
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      // Do NOT poll every query globally — that floods the single-worker
      // backend (N widgets × every 10s) and causes the endless spinners.
      // Screens that genuinely need live data set their own refetchInterval.
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // Serve cached data for 60s before considering it stale; keep it in
      // cache 5 min so reloads/navigation render instantly from cache.
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <StaffAuthProvider>
                <TooltipProvider delayDuration={200}>
                  {children}
                  <Toaster />
                </TooltipProvider>
              </StaffAuthProvider>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
