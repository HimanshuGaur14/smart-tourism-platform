import { describe, expect, it } from 'vitest';
import { buildConfig as build } from '../src/config/env.js';

const DB = 'postgresql://user:pass@localhost:5432/db';
const buildConfig = (env: NodeJS.ProcessEnv) => build({ DATABASE_URL: DB, ...env });

describe('buildConfig', () => {
  it('applies safe local defaults', () => {
    const config = buildConfig({});
    expect(config.port).toBe(4000);
    expect(config.webOrigin).toBe('http://localhost:5173');
    expect(config.cookieSecure).toBe(false);
    expect(config.forecast.provider).toBe('demo');
  });

  it('normalises WEB_ORIGIN to a bare origin', () => {
    expect(buildConfig({ WEB_ORIGIN: 'http://localhost:5173/some/path' }).webOrigin).toBe(
      'http://localhost:5173',
    );
  });

  it('forces Secure cookies in production', () => {
    const config = buildConfig({ NODE_ENV: 'production', COOKIE_SECURE: 'false' });
    expect(config.cookieSecure).toBe(true);
  });

  it('requires ML_SERVICE_URL when the http forecast provider is selected', () => {
    expect(() => buildConfig({ FORECAST_PROVIDER: 'http' })).toThrow(/ML_SERVICE_URL/);
    expect(
      buildConfig({ FORECAST_PROVIDER: 'http', ML_SERVICE_URL: 'http://localhost:8000' }).forecast
        .mlServiceUrl,
    ).toBe('http://localhost:8000');
  });

  it('treats an empty ML_SERVICE_URL as unset', () => {
    expect(buildConfig({ ML_SERVICE_URL: '' }).forecast.mlServiceUrl).toBeUndefined();
    expect(() => buildConfig({ FORECAST_PROVIDER: 'http', ML_SERVICE_URL: '' })).toThrow(
      /ML_SERVICE_URL is required/,
    );
  });

  it('requires a postgresql DATABASE_URL', () => {
    expect(() => build({})).toThrow(/DATABASE_URL is required/);
    expect(() => build({ DATABASE_URL: 'mysql://x' })).toThrow(/postgresql/);
  });

  it('rejects invalid values with a readable message', () => {
    expect(() => buildConfig({ API_PORT: 'abc' })).toThrow(/API_PORT/);
  });
});
