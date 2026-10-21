# Architecture

## Overview

```
Browser (React SPA, :5173)
   │  same-origin /api/v1/* (Vite proxy in dev), cookies included
   ▼
Express API (:4000) ── Prisma 7 + @prisma/adapter-pg ──► PostgreSQL
   │
   └── ForecastService ──► DemoForecastService       (Phase 5)
                       └─► HttpForecastService ──► teammate's FastAPI model (ML_SERVICE_URL)
```

- The browser never talks to the database or the ML service directly.
- `packages/contracts` holds Zod schemas shared by both sides: the API validates its output against the same shapes the web client validates on receipt.

## Backend (apps/api)

- `src/config/env.ts`: Zod-validated configuration (`buildConfig`) and root `.env` loading.
- `src/app.ts`: `createApp({ config, logger })` composes middleware: pino-http (request ids), helmet, CORS (single origin, credentials), JSON body limit 100 kB, cookie parser, the `/api/v1` router, 404 and error handlers.
- `src/server.ts`: process entry point with graceful shutdown.
- `src/modules/<module>/`: one folder per resource (router, service, schemas).
- `src/middleware/`: `validate` (Zod) and the central `errorHandler`.
- `src/lib/`: `AppError`, logger.

## Frontend (apps/web)

- `src/app/`: providers (TanStack Query), router, navigation config.
- `src/layouts/`: root layout, header with accessible mobile menu, footer.
- `src/components/ui/`: design system (Button, Badge, Card, Field/Input/Select/Textarea, Dialog, states, SmartImage, data-source badges, layout primitives).
- `src/features/<feature>/`: hooks and components per domain.
- `src/routes/`: page components.
- `src/lib/`: API client (`apiRequest` validates responses with Zod), query client, image registry.

## Database

Schema: `apps/api/prisma/schema.prisma`; migrations in `apps/api/prisma/migrations`; Prisma config (URL, seed command) in `apps/api/prisma.config.ts`. The generated client goes to `apps/api/src/generated/prisma` (git-ignored, created by `npm install`/`prisma generate`).

| Table                         | Purpose / key constraints                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`                        | unique email, `role` enum TOURIST/VENDOR/ADMIN                                                                                                 |
| `Session`                     | id = hash of cookie token; cascade on user delete                                                                                              |
| `DestinationCategory`         | unique slug; Restrict delete while destinations use it                                                                                         |
| `Destination`                 | unique slug; indexes on (published, featured), (published, hiddenGem), state, category, name; GIN on tags; `coordinatesVerified`, `sourceUrls` |
| `DestinationImage`            | ordered photos with credit/licence/source; cascade                                                                                             |
| `SavedDestination`            | composite PK (userId, destinationId); cascade both ways                                                                                        |
| `Itinerary` / `ItineraryItem` | items cascade with itinerary; Restrict on destination (unpublish instead of delete)                                                            |
| `VendorListing`               | unique slug; owner cascade; destination SetNull; moderation status + active flag                                                               |
| `Enquiry`                     | cascade with listing; user SetNull (guest enquiries allowed)                                                                                   |
| `Forecast`                    | separate from Destination; unique (destination, date, sourceType, modelVersion)                                                                |

A `Review` table was left out until there is a moderation plan for user content.

## Security model (implemented progressively)

| Concern       | Approach                                                                    |
| ------------- | --------------------------------------------------------------------------- |
| Sessions      | Random token in an HttpOnly cookie; only its SHA-256 is stored server-side  |
| Passwords     | Argon2id                                                                    |
| CSRF          | SameSite=Lax cookies + per-session token sent in `X-CSRF-Token`             |
| CORS          | Exactly `WEB_ORIGIN`, credentials enabled, never `*` (Phase 1, done)        |
| Authorisation | Role checks + ownership-scoped queries in services                          |
| Errors        | Central handler, generic 500 message, request id for log correlation (done) |
| Headers       | helmet defaults (done)                                                      |

## Design decisions

- **Same-origin in development** via the Vite proxy avoids third-party cookie issues and keeps SameSite=Lax effective. In production, serve the web build and API behind one origin (reverse proxy) or set `WEB_ORIGIN` accordingly.
- **Contracts compiled to `dist`** so Node can load them at runtime without a TypeScript loader in production.
- **Images**: the build environment could not reach Wikimedia Commons, so Phase 1 ships an original SVG illustration. Destination photos will be stored per destination with source and licence and rendered via `SmartImage`, which falls back gracefully.
