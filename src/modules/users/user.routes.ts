import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { loginSchema, signupSchema } from './user.schema.js';
import { EmailTakenError, createUser, findById, verifyCredentials } from './user.service.js';

export const authRouter = Router();

type Handler = (req: Request, res: Response) => Promise<void>;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

function startSession(
  req: Request,
  user: { id: number; role: 'associate' | 'manager' },
): Promise<void> {
  // Regenerate to prevent session fixation.
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

authRouter.post(
  '/signup',
  wrap(async (req, res) => {
    const input = signupSchema.parse(req.body);
    try {
      const user = await createUser(input);
      await startSession(req, user);
      res.status(201).json({ user });
    } catch (err) {
      if (err instanceof EmailTakenError) {
        res.status(409).json({ error: err.message });
        return;
      }
      throw err;
    }
  }),
);

authRouter.post(
  '/login',
  wrap(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await verifyCredentials(email, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    await startSession(req, user);
    res.json({ user });
  }),
);

authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

authRouter.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const user = await findById(req.session.userId!);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    res.json({ user });
  }),
);
