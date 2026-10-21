import {
  destinationAnalyticsResponseSchema,
  destinationForecastArrayResponseSchema,
  destinationForecastResponseSchema,
  footfallResponseSchema,
  type CrowdLevel,
} from '@smart-tourism/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';

export const crowdLevelLabels: Record<CrowdLevel, string> = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  VERY_HIGH: 'Very high',
};

export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function useFootfall(slugs: string[], months: number) {
  const qs = new URLSearchParams({ months: String(months) });
  if (slugs.length) qs.set('destinations', slugs.join(','));
  return useQuery({
    queryKey: ['analytics', 'footfall', slugs, months],
    queryFn: ({ signal }) =>
      apiRequest(`/analytics/footfall?${qs}`, { schema: footfallResponseSchema, signal }),
    select: (r) => r.data,
    placeholderData: keepPreviousData,
  });
}

export function useDestinationInsights(params: { state?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (params.state) qs.set('state', params.state);
  if (params.category) qs.set('category', params.category);
  return useQuery({
    queryKey: ['analytics', 'destinations', params],
    queryFn: ({ signal }) =>
      apiRequest(`/analytics/destinations?${qs}`, {
        schema: destinationAnalyticsResponseSchema,
        signal,
      }),
    select: (r) => r.data,
    placeholderData: keepPreviousData,
  });
}

export function useForecasts(slugs: string[], days: number) {
  const qs = new URLSearchParams({ days: String(days) });
  if (slugs.length) qs.set('destinations', slugs.join(','));
  return useQuery({
    queryKey: ['forecasts', slugs, days],
    queryFn: ({ signal }) =>
      apiRequest(`/forecasts?${qs}`, { schema: destinationForecastArrayResponseSchema, signal }),
    select: (r) => r.data,
    placeholderData: keepPreviousData,
  });
}

export function useDestinationForecast(slug: string, days = 7) {
  return useQuery({
    queryKey: ['forecasts', slug, days],
    queryFn: ({ signal }) =>
      apiRequest(`/forecasts/${encodeURIComponent(slug)}?days=${days}`, {
        schema: destinationForecastResponseSchema,
        signal,
      }),
    select: (r) => r.data,
  });
}
