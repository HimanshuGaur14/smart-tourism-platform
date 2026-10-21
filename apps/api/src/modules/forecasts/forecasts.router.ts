import {
  forecastListQuerySchema,
  forecastQuerySchema,
  slugParamSchema,
} from '@smart-tourism/contracts';
import { Router } from 'express';
import type { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import type { ForecastService } from '../../services/forecast/index.js';

const destinationSelect = {
  id: true,
  slug: true,
  name: true,
  latitude: true,
  longitude: true,
  category: { select: { slug: true } },
} as const;

function startDate(from: string | undefined): string {
  const today = new Date().toISOString().slice(0, 10);
  if (!from) return today;
  const diffDays = (Date.parse(from) - Date.parse(today)) / 86_400_000;
  if (diffDays < 0 || diffDays > 365) {
    throw AppError.badRequest('Invalid start date', [
      { path: 'from', message: 'Use a date between today and one year ahead' },
    ]);
  }
  return from;
}

/** Forecasts always go through Express; the browser never calls the ML service. */
export function forecastsRouter(db: Db, forecasts: ForecastService): Router {
  const router = Router();
  const toInput = (
    rows: Array<{
      id: string;
      slug: string;
      name: string;
      latitude: number;
      longitude: number;
      category: { slug: string };
    }>,
  ) => rows.map((r) => ({ ...r, category: r.category.slug }));

  router.get('/', async (req, res) => {
    const query = forecastListQuerySchema.parse(req.query) as z.output<
      typeof forecastListQuerySchema
    >;
    const rows = await db.destination.findMany({
      where: {
        published: true,
        ...(query.destinations ? { slug: { in: query.destinations } } : { featured: true }),
      },
      select: destinationSelect,
      orderBy: { name: 'asc' },
      take: 10,
    });
    const data = await forecasts.forecast({
      destinations: toInput(rows),
      startDate: startDate(query.from),
      horizonDays: query.days,
    });
    res.set('Cache-Control', 'no-store').json({ data });
  });

  router.get('/:slug', async (req, res) => {
    const { slug } = slugParamSchema.parse(req.params);
    const query = forecastQuerySchema.parse(req.query);
    const row = await db.destination.findFirst({
      where: { slug, published: true },
      select: destinationSelect,
    });
    if (!row) throw AppError.notFound('Destination not found');
    const [data] = await forecasts.forecast({
      destinations: toInput([row]),
      startDate: startDate(query.from),
      horizonDays: query.days,
    });
    res.set('Cache-Control', 'no-store').json({ data });
  });

  return router;
}
