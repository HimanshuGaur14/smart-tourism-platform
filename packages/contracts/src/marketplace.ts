import { z } from 'zod';
import { dataEnvelope, paginatedEnvelope, paginationQuerySchema } from './common.js';
import { listingTypeSchema } from './domain.js';

export const moderationStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type ModerationStatus = z.infer<typeof moderationStatusSchema>;
export const enquiryStatusSchema = z.enum(['NEW', 'RESPONDED', 'CLOSED']);
export type EnquiryStatus = z.infer<typeof enquiryStatusSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const listingSchema = z.object({
  id: z.string(),
  slug: z.string(),
  type: listingTypeSchema,
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  state: z.string(),
  district: z.string(),
  priceInfo: z.string().nullable(),
  imageUrl: z.string().nullable(),
  isSample: z.boolean(),
  destination: z.object({ slug: z.string(), name: z.string() }).nullable(),
  vendor: z.object({ id: z.string(), name: z.string() }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Listing = z.infer<typeof listingSchema>;

/** The owner and admins additionally see moderation fields. */
export const ownedListingSchema = listingSchema.extend({
  isActive: z.boolean(),
  moderationStatus: moderationStatusSchema,
  moderationNote: z.string().nullable(),
  enquiryCount: z.number().int().nonnegative(),
});
export type OwnedListing = z.infer<typeof ownedListingSchema>;

export const listingListQuerySchema = paginationQuerySchema.extend({
  q: optionalText(100),
  type: listingTypeSchema.optional(),
  state: optionalText(60),
  destination: optionalText(120),
});
export type ListingListQuery = Partial<z.output<typeof listingListQuerySchema>>;

export const listingListResponseSchema = paginatedEnvelope(listingSchema);
export const listingResponseSchema = dataEnvelope(listingSchema);
export const ownedListingResponseSchema = dataEnvelope(ownedListingSchema);
export const ownedListingArrayResponseSchema = dataEnvelope(z.array(ownedListingSchema));

const httpsUrl = z.url({ protocol: /^https$/, message: 'Use an https:// image URL' }).max(500);

export const listingInputSchema = z.object({
  type: listingTypeSchema,
  title: z.string().trim().min(5, 'Use at least 5 characters').max(120),
  summary: z.string().trim().min(10, 'Use at least 10 characters').max(200),
  description: z.string().trim().min(30, 'Use at least 30 characters').max(4000),
  state: z.string().trim().min(2).max(60),
  district: z.string().trim().min(2).max(60),
  priceInfo: z.string().trim().max(120).nullish(),
  imageUrl: httpsUrl.nullish().or(z.literal('').transform(() => null)),
  /** Optional link to a destination by slug. */
  destinationSlug: z
    .string()
    .trim()
    .max(120)
    .nullish()
    .or(z.literal('').transform(() => null)),
});
export type ListingInput = z.input<typeof listingInputSchema>;

export const listingUpdateSchema = listingInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type ListingUpdate = z.input<typeof listingUpdateSchema>;

export const idParamSchema = z.object({ id: z.string().min(1).max(64) });

export const enquiryInputSchema = z.object({
  listingId: z.string().min(1).max(64),
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+0-9 ()-]*$/, 'Use digits, spaces and + ( ) - only')
    .nullish()
    .transform((v) => (v ? v : null)),
  message: z.string().trim().min(10, 'Tell the host a little more (10+ characters)').max(2000),
  travelDate: z.iso
    .date()
    .nullish()
    .or(z.literal('').transform(() => null)),
  groupSize: z.coerce.number().int().min(1).max(50).nullish(),
});
export type EnquiryInput = z.input<typeof enquiryInputSchema>;

export const enquirySchema = z.object({
  id: z.string(),
  listing: z.object({ id: z.string(), slug: z.string(), title: z.string() }),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  message: z.string(),
  travelDate: z.string().nullable(),
  groupSize: z.number().int().nullable(),
  status: enquiryStatusSchema,
  createdAt: z.iso.datetime(),
});
export type Enquiry = z.infer<typeof enquirySchema>;
export const enquiryResponseSchema = dataEnvelope(enquirySchema);
export const enquiryArrayResponseSchema = dataEnvelope(z.array(enquirySchema));
export const enquiryStatusUpdateSchema = z.object({ status: enquiryStatusSchema });
