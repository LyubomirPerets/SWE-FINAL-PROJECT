import { requestJson } from './client';
import type { LoginInput, SignupInput, User } from '../types/auth';

export function login(input: LoginInput) {
  return requestJson<{ user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: 'optional',
  });
}

export function signup(input: SignupInput) {
  return requestJson<{ user: User }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: 'optional',
  });
}

export function getCurrentUser(signal?: AbortSignal) {
  return requestJson<{ user: User }>('/api/auth/me', {
    signal,
    cache: 'no-store',
    auth: 'optional',
  });
}

export function logout() {
  return requestJson<void>('/api/auth/logout', { method: 'POST', auth: 'optional' });
}
