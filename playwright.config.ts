import { defineConfig } from '@playwright/test';

/**
 * End to end checks against a running app (web on 3000, API on 5000, seeded
 * demo data). Run with `npm run test:e2e`. Uses the installed Chrome: no
 * browser download. Tests that create data only run with E2E_MUTATE=1.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
});
