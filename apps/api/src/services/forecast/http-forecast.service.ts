import { crowdLevelSchema, type DestinationForecast } from '@smart-tourism/contracts';
import type { Logger } from 'pino';
import { z } from 'zod';
import type { ForecastRequest, ForecastService } from './types.js';

/** Response contract of the ML service (see docs/ml-integration.md). */
export const mlForecastResponseSchema = z.object({
  modelVersion: z.string().min(1).max(100),
  generatedAt: z.iso.datetime({ offset: true }),
  forecasts: z
    .array(
      z.object({
        destinationId: z.string(),
        forecastDate: z.iso.date(),
        predictedVisitors: z.number().int().nonnegative(),
        crowdLevel: crowdLevelSchema,
        interval: z
          .object({
            lower: z.number().int().nonnegative(),
            upper: z.number().int().nonnegative(),
            level: z.number().gt(0).lt(1),
          })
          .refine((i) => i.lower <= i.upper, 'interval.lower must be <= interval.upper')
          .optional(),
      }),
    )
    .max(10_000),
});

export type UnavailableReason = 'timeout' | 'service_error' | 'invalid_response';

/** Calls the teammate's FastAPI model service. Never throws; failures become UNAVAILABLE. */
export class HttpForecastService implements ForecastService {
  readonly kind = 'http' as const;

  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    private readonly logger?: Logger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async forecast(request: ForecastRequest): Promise<DestinationForecast[]> {
    const unavailable = (reason: UnavailableReason): DestinationForecast[] =>
      request.destinations.map((d) => ({
        destination: { id: d.id, slug: d.slug, name: d.name },
        source: 'UNAVAILABLE',
        modelVersion: null,
        generatedAt: null,
        unavailableReason: reason,
        points: [],
      }));

    let body: unknown;
    try {
      const res = await this.fetchImpl(new URL('/v1/forecast', this.baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          destinations: request.destinations.map((d) => ({
            destinationId: d.id,
            slug: d.slug,
            latitude: d.latitude,
            longitude: d.longitude,
          })),
          startDate: request.startDate,
          horizonDays: request.horizonDays,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) {
        this.logger?.warn({ status: res.status }, 'ML forecast service returned an error status');
        return unavailable('service_error');
      }
      body = await res.json();
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
      this.logger?.warn(
        { err },
        timedOut ? 'ML forecast service timed out' : 'ML forecast service unreachable',
      );
      return unavailable(timedOut ? 'timeout' : 'service_error');
    }

    const parsed = mlForecastResponseSchema.safeParse(body);
    if (!parsed.success) {
      this.logger?.warn(
        { issues: parsed.error.issues.slice(0, 5) },
        'ML forecast response failed validation',
      );
      return unavailable('invalid_response');
    }

    const { modelVersion, generatedAt, forecasts } = parsed.data;
    return request.destinations.map((d) => {
      const points = forecasts
        .filter((f) => f.destinationId === d.id)
        .sort((a, b) => a.forecastDate.localeCompare(b.forecastDate))
        .map((f) => ({
          date: f.forecastDate,
          predictedVisitors: f.predictedVisitors,
          crowdLevel: f.crowdLevel,
          interval: f.interval ?? null,
        }));
      if (points.length === 0) {
        return {
          destination: { id: d.id, slug: d.slug, name: d.name },
          source: 'UNAVAILABLE',
          modelVersion: null,
          generatedAt: null,
          unavailableReason: 'missing_from_response',
          points: [],
        };
      }
      return {
        destination: { id: d.id, slug: d.slug, name: d.name },
        source: 'MODEL',
        modelVersion,
        generatedAt: new Date(generatedAt).toISOString(),
        unavailableReason: null,
        points,
      };
    });
  }
}
