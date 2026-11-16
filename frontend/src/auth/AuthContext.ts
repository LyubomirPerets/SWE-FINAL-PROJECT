import { createContext } from 'react';
import type { LoginInput, SignupInput, User } from '../types/auth';

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: User }
  | { status: 'anonymous'; user: null; expired?: boolean }
  | { status: 'error'; user: null };

export type AuthContextValue = AuthState & {
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  retrySession: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
