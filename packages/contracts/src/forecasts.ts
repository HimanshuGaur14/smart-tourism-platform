import { z } from 'zod';
import { dataEnvelope } from './common.js';
import { crowdLevelSchema, forecastSourceSchema } from './domain.js';

export const forecastPointSchema = z.object({
  date: z.iso.date(),
  predictedVisitors: z.number().int().nonnegative(),
  crowdLevel: crowdLevelSchema,
  /** Only present when the model genuinely provides an interval. */
  interval: z
    .object({ lower: z.number().int(), upper: z.number().int(), level: z.number().gt(0).lt(1) })
    .nullable(),
});
export type ForecastPoint = z.infer<typeof forecastPointSchema>;

/**
 * A forecast for one destination. `source` is mandatory:
 * DEMO = illustrative values, MODEL = ML service output, UNAVAILABLE = no data (points empty).
 */
export const destinationForecastSchema = z.object({
  destination: z.object({ id: z.string(), slug: z.string(), name: z.string() }),
  source: forecastSourceSchema,
  modelVersion: z.string().nullable(),
  generatedAt: z.iso.datetime().nullable(),
  /** Why the forecast is unavailable (timeout, service_error, invalid_response, not_configured). */
  unavailableReason: z.string().nullable(),
  points: z.array(forecastPointSchema),
});
export type DestinationForecast = z.infer<typeof destinationForecastSchema>;

export const forecastQuerySchema = z.object({
  from: z.iso.date().optional(),
  days: z.coerce.number().int().min(1).max(90).default(14),
});
export const forecastListQuerySchema = forecastQuerySchema.extend({
  /** Comma-separated destination slugs (max 10). Defaults to featured destinations. */
  destinations: z
    .string()
    .max(1200)
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(
      z
        .array(z.string().regex(/^[a-z0-9-]+$/))
        .max(10)
        .optional(),
    ),
});

export const destinationForecastResponseSchema = dataEnvelope(destinationForecastSchema);
export const destinationForecastArrayResponseSchema = dataEnvelope(
  z.array(destinationForecastSchema),
);
