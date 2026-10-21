# API reference

Base path: `/api/v1`. All responses are JSON.

## Conventions

Success:

```json
{ "data": {} }
```

Paginated lists add:

```json
{ "data": [], "meta": { "page": 1, "pageSize": 12, "total": 0, "totalPages": 0 } }
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "page", "message": "Too small: expected number to be >=1" }],
    "requestId": "2b0e…"
  }
}
```

| Status | Code                  | When                                     |
| ------ | --------------------- | ---------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Request failed Zod validation            |
| 400    | `BAD_REQUEST`         | Malformed JSON or other client error     |
| 401    | `UNAUTHENTICATED`     | No valid session                         |
| 403    | `FORBIDDEN`           | Role or ownership check failed           |
| 403    | `CSRF_INVALID`        | Missing or wrong CSRF token              |
| 404    | `NOT_FOUND`           | Unknown route or resource                |
| 409    | `CONFLICT`            | Uniqueness violation (e.g. email taken)  |
| 503    | `SERVICE_UNAVAILABLE` | A dependency (database, model) is down   |
| 500    | `INTERNAL_ERROR`      | Unexpected error (details never exposed) |

Every response carries an `X-Request-Id` header.

## Implemented

### `GET /api/v1/health`

Returns `200` with `status: "ok"` when the database answers `SELECT 1`, otherwise `503` with `status: "degraded"` and `database: "down"`. `Cache-Control: no-store`.

```json
{
  "data": {
    "status": "ok",
    "service": "smart-tourism-api",
    "version": "0.1.0",
    "environment": "development",
    "uptimeSeconds": 12,
    "timestamp": "2026-10-21T10:30:54.172Z",
    "database": "up",
    "forecastProvider": "demo"
  }
}
```

### `GET /api/v1/destinations`

Published destinations, paginated.

| Query       | Type                                        | Default    | Notes                                                                                                          |
| ----------- | ------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `q`         | string, ≤100                                |            | Case-insensitive match on name, state, district, short description, category name; exact tag match             |
| `state`     | string, ≤60                                 |            | Exact, case-insensitive                                                                                        |
| `district`  | string, ≤60                                 |            | Exact, case-insensitive                                                                                        |
| `category`  | category slug                               |            | `nature`, `wildlife`, `waterfalls`, `heritage`, `spirituality`, `culture`, `adventure`, `beaches`, `mountains` |
| `featured`  | `true` \| `false`                           |            |                                                                                                                |
| `hiddenGem` | `true` \| `false`                           |            |                                                                                                                |
| `sort`      | `featured` \| `name` \| `state` \| `newest` | `featured` | Ties broken by name, then id (stable pagination)                                                               |
| `page`      | int ≥1                                      | 1          | A page past the end returns `data: []`                                                                         |
| `pageSize`  | int 1–50                                    | 12         |                                                                                                                |

Response: `{ data: DestinationSummary[], meta: { page, pageSize, total, totalPages } }`.

`DestinationSummary`: `id, slug, name, state, district, category {slug, name}, shortDescription, latitude, longitude, coordinatesVerified, tags[], featured, hiddenGem, image | null`.

### `GET /api/v1/destinations/featured`

`kind=featured|hidden-gems` (default `featured`), `limit` 1–24 (default 8). Returns `{ data: DestinationSummary[] }`.

### `GET /api/v1/destinations/states`

`{ data: [{ state, destinationCount }] }` for published destinations, alphabetical. (`states` is therefore a reserved slug.)

### `GET /api/v1/destinations/:slug`

Slug must match `^[a-z0-9]+(-[a-z0-9]+)*$` (else 400). Unknown or unpublished → 404. Returns `DestinationSummary` plus `description, images[], bestTimeToVisit, responsibleTips[], sourceUrls[], updatedAt`.

### `GET /api/v1/destinations/:slug/nearby`

`limit` 1–12 (default 4), `radiusKm` 1–2000 (default 500). Nearest published destinations by great-circle distance, each with `distanceKm` (rounded). This is not road distance.

### `GET /api/v1/categories`

All categories in display order with the number of published destinations: `{ data: [{ id, slug, name, description, destinationCount }] }`.

Public read endpoints send `Cache-Control: public, max-age=60` (categories: 300).

## Authentication and CSRF

Sessions use an HttpOnly, SameSite=Lax cookie (`st_session`) holding a random token; the database stores only its SHA-256 hash. Passwords are hashed with Argon2id (19 MiB, 2 iterations).

Every state-changing request (POST, PATCH, DELETE) from a signed-in user must send the session's CSRF token in the `X-CSRF-Token` header. The token comes from `GET /auth/me`, `POST /auth/login` and `POST /auth/register`. The `Origin` header must also match `CORS_ORIGIN`.

| Endpoint              | Auth | Notes                                                                                                                             |
| --------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/register` | none | `{ name, email, password (min 10), role: TOURIST \| VENDOR }`. Admins are created with `npm run user:create-admin`. Rate-limited. |
| `POST /auth/login`    | none | `{ email, password }`. Rotates the session. Rate-limited.                                                                         |
| `POST /auth/logout`   | any  | 204. Revokes the session and clears the cookie.                                                                                   |
| `GET /auth/me`        | none | `{ data: { user \| null, csrfToken \| null } }`                                                                                   |

## Marketplace and enquiries

| Endpoint                      | Auth           | Notes                                                                                      |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| `GET /listings`               | none           | Approved, active listings. Query: `q`, `type`, `state`, `destination`, `page`, `pageSize`. |
| `GET /listings/:slug`         | none           | One approved listing. Sample listings have `isSample: true`.                               |
| `POST /listings`              | VENDOR, ADMIN  | Creates a listing in `PENDING` moderation. `imageUrl` must be https.                       |
| `PATCH /listings/:id`         | owner or ADMIN | Content edits by a vendor send the listing back to `PENDING`. Non-owners get 404.          |
| `DELETE /listings/:id`        | owner or ADMIN | 204.                                                                                       |
| `GET /me/listings`            | VENDOR, ADMIN  | Own listings with moderation status and enquiry counts.                                    |
| `POST /enquiries`             | none or any    | `{ listingId, name, email, phone?, travelDate?, groupSize?, message }`. Persisted.         |
| `GET /me/enquiries`           | any            | Enquiries the signed-in user sent.                                                         |
| `GET /vendor/enquiries`       | VENDOR, ADMIN  | Enquiries received on own listings.                                                        |
| `PATCH /vendor/enquiries/:id` | listing owner  | `{ status: NEW \| RESPONDED \| CLOSED }`.                                                  |

## Admin (ADMIN role only)

| Endpoint                                                 | Notes                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `GET /admin/destinations`                                | Includes unpublished. Query: `q`, `published`, `page`, `pageSize`.       |
| `GET /admin/destinations/:id`                            | One destination by id.                                                   |
| `POST /admin/destinations`                               | Coordinates must fall in India's bounding box. Duplicate slug gives 409. |
| `PATCH /admin/destinations/:id`                          | Partial update, including `published`.                                   |
| `DELETE /admin/destinations/:id`                         | 204, or 409 if itineraries reference it.                                 |
| `GET /admin/categories`, `PATCH /admin/categories/:slug` | Rename or re-describe a category.                                        |
| `GET /admin/listings`                                    | Moderation queue. Query: `status`, `page`, `pageSize`.                   |
| `PATCH /admin/listings/:id/moderation`                   | `{ moderationStatus, moderationNote? }`.                                 |

## Forecasts and analytics

Every response carries `source` (`DEMO`, `MODEL` or `UNAVAILABLE`). See [ml-integration.md](ml-integration.md).

| Endpoint                      | Auth  | Notes                                                                                       |
| ----------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| `GET /forecasts`              | none  | `destinations` (comma-separated slugs, max 10; default featured), `from`, `days` (1 to 90). |
| `GET /forecasts/:slug`        | none  | One destination. `from` must be between today and today + 365.                              |
| `GET /analytics/footfall`     | none  | Illustrative monthly series and seasonality. Always `DEMO` today.                           |
| `GET /analytics/destinations` | none  | Insights, crowd distribution, anomalies and quieter alternatives. Always `DEMO` today.      |
| `GET /analytics/overview`     | ADMIN | Real platform counts from the database (not visitor numbers).                               |

## Saved destinations and itineraries (any signed-in user)

Each user only ever sees their own rows. Another user's itinerary id returns 404, not 403, so ids cannot be probed.

| Endpoint                              | Notes                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GET /me/saved-destinations`          | Saved, still-published destinations, newest first, each with `savedAt`.                           |
| `PUT /me/saved-destinations/:slug`    | Idempotent save. 404 for unknown or unpublished destinations.                                     |
| `DELETE /me/saved-destinations/:slug` | 204, also when it was not saved.                                                                  |
| `GET /me/itineraries`                 | Summaries with `itemCount`, most recently updated first.                                          |
| `POST /me/itineraries`                | `{ title, startDate?, durationDays? (1 to 30), interests?, notes?, items? }`. Max 50 per user.    |
| `GET /me/itineraries/:id`             | Full itinerary with ordered `items` (`position`, `dayNumber`, `notes`, `available`, destination). |
| `PATCH /me/itineraries/:id`           | Partial update. `items`, when sent, replaces the whole list in the given order.                   |
| `DELETE /me/itineraries/:id`          | 204.                                                                                              |

Items are `{ destinationSlug, dayNumber?, notes? }`, at most 30. Unknown slugs fail with a field error such as `items.1.destinationSlug`; a `dayNumber` beyond `durationDays` fails with `items.N.dayNumber`. `available: false` marks a stop whose destination an admin has since unpublished.
