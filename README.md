# Smart Tourism Platform

A pan-India tourism discovery and intelligence platform built for Smart India Hackathon problem statement **PS 25032**. Users discover destinations, plan trips, find local hosts and artisans, and see crowd outlooks that are clearly labelled as demo or model output.

> **Status: Phase 6 (verified).** Destinations, Explore, accounts, saved destinations, the trip planner, the local marketplace with enquiries, vendor and admin tools, and the tourism intelligence dashboard all work end to end against PostgreSQL. Forecasts are **demo data** until a real model is connected (see [docs/ml-integration.md](docs/ml-integration.md)).

## Stack

| Layer    | Choice                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, TanStack Query 5, React Leaflet 5 |
| Backend  | Node.js, Express 5, TypeScript, Zod 4, pino                                                     |
| Database | PostgreSQL 16 + Prisma 7 (node-postgres driver adapter)                                         |
| Tooling  | npm workspaces, ESLint 10, Prettier, Vitest 5, Testing Library, Supertest                       |

## Repository layout

```
apps/
  api/        Express REST API (/api/v1)
  web/        React single-page app
packages/
  contracts/  Shared Zod schemas and types (no server code)
docs/         Architecture, API reference, ML integration contract
```

## Prerequisites

| Tool       | Version                                           | Notes                                                                                    |
| ---------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Node.js    | 20.12 or newer (22 LTS recommended, see `.nvmrc`) | Windows: the official installer from nodejs.org.                                         |
| npm        | 10+                                               | Comes with Node.js.                                                                      |
| PostgreSQL | 14+ (16 recommended)                              | Either Docker Desktop (Option A) or a normal install (Option B).                         |
| Git        | any recent                                        | The repo's `.gitattributes` keeps LF line endings on Windows, so formatting checks pass. |

All `npm run …` scripts work the same in Windows PowerShell, Command Prompt, macOS and Linux. Only the few shell commands below differ; each is given for both.

## Getting started

### 1. Install and create `.env`

macOS / Linux:

```bash
npm install
cp .env.example .env
```

Windows (PowerShell):

```powershell
npm install
Copy-Item .env.example .env
```

`npm install` also generates the Prisma client. Then open `.env` in an editor and replace the `<user>` and `<password>` placeholders in `DATABASE_URL`, `TEST_DATABASE_URL` and (for Docker) `POSTGRES_USER` / `POSTGRES_PASSWORD`. Leave everything else as it is for local development.

### 2. Create the databases

You need two databases: `smart_tourism` for the app and `smart_tourism_test` for automated tests. The test database name must contain `test`; the test suite refuses to run otherwise.

**Option A: Docker Desktop (Windows, macOS, Linux).** With `POSTGRES_USER` and `POSTGRES_PASSWORD` set in `.env` and the same values in both database URLs:

```bash
npm run db:up        # starts postgres:16 and creates both databases on first start
```

**Option B: an existing PostgreSQL install** (on Windows, the EDB installer from postgresql.org; it includes `psql` and pgAdmin). Connect as the `postgres` superuser, for example with `psql -U postgres` or pgAdmin's Query Tool, and run:

```sql
CREATE ROLE tourism LOGIN CREATEDB PASSWORD 'choose-a-password';
CREATE DATABASE smart_tourism OWNER tourism;
CREATE DATABASE smart_tourism_test OWNER tourism;
```

Then set in `.env`:

```
DATABASE_URL=postgresql://tourism:choose-a-password@localhost:5432/smart_tourism?schema=public
TEST_DATABASE_URL=postgresql://tourism:choose-a-password@localhost:5432/smart_tourism_test?schema=public
```

`CREATEDB` is only needed for `npm run db:migrate` (creating new migrations), which uses a temporary shadow database.

### 3. Apply migrations and seed

```bash
npm run db:setup     # prisma migrate deploy + seed
```

This adds 9 categories, 35 destinations and 8 clearly marked sample marketplace listings. The seed upserts by slug and never deletes rows, so it is safe to re-run.

### 4. Run the app

```bash
npm run dev
```

- Web: http://localhost:5173
- API health: http://localhost:4000/api/v1/health (also reachable through the web dev server at http://localhost:5173/api/v1/health)

`npm run dev:api` and `npm run dev:web` start one side only. Stop with Ctrl+C.

### 5. Accounts

Register at http://localhost:5173/register as a tourist or a vendor. Admin accounts cannot be self-registered; create one from the command line. The password must be at least 10 characters and is never stored in the repo.

macOS / Linux:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run user:create-admin
```

Windows (PowerShell):

```powershell
$env:ADMIN_EMAIL = 'you@example.com'; $env:ADMIN_PASSWORD = 'a-long-password'
npm run user:create-admin
Remove-Item Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
```

Windows (Command Prompt):

```bat
set ADMIN_EMAIL=you@example.com
set ADMIN_PASSWORD=a-long-password
npm run user:create-admin
set ADMIN_EMAIL=
set ADMIN_PASSWORD=
```

If the email already belongs to an account, that account is promoted to admin, its password is replaced and its sessions are signed out.

The 8 seeded **sample** listings belong to `sample-vendor@example.invalid`, an account with a random password that nobody can sign in to. They carry a visible "Sample listing" badge; enquiries sent to them are saved but nobody replies.

### 6. Run the checks

```bash
npm run check        # typecheck, lint, format check, API + web tests, production build
```

Browser tests need Chromium once, then PostgreSQL running (they start the dev servers themselves):

```bash
npx playwright install chromium
npm run test:e2e
```

Browser tests register throwaway `e2e-…@example.com` accounts in your development database.

### Troubleshooting

| Symptom                                                    | Fix                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Test database setup failed … Can't reach database server` | PostgreSQL is not running, or `TEST_DATABASE_URL` is wrong.                                            |
| API exits with `Invalid environment configuration`         | The message names the variable; compare `.env` with `.env.example`.                                    |
| Port 5432, 4000 or 5173 already in use                     | Stop the other program, or change `API_PORT` / the Compose port mapping.                               |
| `prettier --check` fails on every file (Windows)           | The checkout has CRLF endings from before `.gitattributes`: run `git add --renormalize .` or re-clone. |
| PowerShell blocks `npm` with an execution-policy error     | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.                                        |

### Database commands

| Command              | What it does                                                        |
| -------------------- | ------------------------------------------------------------------- |
| `npm run db:deploy`  | Apply pending migrations (`prisma migrate deploy`, non-destructive) |
| `npm run db:seed`    | Upsert seed data                                                    |
| `npm run db:setup`   | Both of the above                                                   |
| `npm run db:migrate` | Create a new migration while developing (`prisma migrate dev`)      |
| `npm run db:status`  | Show migration status                                               |
| `npm run db:studio`  | Open Prisma Studio                                                  |
| `npm run db:up/down` | Start/stop the Docker Compose database                              |

Avoid `prisma migrate reset` unless you intend to wipe the database.

## Environment variables

All apps read the single root `.env`. Only variables prefixed `VITE_` are exposed to the browser.

| Variable                | Used by | Purpose                                                     |
| ----------------------- | ------- | ----------------------------------------------------------- |
| `NODE_ENV`              | api     | Set by the environment, not in `.env` (see `.env.example`)  |
| `API_PORT`              | api     | API port (default 4000)                                     |
| `WEB_ORIGIN`            | api     | Exact origin allowed by CORS with credentials               |
| `DATABASE_URL`          | api     | PostgreSQL connection string (required)                     |
| `TEST_DATABASE_URL`     | tests   | Separate test database; name must contain `test`            |
| `COOKIE_SECURE`         | api     | `true` behind HTTPS; always on in production                |
| `FORECAST_PROVIDER`     | api     | `demo` or `http`                                            |
| `ML_SERVICE_URL`        | api     | Forecast model service base URL (required when `http`)      |
| `ML_SERVICE_TIMEOUT_MS` | api     | Timeout for model calls (default 3000)                      |
| `LOG_LEVEL`             | api     | pino log level                                              |
| `VITE_API_PROXY_TARGET` | web     | Where the Vite dev server proxies `/api` (default API port) |
| `POSTGRES_*`            | docker  | Credentials for the optional Compose database               |

The API validates its configuration on start-up and exits with a readable message if something is wrong.

## Scripts

| Command             | What it does                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`       | contracts watcher, API and web together                                                                            |
| `npm run build`     | builds contracts, API (`apps/api/dist`) and web (`apps/web/dist`)                                                  |
| `npm start`         | runs the built API                                                                                                 |
| `npm run typecheck` | TypeScript checks in every workspace                                                                               |
| `npm run lint`      | ESLint                                                                                                             |
| `npm run format`    | Prettier write (`format:check` to verify)                                                                          |
| `npm test`          | Vitest suites (API needs TEST_DATABASE_URL)                                                                        |
| `npm run test:e2e`  | Playwright browser tests + axe accessibility scan (needs the database; run `npx playwright install chromium` once) |
| `npm run check`     | typecheck, lint, format check, tests and build                                                                     |

## Documentation

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [ML integration contract](docs/ml-integration.md)
- [Conventions for contributors and AI assistants](CLAUDE.md)

## Destination data

The 35 seeded destinations (19 states and union territories) live in `apps/api/prisma/seed-data/destinations.ts`, each with Wikipedia source links. They were written from general reference knowledge because the build environment could not reach external sites, so:

- coordinates are approximate and stored with `coordinatesVerified = false`; the UI says "Approximate location";
- no photos are seeded; cards show a styled placeholder until verified, attributed photos are added.

Please review the facts and coordinates against the cited sources before any public demo.

## Data honesty

Forecasts and analytics are always labelled **Demo forecast**, **Model forecast** or **Forecast unavailable**. Demo values are illustrative only. The tourism intelligence dashboard (`/intelligence`) shows only demo data today and says so on every chart. See [docs/ml-integration.md](docs/ml-integration.md) for connecting a real model. The project makes no claims about real visitor numbers, bookings or partnerships.
