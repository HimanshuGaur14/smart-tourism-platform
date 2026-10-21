import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { detail, list, mockApi, summary } from '../test/fixtures';
import { jsonResponse, renderRoute } from '../test/render';

// Leaflet needs a real browser; the map is covered by manual and e2e checks.
vi.mock('../features/destinations/lazy-map', () => ({
  LazyDestinationMap: () => <div data-testid="map" />,
}));

describe('Explore page', () => {
  it('shows loading skeletons, then destination cards from the API', async () => {
    mockApi({ '/api/v1/destinations': () => jsonResponse(list([summary()])) });
    renderRoute('/explore');
    expect(await screen.findByText(/loading destinations/i)).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: 'Netarhat' });
    expect(link).toHaveAttribute('href', '/destinations/netarhat');
    expect(screen.getByText('1 destination')).toBeInTheDocument();
  });

  it('sends URL filters to the API', async () => {
    const fetchMock = mockApi({ '/api/v1/destinations': () => jsonResponse(list([summary()])) });
    renderRoute('/explore?q=hill&category=mountains&state=Jharkhand&page=2');
    await screen.findByRole('link', { name: 'Netarhat' });
    const call = fetchMock.mock.calls
      .map(([u]) => new URL(String(u), 'http://localhost'))
      .find((u) => u.pathname === '/api/v1/destinations');
    expect(Object.fromEntries(call!.searchParams)).toMatchObject({
      q: 'hill',
      category: 'mountains',
      state: 'Jharkhand',
      page: '2',
      pageSize: '12',
    });
  });

  it('shows an empty state with a way to clear filters', async () => {
    mockApi({ '/api/v1/destinations': () => jsonResponse(list([])) });
    const user = userEvent.setup();
    const { router } = renderRoute('/explore?q=nothing');
    expect(await screen.findByText(/no destinations match/i)).toBeInTheDocument();
    const empty = screen.getByText(/no destinations match/i).closest('div')!;
    await user.click(within(empty).getByRole('button', { name: /clear filters/i }));
    expect(router.state.location.search).toBe('');
  });

  it('shows an error state with retry when the API fails', async () => {
    let fail = true;
    mockApi({
      '/api/v1/destinations': () =>
        fail
          ? jsonResponse(
              { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
              500,
            )
          : jsonResponse(list([summary()])),
    });
    const user = userEvent.setup();
    renderRoute('/explore');
    expect(await screen.findByText(/couldn’t load destinations/i)).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('link', { name: 'Netarhat' })).toBeInTheDocument();
  });

  it('paginates through the URL', async () => {
    mockApi({
      '/api/v1/destinations': (url) =>
        jsonResponse(
          list(
            [summary({ id: `p${url.searchParams.get('page')}` })],
            Number(url.searchParams.get('page')),
            30,
          ),
        ),
    });
    const user = userEvent.setup();
    const { router } = renderRoute('/explore');
    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(router.state.location.search).toBe('?page=2');
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('changing a filter resets to page 1', async () => {
    mockApi({ '/api/v1/destinations': () => jsonResponse(list([summary()], 2, 30)) });
    const user = userEvent.setup();
    const { router } = renderRoute('/explore?page=2');
    await screen.findByRole('link', { name: 'Netarhat' });
    await user.selectOptions(screen.getByLabelText('Category'), 'waterfalls');
    expect(router.state.location.search).toBe('?category=waterfalls');
  });
});

describe('Destination detail page', () => {
  it('renders details, tips, sources and labels the location as approximate', async () => {
    mockApi({
      '/api/v1/destinations/netarhat/nearby': () =>
        jsonResponse({
          data: [
            {
              ...summary({ id: 'd2', slug: 'betla-national-park', name: 'Betla National Park' }),
              distanceKm: 45,
            },
          ],
        }),
      '/api/v1/destinations/netarhat': () => jsonResponse({ data: detail() }),
    });
    renderRoute('/destinations/netarhat');
    expect(await screen.findByRole('heading', { level: 1, name: 'Netarhat' })).toBeInTheDocument();
    expect(document.title).toBe('Netarhat · Yatra Atlas');
    expect(screen.getByText('Carry your waste back out.')).toBeInTheDocument();
    expect(screen.getByText(/approximate location/i)).toBeInTheDocument();
    expect(screen.getByText(/forecast unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /netarhat/i, description: undefined })).toBeTruthy();
    expect(await screen.findByText(/about 45 km away/i)).toBeInTheDocument();
  });

  it('shows the not-found page for an unknown destination', async () => {
    mockApi({
      '/api/v1/destinations/atlantis': () =>
        jsonResponse({ error: { code: 'NOT_FOUND', message: 'Destination not found' } }, 404),
    });
    renderRoute('/destinations/atlantis');
    expect(
      await screen.findByRole('heading', { name: /couldn’t find that page/i }),
    ).toBeInTheDocument();
  });
});

describe('Home page', () => {
  it('loads featured destinations and hidden gems from the API', async () => {
    mockApi({
      '/api/v1/destinations/featured': (url) =>
        jsonResponse({
          data:
            url.searchParams.get('kind') === 'hidden-gems'
              ? [summary({ id: 'g1', slug: 'maluti', name: 'Maluti' })]
              : [summary()],
        }),
    });
    renderRoute('/');
    expect(await screen.findByRole('link', { name: 'Netarhat' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Maluti' })).toBeInTheDocument();
  });

  it('builds category tiles from the API with live counts', async () => {
    mockApi({
      '/api/v1/destinations/featured': () => jsonResponse({ data: [] }),
      '/api/v1/categories': () =>
        jsonResponse({
          data: [
            {
              id: 'c1',
              slug: 'waterfalls',
              name: 'Waterfalls',
              description: 'Falls',
              destinationCount: 4,
            },
            {
              id: 'c2',
              slug: 'beaches',
              name: 'Beaches',
              description: 'Coast',
              destinationCount: 1,
            },
          ],
        }),
    });
    renderRoute('/');
    const tile = await screen.findByRole('link', { name: /waterfalls\s*4 places/i });
    expect(tile).toHaveAttribute('href', '/explore?category=waterfalls');
    expect(screen.getByRole('link', { name: /beaches\s*1 place(?!s)/i })).toBeInTheDocument();
  });

  it('shows a retry when categories fail to load', async () => {
    mockApi({
      '/api/v1/destinations/featured': () => jsonResponse({ data: [] }),
      '/api/v1/categories': () =>
        jsonResponse({ error: { code: 'INTERNAL_ERROR', message: 'x' } }, 500),
    });
    renderRoute('/');
    expect(await screen.findByText(/couldn’t load categories/i)).toBeInTheDocument();
  });
});
