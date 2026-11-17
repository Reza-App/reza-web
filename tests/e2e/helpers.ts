import { expect, type Page } from '@playwright/test';

/** Demo accounts of the seed (override with env variables on another database). */
export const ACCOUNTS = {
  superadmin: { email: process.env.E2E_SUPERADMIN_EMAIL ?? 'superadmin@gmail.com', password: process.env.E2E_SUPERADMIN_PASSWORD ?? '123456' },
  pro: { email: process.env.E2E_PRO_EMAIL ?? 'demo.pro@reza.ma', password: process.env.E2E_PRO_PASSWORD ?? 'demo1234' },
  staff: { email: process.env.E2E_STAFF_EMAIL ?? 'lina.idrissi@atelier-noor.ma', password: process.env.E2E_STAFF_PASSWORD ?? 'staff123' },
  client: { email: process.env.E2E_CLIENT_EMAIL ?? 'demo.client@reza.ma', password: process.env.E2E_CLIENT_PASSWORD ?? 'demo1234' },
};

/** The client site (landing_client) runs apart from this app. */
export const CLIENT_URL = (process.env.E2E_CLIENT_URL ?? 'http://localhost:3100').replace(/\/+$/, '');

export async function loginPro(page: Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('input[type=email]', account.email);
  await page.fill('input#password', account.password);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/(dashboard|plateforme)/, { timeout: 60_000 });
}

export async function loginClient(page: Page) {
  await page.goto(`${CLIENT_URL}/connexion`);
  await page.fill('input[type=email]', ACCOUNTS.client.email);
  await page.fill('input[type=password]', ACCOUNTS.client.password);
  await page.click('button[type=submit]');
  await page.waitForURL((url) => !url.pathname.startsWith('/connexion'), { timeout: 60_000 });
}

/** Collects page crashes and failing API calls (5xx, or 4xx other than session checks). */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`page error: ${String(e).slice(0, 200)}`));
  page.on('response', (r) => {
    const url = new URL(r.url());
    if (!url.pathname.startsWith('/api/')) return;
    if (/\/api\/(session|client\/session)$/.test(url.pathname)) return;
    if (r.status() >= 400) errors.push(`${r.status()} ${r.request().method()} ${url.pathname}`);
  });
  return errors;
}

/** Visits a page and checks it rendered a heading without errors. */
export async function visit(page: Page, path: string, errors: string[]) {
  const before = errors.length;
  await page.goto(path);
  await expect(page.locator('main h1').first()).toBeVisible();
  // Not "networkidle": the realtime channel keeps a request open on the dashboard.
  await page.waitForTimeout(2000);
  expect(errors.slice(before), `${path} errors`).toEqual([]);
}

/** Calls the API through the dashboard relay, as the signed in user. */
export async function apiCall(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ([m, p, b]) => {
      const r = await fetch(p as string, {
        method: m as string,
        headers: { 'Content-Type': 'application/json', 'x-selia-request': '1', Accept: 'application/json' },
        body: b ? JSON.stringify(b) : undefined,
      });
      return { status: r.status, body: (await r.json().catch(() => ({}))) as { message?: string } };
    },
    [method, path, body] as const,
  );
}
