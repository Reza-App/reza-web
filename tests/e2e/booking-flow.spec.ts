import { expect, test } from '@playwright/test';
import { ACCOUNTS, apiCall, CLIENT_URL, loginClient, loginPro } from './helpers';

/**
 * Full flow across profiles: the client books, the salon agenda shows it
 * without reloading, the salon confirms then cancels, the client sees it and
 * is notified. Creates data: only runs with E2E_MUTATE=1 (test database).
 */
test.skip(process.env.E2E_MUTATE !== '1', 'Creates appointments: set E2E_MUTATE=1 on a test database');

test('book, confirm and cancel across client and salon', async ({ browser }) => {
  const pro = await (await browser.newContext()).newPage();
  const client = await (await browser.newContext()).newPage();
  await loginPro(pro, ACCOUNTS.pro);
  await loginClient(client);

  let appointmentId: string | undefined;
  client.on('response', async (r) => {
    if (r.url().endsWith('/bookings') && r.request().method() === 'POST') {
      const body = (await r.json().catch(() => ({}))) as { appointments?: { id: string }[]; bookingGroup?: { appointments?: { id: string }[] } };
      appointmentId = body.appointments?.[0]?.id ?? body.bookingGroup?.appointments?.[0]?.id;
    }
  });

  await client.goto(`${CLIENT_URL}/salon/atelier-noor/reserver`);
  await client.locator('section:has(h2:text("Prestations")) li button').first().click();
  const day = client.locator('section:has(h2:text("Date et heure")) button[aria-pressed="true"][aria-label]');
  await expect(client.getByText(/\d+ dispo/).first()).toBeVisible({ timeout: 60_000 });
  const label = (await day.getAttribute('aria-label')) ?? '';
  const [, d, m] = label.match(/(\d+) ([a-zéû]+)/) ?? [];
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const now = new Date();
  const mi = months.indexOf(m!);
  const iso = `${mi < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear()}-${String(mi + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  await pro.goto(`/dashboard/rendez-vous?view=day&date=${iso}`);
  const count = pro.getByText(/^\d+ rendez vous$/).first();
  const before = await count.innerText();

  await client.locator('section:has(h2:text("Date et heure")) .grid button').first().click();
  await client.getByRole('button', { name: /Confirmer le rendez vous/ }).click();
  await expect(client.locator('h1').first()).toHaveText(/réservé/);

  // Live agenda: no reload on the salon side.
  await expect(count).not.toHaveText(before, { timeout: 15_000 });
  expect(appointmentId).toBeTruthy();

  expect((await apiCall(pro, 'PUT', `/api/backend/appointments/${appointmentId}`, { status: 'CONFIRMED' })).status).toBe(200);
  expect((await apiCall(pro, 'DELETE', `/api/backend/appointments/${appointmentId}`)).status).toBe(200);

  await client.goto(`${CLIENT_URL}/compte/rendez-vous`);
  await client.getByText(/^Annulés/).click();
  await expect(client.locator('article').first()).toBeVisible();
  await client.locator('header button[aria-label^="Notifications"]').click();
  await expect(client.getByText(/a annulé votre rendez-vous/).first()).toBeVisible();
});
