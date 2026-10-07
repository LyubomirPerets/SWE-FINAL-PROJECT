# CRM Backend

Express + TypeScript + PostgreSQL API for the unified CRM / communications platform.

## Quick start

```bash
npm install
cp .env.example .env        # then set SESSION_SECRET
docker compose up -d        # Postgres 16, creates `crm` and `crm_test` databases
npm run db:reset            # drop schema, run migrations, load seed data
npm run dev                 # http://localhost:3000
```

Seed accounts (password `Password123!`): `manager@example.com`, `associate@example.com`, `associate2@example.com`.

## Scripts

| Script                                    | Purpose                              |
| ----------------------------------------- | ------------------------------------ |
| `npm run dev`                             | Start API with hot reload            |
| `npm run build` / `npm start`             | Compile to `dist/` and run           |
| `npm test`                                | Run tests (uses `TEST_DATABASE_URL`) |
| `npm run lint` / `npm run lint:fix`       | ESLint                               |
| `npm run format` / `npm run format:check` | Prettier                             |
| `npm run typecheck`                       | `tsc --noEmit`                       |
| `npm run db:migrate`                      | Apply pending SQL migrations         |
| `npm run db:seed`                         | Insert seed users (idempotent)       |
| `npm run db:reset`                        | Wipe schema, migrate, seed           |

## Project layout

```
src/
  app.ts              Express app factory (middleware, routes)
  server.ts           Entry point
  config.ts           Validated env config (zod)
  db/                 pool, migrate runner, seed, migrations/*.sql
  middleware/         auth (requireAuth, requireRole), error handling
  modules/<name>/     routes + service + schema per resource
tests/                vitest + supertest (runs against crm_test)
```

New resources (customers, interactions, ...) follow the `modules/users` pattern: `*.schema.ts` (zod),
`*.service.ts` (SQL), `*.routes.ts` (HTTP), then mount in `app.ts`. Schema changes go in a new
numbered file in `src/db/migrations/`.

## Auth API

Cookie-based sessions stored in Postgres (`session` table). Roles: `associate` (default), `manager`.

| Method | Path               | Body                        | Result                                      |
| ------ | ------------------ | --------------------------- | ------------------------------------------- |
| POST   | `/api/auth/signup` | `{ email, password, name }` | 201 `{ user }`, logs in; 409 if email taken |
| POST   | `/api/auth/login`  | `{ email, password }`       | 200 `{ user }`; 401 on bad credentials      |
| POST   | `/api/auth/logout` | -                           | 204, session destroyed                      |
| GET    | `/api/auth/me`     | -                           | 200 `{ user }`; 401 if not logged in        |
| GET    | `/health`          | -                           | 200 `{ status: "ok" }`                      |

Protect routes with `requireAuth` or `requireRole('manager')` from `src/middleware/auth.ts`.
Frontend requests must send credentials (`fetch(..., { credentials: 'include' })`).
