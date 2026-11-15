import crypto from 'crypto';
import request from 'supertest';
import { app } from '../app';
import { migrationPool, pool, withTenantTransaction } from '../config/database';
import { authHeaders, cleanupTestData, insertTenantMembership } from './testUtils';

describe('system tenant administration API', () => {
  let sessionTenantId: string;
  let adminUserId: string;
  let adminToken: string;
  const createdTenantIds: string[] = [];

  beforeAll(async () => {
    sessionTenantId = (await pool.query(
      `INSERT INTO tenants (name,subdomain,tax_number,bwr_register_id)
       VALUES ('System tenant admin test',$1,'TEST-TAX-SYS','TEST-BWR-SYS') RETURNING id`,
      [`sys-admin-${Date.now()}`]
    )).rows[0].id as string;
    adminUserId = (await migrationPool.query(
      `INSERT INTO users (email,password_hash,first_name,last_name,is_superadmin)
       VALUES ($1,'unused-test-hash','System','Admin',true) RETURNING id`,
      [`system-admin-${Date.now()}@example.test`]
    )).rows[0].id as string;
    await insertTenantMembership(sessionTenantId, adminUserId);
    adminToken = crypto.randomBytes(32).toString('base64url');
    await migrationPool.query(
      `INSERT INTO user_sessions (user_id,tenant_id,token_hash,expires_at,revoked)
       VALUES ($1,$2,$3,NOW()+interval '1 hour',false)`,
      [
        adminUserId,
        sessionTenantId,
        crypto.createHash('sha256').update(adminToken).digest('hex')
      ]
    );
  });

  afterAll(async () => {
    await cleanupTestData([sessionTenantId, ...createdTenantIds], [adminUserId]);
    await pool.end();
    await migrationPool.end();
  });

  test('creates, lists, updates and audits tenants through the system-only API', async () => {
    const listBefore = await request(app)
      .get('/api/v1/system/tenants')
      .set(authHeaders(adminToken));
    expect(listBefore.status).toBe(200);
    expect(listBefore.body.data.some((tenant: { id: string }) => tenant.id === sessionTenantId)).toBe(true);

    const create = await request(app)
      .post('/api/v1/system/tenants')
      .set(authHeaders(adminToken))
      .send({
        name: 'Neue Sicherheitsfirma',
        subdomain: `new-sec-${Date.now()}`,
        taxNumber: 'DE-TEST-NEW',
        licenseTier: 'STANDARD',
        bwrRegisterId: 'BWR-TEST-NEW',
        din77200Certified: false
      });
    expect(create.status).toBe(201);
    expect(create.body.data).toMatchObject({
      name: 'Neue Sicherheitsfirma',
      license_tier: 'STANDARD',
      din77200_certified: false,
      is_active: true
    });
    const newTenantId = create.body.data.id as string;
    createdTenantIds.push(newTenantId);

    const update = await request(app)
      .patch(`/api/v1/system/tenants/${newTenantId}`)
      .set(authHeaders(adminToken))
      .send({ name: 'Sicherheitsfirma Aktualisiert', isActive: false });
    expect(update.status).toBe(200);
    expect(update.body.data).toMatchObject({
      name: 'Sicherheitsfirma Aktualisiert',
      is_active: false
    });

    const auditRows = await withTenantTransaction(newTenantId, db => db.query(
      `SELECT action_type,details FROM audit_logs
        WHERE tenant_id=$1 AND target_entity=$2
        ORDER BY created_at`,
      [newTenantId, `tenant:${newTenantId}`]
    ));
    expect(auditRows.rows.map(row => row.action_type)).toEqual(['TENANT_CREATED', 'TENANT_UPDATED']);
  });
});
