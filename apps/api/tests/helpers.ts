import { pino } from 'pino';
import { afterAll } from 'vitest';
import { createApp } from '../src/app.js';
import { buildConfig } from '../src/config/env.js';
import { createPrismaClient, type Db } from '../src/lib/prisma.js';
import type { ForecastService } from '../src/services/forecast/index.js';

export const TEST_ORIGIN = 'http://localhost:5173';

function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set');
  return url;
}

let shared: Db | undefined;

/** One Prisma client per test file, disconnected automatically. */
export function testDb(): Db {
  if (!shared) {
    const client = createPrismaClient(testDatabaseUrl());
    shared = client;
    afterAll(async () => {
      await client.$disconnect();
      shared = undefined;
    });
  }
  return shared;
}

export function makeTestApp(
  env: NodeJS.ProcessEnv = {},
  db: Db = testDb(),
  forecasts?: ForecastService,
) {
  const config = buildConfig({
    NODE_ENV: 'test',
    WEB_ORIGIN: TEST_ORIGIN,
    DATABASE_URL: testDatabaseUrl(),
    ...env,
  });
  return createApp({
    config,
    logger: pino({ level: 'silent' }),
    db,
    ...(forecasts && { forecasts }),
  });
}
