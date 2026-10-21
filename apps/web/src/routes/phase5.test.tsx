import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi } from '../test/fixtures';
import { jsonResponse, renderRoute } from '../test/render';

const user = (role: 'TOURIST' | 'VENDOR' | 'ADMIN') => ({
  id: 'u1',
  name: 'Asha',
  email: 'asha@example.com',
  role,
});
const signedIn = (role: 'TOURIST' | 'VENDOR' | 'ADMIN') => () =>
  jsonResponse({ data: { user: user(role), csrfToken: 'csrf-123' } });

const listing = {
  id: 'l1',
  slug: 'river-homestay',
  type: 'HOMESTAY',
  title: 'River Homestay',
  summary: 'A quiet stay by the river.',
  description: 'Rooms with a view of the river.',
  state: 'Jharkhand',
  district: 'Latehar',
  priceInfo: null,
  imageUrl: null,
  isSample: true,
  destination: null,
  vendor: { id: 'v1', name: 'Sample vendor' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const DISCLAIMER = 'Illustrative demo values, not real visitor counts.';
const dest = { slug: 'netarhat', name: 'Netarhat', state: 'Jharkhand' };

describe('Login', () => {
  it('validates fields before calling the API', async () => {
    const fetchMock = mockApi({});
    const u = userEvent.setup();
    renderRoute('/login');
    await u.click(await screen.findByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/auth/login'))).toBe(false);
  });

  it('shows the server error for wrong credentials', async () => {
    mockApi({
      '/api/v1/auth/login': () =>
        jsonResponse(
          { error: { code: 'UNAUTHENTICATED', message: 'Email or password is incorrect' } },
          401,
        ),
    });
    const u = userEvent.setup();
    renderRoute('/login');
    await u.type(await screen.findByLabelText(/email/i), 'asha@example.com');
    await u.type(screen.getByLabelText(/password/i), 'wrong-password-1');
    await u.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i);
  });
});

describe('RequireAuth', () => {
  it('redirects signed-out visitors to login with a return path', async () => {
    mockApi({});
    const { router } = renderRoute('/vendor');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/vendor')}`);
  });

  it('blocks a signed-in user with the wrong role', async () => {
    mockApi({ '/api/v1/auth/me': signedIn('TOURIST') });
    renderRoute('/admin');
    expect(await screen.findByText(/don’t have access/i)).toBeInTheDocument();
  });
});

describe('Enquiry form', () => {
  it('validates, then sends the enquiry with the CSRF token', async () => {
    const fetchMock = mockApi({
      '/api/v1/auth/me': signedIn('TOURIST'),
      '/api/v1/listings': () => jsonResponse({ data: listing }),
      '/api/v1/enquiries': () =>
        jsonResponse(
          {
            data: {
              id: 'e1',
              status: 'NEW',
              name: 'Asha',
              email: 'asha@example.com',
              phone: null,
              travelDate: null,
              groupSize: null,
              message: 'Is the room free in December?',
              createdAt: '2026-01-01T00:00:00.000Z',
              listing: { id: 'l1', slug: 'river-homestay', title: 'River Homestay' },
            },
          },
          201,
        ),
    });
    const u = userEvent.setup();
    renderRoute('/marketplace/river-homestay');
    const form = await screen.findByRole('form', { name: /send an enquiry/i });
    await u.click(within(form).getByRole('button', { name: /send enquiry/i }));
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/enquiries'))).toBe(false);

    await u.type(within(form).getByLabelText(/^message/i), 'Is the room free in December?');
    await u.click(within(form).getByRole('button', { name: /send enquiry/i }));
    expect(await screen.findByText(/enquiry sent/i)).toBeInTheDocument();
    expect(screen.getByText(/enquiry sent/i).closest('[role=status]')).toHaveTextContent(
      /sample listing, so nobody will reply/i,
    );

    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/enquiries'));
    const init = call![1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-123');
    expect(JSON.parse(String(init.body))).toMatchObject({ listingId: 'l1' });
  });
});

describe('Intelligence dashboard', () => {
  it('labels every figure as illustrative demo data', async () => {
    mockApi({
      '/api/v1/analytics/destinations': () =>
        jsonResponse({
          data: {
            source: 'DEMO',
            disclaimer: DISCLAIMER,
            insights: [
              {
                destination: { ...dest, category: 'mountains' },
                visitorsLast12Months: 120000,
                peakMonth: 10,
                currentCrowdLevel: 'MODERATE',
              },
            ],
            crowdDistribution: [{ level: 'MODERATE', count: 1 }],
            anomalies: [],
            alternatives: [],
          },
        }),
      '/api/v1/analytics/footfall': () =>
        jsonResponse({
          data: {
            source: 'DEMO',
            disclaimer: DISCLAIMER,
            months: ['2026-01'],
            series: [{ destination: dest, points: [{ month: '2026-01', visitors: 9000 }] }],
            seasonality: [{ month: 1, index: 1 }],
          },
        }),
      '/api/v1/forecasts': () =>
        jsonResponse({
          data: [
            {
              destination: { id: 'd1', slug: 'netarhat', name: 'Netarhat' },
              source: 'DEMO',
              modelVersion: 'demo-seasonal-v1',
              generatedAt: '2026-01-01T00:00:00.000Z',
              unavailableReason: null,
              points: [
                { date: '2026-10-22', predictedVisitors: 400, crowdLevel: 'LOW', interval: null },
              ],
            },
          ],
        }),
    });
    renderRoute('/intelligence');
    expect(
      await screen.findByText(
        /all figures on this page are illustrative demo data/i,
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText(DISCLAIMER)).toBeInTheDocument();
    expect(await screen.findByText(/not real predictions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/demo data/i).length).toBeGreaterThanOrEqual(6);
    expect(screen.queryByText(/accuracy|confidence/i)).not.toBeInTheDocument();
  });
});
