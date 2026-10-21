import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '../app/providers';
import { routes } from '../app/router';

/** Renders the real route tree at a given URL with a fresh, retry-free query client. */
export function renderRoute(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    router,
    ...render(
      <AppProviders client={client}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const healthyResponse = {
  data: {
    status: 'ok',
    service: 'smart-tourism-api',
    version: '0.1.0',
    environment: 'test',
    uptimeSeconds: 1,
    timestamp: new Date().toISOString(),
    database: 'up',
    forecastProvider: 'demo',
  },
};
