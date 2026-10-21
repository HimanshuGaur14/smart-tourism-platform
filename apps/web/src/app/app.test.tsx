import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { healthyResponse, jsonResponse, renderRoute } from '../test/render';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(jsonResponse(healthyResponse))),
  );
});

describe('routing and layout', () => {
  it('renders the home page with primary navigation', async () => {
    renderRoute('/');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /find the india you haven’t seen yet/i,
      }),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'Explore India' })).toHaveAttribute(
      'href',
      '/explore',
    );
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main');
  });

  it('hero search navigates to Explore with the query in the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/');
    await user.type(screen.getByRole('searchbox'), 'Ziro Valley');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(
      await screen.findByRole('heading', { name: /find your next destination/i }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/explore');
    expect(router.state.location.search).toBe('?q=Ziro%20Valley');
    expect(screen.getByRole('searchbox')).toHaveValue('Ziro Valley');
  });

  it('category filter on Explore updates the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/explore');
    await user.selectOptions(await screen.findByLabelText('Category'), 'waterfalls');
    expect(router.state.location.search).toBe('?category=waterfalls');
  });

  it('ignores an invalid category in the URL', async () => {
    renderRoute('/explore?category=not-real');
    expect(await screen.findByLabelText('Category')).toHaveValue('');
  });

  it('shows a 404 page for unknown routes', () => {
    renderRoute('/no-such-page');
    expect(screen.getByRole('heading', { name: /couldn’t find that page/i })).toBeInTheDocument();
  });

  it('toggles the mobile menu accessibly', async () => {
    const user = userEvent.setup();
    renderRoute('/');
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
