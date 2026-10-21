import { healthResponseSchema } from '@smart-tourism/contracts';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';

export function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiRequest('/health', { schema: healthResponseSchema, signal }),
    select: (response) => response.data,
    staleTime: 30_000,
  });
}
