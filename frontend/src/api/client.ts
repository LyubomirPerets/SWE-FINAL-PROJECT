export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly details: FieldErrors;

  constructor(message: string, status: number, details: FieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = RequestInit & { auth?: 'required' | 'optional' };
const unauthorizedListeners = new Set<() => void>();
let sessionVersion = 0;

// Ignore unauthorized responses from requests belonging to a previous login.
export function advanceSessionVersion() {
  sessionVersion += 1;
}

export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export async function requestJson<T>(
  path: `/api/${string}`,
  { auth = 'required', ...options }: RequestOptions = {},
): Promise<T> {
  const version = sessionVersion;
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...options, headers, credentials: 'include' });
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (
      response.status === 401 &&
      auth === 'required' &&
      version === sessionVersion &&
      !options.signal?.aborted
    ) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    const details: FieldErrors = {};
    if (
      payload &&
      typeof payload === 'object' &&
      'details' in payload &&
      payload.details &&
      typeof payload.details === 'object'
    ) {
      for (const [field, messages] of Object.entries(payload.details)) {
        if (Array.isArray(messages) && messages.every((message) => typeof message === 'string')) {
          details[field] = messages;
        }
      }
    }
    const message =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : response.status === 403
          ? 'You do not have permission to access this resource.'
          : 'The request could not be completed. Please try again.';
    throw new ApiError(message, response.status, details);
  }

  if (payload === null) {
    throw new ApiError('The server returned an unreadable response.', response.status);
  }
  return payload as T;
}
