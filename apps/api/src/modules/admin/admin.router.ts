import {
  adminDestinationListQuerySchema,
  categoryInputSchema,
  destinationCategorySlugSchema,
  destinationInputSchema,
  destinationUpdateSchema,
  idParamSchema,
  moderationQuerySchema,
  moderationUpdateSchema,
  type AdminDestination,
} from '@smart-tourism/contracts';
import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createCategoriesService } from '../categories/categories.router.js';
import { detailInclude, toDetail } from '../destinations/destinations.mapper.js';
import { toOwnedListing } from '../listings/listings.service.js';

type DestinationRow = Prisma.DestinationGetPayload<{ include: typeof detailInclude }>;
const toAdmin = (row: DestinationRow): AdminDestination => ({
  ...toDetail(row),
  published: row.published,
  createdAt: row.createdAt.toISOString(),
});

const listingInclude = {
  vendor: { select: { id: true, name: true } },
  destination: { select: { slug: true, name: true } },
  _count: { select: { enquiries: true } },
} satisfies Prisma.VendorListingInclude;

/** Everything under /admin requires the ADMIN role, checked on the server for every request. */
export function adminRouter(db: Db): Router {
  const router = Router();
  router.use(requireRole('ADMIN'));

  async function categoryId(slug: string) {
    const category = await db.destinationCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!category)
      throw AppError.badRequest('Unknown category', [
        { path: 'category', message: 'Category does not exist' },
      ]);
    return category.id;
  }

  // ---- Destinations ----
  router.get(
    '/destinations',
    validate({ query: adminDestinationListQuerySchema }),
    async (_req, res) => {
      const q = res.locals.valid.query as z.output<typeof adminDestinationListQuerySchema>;
      const where: Prisma.DestinationWhereInput = {
        ...(q.published !== undefined && { published: q.published }),
        ...(q.q && {
          OR: [
            { name: { contains: q.q, mode: 'insensitive' } },
            { state: { contains: q.q, mode: 'insensitive' } },
            { slug: { contains: q.q.toLowerCase() } },
          ],
        }),
      };
      const [total, rows] = await db.$transaction([
        db.destination.count({ where }),
        db.destination.findMany({
          where,
          include: detailInclude,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        }),
      ]);
      res.set('Cache-Control', 'no-store').json({
        data: rows.map(toAdmin),
        meta: {
          page: q.page,
          pageSize: q.pageSize,
          total,
          totalPages: Math.ceil(total / q.pageSize),
        },
      });
    },
  );

  router.get('/destinations/:id', validate({ params: idParamSchema }), async (_req, res) => {
    const { id } = res.locals.valid.params as z.output<typeof idParamSchema>;
    const row = await db.destination.findUnique({ where: { id }, include: detailInclude });
    if (!row) throw AppError.notFound('Destination not found');
    res.set('Cache-Control', 'no-store').json({ data: toAdmin(row) });
  });

  router.post('/destinations', validate({ body: destinationInputSchema }), async (_req, res) => {
    const { category, ...input } = res.locals.valid.body as z.output<typeof destinationInputSchema>;
    const row = await db.destination.create({
      data: {
        ...input,
        bestTimeToVisit: input.bestTimeToVisit ?? null,
        categoryId: await categoryId(category),
      },
      include: detailInclude,
    });
    res.status(201).json({ data: toAdmin(row) });
  });

  router.patch(
    '/destinations/:id',
    validate({ params: idParamSchema, body: destinationUpdateSchema }),
    async (_req, res) => {
      const { id } = res.locals.valid.params as { id: string };
      const { category, ...input } = res.locals.valid.body as z.output<
        typeof destinationUpdateSchema
      >;
      const row = await db.destination.update({
        where: { id },
        data: { ...input, ...(category && { categoryId: await categoryId(category) }) },
        include: detailInclude,
      });
      res.json({ data: toAdmin(row) });
    },
  );

  router.delete('/destinations/:id', validate({ params: idParamSchema }), async (_req, res) => {
    const { id } = res.locals.valid.params as { id: string };
    const used = await db.itineraryItem.count({ where: { destinationId: id } });
    if (used > 0)
      throw AppError.conflict(
        'This destination is used in itineraries. Unpublish it instead of deleting.',
      );
    await db.destination.delete({ where: { id } });
    res.status(204).end();
  });

  // ---- Categories (the slug vocabulary is fixed; names, descriptions and order are editable) ----
  router.get('/categories', async (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ data: await createCategoriesService(db).list() });
  });

  router.patch(
    '/categories/:slug',
    validate({
      params: z.object({ slug: destinationCategorySlugSchema }),
      body: categoryInputSchema.partial(),
    }),
    async (_req, res) => {
      const { slug } = res.locals.valid.params as { slug: string };
      const input = res.locals.valid.body as z.output<typeof categoryInputSchema>;
      await db.destinationCategory.update({ where: { slug }, data: input });
      const all = await createCategoriesService(db).list();
      res.json({ data: all.find((c) => c.slug === slug) });
    },
  );

  // ---- Listing moderation ----
  router.get('/listings', validate({ query: moderationQuerySchema }), async (_req, res) => {
    const q = res.locals.valid.query as z.output<typeof moderationQuerySchema>;
    const where: Prisma.VendorListingWhereInput = q.status ? { moderationStatus: q.status } : {};
    const [total, rows] = await db.$transaction([
      db.vendorListing.count({ where }),
      db.vendorListing.findMany({
        where,
        include: listingInclude,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    res.set('Cache-Control', 'no-store').json({
      data: rows.map(toOwnedListing),
      meta: {
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages: Math.ceil(total / q.pageSize),
      },
    });
  });

  router.patch(
    '/listings/:id/moderation',
    validate({ params: idParamSchema, body: moderationUpdateSchema }),
    async (_req, res) => {
      const { id } = res.locals.valid.params as { id: string };
      const input = res.locals.valid.body as z.output<typeof moderationUpdateSchema>;
      const row = await db.vendorListing.update({
        where: { id },
        data: {
          moderationStatus: input.moderationStatus,
          moderationNote: input.moderationNote ?? null,
        },
        include: listingInclude,
      });
      res.json({ data: toOwnedListing(row) });
    },
  );

  return router;
}
