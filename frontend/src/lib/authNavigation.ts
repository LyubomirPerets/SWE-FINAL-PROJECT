export function getReturnTo(search: string): string {
  const next = new URLSearchParams(search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return '/dashboard';
  }
  const url = new URL(next, 'https://sierra.invalid');
  // Only allow destinations implemented by this application.
  return url.origin === 'https://sierra.invalid' && url.pathname === '/dashboard'
    ? url.pathname + url.search + url.hash
    : '/dashboard';
}
