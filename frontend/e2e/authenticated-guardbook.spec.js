import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { expect, request, test } from '@playwright/test';

const ownerEmail = 'a.schmidt@ffm-sec.de';
const tenantA = '11111111-1111-1111-1111-111111111111';
const tenantB = '22222222-2222-2222-2222-222222222222';
const requireBackend = createRequire(new URL('../backend/package.json', import.meta.url));
const { S3Client, ListObjectsV2Command, GetObjectCommand } = requireBackend('@aws-sdk/client-s3');

function createStorageClient() {
  return new S3Client({
    endpoint: process.env.DMS_S3_ENDPOINT, region: process.env.DMS_S3_REGION, forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.DMS_S3_ACCESS_KEY, secretAccessKey: process.env.DMS_S3_SECRET_KEY
    }
  });
}

async function login(page, email = ownerEmail, tenantId = tenantA) {
  await page.getByLabel('E-Mail').fill(email);
  await page.getByLabel('Passwort').fill(process.env.SECOPS_DEMO_USER_PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  if (email === ownerEmail) {
    await page.getByRole('combobox', { name: 'Mandant', exact: true }).selectOption(tenantId);
    await page.getByRole('button', { name: 'Mit Mandanten anmelden', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ })).toBeVisible();
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

test('genuine customer contract terms and site requirements survive offline replay, edits and reload', async ({ page, context }) => {
  const suffix = randomUUID().slice(0, 8);
  const customerName = `Browser contract ${suffix}`;
  const siteName = `Browser operational site ${suffix}`;
  await page.goto('/');
  await login(page);
  await page.getByRole('button', { name: 'Kunden & Verträge', exact: true }).click();
  await context.setOffline(true);
  await expect(page.getByRole('button', { name: 'Offline. Verbindung wiederherstellen', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mandant hinzufügen', exact: true }).click();
  const customerForm = page.locator('form').filter({ has: page.getByLabel('Kundennummer', { exact: true }) });
  await customerForm.getByLabel('Firmenname', { exact: true }).fill(customerName);
  await customerForm.getByLabel('Ansprechpartner', { exact: true }).fill('Browser Contact');
  await customerForm.getByLabel('Kunden-E-Mail', { exact: true }).fill(`${suffix}@browser.test.invalid`);
  await customerForm.getByLabel('Kunden-Telefon', { exact: true }).fill('069123456');
  await customerForm.getByLabel('Kundenanschrift', { exact: true }).fill('Browser Teststrasse 1');
  await customerForm.getByLabel('Kundennummer', { exact: true }).fill(`CONTRACT-${suffix}`);
  await customerForm.getByLabel('Vertragsbeginn', { exact: true }).fill('2026-02-14');
  await customerForm.getByLabel('Vertragsende', { exact: true }).fill('2027-03-15');
  await customerForm.getByLabel('Kündigungsfrist in Monaten', { exact: true }).fill('6');
  await expect(customerForm.getByLabel('Automatische Vertragsverlängerung', { exact: true })).not.toBeChecked();
  await customerForm.getByRole('button', { name: 'Kunde anlegen', exact: true }).click();
  await expect(customerForm).toHaveCount(0);
  const [queued] = (await readOutbox(page)).filter(mutation => mutation.entityType === 'client');
  expect(queued.payload).toMatchObject({
    clientNumber: `CONTRACT-${suffix}`, contractAutoRenew: false, noticePeriodMonths: 6,
    contractStart: '2026-02-14', contractEnd: '2027-03-15'
  });
  const notificationBell = page.getByRole('button', { name: /^Benachrichtigungscenter öffnen\. Ungelesen:/ });
  const unreadBefore = Number((await notificationBell.getAttribute('aria-label')).match(/(\d+)$/)[1]);
  expect(unreadBefore).toBeGreaterThan(0);
  await notificationBell.click();
  const notificationCenter = page.getByRole('dialog', { name: 'Benachrichtigungscenter', exact: true });
  await expect(notificationCenter.getByText('Kunde vorgemerkt', { exact: true })).toBeVisible();
  await expect(notificationCenter.getByText(`${customerName} wird bei Verbindung synchronisiert.`, { exact: true })).toBeVisible();
  await notificationCenter.getByRole('button', { name: 'Als gelesen markieren: Kunde vorgemerkt', exact: true }).click();
  await expect(notificationBell).toHaveAttribute('aria-label', `Benachrichtigungscenter öffnen. Ungelesen: ${unreadBefore - 1}`);
  await expect(notificationCenter.getByText('Kunde vorgemerkt', { exact: true })).toBeVisible();
  await notificationCenter.getByRole('button', { name: 'Meldung verwerfen: Kunde vorgemerkt', exact: true }).click();
  await expect(notificationCenter.getByText('Kunde vorgemerkt', { exact: true })).toHaveCount(0);
  await notificationCenter.getByRole('button', { name: 'Benachrichtigungscenter schließen', exact: true }).click();
  const replay = page.waitForResponse(response => response.url().endsWith('/customers/sync') && response.request().method() === 'POST');
  await context.setOffline(false);
  expect((await replay).status()).toBe(200);
  await expect.poll(async () => (await readOutbox(page)).filter(mutation => mutation.entityType === 'client')).toHaveLength(0);
  await page.reload();
  await page.getByRole('button', { name: 'Kunden & Verträge', exact: true }).click();
  const customerCard = page.getByRole('heading', { name: customerName, exact: true }).locator('..').locator('..');
  await customerCard.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await expect(customerForm.getByLabel('Vertragsbeginn', { exact: true })).toHaveValue('2026-02-14');
  await expect(customerForm.getByLabel('Vertragsende', { exact: true })).toHaveValue('2027-03-15');
  await expect(customerForm.getByLabel('Kündigungsfrist in Monaten', { exact: true })).toHaveValue('6');
  await expect(customerForm.getByLabel('Automatische Vertragsverlängerung', { exact: true })).not.toBeChecked();
  await customerForm.getByLabel('Kündigungsfrist in Monaten', { exact: true }).fill('9');
  await customerForm.getByLabel('Automatische Vertragsverlängerung', { exact: true }).check();
  const customerUpdate = page.waitForResponse(response =>
    response.url().endsWith(`/customers/${queued.payload.id}`) && response.request().method() === 'PATCH'
  );
  await customerForm.getByRole('button', { name: 'Änderungen speichern', exact: true }).click();
  const updatedCustomer = await customerUpdate;
  expect(updatedCustomer.status()).toBe(200);
  expect((await updatedCustomer.json()).data).toMatchObject({
    contract_auto_renew: true, notice_period_months: 9, contract_start: '2026-02-14', contract_end: '2027-03-15'
  });

  await page.getByRole('button', { name: 'Objektverwaltung (Detail-Tabs)', exact: true }).click();
  await page.getByRole('button', { name: 'Objekt anlegen', exact: true }).click();
  const siteForm = page.locator('form').filter({ has: page.getByLabel('Objektcode', { exact: true }) });
  await siteForm.getByLabel('Zugeordneter Kunde', { exact: true }).selectOption(queued.payload.id);
  await siteForm.getByLabel('Objektcode', { exact: true }).fill(`SITE-${suffix}`);
  await siteForm.getByLabel('Objektname', { exact: true }).fill(siteName);
  await siteForm.getByLabel('Standortadresse', { exact: true }).fill('Browser Teststrasse 2');
  await siteForm.getByLabel('Wachkräfte tagsüber', { exact: true }).fill('4');
  await siteForm.getByLabel('Wachkräfte nachts', { exact: true }).fill('3');
  await siteForm.getByLabel('Alarmanlage', { exact: true }).fill('Actual browser alarm');
  await siteForm.getByLabel('Zutrittsregeln', { exact: true }).fill('Actual browser access rules');
  await siteForm.getByLabel('Zeitzone', { exact: true }).fill('Europe/Berlin');
  const siteCreation = page.waitForResponse(response => response.url().endsWith('/sites') && response.request().method() === 'POST');
  await siteForm.getByRole('button', { name: 'Objekt anlegen', exact: true }).click();
  const createdSiteResponse = await siteCreation;
  expect(createdSiteResponse.status()).toBe(201);
  const { data: createdSite } = await createdSiteResponse.json();
  await page.reload();
  await page.getByRole('button', { name: 'Objektverwaltung (Detail-Tabs)', exact: true }).click();
  await page.getByRole('heading', { name: siteName, level: 3, exact: true }).click();
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await expect(siteForm.getByLabel('Wachkräfte tagsüber', { exact: true })).toHaveValue('4');
  await expect(siteForm.getByLabel('Wachkräfte nachts', { exact: true })).toHaveValue('3');
  await expect(siteForm.getByLabel('Alarmanlage', { exact: true })).toHaveValue('Actual browser alarm');
  await expect(siteForm.getByLabel('Zutrittsregeln', { exact: true })).toHaveValue('Actual browser access rules');
  await expect(siteForm.getByLabel('Zeitzone', { exact: true })).toHaveValue('Europe/Berlin');
  await siteForm.getByLabel('Wachkräfte tagsüber', { exact: true }).fill('5');
  const siteUpdate = page.waitForResponse(response =>
    response.url().endsWith(`/sites/${createdSite.id}`) && response.request().method() === 'PATCH'
  );
  await siteForm.getByRole('button', { name: 'Änderungen speichern', exact: true }).click();
  expect((await siteUpdate).status()).toBe(200);
  await page.reload();
  await page.getByRole('button', { name: 'Objektverwaltung (Detail-Tabs)', exact: true }).click();
  await page.getByRole('heading', { name: siteName, level: 3, exact: true }).click();
  await expect(page.getByText('5 Tag / 3 Nacht', { exact: true })).toBeVisible();
  const siteArchive = page.waitForResponse(response => response.url().endsWith(`/sites/${createdSite.id}/archive`));
  await page.getByRole('button', { name: 'Archivieren', exact: true }).click();
  const archivedSiteResponse = await siteArchive;
  expect(archivedSiteResponse.status()).toBe(200);
  expect((await archivedSiteResponse.json()).data.revision_version).toBe(3);
  await page.reload();
  await page.getByRole('button', { name: 'Objektverwaltung (Detail-Tabs)', exact: true }).click();
  await page.getByRole('button', { name: 'Archiv anzeigen', exact: true }).click();
  await page.getByRole('heading', { name: siteName, level: 3, exact: true }).click();
  const siteRestore = page.waitForResponse(response => response.url().endsWith(`/sites/${createdSite.id}/restore`));
  await page.getByRole('button', { name: 'Wiederherstellen', exact: true }).click();
  const restoredSiteResponse = await siteRestore;
  expect(restoredSiteResponse.status()).toBe(200);
  expect((await restoredSiteResponse.json()).data.revision_version).toBe(4);
  await page.getByRole('button', { name: 'Aktive anzeigen', exact: true }).click();
  await expect(page.getByText('5 Tag / 3 Nacht', { exact: true })).toBeVisible();
  const finalSiteArchive = page.waitForResponse(response => response.url().endsWith(`/sites/${createdSite.id}/archive`));
  await page.getByRole('button', { name: 'Archivieren', exact: true }).click();
  const finalSiteResponse = await finalSiteArchive;
  expect(finalSiteResponse.status()).toBe(200);
  expect((await finalSiteResponse.json()).data.revision_version).toBe(5);
  await page.getByRole('button', { name: 'Kunden & Verträge', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  const customerArchive = page.waitForResponse(response => response.url().endsWith(`/customers/${queued.payload.id}/archive`));
  await customerCard.getByRole('button', { name: 'Archivieren', exact: true }).click();
  expect((await customerArchive).status()).toBe(200);
});

test('employee qualifications and absences confirm real persistence and retain a genuine conflict draft', async ({ page }) => {
  await page.goto('/');
  await login(page);
  await page.getByRole('button', { name: 'Personal & § 34a GewO', exact: true }).click();
  await page.getByRole('button', { name: 'Mitarbeiter anlegen', exact: true }).click();
  const personnelNumber = `DETAIL-${randomUUID().slice(0, 8)}`;
  const employeeForm = page.locator('form').filter({ has: page.getByLabel('Personalnummer', { exact: true }) });
  await employeeForm.getByLabel('Personalnummer', { exact: true }).fill(personnelNumber);
  await employeeForm.getByLabel('Vorname', { exact: true }).fill('Browser');
  await employeeForm.getByLabel('Nachname', { exact: true }).fill('Mitarbeiterdetails');
  await employeeForm.getByLabel('E-Mail', { exact: true }).fill(`${personnelNumber.toLowerCase()}@browser.test.invalid`);
  await employeeForm.getByLabel('Telefon', { exact: true }).fill('069123456');
  await employeeForm.getByLabel('Eintritt', { exact: true }).fill('2026-02-14');
  const creation = page.waitForResponse(response =>
    response.url().endsWith('/employees') && response.request().method() === 'POST'
  );
  await employeeForm.getByRole('button', { name: 'Speichern', exact: true }).click();
  const creationResponse = await creation;
  expect(creationResponse.status()).toBe(201);
  const { data: employee } = await creationResponse.json();
  expect(employee.date_of_joining).toBe('2026-02-14');
  await expect(employeeForm).toHaveCount(0);
  const card = page.locator('article').filter({ hasText: personnelNumber });
  await expect(card).toBeVisible();
  await card.getByLabel('Qualifikation Mitarbeiter', { exact: true }).selectOption({ index: 1 });
  await card.getByPlaceholder('Nachweis-Nr.', { exact: true }).fill('Browser-Nachweis-ohne-Ablauf');
  await card.getByLabel('Ausstellungsdatum', { exact: true }).fill('2020-01-01');
  const qualification = page.waitForResponse(response =>
    response.url().endsWith(`/employees/${employee.id}/qualifications`) && response.request().method() === 'POST'
  );
  await card.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  const qualificationResponse = await qualification;
  expect(qualificationResponse.status()).toBe(201);
  expect(qualificationResponse.request().postDataJSON().expiryDate).toBeNull();
  expect((await qualificationResponse.json()).data.issue_date).toBe('2020-01-01');
  await expect(card.getByPlaceholder('Nachweis-Nr.', { exact: true })).toHaveCount(0);
  await expect(card.getByText('Browser-Nachweis-ohne-Ablauf', { exact: false })).toBeVisible();

  const absenceForm = card.locator('form').filter({ has: page.locator('input[name="employeeId"]') });
  const start = absenceForm.locator('input[name="startDate"]');
  const end = absenceForm.locator('input[name="endDate"]');
  await absenceForm.locator('select[name="type"]').selectOption('Sonstige');
  await start.fill('2030-07-01');
  await end.fill('2030-07-02');
  const absence = page.waitForResponse(response =>
    response.url().endsWith(`/employees/${employee.id}/absences`) && response.request().method() === 'POST'
  );
  await absenceForm.getByRole('button', { name: 'Abwesenheit beantragen', exact: true }).click();
  expect((await absence).status()).toBe(201);
  await expect(start).toHaveValue('');
  await expect(end).toHaveValue('');
  await expect(card.getByText('Sonstige: 2030-07-01 – 2030-07-02 · PENDING', { exact: true })).toBeVisible();

  await start.fill('2030-07-01');
  await end.fill('2030-07-02');
  const conflict = page.waitForResponse(response =>
    response.url().endsWith(`/employees/${employee.id}/absences`) && response.request().method() === 'POST'
  );
  await absenceForm.getByRole('button', { name: 'Abwesenheit beantragen', exact: true }).click();
  expect((await conflict).status()).toBe(409);
  await expect(start).toHaveValue('2030-07-01');
  await expect(end).toHaveValue('2030-07-02');
  await expect(page.getByRole('alert').filter({ hasText: 'Die Speicherung wurde nicht bestätigt' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Personal & § 34a GewO', exact: true }).click();
  await expect(card.getByText('Browser-Nachweis-ohne-Ablauf', { exact: false })).toBeVisible();
  await expect(card.getByText('Sonstige: 2030-07-01 – 2030-07-02 · PENDING', { exact: true })).toBeVisible();
  await card.getByTitle('Bearbeiten', { exact: true }).click();
  await expect(page.getByLabel('Eintritt', { exact: true })).toHaveValue('2026-02-14');
  await page.getByRole('button', { name: '✕', exact: true }).click();
  const qualifications = card.locator('section').filter({
    has: page.getByRole('heading', { name: 'Qualifikationen & Nachweise', exact: true })
  });
  await qualifications.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await expect(card.getByLabel('Ausstellungsdatum bearbeiten', { exact: true })).toHaveValue('2020-01-01');
  const nullableUpdate = page.waitForResponse(response =>
    response.url().includes(`/employees/${employee.id}/qualifications/`) && response.request().method() === 'PATCH'
  );
  await qualifications.getByRole('button', { name: 'Speichern', exact: true }).click();
  expect((await nullableUpdate).status()).toBe(200);
  await qualifications.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await card.getByLabel('Ablaufdatum bearbeiten', { exact: true }).fill('2020-02-01');
  await card.getByLabel('Nachweis geprüft', { exact: true }).check();
  const expiredUpdate = page.waitForResponse(response =>
    response.url().includes(`/employees/${employee.id}/qualifications/`) && response.request().method() === 'PATCH'
  );
  await qualifications.getByRole('button', { name: 'Speichern', exact: true }).click();
  const expiredResponse = await expiredUpdate;
  expect(expiredResponse.status()).toBe(200);
  expect((await expiredResponse.json()).data.status).toBe('EXPIRED');
  await page.reload();
  await page.getByRole('button', { name: 'Personal & § 34a GewO', exact: true }).click();
  await expect(qualifications.getByText('ABGELAUFEN · 2020-02-01', { exact: false })).toBeVisible();
  const employeeArchive = page.waitForResponse(response => response.url().endsWith(`/employees/${employee.id}/archive`));
  await card.getByTitle('Archivieren', { exact: true }).click();
  expect((await employeeArchive).status()).toBe(200);
  await expect(card).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Personal & § 34a GewO', exact: true }).click();
  await page.getByRole('button', { name: 'Archiv anzeigen', exact: true }).click();
  await expect(card).toBeVisible();
  const employeeRestore = page.waitForResponse(response => response.url().endsWith(`/employees/${employee.id}/restore`));
  await card.getByTitle('Wiederherstellen', { exact: true }).click();
  expect((await employeeRestore).status()).toBe(200);
  await page.getByRole('button', { name: 'Aktive anzeigen', exact: true }).click();
  await expect(qualifications.getByText('ABGELAUFEN · 2020-02-01', { exact: false })).toBeVisible();
  await expect(card.getByText('Sonstige: 2030-07-01 – 2030-07-02 · PENDING', { exact: true })).toBeVisible();
});

test('real session and PostgreSQL persist one offline mutation after a lost receipt', async ({ page, context }) => {
  test.setTimeout(120_000);
  const password = process.env.SECOPS_DEMO_USER_PASSWORD;
  expect(password, 'Run using npm run test:browser:backend for an isolated database').toBeTruthy();
  const title = `Backend-Browser-${randomUUID()}`;
  await page.goto('/');
  await login(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ }).click();
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
  await page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ }).waitFor();
  const restoredTitle = `${title}-after-reload`;
  await page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ }).click();
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
  await page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ }).click();
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

test('replays a critical offline incident and its durable follow-up once after a lost receipt', async ({ page, context }) => {
  test.setTimeout(120_000);
  const title = `Critical-Followup-${randomUUID()}`;
  await page.goto('/');
  await login(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ }).click();
  await page.getByRole('button', { name: 'Ereignis erfassen' }).click();
  await page.locator('input[placeholder^="z. B."]').fill(title);
  await page.locator('textarea').fill('Kritischer Vorfall und Folgeaufgabe müssen den Offline-Neustart gemeinsam überleben.');
  await page.locator('form select').filter({ has: page.locator('option[value="Kritisch"]') }).selectOption('Kritisch');
  await expect.poll(() => page.locator('form').evaluate(form => form.checkValidity())).toBe(true);
  await context.setOffline(true);
  await expect(page.getByText('Offline-Modus aktiv')).toBeVisible();
  await page.getByRole('button', { name: 'Offline vormerken' }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  const pending = await readOutbox(page);
  expect(pending.map(item => item.entityType).sort()).toEqual(['guardbook', 'task']);
  const followUp = pending.find(item => item.entityType === 'task');
  expect(followUp.payload).toMatchObject({
    title: `Vorfallsbearbeitung: ${title}`, priority: 'Hoch', category: 'Vorfallsbearbeitung'
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('E-Mail')).toBeVisible();
  expect((await readOutbox(page)).map(item => item.id).sort()).toEqual(pending.map(item => item.id).sort());
  const attempts = [];
  const receipts = [];
  await page.route('**/api/v1/sync/push', async route => {
    attempts.push(route.request().postDataJSON().mutations.map(item => item.clientUuid).sort());
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data.every(receipt => receipt.status === 'SYNCED')).toBe(true);
    receipts.push(body.data);
    if (receipts.length === 1) await route.abort('failed');
    else await route.fulfill({ response });
  });
  await context.setOffline(false);
  await login(page);
  await expect.poll(async () => (await readOutbox(page)).length, { timeout: 30_000 }).toBe(0);
  expect(attempts).toEqual([pending.map(item => item.id).sort(), pending.map(item => item.id).sort()]);
  expect(receipts[1].find(item => item.clientUuid === followUp.id).serverId)
    .toBe(receipts[0].find(item => item.clientUuid === followUp.id).serverId);
  const entries = await page.request.get('/api/v1/logbook');
  expect(entries.status()).toBe(200);
  expect((await entries.json()).data.filter(item => item.title === title)).toHaveLength(1);
  const tasks = await page.request.get('/api/v1/tasks');
  expect(tasks.status()).toBe(200);
  const matching = (await tasks.json()).data.filter(item => item.title === followUp.payload.title);
  expect(matching).toHaveLength(1);
  expect(matching[0].id).toBe(receipts[0].find(item => item.clientUuid === followUp.id).serverId);
  await logout(page);
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
  await page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ }).click();
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
  await page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ }).click();
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
  await page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ }).click();
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
  await page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ }).click();
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
  await page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ }).click();
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

  const storage = createStorageClient();
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

test('retains a genuinely rejected attachment across reload and tenant switch without storing a document', async ({ page, context }) => {
  test.setTimeout(120_000);
  const invalidPhoto = Buffer.from('Synthetic invalid image: intentionally missing the GIF signature.');
  const filename = `invalid-${randomUUID()}.gif`;
  const title = `Rejected-Photo-${randomUUID()}`;
  const storage = createStorageClient();
  const listKeys = async () => {
    const result = await storage.send(new ListObjectsV2Command({ Bucket: process.env.DMS_S3_BUCKET }));
    expect(result.IsTruncated).toBe(false);
    return (result.Contents ?? []).map(object => object.Key).sort();
  };
  try {
    const originalKeys = await listKeys();
    await page.goto('/');
    await login(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const identity = (await (await page.request.get('/api/v1/auth/me')).json()).data;
    await page.getByRole('button', { name: /^Digitales Wachbuch(?: \d+)?$/ }).click();
    await page.getByRole('button', { name: 'Ereignis erfassen' }).click();
    await page.locator('input[placeholder^="z. B."]').fill(title);
    await page.locator('textarea').fill('Echte Dateiprüfung muss ablehnen; lokale Originaldaten bleiben erhalten.');
    await page.locator('input[type="file"]').setInputFiles({
      name: filename, mimeType: 'image/gif', buffer: invalidPhoto
    });
    await expect(page.getByAltText('Vorschau')).toBeVisible();
    await expect.poll(() => page.locator('form').evaluate(form => form.checkValidity())).toBe(true);
    await context.setOffline(true);
    await expect(page.getByText('Offline-Modus aktiv')).toBeVisible();
    await page.getByRole('button', { name: 'Offline vormerken' }).click();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    const [attachment] = await readOutbox(page, 'attachments');
    expect(attachment).toMatchObject({
      tenantId: tenantA, userId: identity.userId, synced: false,
      blobData: `data:image/gif;base64,${invalidPhoto.toString('base64')}`
    });

    const keys = [];
    await page.route('**/api/v1/logbook/*/attachments', async route => {
      keys.push(route.request().headers()['x-idempotency-key']);
      const response = await route.fetch();
      expect(response.status()).toBe(415);
      expect(await response.json()).toMatchObject({
        success: false, message: 'Dateiinhalte stimmen nicht mit dem freigegebenen Dateityp überein.'
      });
      await route.fulfill({ response });
    });
    await context.setOffline(false);
    await expect.poll(async () => (await readOutbox(page, 'attachments'))[0]?.uploadRetryCount,
      { timeout: 30_000 }).toBe(1);
    await context.setOffline(true);
    const [failed] = await readOutbox(page, 'attachments');
    expect(failed).toMatchObject({
      id: attachment.id, blobData: attachment.blobData, synced: false,
      idempotencyKey: attachment.id,
      lastUploadError: 'Dateiinhalte stimmen nicht mit dem freigegebenen Dateityp überein.'
    });
    expect(await readOutbox(page)).toEqual([]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('E-Mail')).toBeVisible();
    expect(await readOutbox(page, 'attachments')).toEqual([failed]);

    await context.setOffline(false);
    await login(page, ownerEmail, tenantB);
    const foreign = (await (await page.request.get('/api/v1/auth/me')).json()).data;
    expect(foreign).toMatchObject({ tenantId: tenantB, userId: identity.userId });
    await expect(page.getByText('Mandantendaten werden aus PostgreSQL geladen…')).toBeHidden();
    expect(await readOutbox(page, 'attachments')).toEqual([failed]);
    expect(keys).toEqual([attachment.id]);
    await logout(page);
    await login(page);
    await expect.poll(async () => (await readOutbox(page, 'attachments'))[0]?.uploadRetryCount,
      { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
    expect(keys.length).toBeGreaterThanOrEqual(2);
    expect(new Set(keys)).toEqual(new Set([attachment.id]));
    expect((await readOutbox(page, 'attachments'))[0]).toMatchObject({
      id: attachment.id, blobData: attachment.blobData, synced: false,
      entityId: failed.entityId, idempotencyKey: attachment.id, lastUploadError: failed.lastUploadError
    });
    const entries = await page.request.get('/api/v1/logbook');
    expect(entries.status()).toBe(200);
    expect((await entries.json()).data.filter(entry => entry.title === title)).toHaveLength(1);
    const documents = await page.request.get(`/api/v1/documents?search=${encodeURIComponent(filename)}`);
    expect(documents.status()).toBe(200);
    expect((await documents.json()).data).toEqual([]);
    expect(await listKeys()).toEqual(originalKeys);
    await logout(page);
  } finally {
    storage.destroy();
  }
});

test('uses genuine read-only API responses and surfaces a permission denial instead of simulated checks', async ({ page }) => {
  test.setTimeout(120_000);
  const openConsole = async () => {
    await page.getByRole('button', { name: 'Backend & DB Blueprint', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Aktive Backend-Architektur', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Schreibgeschützte API-Konsole öffnen', exact: true }).click();
    await expect(page.getByLabel('API-Endpunkt')).toBeVisible();
  };
  await page.goto('/');
  await login(page);
  await openConsole();
  const identityResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/v1/auth/me') && response.request().method() === 'GET');
  await page.getByRole('button', { name: 'Anfrage senden', exact: true }).click();
  const identity = await identityResponse;
  expect(identity.status()).toBe(200);
  const identityData = (await identity.json()).data;
  expect(identityData.tenantId).toBe(tenantA);
  await expect(page.locator('pre')).toContainText(identityData.userId);
  expect(JSON.parse(await page.locator('pre').textContent()).data).toEqual(identityData);
  const writes = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/v1/') && request.method() !== 'GET') {
      writes.push(request.method());
    }
  });
  await page.getByLabel('API-Endpunkt').selectOption('/customers');
  const customersResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/v1/customers') && response.request().method() === 'GET');
  await page.getByRole('button', { name: 'Anfrage senden', exact: true }).click();
  const customers = await customersResponse;
  expect(customers.status()).toBe(200);
  const customersData = (await customers.json()).data;
  expect(customersData.length).toBeGreaterThan(0);
  expect(customersData.map(customer => customer.id)).toEqual(['c1111111-1111-1111-1111-111111111111']);
  await expect(page.locator('pre')).toContainText(customersData[0].id);
  expect(JSON.parse(await page.locator('pre').textContent()).data).toEqual(customersData);
  expect(writes).toEqual([]);
  await logout(page);

  await login(page, 'reader@browser.test.invalid');
  await openConsole();
  await page.getByLabel('API-Endpunkt').selectOption('/customers');
  const deniedResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/v1/customers') && response.request().method() === 'GET');
  await page.getByRole('button', { name: 'Anfrage senden', exact: true }).click();
  const denied = await deniedResponse;
  expect(denied.status()).toBe(403);
  await expect(page.getByRole('alert')).toContainText('Berechtigung');
  await expect(page.locator('pre')).toHaveText('Keine bestätigten Antwortdaten.');
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
