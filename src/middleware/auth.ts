import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../modules/users/user.service.js';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    role?: Role;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!req.session.role || !roles.includes(req.session.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
