import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { errorHandler, notFound } from './middleware/error.js';
import { authRouter } from './modules/users/user.routes.js';

const PgStore = connectPgSimple(session);

export function createApp(): express.Express {
  const app = express();
  const isProd = config.NODE_ENV === 'production';

  if (isProd) app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(
    session({
      store: new PgStore({ pool, tableName: 'session' }),
      secret: config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  // Future sprints: app.use('/api/customers', ...), app.use('/api/interactions', ...)

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
