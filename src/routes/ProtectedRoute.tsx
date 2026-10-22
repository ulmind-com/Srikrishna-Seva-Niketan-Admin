import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FullScreenLoader } from "@/components/common/FullScreenLoader";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
