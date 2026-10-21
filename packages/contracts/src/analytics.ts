import { z } from 'zod';
import { dataEnvelope } from './common.js';
import { crowdLevelSchema, forecastSourceSchema } from './domain.js';

/** Real platform counts from the database (not visitor numbers). */
export const platformOverviewSchema = z.object({
  destinations: z.object({ published: z.number().int(), unpublished: z.number().int() }),
  listings: z.object({
    approvedActive: z.number().int(),
    pending: z.number().int(),
    sample: z.number().int(),
  }),
  enquiries: z.object({ total: z.number().int(), last30Days: z.number().int() }),
  users: z.object({ tourists: z.number().int(), vendors: z.number().int() }),
  forecastSource: forecastSourceSchema,
});
export type PlatformOverview = z.infer<typeof platformOverviewSchema>;
export const platformOverviewResponseSchema = dataEnvelope(platformOverviewSchema);

/**
 * Every visitor-number series carries `source`. While no real footfall data or model is
 * connected, this is always DEMO: illustrative values that must be labelled as such.
 */
export const footfallQuerySchema = z.object({
  destinations: z
    .string()
    .max(1200)
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(
      z
        .array(z.string().regex(/^[a-z0-9-]+$/))
        .max(6)
        .optional(),
    ),
  from: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM')
    .optional(),
  months: z.coerce.number().int().min(3).max(24).default(12),
});

export const footfallSeriesSchema = z.object({
  destination: z.object({ slug: z.string(), name: z.string(), state: z.string() }),
  points: z.array(z.object({ month: z.string(), visitors: z.number().int().nonnegative() })),
});
export const footfallSchema = z.object({
  source: forecastSourceSchema,
  disclaimer: z.string(),
  months: z.array(z.string()),
  series: z.array(footfallSeriesSchema),
  /** Average share of annual visitors per calendar month across the selected destinations. */
  seasonality: z.array(z.object({ month: z.number().int().min(1).max(12), index: z.number() })),
});
export type Footfall = z.infer<typeof footfallSchema>;
export const footfallResponseSchema = dataEnvelope(footfallSchema);

export const destinationInsightSchema = z.object({
  destination: z.object({
    slug: z.string(),
    name: z.string(),
    state: z.string(),
    category: z.string(),
  }),
  visitorsLast12Months: z.number().int(),
  peakMonth: z.number().int().min(1).max(12),
  currentCrowdLevel: crowdLevelSchema,
});
export const crowdDistributionSchema = z.array(
  z.object({ level: crowdLevelSchema, count: z.number().int() }),
);
export const anomalySchema = z.object({
  destination: z.object({ slug: z.string(), name: z.string() }),
  month: z.string(),
  visitors: z.number().int(),
  expected: z.number().int(),
  /** Positive = above expected. */
  deviationPct: z.number(),
  kind: z.enum(['SPIKE', 'DROP']),
});
export const alternativeSchema = z.object({
  for: z.object({ slug: z.string(), name: z.string(), crowdLevel: crowdLevelSchema }),
  suggestions: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      state: z.string(),
      crowdLevel: crowdLevelSchema,
    }),
  ),
});

export const destinationAnalyticsSchema = z.object({
  source: forecastSourceSchema,
  disclaimer: z.string(),
  insights: z.array(destinationInsightSchema),
  crowdDistribution: crowdDistributionSchema,
  anomalies: z.array(anomalySchema),
  alternatives: z.array(alternativeSchema),
});
export type DestinationAnalytics = z.infer<typeof destinationAnalyticsSchema>;
export const destinationAnalyticsResponseSchema = dataEnvelope(destinationAnalyticsSchema);
