import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { healthyResponse, jsonResponse, renderRoute } from '../../test/render';

describe('ApiStatus', () => {
  it('shows a loading state, then online with the API version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(healthyResponse))),
    );
    renderRoute('/');
    expect(screen.getByText(/checking service status/i)).toBeInTheDocument();
    expect(await screen.findByText(/service online · v0\.1\.0/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/health',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('shows an error state when the API is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    renderRoute('/');
    expect(await screen.findByText(/service unreachable/i)).toBeInTheDocument();
  });

  it('shows an error state when the API returns an error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Down' } }, 503),
        ),
      ),
    );
    renderRoute('/');
    expect(await screen.findByText(/service unreachable/i)).toBeInTheDocument();
  });
});
