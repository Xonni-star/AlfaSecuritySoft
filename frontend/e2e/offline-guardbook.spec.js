import { expect, test } from '@playwright/test';

const user = {
  id: '88888888-8888-4888-8888-888888888888',
  tenantId: '99999999-9999-4999-8999-999999999999',
  tenantName: 'Isolierter Browser-Test',
  email: 'offline@test.invalid',
  fullName: 'Offline Test',
  role: 'Wachdienstmitarbeiter',
  permissions: ['logbook:create', 'logbook:read']
};

async function readOfflineState(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('SecurityOps2_OfflineVault');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['outbox', 'attachments'], 'readonly');
      const outboxRequest = transaction.objectStore('outbox').getAll();
      const attachmentRequest = transaction.objectStore('attachments').getAll();
      transaction.oncomplete = () => resolve({
        outbox: outboxRequest.result,
        attachments: attachmentRequest.result
      });
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

test('captures offline, survives reload, and replays one mutation after reconnect', async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.getByLabel('E-Mail')).toBeVisible();
  await page.getByLabel('E-Mail').fill(user.email);
  await page.getByLabel('Passwort').fill('isolated-test-password');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByRole('button', { name: 'Digitales Wachbuch' })).toBeVisible();

  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await page.getByRole('button', { name: 'Digitales Wachbuch' }).click();
  await page.getByRole('button', { name: 'Ereignis erfassen' }).click();
  await page.locator('input[placeholder^="z. B."]').fill('Offline-Browser-Vorfall');
  await page.locator('textarea').fill('Während der realen Browser-Offline-Simulation erfasst.');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'incident.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('isolated browser photo')
  });
  await expect(page.getByAltText('Vorschau')).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText('Offline-Modus aktiv')).toBeVisible();
  await page.getByRole('button', { name: 'Offline vormerken' }).click();
  await expect(page.getByText('Offline-Browser-Vorfall', { exact: true })).toBeVisible();

  const beforeReload = await readOfflineState(page);
  expect(beforeReload.outbox).toHaveLength(1);
  expect(beforeReload.outbox[0].payload.title).toBe('Offline-Browser-Vorfall');
  expect(beforeReload.attachments).toHaveLength(1);
  expect(beforeReload.attachments[0]).toMatchObject({
    entityId: beforeReload.outbox[0].payload.id,
    synced: false,
    fileName: 'incident.jpg'
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('E-Mail')).toBeVisible();
  const afterReload = await readOfflineState(page);
  expect(afterReload.outbox.map(item => item.id)).toEqual(beforeReload.outbox.map(item => item.id));
  expect(afterReload.attachments).toMatchObject([
    expect.objectContaining({ id: beforeReload.attachments[0].id, synced: false })
  ]);

  await context.setOffline(false);
  await page.getByLabel('E-Mail').fill(user.email);
  await page.getByLabel('Passwort').fill('isolated-test-password');
  await page.getByRole('button', { name: 'Anmelden' }).click();

  const testState = async () => (await (await page.request.get('/__test/state')).json());
  await expect.poll(async () => (await testState()).syncAttempts.length, { timeout: 15_000 }).toBe(2);
  const syncState = await testState();
  expect(syncState.syncAttempts).toEqual([beforeReload.outbox[0].id, beforeReload.outbox[0].id]);
  expect(syncState.serverEffects).toBe(1);
  expect(syncState.photoUploadAttempts).toBe(0);
  await expect.poll(async () => (await readOfflineState(page)).outbox.length).toBe(0);

  const finalState = await readOfflineState(page);
  expect(finalState.attachments).toMatchObject([
    expect.objectContaining({ id: beforeReload.attachments[0].id, synced: false })
  ]);
});
