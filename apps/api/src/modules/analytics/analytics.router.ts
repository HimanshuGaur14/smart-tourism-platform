import { destinationCategorySlugSchema, footfallQuerySchema } from '@smart-tourism/contracts';
import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import type { ForecastService } from '../../services/forecast/index.js';
import type { AnalyticsService } from './analytics.service.js';

const insightsQuery = z.object({
  state: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => v || undefined),
  category: destinationCategorySlugSchema.optional(),
});

export function analyticsRouter(service: AnalyticsService, forecasts: ForecastService): Router {
  const router = Router();

  // Platform counts include user numbers, so they are admin-only.
  router.get('/overview', requireRole('ADMIN'), async (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ data: await service.overview(forecasts.kind) });
  });

  router.get('/footfall', validate({ query: footfallQuerySchema }), async (_req, res) => {
    const q = res.locals.valid.query as z.output<typeof footfallQuerySchema>;
    res.json({
      data: await service.footfall({ slugs: q.destinations, from: q.from, months: q.months }),
    });
  });

  router.get('/destinations', validate({ query: insightsQuery }), async (_req, res) => {
    res.json({
      data: await service.destinationInsights(
        res.locals.valid.query as z.output<typeof insightsQuery>,
      ),
    });
  });

  return router;
}
