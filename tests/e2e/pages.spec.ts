import { expect, test } from '@playwright/test';
import { ACCOUNTS, CLIENT_URL, loginClient, loginPro, visit, watchErrors } from './helpers';

const PLATFORM = ['/plateforme', '/plateforme/etablissements', '/plateforme/clients', '/plateforme/paiements', '/plateforme/factures', '/plateforme/tarification', '/plateforme/avis', '/plateforme/messages', '/plateforme/journal', '/plateforme/compte'];

const DASHBOARD = [
  '/dashboard/rendez-vous',
  '/dashboard/caisse',
  '/dashboard/clients/fichier-client/gestion',
  '/dashboard/clients/mes-avis/avis-a-moderer',
  '/dashboard/admin/param-agenda/gestion-de-prestations',
  '/dashboard/admin/mes-factures/moyen-de-paiement',
  '/dashboard/admin/mes-factures/liste-des-factures',
  '/dashboard/admin/statistiques-rdv/indicateurs-cles',
];

const CLIENT = ['/', '/recherche', '/salon/atelier-noor', '/salon/atelier-noor/reserver', '/compte', '/compte/rendez-vous', '/compte/favoris', '/compte/proches', '/compte/avis', '/compte/profil'].map((p) => `${CLIENT_URL}${p}`);

test('platform pages open without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await loginPro(page, ACCOUNTS.superadmin);
  await expect(page).toHaveURL(/\/plateforme/);
  for (const path of PLATFORM) await visit(page, path, errors);
});

test('salon dashboard pages open without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await loginPro(page, ACCOUNTS.pro);
  for (const path of DASHBOARD) await visit(page, path, errors);
});

test('client pages open without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await loginClient(page);
  for (const path of CLIENT) await visit(page, path, errors);
});

test('a collaborator cannot reach the manager pages nor the platform', async ({ page }) => {
  await loginPro(page, ACCOUNTS.staff);
  await page.goto('/dashboard/caisse');
  await expect(page.getByText("Votre profil n'a pas accès à cette page.")).toBeVisible();
  await page.goto('/plateforme');
  await expect(page).toHaveURL(/\/dashboard/);
});

test('private client pages ask to sign in', async ({ page }) => {
  await page.goto(`${CLIENT_URL}/compte/rendez-vous`);
  await expect(page).toHaveURL(/\/connexion\?next=/);
});

test('old client links of this app lead to the client site', async ({ page }) => {
  await page.goto('/client/salon/atelier-noor');
  await expect(page).toHaveURL(`${CLIENT_URL}/salon/atelier-noor`);
});

test('public and legal pages are reachable signed out', async ({ page }) => {
  for (const path of ['/legal/cgu', '/legal/cgu-etablissements', '/legal/mentions-legales', `${CLIENT_URL}/confidentialite`]) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
  }
});

test('salon pages are indexable with title, description and preview image', async ({ request }) => {
  const html = await (await request.get(`${CLIENT_URL}/salon/atelier-noor`)).text();
  expect(html).toMatch(/<title>Atelier Noor[^<]*\| Réserver sur Selia<\/title>/);
  expect(html).toContain('<meta name="robots" content="index, follow"');
  expect(html).toContain('property="og:image"');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /dashboard');
  const sitemap = await (await request.get(`${CLIENT_URL}/sitemap.xml`)).text();
  expect(sitemap).toContain('/salon/atelier-noor');
});
