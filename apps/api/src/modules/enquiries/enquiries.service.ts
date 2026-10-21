import type { Enquiry, EnquiryStatus, enquiryInputSchema } from '@smart-tourism/contracts';
import type { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import type { AuthUser } from '../auth/auth.types.js';
import { PUBLIC_LISTING } from '../listings/listings.service.js';

const include = {
  listing: { select: { id: true, slug: true, title: true, vendorId: true } },
} satisfies Prisma.EnquiryInclude;
type Row = Prisma.EnquiryGetPayload<{ include: typeof include }>;

function toEnquiry(row: Row): Enquiry {
  return {
    id: row.id,
    listing: { id: row.listing.id, slug: row.listing.slug, title: row.listing.title },
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    travelDate: row.travelDate ? row.travelDate.toISOString().slice(0, 10) : null,
    groupSize: row.groupSize,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createEnquiriesService(db: Db) {
  return {
    async create(
      input: z.output<typeof enquiryInputSchema>,
      user: AuthUser | undefined,
    ): Promise<Enquiry> {
      const listing = await db.vendorListing.findFirst({
        where: { id: input.listingId, ...PUBLIC_LISTING },
        select: { id: true, vendorId: true },
      });
      if (!listing) throw AppError.notFound('Listing not found');
      if (user && listing.vendorId === user.id)
        throw AppError.badRequest('You cannot enquire about your own listing');
      const row = await db.enquiry.create({
        data: {
          listingId: listing.id,
          userId: user?.id ?? null,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          message: input.message,
          travelDate: input.travelDate ? new Date(`${input.travelDate}T00:00:00Z`) : null,
          groupSize: input.groupSize ?? null,
        },
        include,
      });
      return toEnquiry(row);
    },

    /** Enquiries the signed-in user sent. */
    async listSent(user: AuthUser): Promise<Enquiry[]> {
      const rows = await db.enquiry.findMany({
        where: { userId: user.id },
        include,
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toEnquiry);
    },

    /** Enquiries received on listings the vendor owns. */
    async listReceived(user: AuthUser): Promise<Enquiry[]> {
      const rows = await db.enquiry.findMany({
        where: { listing: { vendorId: user.id } },
        include,
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return rows.map(toEnquiry);
    },

    async setStatus(id: string, status: EnquiryStatus, user: AuthUser): Promise<Enquiry> {
      const row = await db.enquiry.findUnique({ where: { id }, include });
      if (!row || (row.listing.vendorId !== user.id && user.role !== 'ADMIN'))
        throw AppError.notFound('Enquiry not found');
      const updated = await db.enquiry.update({ where: { id }, data: { status }, include });
      return toEnquiry(updated);
    },
  };
}
export type EnquiriesService = ReturnType<typeof createEnquiriesService>;
