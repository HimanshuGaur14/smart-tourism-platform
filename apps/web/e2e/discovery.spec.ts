import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Map tiles come from openstreetmap.org; block them so tests do not depend on the network.
test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
});

async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page })
    .exclude('.leaflet-container')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

test('home page loads featured destinations and categories from the API', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find the India');
  const featured = page.locator('section', {
    has: page.getByRole('heading', { name: 'Destinations across India' }),
  });
  await expect(featured.getByRole('listitem').first().getByRole('link')).toBeVisible();
  await expect(page.getByRole('link', { name: /Waterfalls\s*\d+ places/ })).toBeVisible();
  await expect(page.getByText('Service online')).toBeVisible();
  await expectNoSeriousA11yIssues(page);
});

test('hero search leads to filtered Explore results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox').fill('Ziro');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/\/explore\?q=Ziro$/);
  await expect(page.getByRole('link', { name: 'Ziro Valley' })).toBeVisible();
  await expect(page.getByText('1 destination', { exact: true })).toBeVisible();
});

test('Explore filters, pagination and clearing', async ({ page }) => {
  await page.goto('/explore');
  await expect(page.getByText('35 destinations')).toBeVisible();
  await expect(page.getByText('Page 1 of 3')).toBeVisible();

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText('Page 2 of 3')).toBeVisible();

  await page.getByLabel('State or union territory').selectOption('Jharkhand');
  await expect(page).toHaveURL(/state=Jharkhand/);
  await expect(page).not.toHaveURL(/page=/);
  await page.getByLabel('Category').selectOption('waterfalls');
  await expect(page.getByText('2 destinations')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Hundru Falls' })).toBeVisible();

  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page.getByText('35 destinations')).toBeVisible();
  await expectNoSeriousA11yIssues(page);
});

test('Explore shows an empty state for a search with no matches', async ({ page }) => {
  await page.goto('/explore?q=qwertyuiop');
  await expect(page.getByText('No destinations match your search')).toBeVisible();
});

test('Explore shows an error state and recovers on retry', async ({ page }) => {
  let fail = true;
  await page.route('**/api/v1/destinations?*', (route) =>
    fail
      ? route.fulfill({
          status: 500,
          json: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        })
      : route.fallback(),
  );
  await page.goto('/explore');
  await expect(page.getByText('We couldn’t load destinations')).toBeVisible({ timeout: 15_000 });
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('35 destinations')).toBeVisible();
});

test('map view renders a marker per destination', async ({ page }) => {
  await page.goto('/explore?view=map&state=Jharkhand');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('path.leaflet-interactive')).toHaveCount(6);
});

test('destination detail page from a card, with nearby places', async ({ page }) => {
  await page.goto('/explore?q=netarhat');
  await page.getByRole('link', { name: 'Netarhat' }).click();
  await expect(page).toHaveURL('/destinations/netarhat');
  await expect(page.getByRole('heading', { level: 1, name: 'Netarhat' })).toBeVisible();
  await expect(page).toHaveTitle('Netarhat · Yatra Atlas');
  await expect(page.getByText('Approximate location.')).toBeVisible();
  await expect(page.getByText('Demo forecast')).toBeVisible();
  await expect(page.getByRole('main').getByText(/not real predictions/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Betla National Park' })).toBeVisible();
  await expectNoSeriousA11yIssues(page);
});

test('unknown destination shows the not-found page', async ({ page }) => {
  await page.goto('/destinations/atlantis');
  await expect(page.getByRole('heading', { name: /couldn’t find that page/ })).toBeVisible();
});

test('keyboard users can skip to content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard flow is checked on desktop');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('mobile menu opens, navigates and closes', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile only');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile' })
    .getByRole('link', { name: 'Explore India' })
    .click();
  await expect(page).toHaveURL('/explore');
  await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeHidden();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
