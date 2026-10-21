import { Router } from 'express';
import type { HealthResponse } from '@smart-tourism/contracts';
import type { AppConfig } from '../../config/env.js';
import type { Db } from '../../lib/prisma.js';

async function databaseIsUp(db: Db): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export function healthRouter(config: AppConfig, db: Db): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const dbUp = await databaseIsUp(db);
    const payload: HealthResponse = {
      data: {
        status: dbUp ? 'ok' : 'degraded',
        service: 'smart-tourism-api',
        version: config.version,
        environment: config.env,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        database: dbUp ? 'up' : 'down',
        forecastProvider: config.forecast.provider,
      },
    };
    res
      .status(dbUp ? 200 : 503)
      .set('Cache-Control', 'no-store')
      .json(payload);
  });

  return router;
}
