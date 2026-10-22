import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { requireAuth, requireRole } from '../src/middleware/auth.js';

function run(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  session: Partial<Request['session']>,
) {
  const req = { session } as Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  const next = vi.fn();
  middleware(req, res as unknown as Response, next);
  return { res, next };
}

describe('requireAuth', () => {
  it('returns 401 without a logged-in user', () => {
    const { res, next } = run(requireAuth, {});
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next for a logged-in user', () => {
    const { res, next } = run(requireAuth, { userId: 1, role: 'associate' });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  const managerOnly = requireRole('manager');

  it('returns 401 without a logged-in user', () => {
    const { res, next } = run(managerOnly, {});
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for a user without the required role', () => {
    const { res, next } = run(managerOnly, { userId: 2, role: 'associate' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the session has no role', () => {
    const { res, next } = run(managerOnly, { userId: 2 });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next for a user with the required role', () => {
    const { res, next } = run(managerOnly, { userId: 1, role: 'manager' });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts any of several allowed roles', () => {
    const { next } = run(requireRole('associate', 'manager'), { userId: 2, role: 'associate' });
    expect(next).toHaveBeenCalledOnce();
  });
});
