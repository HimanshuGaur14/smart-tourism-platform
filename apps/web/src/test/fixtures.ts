import type { DestinationDetail, DestinationSummary } from '@smart-tourism/contracts';
import { vi } from 'vitest';
import { healthyResponse, jsonResponse } from './render';

export function summary(overrides: Partial<DestinationSummary> = {}): DestinationSummary {
  return {
    id: 'd1',
    slug: 'netarhat',
    name: 'Netarhat',
    state: 'Jharkhand',
    district: 'Latehar',
    category: { slug: 'mountains', name: 'Mountains' },
    shortDescription: 'A quiet hill station.',
    latitude: 23.47,
    longitude: 84.27,
    coordinatesVerified: false,
    tags: ['hill station'],
    featured: true,
    hiddenGem: true,
    image: null,
    ...overrides,
  };
}

export function detail(overrides: Partial<DestinationDetail> = {}): DestinationDetail {
  return {
    ...summary(),
    description: 'Netarhat sits on the Chota Nagpur Plateau.',
    images: [],
    bestTimeToVisit: 'October to March',
    responsibleTips: ['Carry your waste back out.'],
    sourceUrls: ['https://en.wikipedia.org/wiki/Netarhat'],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export const list = (data: DestinationSummary[], page = 1, total = data.length, pageSize = 12) => ({
  data,
  meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
});

type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>;

/**
 * Stubs fetch with a tiny router: the first matching path prefix wins.
 * Health, states and categories get sensible defaults.
 */
export function mockApi(routes: Record<string, Handler>) {
  const defaults: Record<string, Handler> = {
    '/api/v1/health': () => jsonResponse(healthyResponse),
    '/api/v1/destinations/states': () =>
      jsonResponse({ data: [{ state: 'Jharkhand', destinationCount: 1 }] }),
    '/api/v1/categories': () => jsonResponse({ data: [] }),
    '/api/v1/auth/me': () => jsonResponse({ data: { user: null, csrfToken: null } }),
  };
  const all = { ...defaults, ...routes };
  const keys = Object.keys(all).sort((a, b) => b.length - a.length);
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const key = keys.find(
      (k) =>
        url.pathname === k || url.pathname.startsWith(`${k}/`) || url.pathname === k.split('?')[0],
    );
    if (!key)
      return Promise.resolve(
        jsonResponse({ error: { code: 'NOT_FOUND', message: 'No mock' } }, 404),
      );
    return Promise.resolve(all[key]!(url, init));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
