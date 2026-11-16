import { randomUUID } from 'node:crypto';
import { expect, request, test } from '@playwright/test';

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
  const login = async () => {
    await page.getByLabel('E-Mail').fill('a.schmidt@ffm-sec.de');
    await page.getByLabel('Passwort').fill(password);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Digitales Wachbuch', exact: true })).toBeVisible();
  };

  await page.goto('/');
  await login();
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
  await login();
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
    await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
    await expect(page.getByLabel('E-Mail')).toBeVisible();
    expect((await page.request.get('/api/v1/auth/me')).status()).toBe(401);
    expect((await revokedSessionProbe.get('/api/v1/auth/me')).status()).toBe(401);
  } finally {
    await revokedSessionProbe.dispose();
  }
});
