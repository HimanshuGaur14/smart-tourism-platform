import { z } from 'zod';
import { dataEnvelope, paginatedEnvelope, paginationQuerySchema } from './common.js';
import { destinationCategorySlugSchema } from './domain.js';

const booleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

/** Strings from query params are trimmed; empty strings count as "not provided". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const categorySchema = z.object({
  id: z.string(),
  slug: destinationCategorySlugSchema,
  name: z.string(),
  description: z.string(),
  destinationCount: z.number().int().nonnegative(),
});
export type Category = z.infer<typeof categorySchema>;
export const categoryListResponseSchema = dataEnvelope(z.array(categorySchema));

export const destinationImageSchema = z.object({
  url: z.string(),
  alt: z.string(),
  credit: z.string().nullable(),
  license: z.string().nullable(),
  sourceUrl: z.string().nullable(),
});
export type DestinationImage = z.infer<typeof destinationImageSchema>;

export const destinationSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  state: z.string(),
  district: z.string(),
  category: z.object({ slug: destinationCategorySlugSchema, name: z.string() }),
  shortDescription: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  /** False means the location is approximate and must be labelled so in the UI. */
  coordinatesVerified: z.boolean(),
  tags: z.array(z.string()),
  featured: z.boolean(),
  hiddenGem: z.boolean(),
  image: destinationImageSchema.nullable(),
});
export type DestinationSummary = z.infer<typeof destinationSummarySchema>;

export const destinationDetailSchema = destinationSummarySchema.extend({
  description: z.string(),
  images: z.array(destinationImageSchema),
  bestTimeToVisit: z.string().nullable(),
  responsibleTips: z.array(z.string()),
  sourceUrls: z.array(z.string()),
  updatedAt: z.iso.datetime(),
});
export type DestinationDetail = z.infer<typeof destinationDetailSchema>;

export const destinationSortSchema = z.enum(['featured', 'name', 'state', 'newest']);
export type DestinationSort = z.infer<typeof destinationSortSchema>;

export const destinationListQuerySchema = paginationQuerySchema.extend({
  /** Matches name, state, district, description and tags (case-insensitive). */
  q: optionalText(100),
  state: optionalText(60),
  district: optionalText(60),
  category: destinationCategorySlugSchema.optional(),
  featured: booleanQuery,
  hiddenGem: booleanQuery,
  sort: destinationSortSchema.default('featured'),
});
/** Parameters a client may send (all optional; the server applies defaults). */
export type DestinationListQuery = Partial<z.output<typeof destinationListQuerySchema>>;

export const destinationListResponseSchema = paginatedEnvelope(destinationSummarySchema);
export type DestinationListResponse = z.infer<typeof destinationListResponseSchema>;

export const destinationDetailResponseSchema = dataEnvelope(destinationDetailSchema);

export const featuredQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(8),
  kind: z.enum(['featured', 'hidden-gems']).default('featured'),
});
export const destinationArrayResponseSchema = dataEnvelope(z.array(destinationSummarySchema));

export const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug'),
});

export const nearbyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(4),
  radiusKm: z.coerce.number().min(1).max(2000).default(500),
});
export const nearbyDestinationSchema = destinationSummarySchema.extend({
  /** Straight-line (great-circle) distance, not road distance. */
  distanceKm: z.number().nonnegative(),
});
export type NearbyDestination = z.infer<typeof nearbyDestinationSchema>;
export const nearbyResponseSchema = dataEnvelope(z.array(nearbyDestinationSchema));

export const stateFacetSchema = z.object({
  state: z.string(),
  destinationCount: z.number().int().nonnegative(),
});
export const stateListResponseSchema = dataEnvelope(z.array(stateFacetSchema));
