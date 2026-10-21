import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

test('a tourist registers, sends an enquiry and sees it in their account', async ({
  page,
  isMobile,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Tourist');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('e2e-password-123');
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto('/marketplace');
  await expect(page.getByText('Sample listing').first()).toBeVisible();
  await expectNoSeriousA11yIssues(page);
  await page.locator('main a[href^="/marketplace/"]').first().click();
  const form = page.getByRole('form', { name: 'Send an enquiry' });
  await form.getByLabel(/^Message/).fill('Is this available in the second week of December?');
  await form.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(page.getByText('Enquiry sent')).toBeVisible();

  await page.goto('/account');
  await expect(page.getByText('Is this available in the second week of December?')).toBeVisible();

  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Sign out' }).locator('visible=true').click();
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?next=/);
});

test('the intelligence dashboard labels its figures as demo data', async ({ page }) => {
  await page.goto('/intelligence');
  await expect(
    page.getByText('All figures on this page are illustrative demo data.'),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: /illustrative monthly visitors/i })).toBeVisible();
  await expect(page.getByRole('table', { name: /crowd forecast/i })).toBeVisible();
  await expect(page.getByText('Demo forecast').first()).toBeVisible();
  await expectNoSeriousA11yIssues(page);
});
