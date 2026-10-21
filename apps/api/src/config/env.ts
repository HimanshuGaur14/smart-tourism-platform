import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  DATABASE_URL: z
    .string({ error: 'DATABASE_URL is required (see .env.example)' })
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must be a postgresql:// URL'),
  COOKIE_SECURE: booleanString,
  FORECAST_PROVIDER: z.enum(['demo', 'http']).default('demo'),
  // An empty `ML_SERVICE_URL=` line in .env means "not set".
  ML_SERVICE_URL: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
  ML_SERVICE_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  /** Exact origin allowed by CORS. Never a wildcard, because credentials are enabled. */
  webOrigin: string;
  databaseUrl: string;
  cookieSecure: boolean;
  forecast: {
    provider: 'demo' | 'http';
    mlServiceUrl: string | undefined;
    timeoutMs: number;
  };
  logLevel: string;
  version: string;
}

export class ConfigError extends Error {}

/** Parses and validates configuration. Pure, so tests can pass their own env. */
export function buildConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new ConfigError(`Invalid environment configuration:\n${issues}`);
  }
  const e = parsed.data;
  const isProduction = e.NODE_ENV === 'production';

  if (e.FORECAST_PROVIDER === 'http' && !e.ML_SERVICE_URL) {
    throw new ConfigError('ML_SERVICE_URL is required when FORECAST_PROVIDER=http.');
  }

  return {
    env: e.NODE_ENV,
    isProduction,
    port: e.API_PORT,
    webOrigin: new URL(e.WEB_ORIGIN).origin,
    databaseUrl: e.DATABASE_URL,
    // HTTPS production always uses Secure cookies; local HTTP dev may opt out.
    cookieSecure: isProduction || e.COOKIE_SECURE,
    forecast: {
      provider: e.FORECAST_PROVIDER,
      mlServiceUrl: e.ML_SERVICE_URL,
      timeoutMs: e.ML_SERVICE_TIMEOUT_MS,
    },
    logLevel: e.NODE_ENV === 'test' ? 'silent' : e.LOG_LEVEL,
    version: process.env.npm_package_version ?? '0.1.0',
  };
}

/** Loads the monorepo root .env (if present) into process.env. Existing vars win. */
export function loadRootEnvFile(): void {
  const rootEnv = fileURLToPath(new URL('../../../../.env', import.meta.url));
  if (existsSync(rootEnv)) {
    process.loadEnvFile(rootEnv);
  }
}
