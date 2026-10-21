import {
  idParamSchema,
  listingInputSchema,
  listingListQuerySchema,
  listingUpdateSchema,
} from '@smart-tourism/contracts';
import { Router } from 'express';
import { z } from 'zod';
import { authOf, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import type { ListingsService } from './listings.service.js';

const idOrSlugParam = z.object({
  id: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9-]+$/),
});

export function listingsRouter(service: ListingsService): Router {
  const router = Router();
  const vendorOrAdmin = requireRole('VENDOR', 'ADMIN');

  router.get('/', validate({ query: listingListQuerySchema }), async (_req, res) => {
    res.json(
      await service.listPublic(res.locals.valid.query as z.output<typeof listingListQuerySchema>),
    );
  });

  router.get('/:id', validate({ params: idOrSlugParam }), async (_req, res) => {
    const { id } = res.locals.valid.params as { id: string };
    res.json({ data: await service.getVisible(id, res.locals.auth?.user) });
  });

  router.post('/', vendorOrAdmin, validate({ body: listingInputSchema }), async (_req, res) => {
    const input = res.locals.valid.body as z.output<typeof listingInputSchema>;
    res.status(201).json({ data: await service.create(authOf(res.locals).user, input) });
  });

  router.patch(
    '/:id',
    vendorOrAdmin,
    validate({ params: idParamSchema, body: listingUpdateSchema }),
    async (_req, res) => {
      const { id } = res.locals.valid.params as { id: string };
      const input = res.locals.valid.body as z.output<typeof listingUpdateSchema>;
      res.json({ data: await service.update(id, authOf(res.locals).user, input) });
    },
  );

  router.delete('/:id', vendorOrAdmin, validate({ params: idParamSchema }), async (_req, res) => {
    const { id } = res.locals.valid.params as { id: string };
    await service.remove(id, authOf(res.locals).user);
    res.status(204).end();
  });

  return router;
}

/** GET /me/listings: the signed-in vendor's own listings, any status. */
export function myListingsRouter(service: ListingsService): Router {
  const router = Router();
  router.get('/', requireRole('VENDOR', 'ADMIN'), async (_req, res) => {
    res
      .set('Cache-Control', 'no-store')
      .json({ data: await service.listOwn(authOf(res.locals).user) });
  });
  return router;
}
