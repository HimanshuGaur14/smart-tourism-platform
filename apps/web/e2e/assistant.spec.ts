import { expect, test } from '@playwright/test';

// Stand-in for the FastAPI chat page so these tests do not need the ML backend running.
test.beforeEach(async ({ page, context }) => {
  const stub = (route: { fulfill: (r: object) => Promise<void> }) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Stub chat</h1>' });
  await page.route('http://127.0.0.1:8000/**', stub);
  await context.route('http://127.0.0.1:8000/**', stub);
});

test('single click toggles the panel and lazily loads the chat', async ({ page }) => {
  await page.goto('/');
  const tab = page.locator('[aria-controls="assistant-panel"]');
  await expect(tab).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#assistant-panel iframe')).toHaveCount(0);

  await tab.click();
  await expect(tab).toHaveAttribute('aria-expanded', 'true');
  const frame = page.frameLocator('#assistant-panel iframe');
  await expect(frame.getByRole('heading', { name: 'Stub chat' })).toBeVisible();
  await expect(page.getByText(/not real predictions/)).toBeVisible();

  // Close: from the header button (the tab is covered on phones, where the panel is full screen).
  await page.getByRole('button', { name: 'Close AI Assistant' }).last().click();
  await expect(tab).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#assistant-panel')).toBeHidden();
});

test('double click opens the chat in a popup and keeps the panel collapsed', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Double click is a desktop gesture; phones use the header button');
  await page.goto('/');
  const tab = page.locator('[aria-controls="assistant-panel"]');
  const [popup] = await Promise.all([page.waitForEvent('popup'), tab.dblclick()]);
  expect(popup.url()).toBe('http://127.0.0.1:8000/chat-ui');
  await page.waitForTimeout(400);
  await expect(tab).toHaveAttribute('aria-expanded', 'false');
});

test('header button opens the popup and collapses the panel', async ({ page }) => {
  await page.goto('/');
  await page.locator('[aria-controls="assistant-panel"]').click();
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Open chat in a new window' }).click(),
  ]);
  expect(popup.url()).toBe('http://127.0.0.1:8000/chat-ui');
  await expect(page.locator('#assistant-panel')).toBeHidden();
});

test('keyboard: Enter opens, Escape closes and returns focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard flow is checked on desktop');
  await page.goto('/');
  const tab = page.locator('[aria-controls="assistant-panel"]');
  await tab.focus();
  await page.keyboard.press('Enter');
  await expect(tab).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(tab).toHaveAttribute('aria-expanded', 'false');
  await expect(tab).toBeFocused();
});

test('panel size: 380x600 on desktop, full screen on phones', async ({ page, isMobile }) => {
  await page.goto('/');
  await page.locator('[aria-controls="assistant-panel"]').click();
  const panel = page.locator('#assistant-panel');
  await expect(panel).toBeVisible();
  await page.waitForTimeout(400); // slide animation
  const box = (await panel.boundingBox())!;
  const vp = page.viewportSize()!;
  if (isMobile) {
    expect(Math.round(box.width)).toBe(vp.width);
    expect(Math.round(box.height)).toBe(vp.height);
  } else {
    expect(Math.round(box.width)).toBe(380);
    expect(Math.round(box.height)).toBe(Math.min(600, vp.height - 40));
    expect(Math.round(box.x + box.width)).toBe(vp.width);
  }
});
