import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as api from '../api/auth';
import { advanceSessionVersion, ApiError, onUnauthorized } from '../api/client';
import type { LoginInput, SignupInput, User } from '../types/auth';
import { AuthContext } from './AuthContext';
import type { AuthState } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });
  const check = useRef<AbortController | null>(null);
  const mutationPending = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);

  const expireSession = useCallback(() => {
    check.current?.abort();
    advanceSessionVersion();
    setState((previous) => ({
      status: 'anonymous',
      user: null,
      expired:
        previous.status === 'authenticated' ||
        (previous.status === 'anonymous' && previous.expired),
    }));
  }, []);

  const checkSession = useCallback(
    (background = false) => {
      if (mutationPending.current) return;
      check.current?.abort();
      const controller = new AbortController();
      check.current = controller;
      return api.getCurrentUser(controller.signal).then(
        ({ user }) => {
          if (!controller.signal.aborted) {
            advanceSessionVersion();
            setState({ status: 'authenticated', user });
          }
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          if (error instanceof ApiError && error.status === 401) expireSession();
          else if (!background) setState({ status: 'error', user: null });
        },
      );
    },
    [expireSession],
  );

  useEffect(() => {
    void checkSession();
    const unsubscribe = onUnauthorized(expireSession);
    const recheck = () => {
      if (document.visibilityState === 'visible') void checkSession(true);
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    // Only a notification crosses tabs; credentials stay in the HttpOnly cookie.
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('sierra-auth');
      channel.current.onmessage = () => {
        void checkSession();
      };
    }
    return () => {
      check.current?.abort();
      unsubscribe();
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
      channel.current?.close();
      channel.current = null;
    };
  }, [checkSession, expireSession]);

  useEffect(() => {
    if (state.status !== 'authenticated') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void checkSession(true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [state.status, checkSession]);

  async function authenticate(request: () => Promise<{ user: User }>) {
    if (mutationPending.current) return;
    mutationPending.current = true;
    check.current?.abort();
    advanceSessionVersion();
    try {
      const { user } = await request();
      setState({ status: 'authenticated', user });
      channel.current?.postMessage('changed');
    } finally {
      mutationPending.current = false;
    }
  }

  async function logout() {
    if (mutationPending.current) return;
    mutationPending.current = true;
    check.current?.abort();
    try {
      await api.logout();
      advanceSessionVersion();
      setState({ status: 'anonymous', user: null });
      channel.current?.postMessage('changed');
    } finally {
      mutationPending.current = false;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login: (input: LoginInput) => authenticate(() => api.login(input)),
        signup: (input: SignupInput) => authenticate(() => api.signup(input)),
        logout,
        retrySession: () => {
          setState({ status: 'loading', user: null });
          void checkSession();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
