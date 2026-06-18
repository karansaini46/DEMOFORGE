import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '../../store/auth.store';

/** Gate for authenticated-only routes. Redirects to /login when signed out. */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
