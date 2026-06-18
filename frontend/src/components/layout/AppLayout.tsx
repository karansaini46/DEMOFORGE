import { Outlet } from 'react-router-dom';

import { Navbar } from './Navbar';

/** Shared chrome (navbar + container) for the main app pages. */
export function AppLayout() {
  return (
    <div className="min-h-screen bg-app">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
