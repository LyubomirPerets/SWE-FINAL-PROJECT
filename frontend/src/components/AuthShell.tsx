import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="auth-shell">
      <header className="auth-header">
        <Link className="auth-brand" to="/" aria-label="Sierra home">
          <img src="/favicon-1.svg" width="28" height="28" alt="" /> Sierra
        </Link>
        <Link to="/">Back to home</Link>
      </header>
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="auth-title">
          <p className="auth-eyebrow">Your Sierra account</p>
          <h1 id="auth-title">{title}</h1>
          {children}
        </section>
      </main>
    </div>
  );
}
