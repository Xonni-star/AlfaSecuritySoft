import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
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

async function readOutbox(page, storeName = 'outbox') {
  return page.evaluate(async name => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('SecurityOps2_OfflineVault');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(name, 'readonly').objectStore(name).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }, storeName);
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
  await expect.poll(() => page.locator('form').evaluate(form => Array.from(form.elements)
    .filter(field => field.willValidate && !field.validity.valid)
    .map(field => ({ name: field.name, value: field.value, message: field.validationMessage })))).toEqual([]);
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

test('replays an owner-bound offline photo once through real S3 and ClamAV after a lost receipt', async ({ page, context }) => {
  test.setTimeout(120_000);
  const photo = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  const title = `Photo-Replay-${randomUUID()}`;
  await page.goto('/');
  await login(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const identity = (await (await page.request.get('/api/v1/auth/me')).json()).data;
  await page.getByRole('button', { name: 'Digitales Wachbuch', exact: true }).click();
  await page.getByRole('button', { name: 'Ereignis erfassen' }).click();
  await page.locator('input[placeholder^="z. B."]').fill(title);
  await page.locator('textarea').fill('Synthetisches Bild: echter privater Speicher und verpflichtender Virenscan.');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'proof.gif', mimeType: 'image/gif', buffer: photo
  });
  await expect(page.getByAltText('Vorschau')).toBeVisible();
  await expect.poll(() => page.locator('form').evaluate(form => Array.from(form.elements)
    .filter(field => field.willValidate && !field.validity.valid)
    .map(field => field.name))).toEqual([]);
  await context.setOffline(true);
  await expect(page.getByText('Offline-Modus aktiv')).toBeVisible();
  await page.getByRole('button', { name: 'Offline vormerken' }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  const [attachment] = await readOutbox(page, 'attachments');
  expect(attachment).toMatchObject({ tenantId: tenantA, userId: identity.userId, synced: false });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('E-Mail')).toBeVisible();
  expect(await readOutbox(page, 'attachments')).toEqual([attachment]);

  const keys = [];
  const receipts = [];
  let releaseRetry;
  const retryGate = new Promise(resolve => { releaseRetry = resolve; });
  await page.route('**/api/v1/logbook/*/attachments', async route => {
    keys.push(route.request().headers()['x-idempotency-key']);
    if (keys.length > 1) await retryGate;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    const document = (await response.json()).data;
    expect(document).toMatchObject({
      tenant_id: tenantA, version_created_by: identity.userId, scan_status: 'clean', file_released: true
    });
    receipts.push(document);
    if (receipts.length === 1) await route.abort('failed');
    else await route.fulfill({ response });
  });
  await context.setOffline(false);
  await login(page, 'other@browser.test.invalid');
  const otherIdentity = (await (await page.request.get('/api/v1/auth/me')).json()).data;
  expect(otherIdentity).toMatchObject({ tenantId: tenantA });
  expect(otherIdentity.userId).not.toBe(identity.userId);
  await expect(page.getByText('Mandantendaten werden aus PostgreSQL geladen…')).toBeHidden();
  await page.getByRole('button', { name: 'Digitales Wachbuch', exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  expect(await readOutbox(page, 'attachments')).toEqual([attachment]);
  expect(keys).toEqual([]);
  await logout(page);
  try {
    await login(page);
    await expect.poll(async () => (await readOutbox(page, 'attachments'))[0]?.uploadRetryCount,
      { timeout: 30_000 }).toBe(1);
    expect((await readOutbox(page, 'attachments'))[0]).toMatchObject({ id: attachment.id, synced: false });
    expect(receipts).toHaveLength(1);
  } finally {
    releaseRetry();
  }
  await expect.poll(() => receipts.length, { timeout: 60_000 }).toBe(2);
  await expect.poll(async () => (await readOutbox(page, 'attachments'))[0]?.synced).toBe(true);
  expect(keys).toEqual([attachment.id, attachment.id]);
  expect(receipts[1].id).toBe(receipts[0].id);
  const documentId = receipts[0].id;
  const download = await page.request.get(`/api/v1/documents/${documentId}/download`);
  expect(download.status()).toBe(200);
  expect(await download.body()).toEqual(photo);
  const versions = await page.request.get(`/api/v1/documents/${documentId}/versions`);
  expect(versions.status()).toBe(200);
  expect((await versions.json()).data).toHaveLength(1);
  const audit = await page.request.get(`/api/v1/documents/${documentId}/audit`);
  expect(audit.status()).toBe(200);
  const events = (await audit.json()).data;
  expect(events.filter(event => event.action === 'uploaded')).toHaveLength(1);
  expect(events.filter(event => event.action === 'scan_clean')).toHaveLength(1);

  const requireBackend = createRequire(new URL('../backend/package.json', import.meta.url));
  const { S3Client, ListObjectsV2Command, GetObjectCommand } = requireBackend('@aws-sdk/client-s3');
  const storage = new S3Client({
    endpoint: process.env.DMS_S3_ENDPOINT, region: process.env.DMS_S3_REGION, forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.DMS_S3_ACCESS_KEY, secretAccessKey: process.env.DMS_S3_SECRET_KEY
    }
  });
  try {
    const { Contents } = await storage.send(new ListObjectsV2Command({ Bucket: process.env.DMS_S3_BUCKET }));
    expect(Contents).toHaveLength(1);
    const key = Contents[0].Key;
    const object = await storage.send(new GetObjectCommand({ Bucket: process.env.DMS_S3_BUCKET, Key: key }));
    expect(Buffer.from(await object.Body.transformToByteArray())).toEqual(photo);
    const anonymous = await fetch(`${process.env.DMS_S3_ENDPOINT}/${process.env.DMS_S3_BUCKET}/${key}`, {
      signal: AbortSignal.timeout(5000)
    });
    expect(anonymous.status).toBe(403);
  } finally {
    storage.destroy();
  }
  await logout(page);
  await login(page, ownerEmail, tenantB);
  const foreignIdentity = (await (await page.request.get('/api/v1/auth/me')).json()).data;
  expect(foreignIdentity.permissions).toContain('documents:download');
  expect((await page.request.get(`/api/v1/documents/${documentId}/download`)).status()).toBe(404);
  await logout(page);
});

test('publishes an independently reviewed SOP and retries one employee acknowledgement after offline reload', async ({ page, context }) => {
  test.setTimeout(180_000);
  const title = `SOP-Browser-${randomUUID()}`;
  const openSOP = async () => {
    await expect(page.getByText('Mandantendaten werden aus PostgreSQL geladen…')).toBeHidden();
    await page.getByRole('button', { name: 'Dienstanweisungen & QM', exact: true }).click();
    const article = page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await expect(article).toBeVisible();
    await article.getByRole('button', { name: 'Details & Verlauf', exact: true }).click();
    return page.getByRole('dialog', { name: `Details ${title}`, exact: true });
  };
  await page.goto('/');
  await login(page);
  await expect(page.getByText('Mandantendaten werden aus PostgreSQL geladen…')).toBeHidden();
  await page.getByRole('button', { name: 'Dienstanweisungen & QM', exact: true }).click();
  await page.getByRole('button', { name: 'Neue Anweisung', exact: true }).click();
  await page.getByRole('textbox', { name: 'Anweisungsnummer', exact: true }).fill(`BROWSER-${randomUUID()}`);
  await page.getByRole('textbox', { name: 'Titel', exact: true }).fill(title);
  await page.getByRole('textbox', { name: 'Inhalt', exact: true }).fill('Offline gelesen und bewusst bestätigt; echte persistierte SOP-Version.');
  const creation = page.waitForResponse(response => response.url().endsWith('/api/v1/sops') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  const created = await creation;
  expect(created.status(), await created.text()).toBe(201);
  const sopId = (await created.json()).data.id;
  const authorIdentity = (await (await page.request.get('/api/v1/auth/me')).json()).data;
  let dialog = await openSOP();
  await dialog.getByRole('combobox', { name: 'Zuweisungstyp', exact: true }).selectOption('employee');
  await dialog.getByRole('combobox', { name: 'Ziel', exact: true }).selectOption({ label: 'Browser Reader' });
  await dialog.getByRole('button', { name: 'Zuweisen', exact: true }).click();
  await expect(page.getByText('Zuweisung wurde gespeichert.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Zur Prüfung', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Als geprüft markieren', exact: true })).toBeVisible();
  const submittedSOP = (await (await page.request.get('/api/v1/sops')).json()).data.find(sop => sop.id === sopId);
  expect(submittedSOP.version_id).toBe(submittedSOP.draft_version_id);
  expect(submittedSOP.version_id).toMatch(/^[a-f0-9-]{36}$/);
  await dialog.getByRole('button', { name: 'Details schließen', exact: true }).click();
  await logout(page);

  await login(page, 'other@browser.test.invalid');
  const reviewerIdentity = (await (await page.request.get('/api/v1/auth/me')).json()).data;
  expect(reviewerIdentity.userId).not.toBe(authorIdentity.userId);
  dialog = await openSOP();
  await dialog.getByRole('textbox', { name: 'Prüfkommentar', exact: true }).fill('Unabhängig im echten Browser geprüft.');
  await dialog.getByRole('button', { name: 'Als geprüft markieren', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Freigeben', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Details schließen', exact: true }).click();
  await logout(page);

  await login(page, 'approver@browser.test.invalid');
  const approverIdentity = (await (await page.request.get('/api/v1/auth/me')).json()).data;
  expect([authorIdentity.userId, reviewerIdentity.userId]).not.toContain(approverIdentity.userId);
  dialog = await openSOP();
  await dialog.getByRole('button', { name: 'Freigeben', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Veröffentlichen', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Veröffentlichen', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Zurückziehen', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Details schließen', exact: true }).click();
  await logout(page);

  const unauthorizedReads = [];
  const basePaths = new Set(['/customers', '/sites', '/employees', '/logbook', '/shifts', '/keys', '/tasks']);
  page.on('request', request => {
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, '');
    if (request.method() === 'GET' && basePaths.has(path)) unauthorizedReads.push(path);
  });
  await login(page, 'reader@browser.test.invalid');
  const readerIdentity = (await (await page.request.get('/api/v1/auth/me')).json()).data;
  expect([...readerIdentity.permissions].sort()).toEqual(['sop:acknowledge', 'sop:read']);
  await expect(page.getByLabel('Sitzungsrolle', { exact: true })).toHaveText('BrowserSOPReader');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  dialog = await openSOP();
  const ownSOP = (await (await page.request.get('/api/v1/sops')).json()).data.find(sop => sop.id === sopId);
  expect(ownSOP.version_id).toMatch(/^[a-f0-9-]{36}$/);
  expect(ownSOP.version_id).toBe(submittedSOP.version_id);
  expect(ownSOP.current_user_acknowledgment).toBe('unacknowledged');
  expect(ownSOP.acknowledged_at).toBeNull();
  await dialog.getByRole('button', { name: 'Details schließen', exact: true }).click();
  const article = page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await expect(article.getByRole('button', { name: 'Kenntnisnahme bestätigen', exact: true })).toBeDisabled();
  await context.setOffline(true);
  await article.getByRole('checkbox', { name: 'Ich habe diese Dienstanweisung gelesen und zur Kenntnis genommen.', exact: true }).check();
  await article.getByRole('button', { name: 'Kenntnisnahme bestätigen', exact: true }).click();
  await expect(article.getByText('Offline vorgemerkt – Synchronisierung ausstehend', { exact: true })).toBeVisible();
  const [pending] = await readOutbox(page, 'sopAcknowledgements');
  expect(pending).toMatchObject({
    sopId, assignmentId: ownSOP.assignment_id, versionId: ownSOP.version_id,
    tenantId: tenantA, userId: readerIdentity.userId, status: 'pending'
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('E-Mail')).toBeVisible();
  expect(await readOutbox(page, 'sopAcknowledgements')).toEqual([pending]);
  const attempts = [];
  const receipts = [];
  await page.route(`**/api/v1/sops/assignments/${pending.assignmentId}/acknowledge`, async route => {
    attempts.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.status(), await response.text()).toBe(200);
    receipts.push((await response.json()).data);
    if (attempts.length === 1) await route.abort('failed');
    else await route.fulfill({ response });
  });
  const firstFailure = page.waitForEvent('requestfailed', {
    predicate: failed => failed.url().endsWith(`/sops/assignments/${pending.assignmentId}/acknowledge`)
  });
  await context.setOffline(false);
  await login(page, 'reader@browser.test.invalid');
  await expect.poll(() => attempts.length).toBe(1);
  await firstFailure;
  expect(await readOutbox(page, 'sopAcknowledgements')).toEqual([pending]);
  await page.reload();
  await expect.poll(() => attempts.length).toBe(2);
  await page.getByRole('button', { name: 'Dienstanweisungen & QM', exact: true }).click();
  await expect.poll(async () => (await readOutbox(page, 'sopAcknowledgements')).length).toBe(0);
  expect(attempts).toEqual([{
    confirmed: true, clientMutationId: pending.clientMutationId, capturedAt: pending.capturedAt
  }, {
    confirmed: true, clientMutationId: pending.clientMutationId, capturedAt: pending.capturedAt
  }]);
  expect(receipts[1]).toEqual({ ...receipts[0], alreadyAcknowledged: true });
  expect(receipts[0]).toMatchObject({
    id: pending.assignmentId, version_id: pending.versionId,
    acknowledged_by_user_id: readerIdentity.userId, client_mutation_id: pending.clientMutationId
  });
  await expect(article.getByText(/Serverbestätigt/)).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Dienstanweisungen & QM', exact: true }).click();
  await expect(article.getByText(/Serverbestätigt/)).toBeVisible();
  expect(unauthorizedReads).toEqual([]);
  await expect(page.getByLabel('Sitzungsrolle', { exact: true })).toHaveText('BrowserSOPReader');
  await expect(page.getByText(/^Daten nicht vollständig geladen:/)).toBeHidden();
  await logout(page);
});
