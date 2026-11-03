import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { SessionStatus } from './SessionStatus';

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === 'loading' || auth.status === 'error') return <SessionStatus />;
  if (auth.status === 'anonymous') {
    const next = location.pathname + location.search + location.hash;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  // A different account gets a fresh component tree and no previous user data.
  return <Outlet key={auth.user.id} />;
}
