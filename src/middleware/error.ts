import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  // Client errors raised by Express middleware (e.g. express.json() on malformed JSON or an
  // oversized body) carry a 4xx status. Don't turn them into a 500 or log them as crashes.
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const messages: Record<number, string> = {
      400: 'Malformed request body',
      413: 'Request body too large',
    };
    res.status(status).json({ error: messages[status] ?? 'Bad request' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
