import type {
  Listing,
  ListingInput,
  OwnedListing,
  PaginationMeta,
  listingInputSchema,
  listingListQuerySchema,
  listingUpdateSchema,
} from '@smart-tourism/contracts';
import type { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import { slugWithSuffix } from '../../lib/slug.js';
import type { AuthUser } from '../auth/auth.types.js';

const include = {
  vendor: { select: { id: true, name: true } },
  destination: { select: { slug: true, name: true } },
  _count: { select: { enquiries: true } },
} satisfies Prisma.VendorListingInclude;
type Row = Prisma.VendorListingGetPayload<{ include: typeof include }>;

/** Only approved, active listings are visible to the public. */
export const PUBLIC_LISTING: Prisma.VendorListingWhereInput = {
  isActive: true,
  moderationStatus: 'APPROVED',
};

function toListing(row: Row): Listing {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    title: row.title,
    summary: row.summary,
    description: row.description,
    state: row.state,
    district: row.district,
    priceInfo: row.priceInfo,
    imageUrl: row.imageUrl,
    isSample: row.isSample,
    destination: row.destination,
    vendor: row.vendor,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toOwnedListing(row: Row): OwnedListing {
  return {
    ...toListing(row),
    isActive: row.isActive,
    moderationStatus: row.moderationStatus,
    moderationNote: row.moderationNote,
    enquiryCount: row._count.enquiries,
  };
}

export function createListingsService(db: Db) {
  async function resolveDestinationId(slug: string | null | undefined) {
    if (slug === undefined) return undefined;
    if (slug === null || slug === '') return null;
    const destination = await db.destination.findFirst({
      where: { slug, published: true },
      select: { id: true },
    });
    if (!destination) {
      throw AppError.badRequest('Unknown destination', [
        { path: 'destinationSlug', message: 'No published destination with this slug' },
      ]);
    }
    return destination.id;
  }

  /** Loads a listing the user may manage: its owner, or any admin. Others get 404 (no existence leak). */
  async function findManageable(id: string, user: AuthUser) {
    const row = await db.vendorListing.findUnique({ where: { id }, include });
    if (!row || (row.vendorId !== user.id && user.role !== 'ADMIN'))
      throw AppError.notFound('Listing not found');
    return row;
  }

  return {
    async listPublic(
      query: z.output<typeof listingListQuerySchema>,
    ): Promise<{ data: Listing[]; meta: PaginationMeta }> {
      const mode = 'insensitive' as const;
      const where: Prisma.VendorListingWhereInput = {
        ...PUBLIC_LISTING,
        ...(query.type && { type: query.type }),
        ...(query.state && { state: { equals: query.state, mode } }),
        ...(query.destination && { destination: { slug: query.destination } }),
        ...(query.q && {
          OR: [
            { title: { contains: query.q, mode } },
            { summary: { contains: query.q, mode } },
            { district: { contains: query.q, mode } },
            { state: { contains: query.q, mode } },
          ],
        }),
      };
      const [total, rows] = await db.$transaction([
        db.vendorListing.count({ where }),
        db.vendorListing.findMany({
          where,
          include,
          orderBy: [{ isSample: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ]);
      return {
        data: rows.map(toListing),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      };
    },

    /** Public detail by id or slug. Owners and admins can also see their unapproved listings. */
    async getVisible(
      idOrSlug: string,
      user: AuthUser | undefined,
    ): Promise<Listing | OwnedListing> {
      const row = await db.vendorListing.findFirst({
        where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
        include,
      });
      if (!row) throw AppError.notFound('Listing not found');
      const canManage = user && (row.vendorId === user.id || user.role === 'ADMIN');
      if (canManage) return toOwnedListing(row);
      if (!row.isActive || row.moderationStatus !== 'APPROVED')
        throw AppError.notFound('Listing not found');
      return toListing(row);
    },

    async listOwn(user: AuthUser): Promise<OwnedListing[]> {
      const rows = await db.vendorListing.findMany({
        where: { vendorId: user.id },
        include,
        orderBy: { updatedAt: 'desc' },
      });
      return rows.map(toOwnedListing);
    },

    async create(
      user: AuthUser,
      input: z.output<typeof listingInputSchema>,
    ): Promise<OwnedListing> {
      const { destinationSlug, ...rest } = input;
      const row = await db.vendorListing.create({
        data: {
          ...rest,
          slug: slugWithSuffix(input.title),
          vendorId: user.id,
          destinationId: (await resolveDestinationId(destinationSlug)) ?? null,
          // New listings wait for admin review before they are public.
          moderationStatus: user.role === 'ADMIN' ? 'APPROVED' : 'PENDING',
        },
        include,
      });
      return toOwnedListing(row);
    },

    async update(
      id: string,
      user: AuthUser,
      input: z.output<typeof listingUpdateSchema>,
    ): Promise<OwnedListing> {
      const existing = await findManageable(id, user);
      const { destinationSlug, isActive, ...content } = input;
      const destinationId = await resolveDestinationId(destinationSlug);
      const contentChanged =
        Object.values(content).some((v) => v !== undefined) || destinationId !== undefined;
      const row = await db.vendorListing.update({
        where: { id: existing.id },
        data: {
          ...content,
          ...(destinationId !== undefined && { destinationId }),
          ...(isActive !== undefined && { isActive }),
          // Vendor content edits go back through moderation.
          ...(contentChanged &&
            user.role !== 'ADMIN' && { moderationStatus: 'PENDING', moderationNote: null }),
        },
        include,
      });
      return toOwnedListing(row);
    },

    async remove(id: string, user: AuthUser): Promise<void> {
      const existing = await findManageable(id, user);
      await db.vendorListing.delete({ where: { id: existing.id } });
    },
  };
}
export type ListingsService = ReturnType<typeof createListingsService>;
export type { ListingInput };
