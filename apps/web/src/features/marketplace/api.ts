import {
  enquiryArrayResponseSchema,
  enquiryResponseSchema,
  listingListResponseSchema,
  ownedListingArrayResponseSchema,
  ownedListingResponseSchema,
  ownedListingSchema,
  listingSchema,
  type EnquiryInput,
  type EnquiryStatus,
  type ListingInput,
  type ListingListQuery,
  type ListingType,
  type ListingUpdate,
} from '@smart-tourism/contracts';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../lib/api-client';

export const listingTypeLabels: Record<ListingType, string> = {
  HOMESTAY: 'Homestay',
  GUIDE: 'Local guide',
  ARTISAN: 'Artisan',
  HANDICRAFT: 'Handicraft',
  CULTURAL_EXPERIENCE: 'Cultural experience',
};

export const enquiryStatusTone = { NEW: 'info', RESPONDED: 'forest', CLOSED: 'neutral' } as const;

const toSearch = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

export function useListings(query: ListingListQuery) {
  return useQuery({
    queryKey: ['listings', query],
    queryFn: ({ signal }) =>
      apiRequest(`/listings${toSearch(query)}`, { schema: listingListResponseSchema, signal }),
    placeholderData: keepPreviousData,
  });
}

/** Public view, or the owner/admin view (with moderation fields) for their own listings. */
const listingDetailResponse = z.object({ data: z.union([ownedListingSchema, listingSchema]) });

export function useListing(idOrSlug: string) {
  return useQuery({
    queryKey: ['listings', 'detail', idOrSlug],
    queryFn: ({ signal }) =>
      apiRequest(`/listings/${encodeURIComponent(idOrSlug)}`, {
        schema: listingDetailResponse,
        signal,
      }),
    select: (r) => r.data,
  });
}

export function useSubmitEnquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EnquiryInput) =>
      apiRequest('/enquiries', { method: 'POST', body: input, schema: enquiryResponseSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'enquiries'] }),
  });
}

export function useMyEnquiries() {
  return useQuery({
    queryKey: ['me', 'enquiries'],
    queryFn: ({ signal }) =>
      apiRequest('/me/enquiries', { schema: enquiryArrayResponseSchema, signal }),
    select: (r) => r.data,
  });
}

// ---- Vendor ----
export function useMyListings() {
  return useQuery({
    queryKey: ['me', 'listings'],
    queryFn: ({ signal }) =>
      apiRequest('/me/listings', { schema: ownedListingArrayResponseSchema, signal }),
    select: (r) => r.data,
  });
}

export function useReceivedEnquiries() {
  return useQuery({
    queryKey: ['me', 'received-enquiries'],
    queryFn: ({ signal }) =>
      apiRequest('/vendor/enquiries', { schema: enquiryArrayResponseSchema, signal }),
    select: (r) => r.data,
  });
}

function useInvalidateListings() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['me', 'listings'] }),
      queryClient.invalidateQueries({ queryKey: ['listings'] }),
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
    ]);
}

export function useSaveListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ListingInput | ListingUpdate }) =>
      apiRequest(id ? `/listings/${id}` : '/listings', {
        method: id ? 'PATCH' : 'POST',
        body: input,
        schema: ownedListingResponseSchema,
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/listings/${id}`, { method: 'DELETE', schema: z.null() }),
    onSuccess: invalidate,
  });
}

export function useSetEnquiryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnquiryStatus }) =>
      apiRequest(`/vendor/enquiries/${id}`, {
        method: 'PATCH',
        body: { status },
        schema: enquiryResponseSchema,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'received-enquiries'] }),
  });
}
