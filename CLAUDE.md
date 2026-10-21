# CLAUDE.md: Smart Tourism Platform conventions

Pan-India tourism discovery and intelligence platform for Smart India Hackathon PS 25032.
Working name in the UI: **Yatra Atlas** (placeholder brand, defined in `apps/web/src/components/brand/logo.tsx`).

## Layout

- `packages/contracts`: framework-free Zod schemas and types shared by web and api. Must never import server-only code (Express, Prisma, Node APIs). Compiled to `dist/` with `tsc`; the root `dev`, `test`, `typecheck` and `build` scripts build it first.
- `apps/api`: Express 5 + TypeScript REST API, mounted at `/api/v1`. ESM with `NodeNext` resolution, so relative imports use `.js` extensions.
- `apps/web`: React 19 + Vite 8 + Tailwind CSS 4 + React Router 7 (`react-router` package, data router) + TanStack Query.
- `docs/`: architecture, API and ML integration contract.

## Stack decisions (do not change without reason)

- No Next.js, MongoDB, second ORM or alternative frameworks. Database is PostgreSQL via Prisma 7.
- Prisma 7 specifics: URL and seed command live in `apps/api/prisma.config.ts` (not in `schema.prisma`); the client is generated to `apps/api/src/generated/prisma` (git-ignored) and constructed with `@prisma/adapter-pg` in `src/lib/prisma.ts`. Import types from `../generated/prisma/client.js`.
- Migrations: create with `npm run db:migrate`, apply with `npm run db:deploy`. Never run `migrate reset`/`db push --force-reset` against a database you did not create.
- API tests run against `TEST_DATABASE_URL` (name must contain `test`); `tests/global-setup.ts` applies migrations and the idempotent seed. Tests that create rows must clean them up.
- The seed upserts by slug and never deletes. It does not overwrite `published` or `coordinatesVerified`.
- Tailwind v4 is configured in CSS (`apps/web/src/styles/index.css`, `@theme static`). There is no `tailwind.config.js`.
- Vitest 5 for both apps (Vitest 4 triggered an npm peer-resolution crash). ESLint 10 flat config at the root.
- One root `.env` for all apps. The API loads it with `process.loadEnvFile`; Vite uses `envDir` = repo root, and only `VITE_*` reaches the browser.
- In development the browser talks only to the Vite origin; Vite proxies `/api` to Express. Keep frontend calls same-origin (`/api/v1/...`) through `apiRequest` in `apps/web/src/lib/api-client.ts`.

## API conventions

- Success: `{ "data": ... }`, lists add `{ "meta": { page, pageSize, total, totalPages } }`.
- Error: `{ "error": { code, message, details?, requestId? } }` built only in `middleware/error-handler.ts`. Throw `AppError` for client-safe errors; anything else becomes a generic 500 with no internals.
- Validate every request with `validate({ body, query, params })`. Parsed values live in `res.locals.valid` (Express 5 `req.query` is read-only).
- Enforce auth, role and ownership checks on the server, by querying with the owner id, never trusting ids from the client alone.
- Config comes only from `config/env.ts` (`buildConfig`), which validates env with Zod. Do not read `process.env` elsewhere.
- `createApp({ config, logger })` is side-effect free so tests use Supertest without starting a server.

## Security rules

- Sessions: HttpOnly cookies only (Phase 3). `Secure` is forced in production. SameSite=Lax + CSRF token header (`X-CSRF-Token`) for state-changing requests.
- CORS: exactly `WEB_ORIGIN`, credentials on, never `*`.
- Hash passwords with Argon2id. Never log cookies or auth headers (pino redaction is configured).
- Never commit `.env` or secrets. `.env.example` contains placeholders only.
- Never run migrations against an unknown database or run destructive DB commands without explicit user approval.

## Data honesty rules

- Destination data comes from PostgreSQL through the API, not hardcoded arrays in React.
- Seeded coordinates are approximate (`coordinatesVerified: false`) and no photos are seeded; only set the flag or add images after checking a source.
- Every forecast carries a source: `DEMO`, `MODEL` or `UNAVAILABLE` (`forecastSourceSchema`). The UI must show `ForecastSourceBadge`/`DemoDataBadge`. Never fall back to demo values labelled as model output.
- No fake testimonials, partnerships, statistics, accuracy figures or live bookings.
- Images: register every photo with source, credit and licence (`ImageRef` in `apps/web/src/lib/images.ts`), render via `SmartImage` (graceful fallback). Only use verified URLs.

## Frontend conventions

- Reusable UI lives in `apps/web/src/components/ui` (exported from `index.ts`); see `/styleguide` for the living reference.
- Feature code goes in `apps/web/src/features/<feature>`; route components in `apps/web/src/routes`.
- Every data view handles loading, empty, error and success states (`LoadingState`, `EmptyState`, `ErrorState`, `Skeleton`).
- Accessibility: labelled controls via `Field`, visible focus (global `:focus-visible`), keyboard-operable menus and dialogs (native `<dialog>`), `prefers-reduced-motion` respected.
- Keep URL state in search params for filters so results are shareable.
- Every route sets its tab title with `useDocumentTitle`. `RootLayout` moves focus to `<main>` when the path changes.
- E2E: `apps/web/e2e` (Playwright 1.56, pinned to match the installed Chromium; `playwright-core` overridden for `@axe-core/playwright`). Tests block OSM tiles and must keep serious/critical axe violations at zero.

## Commands

```bash
npm install
npm run dev          # contracts watch + api (4000) + web (5173)
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run check        # all of the above
```

## Phase status

- Phase 1 (done): monorepo, TS configs, Tailwind, Express health endpoint, routing, design system, scripts, docs.
- Phase 2 (done): Prisma schema + initial migration, seed (35 destinations), destinations/categories API, Home/Explore/detail pages with Leaflet map.
- Phase 3 (done, redefined by the user as the frontend phase): API-driven category tiles, page titles, focus management after navigation, Playwright e2e + axe scans.
- Phase 5 (done): accounts (Argon2id, HttpOnly cookie sessions, CSRF), marketplace with sample listings, persistent enquiries, vendor dashboard, admin destination/category/moderation tools, ForecastService (Demo + Http), analytics endpoints, intelligence dashboard with Recharts.
- Phase 6 (done): saved destinations, itinerary CRUD and the trip planner; full verification pass; Windows-compatible setup (`.gitattributes` LF, shell-safe test setup, README commands for PowerShell/cmd).
- Not done: real ML model integration (deliberately deferred), verified destination photos and coordinates.
