import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { ApiError } from '../api/client';
import type { FieldErrors } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { SessionStatus } from '../components/SessionStatus';
import { useAuth } from '../hooks/useAuth';
import { getReturnTo } from '../lib/authNavigation';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const auth = useAuth();
  const location = useLocation();
  const signup = mode === 'signup';
  const returnTo = getReturnTo(location.search);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const submitting = useRef(false);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const initialEmail = typeof location.state?.email === 'string' ? location.state.email : '';

  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const name = String(form.get('name') ?? '').trim();
    const errors: FieldErrors = {};
    if (signup && !name) errors.name = ['Enter your name.'];
    if (signup && password !== form.get('confirmPassword')) {
      errors.confirmPassword = ['Passwords do not match.'];
    }
    setDetails(errors);
    setError('');
    if (Object.keys(errors).length) {
      setError('Please correct the highlighted fields.');
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
      if (signup) await auth.signup({ name, email, password });
      else await auth.login({ email, password });
    } catch (failure) {
      if (failure instanceof ApiError) {
        setDetails(failure.status === 409 ? { email: [failure.message] } : failure.details);
        setError(
          failure.status >= 500
            ? 'We couldn’t reach the sign-in service. Please try again.'
            : failure.message,
        );
      } else {
        setError('Unable to connect. Check your connection and try again.');
      }
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (auth.status === 'loading' || auth.status === 'error') return <SessionStatus />;
  if (auth.status === 'authenticated') return <Navigate to={returnTo} replace />;

  function fieldError(field: string) {
    return details[field]?.length ? (
      <p className="field-error" id={`${field}-error`}>
        {details[field].join(' ')}
      </p>
    ) : null;
  }

  return (
    <AuthShell title={signup ? 'Create your account' : 'Welcome back'}>
      <title>{`${signup ? 'Sign up' : 'Log in'} | Sierra`}</title>
      <p className="auth-description">
        {signup ? 'Get started with Sierra.' : 'Log in to your Sierra account.'}
      </p>
      {auth.expired && (
        <p className="auth-notice" role="status">
          Your session has ended. Please log in again.
        </p>
      )}
      <form onSubmit={submit} className="auth-form" aria-busy={pending}>
        {error && (
          <p className="auth-error" role="alert" tabIndex={-1} ref={errorSummary}>
            {error}
          </p>
        )}
        <fieldset disabled={pending}>
          <legend className="sr-only">{signup ? 'Account details' : 'Login details'}</legend>
          {signup && (
            <div className="auth-field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                aria-invalid={Boolean(details.name)}
                aria-describedby={details.name ? 'name-error' : undefined}
              />
              {fieldError('name')}
            </div>
          )}
          <div className="auth-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              defaultValue={initialEmail}
              required
              maxLength={254}
              aria-invalid={Boolean(details.email)}
              aria-describedby={details.email ? 'email-error' : undefined}
            />
            {fieldError('email')}
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={signup ? 'new-password' : 'current-password'}
              required
              minLength={signup ? 8 : 1}
              maxLength={signup ? 128 : undefined}
              aria-invalid={Boolean(details.password)}
              aria-describedby={
                [signup ? 'password-hint' : '', details.password ? 'password-error' : '']
                  .filter(Boolean)
                  .join(' ') || undefined
              }
            />
            {signup && (
              <p className="field-hint" id="password-hint">
                Use 8–128 characters.
              </p>
            )}
            {fieldError('password')}
          </div>
          {signup && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                maxLength={128}
                aria-invalid={Boolean(details.confirmPassword)}
                aria-describedby={details.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              {fieldError('confirmPassword')}
            </div>
          )}
          <label className="password-toggle">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />{' '}
            Show password{signup ? 's' : ''}
          </label>
          <button type="submit" className="auth-button">
            {pending
              ? signup
                ? 'Creating account…'
                : 'Logging in…'
              : signup
                ? 'Create account'
                : 'Log in'}
          </button>
        </fieldset>
      </form>
      <p className="auth-switch">
        {signup ? 'Already have an account? ' : 'New to Sierra? '}
        <Link to={`/${signup ? 'login' : 'signup'}?next=${encodeURIComponent(returnTo)}`}>
          {signup ? 'Log in' : 'Create an account'}
        </Link>
      </p>
    </AuthShell>
  );
}
