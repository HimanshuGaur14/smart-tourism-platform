import {
  API_PREFIX,
  CSRF_HEADER,
  apiErrorSchema,
  type ErrorCode,
  type FieldError,
} from '@smart-tourism/contracts';
import type { z } from 'zod';

/** Error thrown for any non-2xx API response or network failure. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK_ERROR' | 'INVALID_RESPONSE',
    public readonly details?: FieldError[],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * CSRF token for the current session, kept in memory only (never in storage).
 * Set from /auth/me, login and register responses.
 */
let csrfToken: string | null = null;
export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

interface RequestOptions<T extends z.ZodType> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Validates the response so UI code never trusts an unexpected shape. */
  schema: T;
  signal?: AbortSignal;
}

/**
 * Calls the Express API. Always same-origin (`/api/v1/...`) and always sends
 * cookies, so HttpOnly session cookies work without exposing tokens to JS.
 */
export async function apiRequest<T extends z.ZodType>(
  path: string,
  { method = 'GET', body, schema, signal }: RequestOptions<T>,
): Promise<z.infer<T>> {
  let response: Response;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers[CSRF_HEADER] = csrfToken;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiClientError(
      'Could not reach the server. Check your connection.',
      0,
      'NETWORK_ERROR',
    );
  }

  const json: unknown = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    if (parsed.success) {
      const { message, code, details } = parsed.data.error;
      throw new ApiClientError(message, response.status, code, details);
    }
    throw new ApiClientError(
      `Request failed (${response.status})`,
      response.status,
      'INTERNAL_ERROR',
    );
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(
      'The server sent an unexpected response.',
      response.status,
      'INVALID_RESPONSE',
    );
  }
  return parsed.data;
}
