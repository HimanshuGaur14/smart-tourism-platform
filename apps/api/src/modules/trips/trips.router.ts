import {
  idParamSchema,
  itineraryInputSchema,
  itineraryUpdateSchema,
  slugParamSchema,
  type Itinerary,
  type ItinerarySummary,
} from '@smart-tourism/contracts';
import { Router } from 'express';
import type { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import { authOf, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { summaryInclude, toSummary } from '../destinations/destinations.mapper.js';

const itineraryInclude = {
  items: {
    orderBy: { position: 'asc' },
    include: { destination: { include: summaryInclude } },
  },
} satisfies Prisma.ItineraryInclude;
type ItineraryRow = Prisma.ItineraryGetPayload<{ include: typeof itineraryInclude }>;

const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

function toItinerary(row: ItineraryRow): Itinerary {
  return {
    id: row.id,
    title: row.title,
    startDate: isoDate(row.startDate),
    durationDays: row.durationDays,
    interests: row.interests,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      position: item.position,
      dayNumber: item.dayNumber,
      notes: item.notes,
      available: item.destination.published,
      destination: toSummary(item.destination),
    })),
  };
}

/** /me/saved-destinations: a signed-in user's bookmarks. */
export function savedDestinationsRouter(db: Db): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (_req, res) => {
    const rows = await db.savedDestination.findMany({
      where: { userId: authOf(res.locals).user.id, destination: { published: true } },
      include: { destination: { include: summaryInclude } },
      orderBy: { createdAt: 'desc' },
    });
    res.set('Cache-Control', 'no-store').json({
      data: rows.map((r) => ({ ...toSummary(r.destination), savedAt: r.createdAt.toISOString() })),
    });
  });

  // PUT is idempotent: saving twice is not an error.
  router.put('/:slug', validate({ params: slugParamSchema }), async (_req, res) => {
    const { slug } = res.locals.valid.params as z.output<typeof slugParamSchema>;
    const userId = authOf(res.locals).user.id;
    const destination = await db.destination.findFirst({
      where: { slug, published: true },
      include: summaryInclude,
    });
    if (!destination) throw AppError.notFound('Destination not found');
    const saved = await db.savedDestination.upsert({
      where: { userId_destinationId: { userId, destinationId: destination.id } },
      create: { userId, destinationId: destination.id },
      update: {},
    });
    res.json({ data: { ...toSummary(destination), savedAt: saved.createdAt.toISOString() } });
  });

  router.delete('/:slug', validate({ params: slugParamSchema }), async (_req, res) => {
    const { slug } = res.locals.valid.params as z.output<typeof slugParamSchema>;
    await db.savedDestination.deleteMany({
      where: { userId: authOf(res.locals).user.id, destination: { slug } },
    });
    res.status(204).end();
  });

  return router;
}

/** /me/itineraries: CRUD on the signed-in user's own itineraries. Others' ids give 404. */
export function itinerariesRouter(db: Db): Router {
  const router = Router();
  router.use(requireAuth);

  /** Resolves stop slugs to published destination ids, reporting unknown ones per field. */
  async function resolveItems(items: z.output<typeof itineraryInputSchema>['items']) {
    const slugs = [...new Set(items.map((i) => i.destinationSlug))];
    const found = await db.destination.findMany({
      where: { slug: { in: slugs }, published: true },
      select: { id: true, slug: true },
    });
    const ids = new Map(found.map((d) => [d.slug, d.id]));
    const missing = items.flatMap((item, i) =>
      ids.has(item.destinationSlug)
        ? []
        : [{ path: `items.${i}.destinationSlug`, message: 'Unknown destination' }],
    );
    if (missing.length) throw AppError.badRequest('Some destinations do not exist', missing);
    return items.map((item, position) => ({
      destinationId: ids.get(item.destinationSlug)!,
      position,
      dayNumber: item.dayNumber,
      notes: item.notes,
    }));
  }

  async function findOwn(id: string, userId: string) {
    const row = await db.itinerary.findFirst({ where: { id, userId }, include: itineraryInclude });
    if (!row) throw AppError.notFound('Itinerary not found');
    return row;
  }

  router.get('/', async (_req, res) => {
    const rows = await db.itinerary.findMany({
      where: { userId: authOf(res.locals).user.id },
      include: { _count: { select: { items: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.set('Cache-Control', 'no-store').json({
      data: rows.map((r): ItinerarySummary => ({
        id: r.id,
        title: r.title,
        startDate: isoDate(r.startDate),
        durationDays: r.durationDays,
        interests: r.interests,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        itemCount: r._count.items,
      })),
    });
  });

  router.post('/', validate({ body: itineraryInputSchema }), async (_req, res) => {
    const input = res.locals.valid.body as z.output<typeof itineraryInputSchema>;
    const userId = authOf(res.locals).user.id;
    const count = await db.itinerary.count({ where: { userId } });
    if (count >= 50) throw AppError.badRequest('You can keep up to 50 itineraries');
    const items = await resolveItems(input.items);
    const row = await db.itinerary.create({
      data: {
        userId,
        title: input.title,
        startDate: input.startDate ? new Date(input.startDate) : null,
        durationDays: input.durationDays,
        interests: input.interests,
        notes: input.notes,
        items: { create: items },
      },
      include: itineraryInclude,
    });
    res.status(201).json({ data: toItinerary(row) });
  });

  router.get('/:id', validate({ params: idParamSchema }), async (_req, res) => {
    const { id } = res.locals.valid.params as { id: string };
    res
      .set('Cache-Control', 'no-store')
      .json({ data: toItinerary(await findOwn(id, authOf(res.locals).user.id)) });
  });

  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: itineraryUpdateSchema }),
    async (_req, res) => {
      const { id } = res.locals.valid.params as { id: string };
      const input = res.locals.valid.body as z.output<typeof itineraryUpdateSchema>;
      const current = await findOwn(id, authOf(res.locals).user.id);

      const durationDays =
        input.durationDays !== undefined ? input.durationDays : current.durationDays;
      const dayChecked = input.items ?? current.items;
      if (durationDays) {
        const bad = dayChecked.flatMap((item, i) =>
          item.dayNumber && item.dayNumber > durationDays
            ? [
                {
                  path: `items.${i}.dayNumber`,
                  message: `Day must be within the ${durationDays}-day trip`,
                },
              ]
            : [],
        );
        if (bad.length) throw AppError.badRequest('Request validation failed', bad);
      }
      const items = input.items ? await resolveItems(input.items) : undefined;

      const row = await db.$transaction(async (tx) => {
        if (items) await tx.itineraryItem.deleteMany({ where: { itineraryId: id } });
        return tx.itinerary.update({
          where: { id },
          data: {
            ...(input.title !== undefined && { title: input.title }),
            ...(input.startDate !== undefined && {
              startDate: input.startDate ? new Date(input.startDate) : null,
            }),
            ...(input.durationDays !== undefined && { durationDays: input.durationDays }),
            ...(input.interests !== undefined && { interests: input.interests }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(items && { items: { create: items } }),
          },
          include: itineraryInclude,
        });
      });
      res.json({ data: toItinerary(row) });
    },
  );

  router.delete('/:id', validate({ params: idParamSchema }), async (_req, res) => {
    const { id } = res.locals.valid.params as { id: string };
    await findOwn(id, authOf(res.locals).user.id);
    await db.itinerary.delete({ where: { id } });
    res.status(204).end();
  });

  return router;
}
