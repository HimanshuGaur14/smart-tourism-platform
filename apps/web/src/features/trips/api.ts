import {
  itineraryResponseSchema,
  itinerarySummaryArrayResponseSchema,
  savedDestinationArrayResponseSchema,
  savedDestinationResponseSchema,
  type ItineraryInput,
  type ItineraryUpdate,
} from '@smart-tourism/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../lib/api-client';

// Keys start with 'me' so signing out clears them (see features/auth/session.tsx).
const keys = {
  saved: ['me', 'saved-destinations'] as const,
  itineraries: ['me', 'itineraries'] as const,
  itinerary: (id: string) => ['me', 'itineraries', id] as const,
};

export function useSavedDestinations(enabled = true) {
  return useQuery({
    queryKey: keys.saved,
    queryFn: ({ signal }) =>
      apiRequest('/me/saved-destinations', { schema: savedDestinationArrayResponseSchema, signal }),
    select: (r) => r.data,
    enabled,
  });
}

export function useToggleSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, saved }: { slug: string; saved: boolean }) =>
      saved
        ? apiRequest(`/me/saved-destinations/${slug}`, { method: 'DELETE', schema: z.null() })
        : apiRequest(`/me/saved-destinations/${slug}`, {
            method: 'PUT',
            schema: savedDestinationResponseSchema,
          }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.saved }),
  });
}

export function useItineraries() {
  return useQuery({
    queryKey: keys.itineraries,
    queryFn: ({ signal }) =>
      apiRequest('/me/itineraries', { schema: itinerarySummaryArrayResponseSchema, signal }),
    select: (r) => r.data,
  });
}

export function useItinerary(id: string | undefined) {
  return useQuery({
    queryKey: keys.itinerary(id ?? ''),
    queryFn: ({ signal }) =>
      apiRequest(`/me/itineraries/${id}`, { schema: itineraryResponseSchema, signal }),
    select: (r) => r.data,
    enabled: !!id,
  });
}

export function useSaveItinerary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ItineraryInput | ItineraryUpdate }) =>
      apiRequest(id ? `/me/itineraries/${id}` : '/me/itineraries', {
        method: id ? 'PATCH' : 'POST',
        body: input,
        schema: itineraryResponseSchema,
      }),
    onSuccess: (res) => {
      qc.setQueryData(keys.itinerary(res.data.id), res);
      return qc.invalidateQueries({ queryKey: keys.itineraries, exact: true });
    },
  });
}

export function useDeleteItinerary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/me/itineraries/${id}`, { method: 'DELETE', schema: z.null() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.itineraries }),
  });
}
