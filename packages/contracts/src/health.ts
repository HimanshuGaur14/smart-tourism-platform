import { z } from 'zod';
import { dataEnvelope } from './common.js';

export const healthSchema = z.object({
  /** `degraded` (HTTP 503) when the database is unreachable. */
  status: z.enum(['ok', 'degraded']),
  service: z.string(),
  version: z.string(),
  environment: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.iso.datetime(),
  database: z.enum(['up', 'down']),
  forecastProvider: z.enum(['demo', 'http']),
});
export type Health = z.infer<typeof healthSchema>;

export const healthResponseSchema = dataEnvelope(healthSchema);
export type HealthResponse = z.infer<typeof healthResponseSchema>;
