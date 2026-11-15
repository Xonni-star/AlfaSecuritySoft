import crypto from 'crypto';
import request from 'supertest';
import { app } from '../app';
import { migrationPool, pool } from '../config/database';
import { authHeaders, cleanupTestData, insertTenantMembership } from './testUtils';

describe('tenant, site, and role authorization API boundaries', () => {
  let tenantA: string;
  let tenantB: string;
  let adminUserA: string;
  let unprivilegedUserA: string;
  let foreignUserB: string;
  let siteScopedUserA: string;
  let siteA: string;
  let siteAOutsideScope: string;
  let siteB: string;
  let foreignRoleB: string;
  let adminSession: string;
  let unprivilegedSession: string;
  let siteScopedSession: string;

  async function createSession(userId: string, tenantId: string): Promise<string> {
    const sessionId = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(sessionId).digest('hex');
    await migrationPool.query(
      `INSERT INTO user_sessions (user_id,tenant_id,token_hash,expires_at,revoked)
       VALUES ($1,$2,$3,NOW()+interval '1 hour',false)`,
      [userId, tenantId, tokenHash]
    );
    return sessionId;
  }

  async function createTenant(name: string, suffix: string): Promise<string> {
    const result = await migrationPool.query(
      `INSERT INTO tenants (name,subdomain,tax_number,bwr_register_id)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [name, `${suffix}-${Date.now()}`, `${suffix}-TAX`, `${suffix}-BWR`]
    );
    return result.rows[0].id as string;
  }

  async function createUser(emailPrefix: string, tenantId: string): Promise<string> {
    const result = await migrationPool.query(
      `INSERT INTO users (email,password_hash,first_name,last_name)
       VALUES ($1,'unused-test-hash','Boundary','Test') RETURNING id`,
      [`${emailPrefix}-${Date.now()}@example.test`]
    );
    const userId = result.rows[0].id as string;
    await insertTenantMembership(tenantId, userId);
    return userId;
  }

  async function createClient(tenantId: string, name: string): Promise<string> {
    const result = await migrationPool.query(
      `INSERT INTO clients
        (tenant_id,client_number,company_name,contact_person,email,phone,address,contract_start,contract_end)
       VALUES ($1,$2,$3,'Boundary Test',$4,'000','Test address','2026-01-01','2027-01-01')
       RETURNING id`,
      [tenantId, `${name}-${Date.now()}`, name, `${name}@example.test`]
    );
    return result.rows[0].id as string;
  }

  async function createSite(tenantId: string, clientId: string, name: string): Promise<string> {
    const result = await migrationPool.query(
      `INSERT INTO sites (tenant_id,client_id,site_code,name,address,time_zone)
       VALUES ($1,$2,$3,$4,'Test address','Europe/Berlin') RETURNING id`,
      [tenantId, clientId, `${name}-${Date.now()}`, name]
    );
    return result.rows[0].id as string;
  }

  beforeAll(async () => {
    tenantA = await createTenant('Authorization Boundary Tenant A', 'auth-boundary-a');
    tenantB = await createTenant('Authorization Boundary Tenant B', 'auth-boundary-b');

    adminUserA = await createUser('auth-boundary-admin', tenantA);
    unprivilegedUserA = await createUser('auth-boundary-unprivileged', tenantA);
    foreignUserB = await createUser('auth-boundary-foreign', tenantB);
    siteScopedUserA = await createUser('auth-boundary-site', tenantA);

    const adminRole = await migrationPool.query(
      `INSERT INTO tenant_roles (tenant_id,name,description)
       VALUES ($1,$2,'Isolated tenant-admin boundary fixture') RETURNING id`,
      [tenantA, `BoundaryAdmin_${Date.now()}`]
    );
    await migrationPool.query(
      `INSERT INTO tenant_role_permissions (tenant_id,role_id,permission_id,data_scope)
       SELECT $1,$2,p.id,'TENANT'
         FROM permissions p
        WHERE p.code=ANY($3::text[])`,
      [tenantA, adminRole.rows[0].id, ['users:read', 'users:manage', 'roles:read', 'roles:manage', 'sites:read']]
    );
    await migrationPool.query(
      `INSERT INTO tenant_user_roles (tenant_id,user_id,role_id)
       VALUES ($1,$2,$3)`,
      [tenantA, adminUserA, adminRole.rows[0].id]
    );

    const siteRole = await migrationPool.query(
      `INSERT INTO tenant_roles (tenant_id,name,description)
       VALUES ($1,$2,'Isolated site-scope boundary fixture') RETURNING id`,
      [tenantA, `BoundarySite_${Date.now()}`]
    );
    const clientA = await createClient(tenantA, 'Authorization Boundary A');
    const clientB = await createClient(tenantB, 'Authorization Boundary B');
    siteA = await createSite(tenantA, clientA, 'Authorized site');
    siteAOutsideScope = await createSite(tenantA, clientA, 'Out-of-scope site');
    siteB = await createSite(tenantB, clientB, 'Foreign tenant site');
    await migrationPool.query(
      `INSERT INTO tenant_role_permissions (tenant_id,role_id,permission_id,site_id,data_scope)
       SELECT $1,$2,p.id,$3,'SITE'
         FROM permissions p
        WHERE p.code=ANY($4::text[])`,
      [tenantA, siteRole.rows[0].id, siteA, ['sites:read', 'sites:update']]
    );
    await migrationPool.query(
      `INSERT INTO tenant_user_roles (tenant_id,user_id,role_id,site_id)
       VALUES ($1,$2,$3,$4)`,
      [tenantA, siteScopedUserA, siteRole.rows[0].id, siteA]
    );

    const foreignRole = await migrationPool.query(
      `INSERT INTO tenant_roles (tenant_id,name,description)
       VALUES ($1,$2,'Foreign tenant role fixture') RETURNING id`,
      [tenantB, `BoundaryForeign_${Date.now()}`]
    );
    foreignRoleB = foreignRole.rows[0].id as string;

    adminSession = await createSession(adminUserA, tenantA);
    unprivilegedSession = await createSession(unprivilegedUserA, tenantA);
    siteScopedSession = await createSession(siteScopedUserA, tenantA);
  });

  afterAll(async () => {
    await cleanupTestData([tenantA, tenantB], [adminUserA, unprivilegedUserA, foreignUserB, siteScopedUserA]);
    await pool.end();
    await migrationPool.end();
  });

  test('denies direct API calls without a grant and keeps tenant administration system-only', async () => {
    const missingGrant = await request(app)
      .get('/api/v1/admin/users')
      .set(authHeaders(unprivilegedSession));
    expect(missingGrant.status).toBe(403);

    const tenantAdminSystemCall = await request(app)
      .get('/api/v1/system/tenants')
      .set(authHeaders(adminSession));
    expect(tenantAdminSystemCall.status).toBe(403);
  });

  test('does not expose or mutate a user from another tenant by direct ID', async () => {
    const read = await request(app)
      .get(`/api/v1/admin/users/${foreignUserB}`)
      .set(authHeaders(adminSession));
    expect(read.status).toBe(404);

    const update = await request(app)
      .patch(`/api/v1/admin/users/${foreignUserB}`)
      .set(authHeaders(adminSession))
      .send({ firstName: 'Unauthorized change' });
    expect(update.status).toBe(404);

    const unchanged = await migrationPool.query(
      'SELECT first_name FROM tenant_memberships WHERE tenant_id=$1 AND user_id=$2',
      [tenantB, foreignUserB]
    );
    expect(unchanged.rows[0].first_name).toBe('Boundary');
  });

  test('rejects foreign tenant role and site IDs in direct role administration calls', async () => {
    const assignForeignRole = await request(app)
      .post(`/api/v1/admin/users/${adminUserA}/roles`)
      .set(authHeaders(adminSession))
      .send({ roleId: foreignRoleB });
    expect(assignForeignRole.status).toBe(400);

    const createRoleWithForeignSite = await request(app)
      .post('/api/v1/admin/roles')
      .set(authHeaders(adminSession))
      .send({
        name: 'Invalid foreign site role',
        permissions: [{ code: 'sites:read', siteId: siteB, dataScope: 'SITE' }]
      });
    expect(createRoleWithForeignSite.status).toBe(400);

    const inserted = await migrationPool.query(
      `SELECT 1 FROM tenant_roles WHERE tenant_id=$1 AND name='Invalid foreign site role'`,
      [tenantA]
    );
    expect(inserted.rows).toHaveLength(0);
  });

  test('site-scoped reads and updates cannot cross the authorized site boundary', async () => {
    const listed = await request(app)
      .get('/api/v1/sites')
      .set(authHeaders(siteScopedSession));
    expect(listed.status).toBe(200);
    const listedIds = listed.body.data.map((site: { id: string }) => site.id);
    expect(listedIds).toContain(siteA);
    expect(listedIds).not.toContain(siteAOutsideScope);
    expect(listedIds).not.toContain(siteB);

    const foreignSiteUpdate = await request(app)
      .patch(`/api/v1/sites/${siteAOutsideScope}`)
      .set(authHeaders(siteScopedSession))
      .send({ name: 'Unauthorized site update', revisionVersion: 1 });
    expect(foreignSiteUpdate.status).toBe(404);

    const unchanged = await migrationPool.query(
      'SELECT name FROM sites WHERE tenant_id=$1 AND id=$2',
      [tenantA, siteAOutsideScope]
    );
    expect(unchanged.rows[0].name).toBe('Out-of-scope site');
  });
});
