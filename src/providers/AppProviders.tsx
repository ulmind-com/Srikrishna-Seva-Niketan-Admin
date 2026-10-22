import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
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
              <TooltipProvider delayDuration={200}>
                {children}
                <Toaster />
              </TooltipProvider>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
