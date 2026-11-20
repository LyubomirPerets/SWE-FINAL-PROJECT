import { useAuth } from '../hooks/useAuth';
import { AuthShell } from './AuthShell';

export function SessionStatus() {
  const auth = useAuth();
  const failed = auth.status === 'error';
  return (
    <AuthShell title={failed ? 'We couldn’t check your session' : 'Checking your session…'}>
      <title>{`${failed ? 'Connection problem' : 'Checking session'} | Sierra`}</title>
      <p role={failed ? 'alert' : 'status'}>
        {failed
          ? 'Check your connection and try again.'
          : 'Please wait while we check whether you are signed in.'}
      </p>
      {failed && (
        <button className="auth-button" onClick={auth.retrySession}>
          Try again
        </button>
      )}
    </AuthShell>
  );
}
