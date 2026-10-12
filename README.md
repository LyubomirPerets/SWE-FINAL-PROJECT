# CRM Backend

Express + TypeScript + PostgreSQL API for the unified CRM / communications platform.

**New to the team? Read [First-time setup](#first-time-setup) and [How we work](#how-we-work-git-workflow) before writing any code.** Then read the guide for your role.

## Team & ownership

| Role      | People | Owns                                                         |
| --------- | ------ | ------------------------------------------------------------ |
| Backend   | 2      | `src/modules/`, `src/middleware/`, `src/app.ts`, `tests/`    |
| Database  | 1      | `src/db/migrations/`, `src/db/seed.ts`, the schema / ERD     |
| Front-end | 2      | `frontend/` (not created yet), everything that calls the API |

Anyone can open a pull request that touches any area. If you change something another role owns, tag that person on the pull request.

## First-time setup

### Prerequisites

- **Git**
- **Node.js 20 or newer.** CI uses Node 24, so use that if you can.
- **Docker Desktop.** On Windows, turn on WSL integration in its settings.
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

Then start the database and the API:

```bash
docker compose up -d             # Postgres 16; creates the `crm` and `crm_test` databases
npm run db:reset                 # wipes the schema, runs all migrations, loads seed data
npm run dev                      # API at http://localhost:3000, reloads when you save
```

Check that it works. In a second terminal:

```bash
curl http://localhost:3000/health   # → {"status":"ok"}
npm test                            # all tests should pass
```

Seed accounts, all with password `Password123!`:

- `manager@example.com` (manager)
- `associate@example.com` (associate)
- `associate2@example.com` (associate)

## How we work (git workflow)

### Branches

- **`dev`** is where everyday work lands. It's the default branch.
- **`main`** is the release branch. It only changes when `dev` is merged into it at the end of a sprint.
- **Nobody pushes directly to `dev` or `main`.** GitHub rejects it. Every change goes through a pull request from your own branch.

### The daily loop

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

New resources (customers, interactions, ...) follow the `src/modules/users` pattern:

1. `<name>.schema.ts`: zod schemas that validate request bodies.
2. `<name>.service.ts`: the SQL queries, using `pool` from `src/db/pool.ts`.
3. `<name>.routes.ts`: an Express `Router` with the HTTP handlers.
4. Mount the router in `src/app.ts`. There's already a placeholder comment for future routes there.

Other rules:

- **Protect routes** with `requireAuth` or `requireRole('manager')` from `src/middleware/auth.ts`. They return `401 { error: 'Authentication required' }` or `403 { error: 'Forbidden' }`.
- **Errors** are always JSON `{ error: string }`. If a zod `.parse()` fails, `src/middleware/error.ts` turns it into `400 { error: 'Validation failed', details: { field: [messages] } }`, so you don't need to catch validation errors yourself.
- **Tests** go in `tests/<name>.test.ts`. Follow `tests/auth.test.ts`: use `supertest` against `createApp()`, and `TRUNCATE` your tables in `beforeEach`. Tests run against the `crm_test` database, never your dev data. Add your tables to the `TRUNCATE` list.
- **Schema changes** are owned by the database role. Agree on the tables with them first, and they'll write the migration.

### Database

- **Each schema change is a new numbered file** in `src/db/migrations/`, such as `002_customers.sql`, then `003_interactions.sql`. Files run in name order, and each one runs inside a transaction.
- **Never edit a migration after it has been merged.** `src/db/migrate.ts` records each file's name in the `schema_migrations` table and skips files it has already applied. If you edit `001_init.sql`, your teammates' databases will never get the change. To fix a merged migration, add a new one.
- **Sample data** goes in `src/db/seed.ts`. Keep it safe to run twice, for example with `ON CONFLICT DO NOTHING`.
- **Test your changes** with `npm run db:reset`, which drops everything and rebuilds it, and with `npm test`. The tests rebuild `crm_test` from the migrations on every run.
- **Look at the database directly:**
  ```bash
  docker compose exec db psql -U crm -d crm
  ```
- **Coordinate with backend.** Their services write raw SQL against your tables, so renaming a column breaks their code. Mention schema changes in the pull request description.
- After your migration is merged, **everyone else runs `npm run db:migrate`** after pulling.

### Front-end

The front-end will live in a `frontend/` folder in this repo. It hasn't been created yet.

- **Run the backend locally** using [First-time setup](#first-time-setup). The API runs at `http://localhost:3000`.
- **Auth uses cookie sessions, not tokens.** After a login or signup request, the browser stores a session cookie. Every request must send it:
  ```js
  fetch('/api/auth/me', { credentials: 'include' });
  ```
- **The backend has no CORS setup.** In development, proxy `/api` to the backend from your dev server instead of calling `http://localhost:3000` directly. The browser then sees one origin, and cookies just work. With Vite:
  ```js
  // vite.config.js
  export default {
    server: { proxy: { '/api': 'http://localhost:3000' } },
  };
  ```
- **See the [Auth API](#auth-api)** for endpoints, and log in with the seed accounts.
- **Error responses** are always JSON with an `error` field. Validation errors also include `details` with messages per field, which is useful for showing errors on forms.

> **When `frontend/` is added:** the root `npm run lint`, `npm run format:check`, and CI currently scan the whole repo. The front-end will need its own lint/format config, or the root configs will need to ignore `frontend/`. Sort this out in the first front-end pull request.

## Reference

### Scripts

| Script                                    | Purpose                                       |
| ----------------------------------------- | --------------------------------------------- |
| `npm run dev`                             | Start API with hot reload                     |
| `npm run build` / `npm start`             | Compile to `dist/` and run                    |
| `npm test`                                | Run tests (uses `TEST_DATABASE_URL`)          |
| `npm run lint` / `npm run lint:fix`       | ESLint                                        |
| `npm run format` / `npm run format:check` | Prettier                                      |
| `npm run typecheck`                       | `tsc --noEmit`                                |
| `npm run db:migrate`                      | Apply new migrations (run after every pull)   |
| `npm run db:seed`                         | Insert seed users (safe to run twice)         |
| `npm run db:reset`                        | Wipe schema, migrate, seed (**deletes data**) |

### Docker

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

Cookie-based sessions stored in Postgres (`session` table). Roles: `associate` (default), `manager`.

| Method | Path               | Body                        | Result                                      |
| ------ | ------------------ | --------------------------- | ------------------------------------------- |
| POST   | `/api/auth/signup` | `{ email, password, name }` | 201 `{ user }`, logs in; 409 if email taken |
| POST   | `/api/auth/login`  | `{ email, password }`       | 200 `{ user }`; 401 on bad credentials      |
| POST   | `/api/auth/logout` | -                           | 204, session destroyed                      |
| GET    | `/api/auth/me`     | -                           | 200 `{ user }`; 401 if not logged in        |
| GET    | `/health`          | -                           | 200 `{ status: "ok" }`                      |

## Troubleshooting

| Problem                                              | Fix                                                                                                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git push` rejected: "protected branch"              | You committed on `dev` or `main`. Run `git checkout -b feature/<name>` to move your commits onto a new branch, push that, and reset local `dev` with `git checkout dev && git reset --hard origin/dev`. |
| `ECONNREFUSED ... 5432`                              | Postgres isn't running. Start Docker Desktop, then run `docker compose up -d`.                                                                                                                          |
| `docker compose up` says port 5432 is already in use | Another Postgres is running on your machine. Stop it, or change the left side of `'5432:5432'` in `docker-compose.yml` and the port in your `.env`.                                                     |
| `Invalid environment configuration`                  | `.env` is missing, or `SESSION_SECRET` is shorter than 16 characters. See [First-time setup](#first-time-setup).                                                                                        |
| `relation "..." does not exist`                      | Your database is missing a migration. Run `npm run db:migrate`, or `npm run db:reset` if that doesn't fix it.                                                                                           |
| CI is red but everything passes locally              | Run `npm ci` to match CI's clean install, then `npm run format:check`. Click **Details** on the pull request to see the exact failing step.                                                             |
