import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

import { logout as logoutApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../ui/Button';

function PlanBadge({ plan }: { plan: 'FREE' | 'PRO' }) {
  const isPro = plan === 'PRO';
  return (
    <span
      className={[
        'rounded-full px-2 py-0.5 text-xs font-semibold',
        isPro ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600',
      ].join(' ')}
    >
      {plan}
    </span>
  );
}

export function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Even if the server call fails, clear the local session.
    } finally {
      clearAuth();
      toast.success('Signed out');
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-lg font-extrabold tracking-tight text-gray-900">
          DEMO<span className="text-primary">FORGE</span>
        </Link>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">
              {user.email}
            </span>
            <PlanBadge plan={user.plan} />
            <Button variant="secondary" onClick={handleLogout} className="px-3 py-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary">Register</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
