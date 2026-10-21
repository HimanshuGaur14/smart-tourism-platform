import { z } from 'zod';
import { dataEnvelope } from './common.js';
import { destinationSummarySchema } from './destinations.js';

const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug');

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

// ---- Saved destinations ----
export const savedDestinationSchema = destinationSummarySchema.extend({
  savedAt: z.iso.datetime(),
});
export type SavedDestination = z.infer<typeof savedDestinationSchema>;
export const savedDestinationArrayResponseSchema = dataEnvelope(z.array(savedDestinationSchema));
export const savedDestinationResponseSchema = dataEnvelope(savedDestinationSchema);

// ---- Itineraries ----
export const MAX_ITINERARY_ITEMS = 30;
export const MAX_ITINERARY_DAYS = 30;

export const itineraryItemInputSchema = z.object({
  destinationSlug: slug,
  dayNumber: z
    .number()
    .int()
    .min(1)
    .max(MAX_ITINERARY_DAYS)
    .nullish()
    .transform((v) => v ?? null),
  notes: nullableText(500),
});
export type ItineraryItemInput = z.input<typeof itineraryItemInputSchema>;

const itineraryFields = {
  title: z.string().trim().min(2, 'Give the trip a title').max(120),
  startDate: z.iso
    .date()
    .nullish()
    .or(z.literal(''))
    .transform((v) => v || null),
  durationDays: z
    .number()
    .int()
    .min(1)
    .max(MAX_ITINERARY_DAYS)
    .nullish()
    .transform((v) => v ?? null),
  interests: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  notes: nullableText(2000),
  /** Ordered stops; the array order is the visiting order. */
  items: z.array(itineraryItemInputSchema).max(MAX_ITINERARY_ITEMS).default([]),
};

export const itineraryInputSchema = z.object(itineraryFields).superRefine((v, ctx) => {
  if (v.durationDays) {
    v.items.forEach((item, i) => {
      if (item.dayNumber && item.dayNumber > v.durationDays!)
        ctx.addIssue({
          code: 'custom',
          path: ['items', i, 'dayNumber'],
          message: `Day must be within the ${v.durationDays}-day trip`,
        });
    });
  }
});
export type ItineraryInput = z.input<typeof itineraryInputSchema>;

/** PATCH: every field optional; `items`, when sent, replaces the whole list. */
export const itineraryUpdateSchema = z
  .object({
    title: itineraryFields.title.optional(),
    startDate: itineraryFields.startDate.optional(),
    durationDays: itineraryFields.durationDays.optional(),
    interests: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
    notes: itineraryFields.notes.optional(),
    items: z.array(itineraryItemInputSchema).max(MAX_ITINERARY_ITEMS).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type ItineraryUpdate = z.input<typeof itineraryUpdateSchema>;

export const itineraryItemSchema = z.object({
  id: z.string(),
  position: z.number().int(),
  dayNumber: z.number().int().nullable(),
  notes: z.string().nullable(),
  /** False when an admin has since unpublished the destination. */
  available: z.boolean(),
  destination: destinationSummarySchema,
});
export type ItineraryItem = z.infer<typeof itineraryItemSchema>;

export const itinerarySchema = z.object({
  id: z.string(),
  title: z.string(),
  startDate: z.iso.date().nullable(),
  durationDays: z.number().int().nullable(),
  interests: z.array(z.string()),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  items: z.array(itineraryItemSchema),
});
export type Itinerary = z.infer<typeof itinerarySchema>;

export const itinerarySummarySchema = itinerarySchema
  .omit({ items: true, notes: true })
  .extend({ itemCount: z.number().int() });
export type ItinerarySummary = z.infer<typeof itinerarySummarySchema>;

export const itineraryResponseSchema = dataEnvelope(itinerarySchema);
export const itinerarySummaryArrayResponseSchema = dataEnvelope(z.array(itinerarySummarySchema));
