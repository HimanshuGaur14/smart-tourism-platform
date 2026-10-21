# ML forecasting integration

This document describes how a separate machine-learning service (for example a FastAPI app
built by a teammate) plugs into the Smart Tourism Platform to provide crowd forecasts.

No model is connected today. Out of the box the API uses `DemoForecastService`, and every
number it produces is labelled `DEMO` and described as illustrative in the UI. This document is
the proposed contract; it has been implemented on the platform side (`HttpForecastService`) and
covered by tests with a mocked service, but it has not been tested against a real ML service.

## Architecture

```
Browser ──► Express API ──► ForecastService (interface)
                               ├─ DemoForecastService   (default, source = DEMO)
                               └─ HttpForecastService   (source = MODEL or UNAVAILABLE)
                                        │  POST {ML_SERVICE_URL}/v1/forecast
                                        ▼
                                  ML service (FastAPI)
```

- The interface lives in `apps/api/src/services/forecast/types.ts`.
- The browser never calls the ML service directly. The Express API validates the ML response
  before anything reaches the UI.
- A provider is chosen at start-up in `apps/api/src/services/forecast/index.ts`.

## Configuration

| Variable                | Default | Meaning                                                         |
| ----------------------- | ------- | --------------------------------------------------------------- |
| `FORECAST_PROVIDER`     | `demo`  | `demo` uses DemoForecastService; `http` uses the ML service.    |
| `ML_SERVICE_URL`        | none    | Base URL of the ML service. Required when the provider is http. |
| `ML_SERVICE_TIMEOUT_MS` | `3000`  | Per-request timeout (100 to 30000 ms).                          |

The API refuses to start if `FORECAST_PROVIDER=http` and `ML_SERVICE_URL` is missing.

## Request: `POST /v1/forecast`

Headers: `Content-Type: application/json`, `Accept: application/json`.

```json
{
  "destinations": [
    { "destinationId": "cm2x9…", "slug": "netarhat", "latitude": 23.48, "longitude": 84.27 }
  ],
  "startDate": "2026-10-22",
  "horizonDays": 14
}
```

| Field                          | Type                 | Notes                                          |
| ------------------------------ | -------------------- | ---------------------------------------------- |
| `destinations`                 | array, 1 to 10 items | Published destinations only.                   |
| `destinations[].destinationId` | string               | Platform id. Echo it back in the response.     |
| `destinations[].slug`          | string               | Human-readable key, for logging.               |
| `destinations[].latitude`      | number               | Coordinates are not yet verified for all rows. |
| `destinations[].longitude`     | number               |                                                |
| `startDate`                    | `YYYY-MM-DD` (UTC)   | Today up to today + 365 days.                  |
| `horizonDays`                  | integer, 1 to 90     | Number of consecutive days from `startDate`.   |

## Response: `200 OK`

```json
{
  "modelVersion": "crowd-gbm-2026-10-01",
  "generatedAt": "2026-10-21T09:30:00Z",
  "forecasts": [
    {
      "destinationId": "cm2x9…",
      "forecastDate": "2026-10-22",
      "predictedVisitors": 1840,
      "crowdLevel": "MODERATE",
      "interval": { "lower": 1500, "upper": 2200, "level": 0.8 }
    }
  ]
}
```

Validation applied by the platform (`mlForecastResponseSchema` in
`apps/api/src/services/forecast/http-forecast.service.ts`):

| Field                           | Rule                                                                     |
| ------------------------------- | ------------------------------------------------------------------------ |
| `modelVersion`                  | Non-empty string, at most 100 characters.                                |
| `generatedAt`                   | ISO 8601 date-time with offset.                                          |
| `forecasts`                     | Array, at most 10,000 items.                                             |
| `forecasts[].destinationId`     | Must match a requested id; unknown ids are ignored.                      |
| `forecasts[].forecastDate`      | `YYYY-MM-DD`.                                                            |
| `forecasts[].predictedVisitors` | Non-negative integer.                                                    |
| `forecasts[].crowdLevel`        | `LOW`, `MODERATE`, `HIGH` or `VERY_HIGH`.                                |
| `forecasts[].interval`          | Optional. `lower <= upper`, both non-negative integers, `0 < level < 1`. |

Send `interval` only if the model genuinely produces one (for example quantile regression or
conformal prediction). The UI never invents an interval or a confidence figure.

## Failure handling

`HttpForecastService` never throws. Any failure turns into `source: "UNAVAILABLE"` with an
`unavailableReason`, and the UI says the forecast is unavailable. It does **not** fall back to
demo numbers, so a broken model can never be mistaken for a working one.

| Situation                                  | `unavailableReason`     |
| ------------------------------------------ | ----------------------- |
| No response within `ML_SERVICE_TIMEOUT_MS` | `timeout`               |
| Network error or non-2xx status            | `service_error`         |
| Body fails the schema above                | `invalid_response`      |
| Valid body, but no rows for a destination  | `missing_from_response` |

## What the platform returns to the browser

`GET /api/v1/forecasts/:slug?days=7` and `GET /api/v1/forecasts?destinations=a,b&days=14`
return `DestinationForecast` objects (`packages/contracts/src/forecasts.ts`):

```json
{
  "destination": { "id": "cm2x9…", "slug": "netarhat", "name": "Netarhat" },
  "source": "MODEL",
  "modelVersion": "crowd-gbm-2026-10-01",
  "generatedAt": "2026-10-21T09:30:00.000Z",
  "unavailableReason": null,
  "points": [
    {
      "date": "2026-10-22",
      "predictedVisitors": 1840,
      "crowdLevel": "MODERATE",
      "interval": { "lower": 1500, "upper": 2200, "level": 0.8 }
    }
  ]
}
```

## Honesty rules

1. Every forecast carries `source`. The UI shows a badge for it everywhere a number appears.
2. `DEMO` values are deterministic, generated from simple seasonal patterns, and described as
   illustrative. They are never called predictions.
3. `MODEL` output is shown with its `modelVersion` and described as an estimate.
4. The platform does not display accuracy, confidence percentages or visitor counts unless the
   model provides them and they have been validated. No accuracy metric exists today.
5. The historical charts on the intelligence dashboard (`/analytics/footfall` and
   `/analytics/destinations`) remain `DEMO` even when a model is connected, because no real
   footfall dataset is loaded. Replacing them needs a real data source, not just a model.

## Example FastAPI stub

A minimal service that satisfies the contract, useful for local integration testing. It
returns obviously fake constant values, so do not present its output as a real forecast.

```python
# ml_stub.py  —  run with: uvicorn ml_stub:app --port 8000
from datetime import date, datetime, timedelta, timezone
from typing import Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()

class Destination(BaseModel):
    destinationId: str
    slug: str
    latitude: float
    longitude: float

class ForecastRequest(BaseModel):
    destinations: list[Destination] = Field(min_length=1, max_length=10)
    startDate: date
    horizonDays: int = Field(ge=1, le=90)

class Point(BaseModel):
    destinationId: str
    forecastDate: date
    predictedVisitors: int = Field(ge=0)
    crowdLevel: Literal["LOW", "MODERATE", "HIGH", "VERY_HIGH"]

class ForecastResponse(BaseModel):
    modelVersion: str
    generatedAt: datetime
    forecasts: list[Point]

@app.post("/v1/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest) -> ForecastResponse:
    points = [
        Point(destinationId=d.destinationId,
              forecastDate=req.startDate + timedelta(days=i),
              predictedVisitors=100, crowdLevel="LOW")
        for d in req.destinations for i in range(req.horizonDays)
    ]
    return ForecastResponse(modelVersion="stub-0", generatedAt=datetime.now(timezone.utc),
                            forecasts=points)
```

Then set `FORECAST_PROVIDER=http` and `ML_SERVICE_URL=http://localhost:8000` in `.env` and
restart the API. The destination pages will show a "Model forecast" badge with version `stub-0`.

## Open questions for the ML teammate

- Which training data is available, and for which destinations? (No real footfall data is in
  the platform today.)
- Should the platform cache forecasts in the existing `Forecast` table, and for how long?
- Does the service need authentication? If so, we will add a shared secret header read from an
  environment variable, never committed to the repo.
