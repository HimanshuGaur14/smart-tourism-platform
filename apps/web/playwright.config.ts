import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real stack (web + API + seeded PostgreSQL).
 * Starts `npm run dev` from the repo root unless servers are already running.
 * First run: `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    cwd: '../..',
    url: 'http://localhost:5173/api/v1/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
