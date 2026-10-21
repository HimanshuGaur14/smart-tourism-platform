import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { detail, list, mockApi, summary } from '../test/fixtures';
import { jsonResponse, renderRoute } from '../test/render';

vi.mock('../features/destinations/lazy-map', () => ({
  LazyDestinationMap: () => <div data-testid="map" />,
}));

const me = () =>
  jsonResponse({
    data: {
      user: { id: 'u1', name: 'Asha', email: 'asha@example.com', role: 'TOURIST' },
      csrfToken: 'csrf-1',
    },
  });

const itinerary = (overrides = {}) => ({
  id: 'it1',
  title: 'Hills of Jharkhand',
  startDate: null,
  durationDays: 2,
  interests: [],
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  items: [
    { id: 'i1', position: 0, dayNumber: 1, notes: null, available: true, destination: summary() },
  ],
  ...overrides,
});

describe('Save destination', () => {
  it('asks signed-out visitors to sign in', async () => {
    mockApi({ '/api/v1/destinations': () => jsonResponse({ data: detail() }) });
    renderRoute('/destinations/netarhat');
    expect(await screen.findByRole('button', { name: /sign in to save/i })).toBeInTheDocument();
  });

  it('saves for a signed-in user', async () => {
    let saved = false;
    const fetchMock = mockApi({
      '/api/v1/auth/me': me,
      '/api/v1/destinations': () => jsonResponse({ data: detail() }),
      '/api/v1/me/saved-destinations': (_url, init) => {
        if (init?.method === 'PUT') saved = true;
        return jsonResponse({
          data: saved
            ? init?.method === 'PUT'
              ? { ...summary(), savedAt: '2026-01-01T00:00:00.000Z' }
              : [{ ...summary(), savedAt: '2026-01-01T00:00:00.000Z' }]
            : [],
        });
      },
    });
    const u = userEvent.setup();
    renderRoute('/destinations/netarhat');
    await u.click(await screen.findByRole('button', { name: 'Save Netarhat' }));
    expect(await screen.findByRole('button', { name: 'Saved' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(String(put![0])).toContain('/me/saved-destinations/netarhat');
  });
});

describe('Trip planner', () => {
  it('redirects signed-out visitors to sign in', async () => {
    mockApi({});
    const { router } = renderRoute('/planner');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('validates, then creates an itinerary with ordered stops', async () => {
    const fetchMock = mockApi({
      '/api/v1/auth/me': me,
      '/api/v1/me/saved-destinations': () => jsonResponse({ data: [] }),
      '/api/v1/destinations': () =>
        jsonResponse(list([summary(), summary({ id: 'd2', slug: 'betla', name: 'Betla' })])),
      '/api/v1/me/itineraries': (_url, init) =>
        init?.method === 'POST'
          ? jsonResponse({ data: itinerary() }, 201)
          : jsonResponse({ data: itinerary() }),
    });
    const u = userEvent.setup();
    const { router } = renderRoute('/planner/new');
    const form = await screen.findByRole('form', { name: 'Itinerary' });

    await u.click(within(form).getByRole('button', { name: 'Create itinerary' }));
    expect(await screen.findByText(/give the trip a title/i)).toBeInTheDocument();

    await u.type(within(form).getByLabelText(/title/i), 'Hills of Jharkhand');
    await u.click(await screen.findByRole('button', { name: 'Add Betla' }));
    await u.click(screen.getByRole('button', { name: 'Add Netarhat' }));
    await u.click(screen.getByRole('button', { name: 'Move Netarhat up' }));
    await u.click(within(form).getByRole('button', { name: 'Create itinerary' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/planner/it1'));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    const body = JSON.parse(String(post![1]!.body));
    expect(body.title).toBe('Hills of Jharkhand');
    expect(body.items.map((i: { destinationSlug: string }) => i.destinationSlug)).toEqual([
      'netarhat',
      'betla',
    ]);
  });

  it('shows not found for an itinerary that is not yours', async () => {
    mockApi({
      '/api/v1/auth/me': me,
      '/api/v1/me/itineraries': () =>
        jsonResponse({ error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404),
    });
    renderRoute('/planner/someone-elses');
    expect(await screen.findByText('Itinerary not found')).toBeInTheDocument();
  });
});
