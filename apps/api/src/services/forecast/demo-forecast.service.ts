import type { DestinationForecast } from '@smart-tourism/contracts';
import { baseDailyVisitors, crowdLevelFor, demoDailyVisitors, seasonFactor } from './demo-data.js';
import type { ForecastRequest, ForecastService } from './types.js';

export const DEMO_MODEL_VERSION = 'demo-seasonal-v1';

/** Illustrative forecasts from a seasonal pattern + deterministic noise. Always source DEMO. */
export class DemoForecastService implements ForecastService {
  readonly kind = 'demo' as const;

  async forecast({
    destinations,
    startDate,
    horizonDays,
  }: ForecastRequest): Promise<DestinationForecast[]> {
    const start = new Date(`${startDate}T00:00:00Z`);
    const generatedAt = new Date().toISOString();
    return destinations.map((d) => {
      // "Typical" = the destination's average across the year, so levels reflect season.
      const typical =
        baseDailyVisitors(d.id) *
        (Array.from({ length: 12 }, (_, m) => seasonFactor(d.category, m)).reduce((a, b) => a + b) /
          12) *
        1.1;
      const points = Array.from({ length: horizonDays }, (_, i) => {
        const date = new Date(start.getTime() + i * 86_400_000);
        const visitors = demoDailyVisitors(d.id, d.category, date);
        return {
          date: date.toISOString().slice(0, 10),
          predictedVisitors: visitors,
          crowdLevel: crowdLevelFor(visitors, typical),
          interval: null,
        };
      });
      return {
        destination: { id: d.id, slug: d.slug, name: d.name },
        source: 'DEMO' as const,
        modelVersion: DEMO_MODEL_VERSION,
        generatedAt,
        unavailableReason: null,
        points,
      };
    });
  }
}
