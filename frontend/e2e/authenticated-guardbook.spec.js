import { randomUUID } from 'node:crypto';
import { expect, request, test } from '@playwright/test';

const ownerEmail = 'a.schmidt@ffm-sec.de';
const tenantA = '11111111-1111-1111-1111-111111111111';
const tenantB = '22222222-2222-2222-2222-222222222222';

async function login(page, email = ownerEmail, tenantId = tenantA) {
  await page.getByLabel('E-Mail').fill(email);
  await page.getByLabel('Passwort').fill(process.env.SECOPS_DEMO_USER_PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  if (email === ownerEmail) {
    await page.getByRole('combobox', { name: 'Mandant', exact: true }).selectOption(tenantId);
    await page.getByRole('button', { name: 'Mit Mandanten anmelden', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Digitales Wachbuch', exact: true })).toBeVisible();
}

async function logout(page) {
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await expect(page.getByLabel('E-Mail')).toBeVisible();
}

async function readOutbox(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('SecurityOps2_OfflineVault');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction('outbox', 'readonly').objectStore('outbox').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}

test('real session and PostgreSQL persist one offline mutation after a lost receipt', async ({ page, context }) => {
  test.setTimeout(120_000);
  const password = process.env.SECOPS_DEMO_USER_PASSWORD;
  expect(password, 'Run using npm run test:browser:backend for an isolated database').toBeTruthy();
  const title = `Backend-Browser-${randomUUID()}`;
  await page.goto('/');
  await login(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.getByRole('button', { name: 'Digitales Wachbuch', exact: true }).click();
  await page.getByRole('button', { name: 'Ereignis erfassen' }).click();
  await page.locator('input[placeholder^="z. B."]').fill(title);
  await page.locator('textarea').fill('Echter Browser, Cookie-Sitzung, Express-API und isoliertes PostgreSQL.');
  await context.setOffline(true);
  await expect(page.getByText('Offline-Modus aktiv')).toBeVisible();
  await page.getByRole('button', { name: 'Offline vormerken' }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  const pending = await readOutbox(page);
  expect(pending).toHaveLength(1);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('E-Mail')).toBeVisible();
  expect((await readOutbox(page)).map(item => item.id)).toEqual([pending[0].id]);

  const attempts = [];
  const receipts = [];
  await page.route('**/api/v1/sync/push', async (route) => {
    attempts.push(route.request().postDataJSON().mutations.map(item => item.clientUuid));
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    receipts.push(body.data);
    if (attempts.length === 1) {
      await route.abort('failed');
    } else {
      await route.fulfill({ response });
    }
  });
  await context.setOffline(false);
  await login(page);
  await expect.poll(() => attempts.length, { timeout: 30_000 }).toBe(2);
  await expect.poll(async () => (await readOutbox(page)).length).toBe(0);
  expect(attempts).toEqual([[pending[0].id], [pending[0].id]]);
  expect(receipts).toHaveLength(2);
  expect(receipts[0][0].status).toBe('SYNCED');
  expect(receipts[1][0].serverId).toBe(receipts[0][0].serverId);

  const persisted = await page.request.get('/api/v1/logbook');
  expect(persisted.status()).toBe(200);
  const entries = (await persisted.json()).data.filter(entry => entry.title === title);
  expect(entries).toHaveLength(1);
  expect(entries[0].id).toBe(receipts[0][0].serverId);
  expect(entries[0].client_mutation_id).toBe(pending[0].id);

  await page.reload();
  await expect(page.getByText('Mandantendaten werden aus PostgreSQL geladen…')).toBeHidden();
  await page.getByRole('button', { name: 'Digitales Wachbuch', exact: true }).waitFor();
  const restoredTitle = `${title}-after-reload`;
  await page.getByRole('button', { name: 'Digitales Wachbuch', exact: true }).click();
  await page.getByRole('button', { name: 'Ereignis erfassen' }).click();
  await page.locator('input[placeholder^="z. B."]').fill(restoredTitle);
  await page.locator('textarea').fill('Erfassung nach Wiederherstellung der echten Cookie-Sitzung.');
  await page.unroute('**/api/v1/sync/push');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText(restoredTitle, { exact: true })).toBeVisible();
  await expect.poll(async () => (await readOutbox(page)).length).toBe(0);
  const restoredEntries = (await (await page.request.get('/api/v1/logbook')).json()).data
    .filter(entry => entry.title === restoredTitle);
  expect(restoredEntries).toHaveLength(1);
  await page.getByRole('button', { name: 'Digitales Wachbuch', exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  const sessionCookies = await context.cookies('http://127.0.0.1:4173/api/v1/auth/me');
  const sessionCookie = sessionCookies.find(cookie => cookie.name === 'secops_session');
  expect(sessionCookie?.httpOnly).toBe(true);
  const revokedSessionProbe = await request.newContext({
    baseURL: 'http://127.0.0.1:4173',
    extraHTTPHeaders: { Cookie: `secops_session=${sessionCookie.value}` }
  });
  try {
    expect((await revokedSessionProbe.get('/api/v1/auth/me')).status()).toBe(200);
    await logout(page);
    expect((await page.request.get('/api/v1/auth/me')).status()).toBe(401);
    expect((await revokedSessionProbe.get('/api/v1/auth/me')).status()).toBe(401);
  } finally {
    await revokedSessionProbe.dispose();
  }
});

test('preserves an owner mutation across account and tenant switches until the owner returns', async ({ page, context }) => {
  test.setTimeout(120_000);
  const title = `Owner-bound-${randomUUID()}`;
  await page.goto('/');
  await login(page);
  await expect(page.getByText('Mandantendaten werden aus PostgreSQL geladen…')).toBeHidden();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const originalIdentity = (await (await page.request.get('/api/v1/auth/me')).json()).data;
  await page.getByRole('button', { name: 'Digitales Wachbuch', exact: true }).click();
  await page.getByRole('button', { name: 'Ereignis erfassen' }).click();
  await page.locator('input[placeholder^="z. B."]').fill(title);
  await page.locator('textarea').fill('Nur die ursprüngliche Identität darf diese Mutation synchronisieren.');
  await context.setOffline(true);
  await expect(page.getByText('Offline-Modus aktiv')).toBeVisible();
  await page.getByRole('button', { name: 'Offline vormerken' }).click();
  const [pending] = await readOutbox(page);
  expect(pending.tenantId).toBe(tenantA);
  expect(pending.userId).toBe(originalIdentity.userId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('E-Mail')).toBeVisible();
  await context.setOffline(false);

  const attemptedIds = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/v1/sync/push') {
      attemptedIds.push(...request.postDataJSON().mutations.map(item => item.clientUuid));
    }
  });
  await login(page, 'other@browser.test.invalid');
  await expect(page.getByText('Mandantendaten werden aus PostgreSQL geladen…')).toBeHidden();
  const otherIdentity = (await (await page.request.get('/api/v1/auth/me')).json()).data;
  expect(otherIdentity.tenantId).toBe(tenantA);
  expect(otherIdentity.userId).not.toBe(pending.userId);
  await page.getByRole('button', { name: 'Digitales Wachbuch', exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Offline-Synchronisierung öffnen. Ausstehende Einträge: 0', exact: true })).toBeVisible();
  expect((await readOutbox(page)).map(item => item.id)).toEqual([pending.id]);
  expect(attemptedIds).not.toContain(pending.id);
  await logout(page);

  await login(page, ownerEmail, tenantB);
  await expect(page.getByText('Mandantendaten werden aus PostgreSQL geladen…')).toBeHidden();
  const otherTenantIdentity = (await (await page.request.get('/api/v1/auth/me')).json()).data;
  expect(otherTenantIdentity.tenantId).toBe(tenantB);
  expect(otherTenantIdentity.userId).toBe(pending.userId);
  await page.getByRole('button', { name: 'Digitales Wachbuch', exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  expect((await readOutbox(page)).map(item => item.id)).toEqual([pending.id]);
  expect(attemptedIds).not.toContain(pending.id);
  expect((await (await page.request.get('/api/v1/logbook')).json()).data).toEqual([]);
  await logout(page);

  await login(page);
  await expect.poll(async () => (await readOutbox(page)).length).toBe(0);
  expect(attemptedIds).toEqual([pending.id]);
  const rows = (await (await page.request.get('/api/v1/logbook')).json()).data
    .filter(entry => entry.title === title);
  expect(rows).toHaveLength(1);
  expect(rows[0].client_mutation_id).toBe(pending.id);
  await logout(page);
});
