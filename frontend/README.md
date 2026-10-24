# Sierra frontend

React, TypeScript, and Vite frontend for the CRM.

## Run locally

Start PostgreSQL and the backend using the [root setup instructions](../README.md#first-time-setup). The API must be running on port 3000.

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite. No frontend environment variables are required for authentication. The Vite proxy forwards relative `/api/...` requests to `http://localhost:3000`.

## Authentication

- `/`: public landing page with login and signup links. The email form carries the entered email to signup.
- `/login`: email and password login.
- `/signup`: name, email, password, and password confirmation. Signup signs the user in automatically; new accounts are associates.
- `/dashboard`: protected account screen showing the signed-in user's name, email, role, and logout button.

The frontend uses the existing `/api/auth/signup`, `/login`, `/me`, and `/logout` endpoints. The browser manages the HttpOnly session cookie; passwords and session credentials are never saved in browser storage.

`AuthProvider` checks `/me` on startup and restores the current user after a reload. Protected pages wait for that check before rendering. Connection failures display a retry option. An unauthorized response ends the local session; a forbidden response does not log the user out. Login failures stay on the form.

Active sessions are rechecked when the tab gains focus, becomes visible, and every minute while visible. Authentication changes are synchronized across tabs with BroadcastChannel where available, with focus checks as a fallback. Logout clears local account state only after the server confirms success. Return URLs are limited to the implemented dashboard route.

## Checks

```bash
npm run build
npm run lint
npx playwright install --with-deps chromium
npm test
```

The Playwright suite uses mocked HTTP responses matching the backend contract, including a real browser cookie. It covers login/signup validation, session restoration, loading and failure states, expiration, logout, multiple tabs, redirects, and mobile layout. It does not require a database. Backend integration tests live in the root `tests/` directory.

Root lint and formatting checks also apply:

```bash
cd ..
npm run lint
npm run format:check
```

## Deployment

Serve the built `dist/` directory with a fallback to `index.html` for frontend routes. Forward `/api/*` to the backend before that fallback. Vite's development proxy is not part of the production build. Use HTTPS because the backend sets secure cookies in production, and keep backend secrets in the backend environment.
