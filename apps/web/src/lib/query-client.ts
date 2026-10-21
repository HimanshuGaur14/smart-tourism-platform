import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from './api-client';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        // Do not retry client errors (4xx); retry transient failures once.
        retry: (failureCount, error) =>
          !(error instanceof ApiClientError && error.status >= 400 && error.status < 500) &&
          failureCount < 1,
      },
    },
  });
}
