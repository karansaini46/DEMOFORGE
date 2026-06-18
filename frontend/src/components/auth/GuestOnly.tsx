import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '../../store/auth.store';

/** Gate for guest-only routes (login/register). Redirects authed users to /dashboard. */
export function GuestOnly() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
