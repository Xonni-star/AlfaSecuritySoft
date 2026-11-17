import assert from 'node:assert/strict';
import argon2 from 'argon2';
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  S3Client
} from '@aws-sdk/client-s3';
import crypto from 'crypto';
import net from 'net';
import request from 'supertest';
import { app } from '../app';
import { migrationPool, pool } from '../config/database';
import { env } from '../config/env';
import { authHeaders, insertTenantMembership } from '../tests/testUtils';
import { S3DocumentObjectStore, setDocumentObjectStore } from '../services/documentFiles';
import { ClamAvDocumentScanner, setDocumentScanner } from '../services/documentScanner';

const readinessTimeoutMs = 5 * 60 * 1000;
const connectionTimeoutMs = 1500;
const password = `Phase9-${crypto.randomUUID()}-test-only!`;
const suffix = crypto.randomUUID().replace(/-/g, '');
const s3 = new S3Client({
  endpoint: env.DMS_S3_ENDPOINT,
  region: env.DMS_S3_REGION,
  forcePathStyle: env.DMS_S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: env.DMS_S3_ACCESS_KEY, secretAccessKey: env.DMS_S3_SECRET_KEY }
});
const requiredPermissions = [
  'customers:create',
  'customers:read',
  'sites:create',
  'sites:read',
  'employees:create',
  'employees:read',
  'employees:account:link',
  'qualifications:manage',
  'planning:manage',
  'planning:read',
  'planning:publish',
  'handovers:create',
  'handovers:read',
  'handovers:confirm',
  'documents:create',
  'documents:read',
  'documents:manage',
  'documents:download'
];

let tenantId: string | undefined;
let roleId: string | undefined;
const userIds: string[] = [];
let bucketName: string | undefined;
let bucketCreated = false;
let originalBucketName: string | undefined;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pingClamAv(): Promise<boolean> {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: env.DMS_CLAMAV_HOST, port: env.DMS_CLAMAV_PORT });
    let response = '';
    let settled = false;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ready);
    };

    socket.setTimeout(connectionTimeoutMs, () => finish(false));
    socket.on('connect', () => socket.end('zPING\0'));
    socket.on('data', data => {
      response += data.toString('utf8');
      if (response.includes('PONG')) finish(true);
    });
    socket.on('end', () => finish(response.includes('PONG')));
    socket.on('error', () => finish(false));
  });
}

async function waitForClamAv(): Promise<void> {
  const deadline = Date.now() + readinessTimeoutMs;
  while (Date.now() < deadline) {
    if (await pingClamAv()) return;
    await sleep(1000);
  }
  throw new Error(`ClamAV did not become ready within ${readinessTimeoutMs} ms.`);
}

async function waitForMinio(): Promise<void> {
  const deadline = Date.now() + readinessTimeoutMs;
  let lastError: unknown;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      await s3.send(new ListBucketsCommand({}));
      ready = true;
      break;
    } catch (error) {
      lastError = error;
      await sleep(1000);
    }
  }
  if (!ready) {
    const detail = lastError instanceof Error ? ` ${lastError.message}` : '';
    throw new Error(`MinIO did not become ready within ${readinessTimeoutMs} ms.${detail}`);
  }
  await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
  bucketCreated = true;
}

async function createUser(email: string, firstName: string, lastName: string): Promise<string> {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const inserted = await migrationPool.query(
    `INSERT INTO users (email,password_hash,first_name,last_name,phone)
     VALUES ($1,$2,$3,$4,'+49 30 000') RETURNING id`,
    [email, passwordHash, firstName, lastName]
  );
  const userId = inserted.rows[0].id as string;
  userIds.push(userId);
  await insertTenantMembership(tenantId!, userId);
  await migrationPool.query(
    'INSERT INTO user_roles (user_id,role_id,tenant_id) VALUES ($1,$2,$3)',
    [userId, roleId, tenantId]
  );
  return userId;
}

async function login(email: string): Promise<string> {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .set('Origin', 'http://localhost:3000')
    .send({ email, password, requestedTenantId: tenantId });
  assert.equal(response.status, 200, `Synthetic test login failed for ${email}.`);
  const cookies = response.headers['set-cookie'];
  const sessionCookie = (Array.isArray(cookies) ? cookies : [cookies || ''])
    .find(value => value.startsWith('secops_session='));
  const sessionId = sessionCookie?.match(/^secops_session=([^;]+)/)?.[1];
  assert.ok(sessionId, 'Test login did not return a session cookie.');
  assert.equal(typeof response.body.data.csrfToken, 'string', 'Test login did not return a CSRF token.');
  return `${sessionId}|${response.body.data.csrfToken}`;
}

async function createEmployee(
  token: string,
  personnelNumber: string,
  firstName: string,
  lastName: string,
  email: string,
  siteId: string,
  date: string
): Promise<{ id: string; revisionVersion: number }> {
  const response = await request(app)
    .post('/api/v1/employees')
    .set(authHeaders(token))
    .send({
      personnelNumber,
      firstName,
      lastName,
      email,
      phone: '+49 30 000',
      role: 'Wachdienstmitarbeiter',
      status: 'Aktiv',
      weeklyHours: 40,
      hourlyRate: 19,
      dateOfJoining: date,
      assignedSiteIds: [siteId]
    });
  assert.equal(response.status, 201, `Employee creation failed: ${JSON.stringify(response.body)}`);
  return { id: response.body.data.id, revisionVersion: response.body.data.revision_version };
}

async function executeJourney(): Promise<void> {
  assert.equal(env.NODE_ENV, 'test', 'Phase 9 integration coverage must use NODE_ENV=test.');
  assert.equal(env.DMS_SCANNER_PROVIDER, 'clamav', 'The DMS journey requires the local ClamAV fixture.');
  assert.equal(env.DMS_SCAN_REQUIRED, true, 'The DMS journey requires fail-closed scanning.');

  tenantId = (await migrationPool.query(
    `INSERT INTO tenants (name,subdomain,tax_number,bwr_register_id)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [`Phase 9 E2E ${suffix}`, `phase9-${suffix}`, `PH9-${suffix}`, `PH9-${suffix}`]
  )).rows[0].id as string;

  const role = await migrationPool.query(
    `INSERT INTO roles (name,description) VALUES ($1,'Synthetic Phase 9 integration fixture') RETURNING id`,
    [`Phase9_${suffix}`]
  );
  roleId = role.rows[0].id as string;
  const permissionRows = await migrationPool.query(
    'SELECT code,id FROM permissions WHERE code=ANY($1::text[])',
    [requiredPermissions]
  );
  assert.deepEqual(
    permissionRows.rows.map(row => row.code).sort(),
    [...requiredPermissions].sort(),
    'The migrated database must include every permission used by the synthetic workflow.'
  );
  await migrationPool.query(
    `INSERT INTO role_permissions (role_id,permission_id)
     SELECT $1,id FROM permissions WHERE code=ANY($2::text[])`,
    [roleId, requiredPermissions]
  );

  const managerEmail = `phase9-manager-${suffix}@example.test`;
  const outgoingEmail = `phase9-outgoing-${suffix}@example.test`;
  const incomingEmail = `phase9-incoming-${suffix}@example.test`;
  await createUser(managerEmail, 'Synthetic', 'Manager');
  const outgoingUserId = await createUser(outgoingEmail, 'Synthetic', 'Outgoing');
  const incomingUserId = await createUser(incomingEmail, 'Synthetic', 'Incoming');
  const managerToken = await login(managerEmail);

  const dates = await migrationPool.query(
    `SELECT CURRENT_DATE::text AS today,
            (CURRENT_DATE + 2)::text AS shift_date,
            (CURRENT_DATE + 365)::text AS expiry_date`
  );
  const { today, shift_date: shiftDate, expiry_date: expiryDate } = dates.rows[0];
  const customer = await request(app).post('/api/v1/customers').set(authHeaders(managerToken)).send({
    clientNumber: `PH9-${suffix}`,
    companyName: `Synthetic Phase 9 Customer ${suffix}`,
    contactPerson: 'Synthetic Contact',
    email: `customer-${suffix}@example.test`,
    phone: '+49 30 000',
    address: 'Synthetic Testweg 1',
    contractStart: today,
    contractEnd: expiryDate
  });
  assert.equal(customer.status, 201, `Synthetic customer creation failed: ${JSON.stringify(customer.body)}`);
  const customerId = customer.body.data.id as string;

  const site = await request(app).post('/api/v1/sites').set(authHeaders(managerToken)).send({
    clientId: customerId,
    siteCode: `PH9-${suffix}`,
    name: `Synthetic Phase 9 Site ${suffix}`,
    address: 'Synthetic Testweg 1',
    securityLevel: 'Mittel',
    requiredGuardsDay: 1,
    requiredGuardsNight: 1,
    alarmSystem: 'Synthetic',
    accessRules: 'Test fixture'
  });
  assert.equal(site.status, 201, `Synthetic site creation failed: ${JSON.stringify(site.body)}`);
  const siteId = site.body.data.id as string;

  const incomingEmployee = await createEmployee(
    managerToken, `PH9-${suffix}`, 'Synthetic', 'Incoming',
    `employee-incoming-${suffix}@example.test`, siteId, today
  );
  const outgoingEmployee = await createEmployee(
    managerToken, `PH9-OUT-${suffix}`, 'Synthetic', 'Outgoing',
    `employee-outgoing-${suffix}@example.test`, siteId, today
  );
  const qualification = await request(app)
    .post(`/api/v1/employees/${incomingEmployee.id}/qualifications`)
    .set(authHeaders(managerToken))
    .send({
      type: 'Sachkundeprüfung § 34a',
      certificateNumber: `PH9-CERT-${suffix}`,
      issueDate: today,
      expiryDate,
      verified: true,
      documentReference: `phase9-${suffix}`
    });
  assert.equal(qualification.status, 201, `Synthetic employee qualification failed: ${JSON.stringify(qualification.body)}`);
  assert.equal(qualification.body.data.status, 'VALID');

  const [outgoingLink, incomingLink] = await Promise.all([
    request(app).patch(`/api/v1/employees/${outgoingEmployee.id}/account`)
      .set(authHeaders(managerToken))
      .send({ userId: outgoingUserId, revisionVersion: outgoingEmployee.revisionVersion }),
    request(app).patch(`/api/v1/employees/${incomingEmployee.id}/account`)
      .set(authHeaders(managerToken))
      .send({ userId: incomingUserId, revisionVersion: incomingEmployee.revisionVersion })
  ]);
  assert.equal(outgoingLink.status, 200, `Outgoing account link failed: ${JSON.stringify(outgoingLink.body)}`);
  assert.equal(incomingLink.status, 200, `Incoming account link failed: ${JSON.stringify(incomingLink.body)}`);
  const outgoingToken = await login(outgoingEmail);
  const incomingToken = await login(incomingEmail);

  const period = await request(app).post('/api/v1/planning/periods').set(authHeaders(managerToken)).send({
    name: `Synthetic Phase 9 ${suffix}`,
    dateFrom: shiftDate,
    dateTo: shiftDate,
    timeZone: 'Europe/Berlin'
  });
  assert.equal(period.status, 201, `Planning period creation failed: ${JSON.stringify(period.body)}`);
  const periodId = period.body.data.id as string;

  const shift = await request(app).post('/api/v1/planning/shifts').set(authHeaders(managerToken)).send({
    siteId,
    schedulePeriodId: periodId,
    date: shiftDate,
    startTime: '08:00',
    endTime: '16:00',
    type: 'Tagdienst',
    requiredQualification: 'Sachkundeprüfung § 34a',
    requiredStaffCount: 1,
    clientMutationId: `ph9-shift-${suffix}`
  });
  assert.equal(shift.status, 201, `Planning shift creation failed: ${JSON.stringify(shift.body)}`);
  const shiftId = shift.body.data.shift.id as string;

  const assignment = await request(app)
    .post(`/api/v1/planning/shifts/${shiftId}/assignments`)
    .set(authHeaders(managerToken))
    .send({ employeeId: incomingEmployee.id, expectedVersion: shift.body.data.shift.revision_version });
  assert.equal(assignment.status, 200, `Qualified employee assignment failed: ${JSON.stringify(assignment.body)}`);

  const publication = await request(app)
    .post(`/api/v1/planning/periods/${periodId}/publish`)
    .set(authHeaders(managerToken))
    .send({ expectedVersion: period.body.data.revision_version });
  assert.equal(publication.status, 200, `Planning period publication failed: ${JSON.stringify(publication.body)}`);
  assert.equal(publication.body.data.period.status, 'published');
  const publishedAssignments = await request(app)
    .get(`/api/v1/planning/shifts/${shiftId}/assignments`)
    .set(authHeaders(managerToken));
  assert.equal(publishedAssignments.status, 200);
  assert.ok(publishedAssignments.body.data.some((row: { employee_id: string }) => row.employee_id === incomingEmployee.id));

  const clientMutationId = `ph9-handover-${suffix}`;
  const handover = await request(app).post('/api/v1/handovers').set(authHeaders(managerToken)).send({
    siteId,
    shiftId,
    occurredAt: new Date().toISOString(),
    outgoingEmployeeId: outgoingEmployee.id,
    incomingEmployeeId: incomingEmployee.id,
    generalText: 'Synthetic shift handover.',
    incidents: '',
    importantNotes: '',
    safetyInformation: '',
    clientMutationId,
    tasks: []
  });
  assert.equal(handover.status, 201, `Handover creation failed: ${JSON.stringify(handover.body)}`);
  const handoverId = handover.body.data.id as string;
  const capturedAt = new Date().toISOString();
  const confirmation = await request(app)
    .post(`/api/v1/handovers/${handoverId}/confirm`)
    .set(authHeaders(outgoingToken))
    .send({
      clientMutationId: `ph9-confirm-${suffix}`,
      expectedRevisionVersion: handover.body.data.revisionVersion,
      capturedAt
    });
  assert.equal(confirmation.status, 200, `Outgoing handover confirmation failed: ${JSON.stringify(confirmation.body)}`);
  const acknowledgement = await request(app)
    .post(`/api/v1/handovers/${handoverId}/acknowledge`)
    .set(authHeaders(incomingToken))
    .send({
      clientMutationId: `ph9-ack-${suffix}`,
      expectedRevisionVersion: handover.body.data.revisionVersion,
      capturedAt: new Date().toISOString()
    });
  assert.equal(acknowledgement.status, 200, `Incoming handover acknowledgement failed: ${JSON.stringify(acknowledgement.body)}`);
  const completedHandover = await request(app)
    .get(`/api/v1/handovers/${handoverId}`)
    .set(authHeaders(managerToken));
  assert.equal(completedHandover.status, 200);
  assert.equal(completedHandover.body.data.status, 'completed');
  const handoverEvents = await request(app)
    .get(`/api/v1/handovers/${handoverId}/events`)
    .set(authHeaders(managerToken));
  assert.equal(handoverEvents.status, 200);
  assert.ok(handoverEvents.body.data.items.some((event: { action: string }) => event.action === 'confirmed'));
  assert.ok(handoverEvents.body.data.items.some((event: { action: string }) => event.action === 'acknowledged'));

  const category = await request(app)
    .post('/api/v1/documents/categories')
    .set(authHeaders(managerToken))
    .send({ name: `Synthetic Phase 9 ${suffix}`, description: 'Synthetic end-to-end fixture.' });
  assert.equal(category.status, 201, `Document category creation failed: ${JSON.stringify(category.body)}`);
  const pdf = Buffer.from(`%PDF-1.7\nSynthetic Phase 9 employee document ${suffix}\n%%EOF\n`);
  const upload = await request(app)
    .post('/api/v1/documents')
    .query({
      title: `Synthetic employee document ${suffix}`,
      categoryId: category.body.data.id,
      relationshipType: 'employee',
      relationshipId: incomingEmployee.id
    })
    .set(authHeaders(managerToken))
    .set('Content-Type', 'application/octet-stream')
    .set('X-File-Name', encodeURIComponent(`phase9-${suffix}.pdf`))
    .send(pdf);
  assert.equal(upload.status, 201, `Scanned document upload failed: ${JSON.stringify(upload.body)}`);
  const documentId = upload.body.data.id as string;
  assert.equal(upload.body.data.scan_status, 'clean');
  assert.equal(upload.body.data.file_released, true);

  const listedDocuments = await request(app).get('/api/v1/documents').set(authHeaders(managerToken));
  assert.equal(listedDocuments.status, 200);
  assert.ok(listedDocuments.body.data.some((document: { id: string }) => document.id === documentId));
  const downloaded = await request(app)
    .get(`/api/v1/documents/${documentId}/download`)
    .set(authHeaders(managerToken))
    .buffer()
    .parse((response, callback) => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => callback(null, Buffer.concat(chunks)));
    });
  assert.equal(downloaded.status, 200);
  assert.deepEqual(downloaded.body, pdf);

  const audit = await request(app).get(`/api/v1/documents/${documentId}/audit`).set(authHeaders(managerToken));
  assert.equal(audit.status, 200);
  assert.ok(audit.body.data.some((event: { action: string }) => event.action === 'scan_clean'));
  assert.ok(audit.body.data.some((event: { action: string }) => event.action === 'downloaded'));
  console.log('Phase 9 verified synthetic employee onboarding, qualification-based planning and publication, both handover confirmations, and a real MinIO/ClamAV document upload and download.');
}

async function cleanupTenant(): Promise<void> {
  if (!tenantId && !roleId && !userIds.length) return;
  const client = await migrationPool.connect();
  try {
    await client.query('SET session_replication_role = replica');
    if (tenantId) {
      const tables = await client.query(
        `SELECT DISTINCT namespace.nspname AS schema_name, relation.relname AS table_name
           FROM pg_class relation
           JOIN pg_namespace namespace ON namespace.oid=relation.relnamespace
           JOIN pg_attribute attribute ON attribute.attrelid=relation.oid
          WHERE namespace.nspname='public'
            AND relation.relkind IN ('r','p')
            AND attribute.attname='tenant_id'
            AND attribute.attnum>0
            AND NOT attribute.attisdropped`
      );
      for (const table of tables.rows) {
        await client.query(
          `DELETE FROM "${table.schema_name}"."${table.table_name}" WHERE tenant_id=$1`,
          [tenantId]
        );
      }
    }
    if (userIds.length) {
      await client.query('DELETE FROM user_sessions WHERE user_id=ANY($1::uuid[])', [userIds]);
      await client.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [userIds]);
    }
    if (roleId) {
      await client.query('DELETE FROM role_permissions WHERE role_id=$1', [roleId]);
      await client.query('DELETE FROM roles WHERE id=$1', [roleId]);
    }
    if (tenantId) await client.query('DELETE FROM tenants WHERE id=$1', [tenantId]);
  } finally {
    try {
      await client.query('SET session_replication_role = origin');
    } finally {
      client.release();
    }
  }
}

async function cleanupBucket(): Promise<void> {
  if (!bucketCreated || !bucketName) return;
  let continuationToken: string | undefined;
  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: continuationToken
    }));
    for (const object of page.Contents ?? []) {
      if (object.Key) await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: object.Key }));
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  await s3.send(new DeleteBucketCommand({ Bucket: bucketName }));
}

async function main(): Promise<void> {
  let runError: unknown;
  try {
    originalBucketName = env.DMS_S3_BUCKET;
    bucketName = `alfasecuritysoft-phase9-${suffix}`;
    await waitForClamAv();
    await waitForMinio();
    env.DMS_S3_BUCKET = bucketName;
    setDocumentObjectStore(new S3DocumentObjectStore());
    setDocumentScanner(new ClamAvDocumentScanner());
    await executeJourney();
  } catch (error) {
    runError = error;
  }

  const cleanupErrors: unknown[] = [];
  for (const cleanup of [cleanupTenant, cleanupBucket]) {
    try {
      await cleanup();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (originalBucketName) env.DMS_S3_BUCKET = originalBucketName;
  s3.destroy();

  if (runError && cleanupErrors.length) {
    throw new AggregateError([runError, ...cleanupErrors], 'Phase 9 journey failed and fixture cleanup was incomplete.');
  }
  if (runError) throw runError;
  if (cleanupErrors.length) {
    throw new AggregateError(cleanupErrors, 'Phase 9 fixture cleanup was incomplete.');
  }
}

main()
  .catch((error: unknown) => {
    console.error('Phase 9 core workflow integration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([pool.end(), migrationPool.end()]);
  });
