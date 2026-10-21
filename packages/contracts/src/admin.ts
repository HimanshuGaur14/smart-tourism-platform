import { z } from 'zod';
import { dataEnvelope, paginatedEnvelope, paginationQuerySchema } from './common.js';
import { destinationCategorySlugSchema } from './domain.js';
import { destinationDetailSchema } from './destinations.js';
import { moderationStatusSchema } from './marketplace.js';

const slug = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

export const adminDestinationSchema = destinationDetailSchema.extend({
  published: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type AdminDestination = z.infer<typeof adminDestinationSchema>;

export const adminDestinationListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  published: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});
export const adminDestinationListResponseSchema = paginatedEnvelope(adminDestinationSchema);
export const adminDestinationResponseSchema = dataEnvelope(adminDestinationSchema);

const lines = z.array(z.string().trim().min(1).max(300)).max(12);

export const destinationInputSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(60),
  district: z.string().trim().min(2).max(60),
  category: destinationCategorySlugSchema,
  shortDescription: z.string().trim().min(10).max(240),
  description: z.string().trim().min(30).max(5000),
  latitude: z.coerce.number().min(6).max(37.5),
  longitude: z.coerce.number().min(68).max(97.5),
  coordinatesVerified: z.boolean().default(false),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(15).default([]),
  bestTimeToVisit: z.string().trim().max(120).nullish(),
  responsibleTips: lines.default([]),
  sourceUrls: z.array(z.url().max(500)).max(10).default([]),
  featured: z.boolean().default(false),
  hiddenGem: z.boolean().default(false),
  published: z.boolean().default(true),
});
export type DestinationInput = z.input<typeof destinationInputSchema>;
export const destinationUpdateSchema = destinationInputSchema.partial();

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(5).max(240),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
});

export const moderationQuerySchema = paginationQuerySchema.extend({
  status: moderationStatusSchema.optional(),
});
export const moderationUpdateSchema = z.object({
  moderationStatus: moderationStatusSchema,
  moderationNote: z.string().trim().max(500).nullish(),
});
