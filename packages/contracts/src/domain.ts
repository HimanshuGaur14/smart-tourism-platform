import { z } from 'zod';

/**
 * Domain vocabularies shared by web and api. Database enums (Phase 2) must stay
 * in sync with these lists.
 */

export const userRoleSchema = z.enum(['TOURIST', 'VENDOR', 'ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const destinationCategorySlugs = [
  'nature',
  'wildlife',
  'waterfalls',
  'heritage',
  'spirituality',
  'culture',
  'adventure',
  'beaches',
  'mountains',
] as const;
export const destinationCategorySlugSchema = z.enum(destinationCategorySlugs);
export type DestinationCategorySlug = z.infer<typeof destinationCategorySlugSchema>;

export const listingTypeSchema = z.enum([
  'HOMESTAY',
  'GUIDE',
  'ARTISAN',
  'HANDICRAFT',
  'CULTURAL_EXPERIENCE',
]);
export type ListingType = z.infer<typeof listingTypeSchema>;

export const crowdLevelSchema = z.enum(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']);
export type CrowdLevel = z.infer<typeof crowdLevelSchema>;

/**
 * Where a forecast came from. The UI must label DEMO and UNAVAILABLE clearly and
 * never present demo values as model output.
 */
export const forecastSourceSchema = z.enum(['DEMO', 'MODEL', 'UNAVAILABLE']);
export type ForecastSource = z.infer<typeof forecastSourceSchema>;
