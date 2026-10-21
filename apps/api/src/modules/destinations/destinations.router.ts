import {
  destinationListQuerySchema,
  featuredQuerySchema,
  nearbyQuerySchema,
  slugParamSchema,
} from '@smart-tourism/contracts';
import { Router } from 'express';
import type { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import type { DestinationsService } from './destinations.service.js';

const publicCache = 'public, max-age=60';

export function destinationsRouter(service: DestinationsService): Router {
  const router = Router();

  router.get('/', validate({ query: destinationListQuerySchema }), async (_req, res) => {
    const query = res.locals.valid.query as z.output<typeof destinationListQuerySchema>;
    res.set('Cache-Control', publicCache).json(await service.list(query));
  });

  router.get('/featured', validate({ query: featuredQuerySchema }), async (_req, res) => {
    const { kind, limit } = res.locals.valid.query as z.output<typeof featuredQuerySchema>;
    res.set('Cache-Control', publicCache).json({ data: await service.highlighted(kind, limit) });
  });

  // Declared before /:slug, so "states" is a reserved slug.
  router.get('/states', async (_req, res) => {
    res.set('Cache-Control', publicCache).json({ data: await service.states() });
  });

  router.get('/:slug', validate({ params: slugParamSchema }), async (_req, res) => {
    const { slug } = res.locals.valid.params as z.output<typeof slugParamSchema>;
    res.set('Cache-Control', publicCache).json({ data: await service.getBySlug(slug) });
  });

  router.get(
    '/:slug/nearby',
    validate({ params: slugParamSchema, query: nearbyQuerySchema }),
    async (_req, res) => {
      const { slug } = res.locals.valid.params as z.output<typeof slugParamSchema>;
      const { limit, radiusKm } = res.locals.valid.query as z.output<typeof nearbyQuerySchema>;
      res
        .set('Cache-Control', publicCache)
        .json({ data: await service.nearby(slug, limit, radiusKm) });
    },
  );

  return router;
}
