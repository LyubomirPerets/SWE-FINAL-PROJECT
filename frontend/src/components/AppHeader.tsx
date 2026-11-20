import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

const ROLE_LABELS = { manager: 'Manager', associate: 'Associate', technician: 'Technician' };

export function AppHeader() {
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
    <>
      <header className="app-header">
        <Link className="auth-brand" to="/" aria-label="Sierra home">
          <img src="/favicon-1.svg" width="28" height="28" alt="" /> Sierra
        </Link>
        <nav aria-label="Main">
          <Link to="/dashboard" aria-current="page">
            Dashboard
          </Link>
        </nav>
        <div className="app-account">
          <div className="app-identity">
            <strong>{auth.user.name}</strong>
            <span>{auth.user.email}</span>
            <small>{ROLE_LABELS[auth.user.role]}</small>
          </div>
          <button className="btn" disabled={pending} onClick={logout}>
            {pending ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </header>
      {error && (
        <p className="auth-error app-logout-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
