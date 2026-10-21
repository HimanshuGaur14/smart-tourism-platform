import { healthResponseSchema } from '@smart-tourism/contracts';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../test/render';
import { ApiClientError, apiRequest } from './api-client';

describe('apiRequest', () => {
  it('turns an error envelope into an ApiClientError with code and details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: [{ path: 'email', message: 'Invalid email' }],
              },
            },
            400,
          ),
        ),
      ),
    );
    const error = await apiRequest('/x', { schema: healthResponseSchema }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect((error as ApiClientError).details?.[0]?.path).toBe('email');
  });

  it('rejects a 200 response that does not match the contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ data: { status: 'weird' } }))),
    );
    await expect(apiRequest('/health', { schema: healthResponseSchema })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('sends JSON bodies with credentials', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse({ data: null })));
    vi.stubGlobal('fetch', fetchMock);
    const { z } = await import('zod');
    await apiRequest('/echo', {
      method: 'POST',
      body: { a: 1 },
      schema: z.object({ data: z.null() }),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/echo',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: '{"a":1}',
      }),
    );
  });
});
