import {
  enquiryInputSchema,
  enquiryStatusUpdateSchema,
  idParamSchema,
} from '@smart-tourism/contracts';
import { Router } from 'express';
import type { z } from 'zod';
import type { AppConfig } from '../../config/env.js';
import { rateLimit } from '../../lib/rate-limit.js';
import { authOf, requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import type { EnquiriesService } from './enquiries.service.js';

/** POST /enquiries (public, rate-limited). */
export function enquiriesRouter(service: EnquiriesService, config: AppConfig): Router {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 60 * 60_000,
    max: config.env === 'test' ? 1000 : 20,
    key: (req) => req.ip ?? 'unknown',
  });
  router.post('/', limiter, validate({ body: enquiryInputSchema }), async (_req, res) => {
    const input = res.locals.valid.body as z.output<typeof enquiryInputSchema>;
    res.status(201).json({ data: await service.create(input, res.locals.auth?.user) });
  });
  return router;
}

/** /me/enquiries: what I sent. */
export function myEnquiriesRouter(service: EnquiriesService): Router {
  const router = Router();
  router.get('/', requireAuth, async (_req, res) => {
    res
      .set('Cache-Control', 'no-store')
      .json({ data: await service.listSent(authOf(res.locals).user) });
  });
  return router;
}

/** /vendor/enquiries: what my listings received. */
export function vendorEnquiriesRouter(service: EnquiriesService): Router {
  const router = Router();
  router.use(requireRole('VENDOR', 'ADMIN'));
  router.get('/', async (_req, res) => {
    res
      .set('Cache-Control', 'no-store')
      .json({ data: await service.listReceived(authOf(res.locals).user) });
  });
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: enquiryStatusUpdateSchema }),
    async (_req, res) => {
      const { id } = res.locals.valid.params as { id: string };
      const { status } = res.locals.valid.body as z.output<typeof enquiryStatusUpdateSchema>;
      res.json({ data: await service.setStatus(id, status, authOf(res.locals).user) });
    },
  );
  return router;
}
