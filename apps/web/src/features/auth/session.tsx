import {
  sessionResponseSchema,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
  type UserRole,
} from '@smart-tourism/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest, setCsrfToken } from '../../lib/api-client';

export const sessionKey = ['session'] as const;

async function fetchSession(signal?: AbortSignal) {
  const res = await apiRequest('/auth/me', { schema: sessionResponseSchema, signal });
  setCsrfToken(res.data.csrfToken);
  return res.data;
}

export function useSession() {
  const query = useQuery({
    queryKey: sessionKey,
    queryFn: ({ signal }) => fetchSession(signal),
    staleTime: 5 * 60_000,
  });
  const user: PublicUser | null = query.data?.user ?? null;
  return { ...query, user, hasRole: (...roles: UserRole[]) => !!user && roles.includes(user.role) };
}

function useSessionMutation<TInput>(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TInput) => {
      const res = await apiRequest(path, {
        method: 'POST',
        body: input,
        schema: sessionResponseSchema,
      });
      setCsrfToken(res.data.csrfToken);
      return res.data;
    },
    onSuccess: async (data) => {
      // A different user may now be signed in: drop everything cached for the old one.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === 'me' });
      queryClient.setQueryData(sessionKey, data);
    },
  });
}

export const useLogin = () => useSessionMutation<LoginInput>('/auth/login');
export const useRegister = () => useSessionMutation<RegisterInput>('/auth/register');

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/auth/logout', { method: 'POST', schema: z.null() }),
    onSettled: () => {
      setCsrfToken(null);
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === 'me' });
      queryClient.setQueryData(sessionKey, { user: null, csrfToken: null });
    },
  });
}

export const roleHome: Record<UserRole, string> = {
  TOURIST: '/account',
  VENDOR: '/vendor',
  ADMIN: '/admin',
};
