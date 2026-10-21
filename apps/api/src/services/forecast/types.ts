import type { DestinationForecast } from '@smart-tourism/contracts';

export interface ForecastDestination {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
}

export interface ForecastRequest {
  destinations: ForecastDestination[];
  /** First forecast date (UTC, date only). */
  startDate: string;
  horizonDays: number;
}

/**
 * Replaceable forecast provider. Implementations must label their output honestly:
 * DemoForecastService returns source DEMO; HttpForecastService returns MODEL or UNAVAILABLE.
 * Implementations must not throw for provider failures; they return UNAVAILABLE instead.
 */
export interface ForecastService {
  readonly kind: 'demo' | 'http';
  forecast(request: ForecastRequest): Promise<DestinationForecast[]>;
}
