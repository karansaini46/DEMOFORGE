import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/auth.store';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your generated demos will appear here.
          </p>
        </div>
        <Link to="/generate">
          <Button>
            <Plus className="h-4 w-4" />
            New demo
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center shadow-sm">
        <p className="text-sm text-gray-500">
          No demos yet — create your first one to get started.
        </p>
      </div>
    </div>
  );
}
