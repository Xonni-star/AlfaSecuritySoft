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
  let reportUserA: string;
  let reportSession: string;
  let reportRoleId: string;
  let siteRoleId: string;
  const reportDate = '2027-06-11';
  const reportCases = [
    { path: 'work-hours', csv: false },
    { path: 'work-hours', csv: true },
    { path: 'coverage', csv: false },
    { path: 'qualifications', csv: false },
    { path: 'absences', csv: false }
  ];
  const reportFixtures: Array<{
    tenantId: string; siteId: string; employeeId: string; shiftId: string; marker: string;
  }> = [];

  function getReport(session: string, report: typeof reportCases[number]) {
    return request(app).get(`/api/v1/planning/reports/${report.path}`)
      .set(authHeaders(session))
      .query({ from: reportDate, to: reportDate, ...(report.csv ? { format: 'csv' } : {}) });
  }

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
    reportUserA = await createUser('auth-boundary-reports', tenantA);

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
    siteRoleId = siteRole.rows[0].id as string;
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
      [tenantA, siteRoleId, siteA, ['sites:read', 'sites:update', 'planning:read', 'planning:reports:read']]
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

    reportRoleId = (await migrationPool.query(
      `INSERT INTO tenant_roles (tenant_id,name) VALUES ($1,$2) RETURNING id`,
      [tenantA, `BoundaryReports_${Date.now()}`]
    )).rows[0].id as string;
    await migrationPool.query(
      `INSERT INTO tenant_role_permissions (tenant_id,role_id,permission_id,data_scope)
       SELECT $1,$2,id,'TENANT' FROM permissions WHERE code='planning:reports:read'`,
      [tenantA, reportRoleId]
    );
    await migrationPool.query(
      'INSERT INTO tenant_user_roles (tenant_id,user_id,role_id) VALUES ($1,$2,$3)',
      [tenantA, reportUserA, reportRoleId]
    );
    for (const [tenantId, siteId, marker] of [
      [tenantA, siteA, 'REPORT-A'],
      [tenantA, siteAOutsideScope, 'REPORT-OUTSIDE'],
      [tenantB, siteB, 'REPORT-FOREIGN']
    ]) {
      const employeeId = (await migrationPool.query(
        `INSERT INTO employees
          (tenant_id,personnel_number,first_name,last_name,email,phone,role,date_of_joining)
         VALUES ($1,$2,'Boundary',$2,$3,'000','Wache','2026-01-01') RETURNING id`,
        [tenantId, marker, `${marker.toLowerCase()}@boundary.test.invalid`]
      )).rows[0].id as string;
      await migrationPool.query(
        'INSERT INTO employee_site_assignments (tenant_id,employee_id,site_id) VALUES ($1,$2,$3)',
        [tenantId, employeeId, siteId]
      );
      await migrationPool.query(
        `INSERT INTO employee_qualifications
          (tenant_id,employee_id,qualification_type,certificate_number,issue_date,verified,status)
         VALUES ($1,$2,$3,$3,'2026-01-01',true,'VALID')`,
        [tenantId, employeeId, marker]
      );
      const shiftId = (await migrationPool.query(
        `INSERT INTO shifts
          (tenant_id,site_id,employee_id,shift_date,start_time,end_time,required_qualification)
         VALUES ($1,$2,$3,$4,'08:00','16:00',$5) RETURNING id`,
        [tenantId, siteId, employeeId, reportDate, marker]
      )).rows[0].id as string;
      await migrationPool.query(
        'INSERT INTO shift_staffing_assignments (tenant_id,shift_id,employee_id) VALUES ($1,$2,$3)',
        [tenantId, shiftId, employeeId]
      );
      await migrationPool.query(
        `INSERT INTO employee_absences (tenant_id,employee_id,absence_type,date_from,date_to,status)
         VALUES ($1,$2,'SICKNESS',$3,$3,'APPROVED')`,
        [tenantId, employeeId, reportDate]
      );
      reportFixtures.push({ tenantId, siteId, employeeId, shiftId, marker });
    }

    adminSession = await createSession(adminUserA, tenantA);
    unprivilegedSession = await createSession(unprivilegedUserA, tenantA);
    siteScopedSession = await createSession(siteScopedUserA, tenantA);
    reportSession = await createSession(reportUserA, tenantA);
  });

  afterAll(async () => {
    await cleanupTestData([tenantA, tenantB], [adminUserA, unprivilegedUserA, foreignUserB, siteScopedUserA, reportUserA]);
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

  test.each(reportCases)('denies $path (csv=$csv) without an explicit report grant, including tenant admins', async report => {
    for (const session of [unprivilegedSession, adminSession]) {
      const denied = await getReport(session, report);
      expect(denied.status).toBe(403);
      expect(denied.body.success).toBe(false);
      expect(denied.body.data).toBeUndefined();
    }
  });

  test.each(reportCases)('isolates $path (csv=$csv) rows and aggregates by authenticated grants despite forged hints', async report => {
    for (const [session, expected] of [
      [reportSession, reportFixtures.filter(fixture => fixture.tenantId === tenantA)],
      [siteScopedSession, reportFixtures.filter(fixture => fixture.siteId === siteA)]
    ] as const) {
      const response = await getReport(session, report)
        .set('X-Tenant-ID', tenantB)
        .query({ tenantId: tenantB, tenant_id: tenantB, requestedTenantId: tenantB, siteId: siteB });
      expect(response.status).toBe(200);
      if (report.csv) {
        expect(response.headers['content-type']).toContain('text/csv');
        for (const fixture of reportFixtures) {
          if (expected.includes(fixture)) expect(response.text).toContain(fixture.marker);
          else expect(response.text).not.toContain(fixture.marker);
        }
      } else if (report.path === 'work-hours') {
        expect(response.body.data.map((row: { employee_id: string }) => row.employee_id).sort())
          .toEqual(expected.map(fixture => fixture.employeeId).sort());
        expect(response.body.data.every((row: { planned_hours: number }) => Number(row.planned_hours) === 8)).toBe(true);
      } else if (report.path === 'coverage') {
        expect(response.body.data.map((row: { shift_id: string }) => row.shift_id).sort())
          .toEqual(expected.map(fixture => fixture.shiftId).sort());
        expect(response.body.summary).toMatchObject({
          shifts: expected.length, requiredCount: expected.length,
          assignedQualifiedCount: expected.length, shortfall: 0
        });
        expect(response.body.summary.byQualification.map((row: { qualificationType: string }) => row.qualificationType).sort())
          .toEqual(expected.map(fixture => fixture.marker).sort());
      } else if (report.path === 'qualifications') {
        expect(response.body.data.map((row: { qualification_type: string }) => row.qualification_type).sort())
          .toEqual(expected.map(fixture => fixture.marker).sort());
        for (const row of response.body.data) {
          expect(row).toMatchObject({
            active_qualified_employees: 1, employees_with_record: 1,
            required_slots: 1, assigned_qualified_slots: 1, shortfall: 0
          });
        }
      } else {
        expect(response.body.data).toEqual([{
          absence_type: 'SICKNESS', status: 'APPROVED', absence_records: expected.length,
          affected_employees: expected.length, overlapping_calendar_days: expected.length
        }]);
        expect(response.body.summary).toEqual({ absenceRecords: expected.length, affectedEmployees: expected.length });
      }
    }
  });

  test('applies report permission removal immediately to existing sessions and restores only the authorized scope', async () => {
    await migrationPool.query(
      `DELETE FROM tenant_role_permissions
       WHERE tenant_id=$1 AND role_id=ANY($2::uuid[])
         AND permission_id=(SELECT id FROM permissions WHERE code='planning:reports:read')`,
      [tenantA, [reportRoleId, siteRoleId]]
    );
    try {
      for (const report of reportCases) {
        expect((await getReport(reportSession, report)).status).toBe(403);
        expect((await getReport(siteScopedSession, report)).status).toBe(403);
      }
    } finally {
      await migrationPool.query(
        `INSERT INTO tenant_role_permissions (tenant_id,role_id,permission_id,site_id,data_scope)
         SELECT $1::uuid,$2::uuid,id,NULL::uuid,'TENANT' FROM permissions WHERE code='planning:reports:read'
         UNION ALL
         SELECT $1::uuid,$3::uuid,id,$4::uuid,'SITE' FROM permissions WHERE code='planning:reports:read'`,
        [tenantA, reportRoleId, siteRoleId, siteA]
      );
    }
    const restored = await getReport(siteScopedSession, { path: 'coverage', csv: false });
    expect(restored.status).toBe(200);
    expect(restored.body.data.map((row: { site_id: string }) => row.site_id)).toEqual([siteA]);
  });

  test('report-only grants do not authorize underlying object APIs and site reads cannot resolve foreign shift IDs', async () => {
    expect((await request(app).get('/api/v1/planning/shifts').set(authHeaders(reportSession))).status).toBe(403);
    const ownShift = reportFixtures.find(fixture => fixture.siteId === siteA)!;
    const authorized = await request(app)
      .get(`/api/v1/planning/shifts/${ownShift.shiftId}/assignments`).set(authHeaders(siteScopedSession));
    expect(authorized.status).toBe(200);
    expect(authorized.body.data.map((row: { employee_id: string }) => row.employee_id)).toEqual([ownShift.employeeId]);
    for (const fixture of reportFixtures.filter(fixture => fixture.siteId !== siteA)) {
      const denied = await request(app).get(`/api/v1/planning/shifts/${fixture.shiftId}/assignments`)
        .set(authHeaders(siteScopedSession));
      expect(denied.status).toBe(200);
      expect(denied.body.data).toEqual([]);
      const suggestions = await request(app).get(`/api/v1/planning/shifts/${fixture.shiftId}/staffing-suggestions`)
        .set(authHeaders(siteScopedSession));
      expect(suggestions.status).toBe(404);
      expect(suggestions.body.data).toBeUndefined();
    }
  });
});
