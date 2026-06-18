import { Navigate, Route, Routes } from 'react-router-dom';

import { GuestOnly } from './components/auth/GuestOnly';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import JobStatus from './pages/JobStatus';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  return (
    <Routes>
      {/* Auth pages — redirect to /dashboard when already signed in. */}
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Main app shell (navbar + container). */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Landing />} />

        {/* Protected routes. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/jobs/:id" element={<JobStatus />} />
        </Route>
      </Route>

      {/* Fallback. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
