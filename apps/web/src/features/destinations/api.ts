import {
  categoryListResponseSchema,
  destinationArrayResponseSchema,
  destinationDetailResponseSchema,
  destinationListResponseSchema,
  nearbyResponseSchema,
  stateListResponseSchema,
  type DestinationListQuery,
} from '@smart-tourism/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';

function toSearch(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export const destinationKeys = {
  list: (query: DestinationListQuery) => ['destinations', 'list', query] as const,
  highlighted: (kind: string, limit: number) =>
    ['destinations', 'highlighted', kind, limit] as const,
  detail: (slug: string) => ['destinations', 'detail', slug] as const,
  nearby: (slug: string) => ['destinations', 'nearby', slug] as const,
  states: ['destinations', 'states'] as const,
  categories: ['categories'] as const,
};

export function useDestinations(query: DestinationListQuery) {
  return useQuery({
    queryKey: destinationKeys.list(query),
    queryFn: ({ signal }) =>
      apiRequest(`/destinations${toSearch(query)}`, {
        schema: destinationListResponseSchema,
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useHighlightedDestinations(kind: 'featured' | 'hidden-gems', limit = 8) {
  return useQuery({
    queryKey: destinationKeys.highlighted(kind, limit),
    queryFn: ({ signal }) =>
      apiRequest(`/destinations/featured${toSearch({ kind, limit })}`, {
        schema: destinationArrayResponseSchema,
        signal,
      }),
    select: (res) => res.data,
  });
}

export function useDestination(slug: string) {
  return useQuery({
    queryKey: destinationKeys.detail(slug),
    queryFn: ({ signal }) =>
      apiRequest(`/destinations/${encodeURIComponent(slug)}`, {
        schema: destinationDetailResponseSchema,
        signal,
      }),
    select: (res) => res.data,
  });
}

export function useNearbyDestinations(slug: string, enabled = true) {
  return useQuery({
    queryKey: destinationKeys.nearby(slug),
    queryFn: ({ signal }) =>
      apiRequest(`/destinations/${encodeURIComponent(slug)}/nearby?limit=4`, {
        schema: nearbyResponseSchema,
        signal,
      }),
    select: (res) => res.data,
    enabled,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: destinationKeys.categories,
    queryFn: ({ signal }) =>
      apiRequest('/categories', { schema: categoryListResponseSchema, signal }),
    select: (res) => res.data,
    staleTime: 5 * 60_000,
  });
}

export function useStates() {
  return useQuery({
    queryKey: destinationKeys.states,
    queryFn: ({ signal }) =>
      apiRequest('/destinations/states', { schema: stateListResponseSchema, signal }),
    select: (res) => res.data,
    staleTime: 5 * 60_000,
  });
}
