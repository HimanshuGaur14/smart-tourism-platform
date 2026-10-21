import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
});

test('a tourist saves a destination and builds, edits and deletes an itinerary', async ({
  page,
}) => {
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Planner');
  await page.getByLabel('Email').fill(`e2e-plan-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('e2e-password-123');
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/account$/);

  // Save a destination, and see it on the account page after a reload (persisted).
  await page.goto('/destinations/netarhat');
  await page.getByRole('button', { name: 'Save Netarhat' }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
  await page.goto('/account');
  await page.reload();
  await expect(page.getByRole('link', { name: 'Netarhat' })).toBeVisible();

  // Create an itinerary from a saved place and a search result.
  await page.goto('/planner/new');
  const form = page.getByRole('form', { name: 'Itinerary' });
  await form.getByLabel('Title').fill('Jharkhand long weekend');
  await form.getByLabel('Number of days').fill('3');
  await page.getByRole('button', { name: 'Add Netarhat' }).first().click();
  await page.getByLabel('Search destinations').fill('hundru');
  await page.getByRole('button', { name: 'Add Hundru Falls' }).click();
  await form.getByRole('button', { name: 'Create itinerary' }).click();
  await expect(page).toHaveURL(/\/planner\/[a-z0-9]+$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Jharkhand long weekend' }),
  ).toBeVisible();

  // Reorder, save, reload: the order persists.
  await page.getByRole('button', { name: 'Move Hundru Falls up' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await page.reload();
  const stops = page.getByRole('region', { name: /stops/i }).getByRole('listitem');
  await expect(stops.first()).toContainText('Hundru Falls');
  await expect(stops.nth(1)).toContainText('Netarhat');

  await page.goto('/planner');
  await expect(page.getByRole('link', { name: 'Jharkhand long weekend' })).toBeVisible();
  await page.getByRole('link', { name: 'Jharkhand long weekend' }).click();
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByText('No itineraries yet')).toBeVisible();
});

test('pages do not scroll sideways at phone width', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Phone layout only');
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Layout');
  await page.getByLabel('Email').fill(`e2e-layout-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('e2e-password-123');
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/account$/);

  const paths = [
    '/',
    '/explore',
    '/destinations/netarhat',
    '/marketplace',
    '/intelligence',
    '/account',
    '/planner',
    '/planner/new',
  ];
  for (const path of paths) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const [scroll, client] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scroll, `${path} is wider than the screen`).toBeLessThanOrEqual(client);
  }
});
