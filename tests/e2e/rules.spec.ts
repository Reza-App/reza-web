import { expect, test } from '@playwright/test';
import { ACCOUNTS, apiCall, CLIENT_URL, loginClient, loginPro } from './helpers';

/**
 * Business rules enforced by the API. Only refused changes are sent here, so
 * nothing is modified in the database.
 */
test('the server refuses impossible appointment status changes', async ({ page }) => {
  await loginPro(page, ACCOUNTS.pro);
  const list = await apiCall(page, 'GET', '/api/backend/appointments?status=COMPLETED&limit=1');
  const done = (list.body as { appointments?: { id: string }[] }).appointments?.[0];
  test.skip(!done, 'No completed appointment in the data');
  const cancel = await apiCall(page, 'DELETE', `/api/backend/appointments/${done!.id}`);
  expect(cancel.status).toBe(409);
  const pending = await apiCall(page, 'PUT', `/api/backend/appointments/${done!.id}`, { status: 'PENDING' });
  expect(pending.status).toBe(409);
});

test('the booking page shows each day with its free times', async ({ page }) => {
  await loginClient(page);
  await page.goto(`${CLIENT_URL}/salon/atelier-noor/reserver`);
  await page.locator('section:has(h2:text("Prestations")) li button').first().click();
  await expect(page.getByText(/\d+ dispo|Complet|Fermé/).first()).toBeVisible({ timeout: 60_000 });
});

test('the salon account cannot declare a transfer while nothing is due or one is pending', async ({ page }) => {
  await loginPro(page, ACCOUNTS.pro);
  await page.goto('/dashboard/admin/mes-factures/moyen-de-paiement');
  const button = page.getByRole('button', { name: 'Déclarer un virement' });
  await expect(button).toBeVisible();
  const res = await apiCall(page, 'POST', '/api/backend/subscription/declare-payment', { amount: 1 });
  expect(res.status).toBe(400);
});
