# CRM Backend

Express + TypeScript + PostgreSQL API for a CRM for home-services businesses (HVAC, lawn care, garage doors). Office staff track customers and schedule jobs, and technicians see the jobs assigned to them.

## Where we are (Sprint 3)

| Area                   | Status                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Auth (signup/login/me) | ✅ Done: cookie sessions, 3 roles (`manager`, `associate`, `technician`)                 |
| Customers              | ✅ Done: full CRUD API, tests, React page                                                |
| Jobs                   | 🚧 Routes and validation only, waiting on the jobs migration (see [Jobs API](#jobs-api)) |
| Shared database        | ✅ Supabase Postgres, used by everyone for development                                   |
| Cloud deploy           | ⏳ Not started                                                                           |

## Team & ownership

| Role      | People | Owns                                                      |
| --------- | ------ | --------------------------------------------------------- |
| Backend   | 2      | `src/modules/`, `src/middleware/`, `src/app.ts`, `tests/` |
| Database  | 1      | `src/db/migrations/`, `src/db/seed.ts`, the schema / ERD  |
| Front-end | 2      | `frontend/`, everything that calls the API                |

Anyone can open a pull request that touches any area. If you change something another role owns, tag that person on the pull request.

## First-time setup

### Prerequisites

- **Git**
- **Node.js 20 or newer.** CI uses Node 24, so use that if you can.
- **Docker Desktop.** It's only needed for running the tests now. On Windows, turn on WSL integration in its settings.
- **The Supabase connection URI.** Ask Lyubomir for it in a private message. Never post it in the repo, an issue, or the group chat.
- **GitHub CLI (`gh`)** is optional but makes pull requests faster. Run `gh auth login` once after installing it.

### Steps

```bash
git clone https://github.com/LyubomirPerets/SWE-FINAL-PROJECT.git
cd SWE-FINAL-PROJECT
git checkout dev                 # usually automatic: dev is the default branch

npm install
cp .env.example .env
```

Open `.env` and replace `SESSION_SECRET` with a random string. This command generates one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Next, point the app at the shared Supabase database. In `.env`, replace the `DATABASE_URL=` line with the URI you were sent:

```
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify
```

- Use `=` after `DATABASE_URL`, not `:`.
- Keep `?sslmode=no-verify` at the end. Supabase requires SSL.
- **Leave `TEST_DATABASE_URL` pointing at local Docker.** If that line is missing, `npm test` falls back to `DATABASE_URL` and **wipes the shared database**.

The shared database is already migrated and seeded, so you don't need to run `db:reset`. Start the API and the local test database:

```bash
npm run db:migrate               # applies any migrations you don't have yet (safe)
npm run dev                      # API at http://localhost:3000, reloads when you save
docker compose up -d             # local Postgres 16, used only by the tests (`crm_test`)
```

Check that it works. In a second terminal:

```bash
curl http://localhost:3000/health   # → {"status":"ok"}
npm test                            # all tests should pass (runs against local crm_test)
```

Seed accounts, all with password `Password123!`:

- `manager@example.com` (manager)
- `associate@example.com` (associate)
- `associate2@example.com` (associate)
- `technician@example.com` (technician)

## Shared database (Supabase)

Everyone develops against one Supabase Postgres database, so **your changes are visible to the whole team**, and so are your mistakes.

- **Never run `npm run db:reset`** while `DATABASE_URL` points at Supabase, and **never run `npm test` without a `TEST_DATABASE_URL` line**. Both drop every table in the shared database.
- **`npm run db:migrate` is safe.** It only applies migrations that haven't run yet. Whoever merges a migration runs it once, and after that it's a no-op for everyone else.
- **`npm run db:seed` is safe to run again.** It skips users that already exist and only adds customers if the table is empty.
- **Look at the data** in the Supabase dashboard under **Table Editor**, or use **SQL Editor** for queries.
- **Free projects pause after about a week with no activity.** If connections suddenly time out, open the dashboard and resume the project.
- **If the password changes**, everyone updates the password part of `DATABASE_URL` in their own `.env` and restarts `npm run dev`. Use a password with only letters and numbers, so it never needs URL-encoding.
- **Want a private sandbox?** Point `DATABASE_URL` back at `postgres://crm:crm@localhost:5432/crm` and run `npm run db:reset` there. It's your local Docker database, so wiping it only affects you.

## How we work (git workflow)

### Branches

- **`dev`** is where everyday work lands. It's the default branch.
- **`main`** is the release branch. It only changes when `dev` is merged into it at the end of a sprint.
- **Nobody pushes directly to `dev` or `main`.** GitHub rejects it. Every change goes through a pull request from your own branch.

### Working

```bash
# 1. Start from the latest dev
git checkout dev
git pull

# 2. Make a branch for one piece of work
git checkout -b feature/customer-list

# 3. Work and commit as usual
git add <files>
git commit -m "Add customer list endpoint"

# 4. Push your branch and open a pull request into dev
git push -u origin feature/customer-list
gh pr create --base dev --fill        # or open the pull request on github.com

# 5. Wait for the green check ✅ on the pull request, then merge
gh pr merge --squash --delete-branch

# 6. Go back to dev for the next task
git checkout dev
git pull
```

Branch name prefixes: `feature/`, `fix/`, `db/`, `docs/`, `ci/`.

Keep pull requests small, with one feature or fix each. Small pull requests are easier to review and cause fewer conflicts.

### Keeping your branch up to date

If `dev` has moved on while you were working, or your pull request shows conflicts:

```bash
git checkout feature/customer-list
git pull origin dev              # merge the latest dev into your branch
# fix any conflicts, commit, then:
git push
```

### Branch rules (enforced by GitHub)

| Rule                                       | `dev` | `main`                       |
| ------------------------------------------ | ----- | ---------------------------- |
| Pull request required                      | ✅    | ✅                           |
| Approvals needed                           | 0     | 1 (not from the last pusher) |
| CI check `lint, typecheck, test` must pass | ✅    | ✅                           |
| Branch must be up to date before merging   | no    | yes                          |
| Force-push and branch deletion             | ❌    | ❌                           |

### Releasing to `main`

At the end of a sprint, one person opens a pull request from `dev` into `main`:

```bash
gh pr create --base main --head dev --title "Sprint N release"
```

A different teammate reviews and approves it. Once CI passes, it can be merged.

## CI

Every pull request into `dev` or `main`, and every push to them, runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml). It installs dependencies with `npm ci`, then runs lint, format check, typecheck, build, and the tests against a real Postgres 16 database. A pull request can't be merged until it passes.

Run the same checks yourself before pushing:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test
```

Most failures fix themselves with:

```bash
npm run lint:fix      # auto-fix lint problems
npm run format        # auto-format every file with Prettier
```

If the check is red on GitHub, click **Details** next to it on the pull request to see which step failed and why.

## Role guides

### Backend

New resources follow the `src/modules/customers` pattern, which is the most complete example:

1. `<name>.schema.ts`: zod schemas that validate request bodies and URL params.
2. `<name>.service.ts`: the SQL queries, using `pool` from `src/db/pool.ts`. Convert between `snake_case` columns and `camelCase` JSON here.
3. `<name>.routes.ts`: an Express `Router` with the HTTP handlers.
4. Mount the router in `src/app.ts`, next to `/api/customers` and `/api/jobs`.

Other rules:

- **Protect routes** with `requireAuth` or `requireRole(...)` from `src/middleware/auth.ts`, for example `requireRole('associate', 'manager')` for office-only actions that technicians can't do. They return `401 { error: 'Authentication required' }` or `403 { error: 'Forbidden' }`.
- **Errors** are always JSON `{ error: string }`. If a zod `.parse()` fails, `src/middleware/error.ts` turns it into `400 { error: 'Validation failed', details: { field: [messages] } }`, so you don't need to catch validation errors yourself.
- **Tests** go in `tests/<name>.test.ts`. Follow `tests/auth.test.ts`: use `supertest` against `createApp()`, and `TRUNCATE` your tables in `beforeEach`. Tests run against the `crm_test` database, never your dev data. Add your tables to the `TRUNCATE` list.
- **Schema changes** are owned by the database role. Agree on the tables with them first, and they'll write the migration.

### Database

- **Each schema change is a new numbered file** in `src/db/migrations/`. The latest is `003_customers.sql`, so the jobs table will be `004_jobs.sql`. Files run in name order, and each one runs inside a transaction.
- **Never edit a migration after it has been merged.** `src/db/migrate.ts` records each file's name in the `schema_migrations` table and skips files it has already applied. If you edit `001_init.sql`, your teammates' databases will never get the change. To fix a merged migration, add a new one.
- **Sample data** goes in `src/db/seed.ts`. Keep it safe to run twice, for example with `ON CONFLICT DO NOTHING`.
- **Test new migrations locally first**, never on Supabase. Point `DATABASE_URL` at local Docker (`postgres://crm:crm@localhost:5432/crm`), run `npm run db:reset`, then `npm test`. The tests rebuild `crm_test` from the migrations on every run.
- **Look at the database directly:** use the Supabase **Table Editor** or **SQL Editor** for the shared database. For local Docker, use:
  ```bash
  docker compose exec db psql -U crm -d crm
  ```
- **Coordinate with backend.** Their services write raw SQL against your tables, so renaming a column breaks their code. Mention schema changes in the pull request description.
- **After your migration is merged**, run `npm run db:migrate` once against Supabase and tell the team. Code on `dev` that needs the new table won't work for anyone until then.

### Front-end

The front-end lives in [`frontend/`](frontend/) (React + Vite + TypeScript). It has its own `package.json`, so run `npm install` inside `frontend/` too. See [`frontend/README.md`](frontend/README.md).

- **Run the backend locally** using [First-time setup](#first-time-setup). The API runs at `http://localhost:3000`.
- **Auth uses cookie sessions, not tokens.** After a login or signup request, the browser stores a session cookie. Every request must send it:
  ```js
  fetch('/api/auth/me', { credentials: 'include' });
  ```
- **The backend has no CORS setup.** Call relative URLs like `/api/...`, never `http://localhost:3000` directly. `frontend/vite.config.ts` already proxies `/api` to the backend, so the browser sees one origin and cookies just work.
- **Log in with the seed accounts.** Use `technician@example.com` to check what technicians can't do.
- **Error responses** are always JSON with an `error` field. Validation errors also include `details` with messages per field, which is useful for showing errors on forms.

- **The API is documented** under [Auth API](#auth-api), [Customers API](#customers-api) and [Jobs API](#jobs-api). Don't build against jobs yet: those routes return placeholder data.
- **End-to-end tests** use Playwright and live in `frontend/tests/`. Run `npm test` inside `frontend/`. It starts Vite for you.

> **Lint and CI for `frontend/`:** the root `npm run lint` and `npm run format:check` (and so CI) also scan `frontend/`, using the root configs. Run them from the repo root before pushing front-end changes. CI does not typecheck, build, or run Playwright for the front-end yet. Run `npm run build` and `npm test` inside `frontend/` yourself.

## Reference

### Scripts

| Script                                    | Purpose                                                   |
| ----------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                             | Start API with hot reload                                 |
| `npm run build` / `npm start`             | Compile to `dist/` and run                                |
| `npm test`                                | Run tests (uses `TEST_DATABASE_URL`)                      |
| `npm run lint` / `npm run lint:fix`       | ESLint                                                    |
| `npm run format` / `npm run format:check` | Prettier                                                  |
| `npm run typecheck`                       | `tsc --noEmit`                                            |
| `npm run db:migrate`                      | Apply new migrations (run after every pull)               |
| `npm run db:seed`                         | Insert seed users and customers (safe to run twice)       |
| `npm run db:reset`                        | Wipe schema, migrate, seed (**deletes data, local only**) |

### Docker

Local Docker Postgres is for the test database (`crm_test`), plus an optional private `crm` sandbox.

```bash
docker compose up -d       # start Postgres in the background
docker compose down        # stop it (data is kept)
docker compose down -v     # stop it and delete all data, including crm_test
```

After `down -v`, run `docker compose up -d` and `npm run db:reset` to start fresh.

### Project layout

```
src/
  app.ts              Express app factory (middleware, routes)
  server.ts           Entry point
  config.ts           Validated env config (zod)
  db/                 pool, migrate runner, seed, migrations/*.sql
  middleware/         auth (requireAuth, requireRole), error handling
  modules/<name>/     routes + service + schema per resource
tests/                vitest + supertest (runs against crm_test)
.github/workflows/    CI
```

### Auth API

Cookie-based sessions stored in Postgres (`session` table). Roles: `associate` (default for signups), `manager`, `technician` (field crew).

| Method | Path               | Body                        | Result                                      |
| ------ | ------------------ | --------------------------- | ------------------------------------------- |
| POST   | `/api/auth/signup` | `{ email, password, name }` | 201 `{ user }`, logs in; 409 if email taken |
| POST   | `/api/auth/login`  | `{ email, password }`       | 200 `{ user }`; 401 on bad credentials      |
| POST   | `/api/auth/logout` | -                           | 204, session destroyed                      |
| GET    | `/api/auth/me`     | -                           | 200 `{ user }`; 401 if not logged in        |
| GET    | `/health`          | -                           | 200 `{ status: "ok" }`                      |

### Customers API

Customers are homeowners. Every route requires a logged-in user. Anyone can read customers, but only `associate` and `manager` can create, edit, or delete them (technicians get 403).

| Method | Path                 | Body                | Result                            |
| ------ | -------------------- | ------------------- | --------------------------------- |
| GET    | `/api/customers`     | -                   | 200 `{ customers }`, newest first |
| GET    | `/api/customers/:id` | -                   | 200 `{ customer }`; 404           |
| POST   | `/api/customers`     | customer fields     | 201 `{ customer }`                |
| PATCH  | `/api/customers/:id` | any customer fields | 200 `{ customer }`; 404           |
| DELETE | `/api/customers/:id` | -                   | 204; 404                          |

Customer fields (JSON is `camelCase`):

| Field              | Type / allowed values                 | Notes                          |
| ------------------ | ------------------------------------- | ------------------------------ |
| `firstName`        | string                                | required                       |
| `lastName`         | string                                | required                       |
| `email`            | email                                 | email **or** phone is required |
| `phone`            | string                                | email **or** phone is required |
| `address`          | string                                | optional                       |
| `service`          | `hvac` \| `lawn` \| `garage_door`     | default `hvac`                 |
| `status`           | `lead` \| `active` \| `past_customer` | default `lead`                 |
| `preferredContact` | `text` \| `call` \| `email`           | default `text`                 |
| `followUpDate`     | `YYYY-MM-DD`                          | optional                       |
| `notes`            | string                                | optional                       |

Empty strings in optional fields are saved as `null`, so a form can clear a field by sending `""`.

### Jobs API

> 🚧 **Scaffold only.** The routes, roles, and validation are in place, but there's no `jobs` table yet. `GET /api/jobs` returns an empty list, `POST` echoes back the validated body, and the other routes return 501. Real behavior comes with migration `004_jobs.sql`.

A job is one scheduled visit to a customer (the ERD calls it "Services"). Office staff manage all jobs. Technicians will see and update only the jobs assigned to them, and can only change `status` and `notes`.

Fields: `customerId` (required), `serviceType` (`hvac` \| `lawn` \| `garage_door`, required), `scheduledAt` (ISO 8601 with time zone, required), `assignedTo` (technician user id), `status` (`scheduled` \| `in_progress` \| `completed` \| `cancelled`, default `scheduled`), `notes`.

## Troubleshooting

| Problem                                                 | Fix                                                                                                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git push` rejected: "protected branch"                 | You committed on `dev` or `main`. Run `git checkout -b feature/<name>` to move your commits onto a new branch, push that, and reset local `dev` with `git checkout dev && git reset --hard origin/dev`. |
| `TypeError: Invalid URL` on startup                     | `DATABASE_URL` is malformed. Usually the password contains `@ # / : ? %`, so URL-encode it, or reset it to letters and numbers only. Also check the line uses `=`, not `:`.                             |
| `self-signed certificate in certificate chain`          | The Supabase URI ends in `sslmode=require`. Change it to `?sslmode=no-verify`.                                                                                                                          |
| `password authentication failed` / timeouts to Supabase | Someone changed the password (get the new URI), or the free project paused (resume it in the dashboard).                                                                                                |
| VS Code says `.env` is read-only                        | `.env.example` is read-only, and `cp` copied that permission. Run `chmod u+w .env`, then reopen the file.                                                                                               |
| `ECONNREFUSED ... 5432`                                 | Postgres isn't running. Start Docker Desktop, then run `docker compose up -d`.                                                                                                                          |
| `docker compose up` says port 5432 is already in use    | Another Postgres is running on your machine. Stop it, or change the left side of `'5432:5432'` in `docker-compose.yml` and the port in your `.env`.                                                     |
| `Invalid environment configuration`                     | `.env` is missing, or `SESSION_SECRET` is shorter than 16 characters. See [First-time setup](#first-time-setup).                                                                                        |
| `relation "..." does not exist`                         | Your database is missing a migration. Run `npm run db:migrate`, or `npm run db:reset` if that doesn't fix it.                                                                                           |
| CI is red but everything passes locally                 | Run `npm ci` to match CI's clean install, then `npm run format:check`. Click **Details** on the pull request to see the exact failing step.                                                             |
