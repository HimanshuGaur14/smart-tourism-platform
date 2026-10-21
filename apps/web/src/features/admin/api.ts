import {
  adminDestinationListResponseSchema,
  adminDestinationResponseSchema,
  categoryListResponseSchema,
  categorySchema,
  ownedListingResponseSchema,
  ownedListingSchema,
  paginatedEnvelope,
  platformOverviewResponseSchema,
  type DestinationInput,
  type ModerationStatus,
} from '@smart-tourism/contracts';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../lib/api-client';

const moderationListSchema = paginatedEnvelope(ownedListingSchema);

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: ({ signal }) =>
      apiRequest('/analytics/overview', { schema: platformOverviewResponseSchema, signal }),
    select: (r) => r.data,
  });
}

export function useModerationQueue(status: ModerationStatus | 'ALL', page: number) {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: '20',
    ...(status !== 'ALL' && { status }),
  });
  return useQuery({
    queryKey: ['admin', 'listings', status, page],
    queryFn: ({ signal }) =>
      apiRequest(`/admin/listings?${qs}`, { schema: moderationListSchema, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useAdminDestinations(q: string, page: number) {
  const qs = new URLSearchParams({ page: String(page), pageSize: '20', ...(q && { q }) });
  return useQuery({
    queryKey: ['admin', 'destinations', q, page],
    queryFn: ({ signal }) =>
      apiRequest(`/admin/destinations?${qs}`, {
        schema: adminDestinationListResponseSchema,
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useAdminDestination(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'destination', id],
    queryFn: ({ signal }) =>
      apiRequest(`/admin/destinations/${id}`, { schema: adminDestinationResponseSchema, signal }),
    select: (r) => r.data,
    enabled: !!id,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['admin'] }),
      qc.invalidateQueries({ queryKey: ['destinations'] }),
      qc.invalidateQueries({ queryKey: ['listings'] }),
      qc.invalidateQueries({ queryKey: ['categories'] }),
    ]);
}

export function useModerate() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      moderationStatus,
      moderationNote,
    }: {
      id: string;
      moderationStatus: ModerationStatus;
      moderationNote?: string;
    }) =>
      apiRequest(`/admin/listings/${id}/moderation`, {
        method: 'PATCH',
        body: { moderationStatus, moderationNote },
        schema: ownedListingResponseSchema,
      }),
    onSuccess: invalidate,
  });
}

export function useSaveDestination() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: Partial<DestinationInput> }) =>
      apiRequest(id ? `/admin/destinations/${id}` : '/admin/destinations', {
        method: id ? 'PATCH' : 'POST',
        body: input,
        schema: adminDestinationResponseSchema,
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteDestination() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/admin/destinations/${id}`, { method: 'DELETE', schema: z.null() }),
    onSuccess: invalidate,
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: ({ signal }) =>
      apiRequest('/admin/categories', { schema: categoryListResponseSchema, signal }),
    select: (r) => r.data,
  });
}

export function useSaveCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      slug,
      input,
    }: {
      slug: string;
      input: { name?: string; description?: string; sortOrder?: number };
    }) =>
      apiRequest(`/admin/categories/${slug}`, {
        method: 'PATCH',
        body: input,
        schema: z.object({ data: categorySchema }),
      }),
    onSuccess: invalidate,
  });
}
