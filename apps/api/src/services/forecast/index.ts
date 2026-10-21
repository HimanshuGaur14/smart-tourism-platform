import type { Logger } from 'pino';
import type { AppConfig } from '../../config/env.js';
import { DemoForecastService } from './demo-forecast.service.js';
import { HttpForecastService } from './http-forecast.service.js';
import type { ForecastService } from './types.js';

export function createForecastService(config: AppConfig, logger?: Logger): ForecastService {
  if (config.forecast.provider === 'http') {
    // buildConfig guarantees the URL is present for the http provider.
    return new HttpForecastService(
      config.forecast.mlServiceUrl!,
      config.forecast.timeoutMs,
      logger,
    );
  }
  return new DemoForecastService();
}

export { DemoForecastService, HttpForecastService };
export type { ForecastService };
