import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AuthShell } from '../components/AuthShell';
import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  async function logout() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      await auth.logout();
      await navigate('/login', { replace: true });
    } catch {
      setError('We couldn’t log you out. Check your connection and try again.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (!auth.user) return null;
  return (
    <AuthShell title={`Welcome, ${auth.user.name}`}>
      <title>Your account | Sierra</title>
      <p className="auth-description">You’re signed in to Sierra.</p>
      <dl className="account-details">
        <div>
          <dt>Email address</dt>
          <dd>{auth.user.email}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{auth.user.role === 'manager' ? 'Manager' : 'Associate'}</dd>
        </div>
      </dl>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <button className="auth-button" disabled={pending} onClick={logout}>
        {pending ? 'Logging out…' : 'Log out'}
      </button>
    </AuthShell>
  );
}
