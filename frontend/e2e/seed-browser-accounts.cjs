const { createRequire } = require('node:module');
const backendRequire = createRequire(require.resolve('../backend/package.json'));
const { Pool } = backendRequire('pg');
const argon2 = backendRequire('argon2');

async function seedBrowserAccounts() {
  const database = new URL(process.env.DATABASE_MIGRATION_URL);
  if (process.env.NODE_ENV !== 'test' || database.hostname !== '127.0.0.1' ||
      database.pathname !== '/securityops_browser') {
    throw new Error('Browser fixtures require the isolated loopback test database.');
  }
  const pool = new Pool({ connectionString: database.toString() });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const frankfurt = '11111111-1111-1111-1111-111111111111';
    const bavaria = '22222222-2222-2222-2222-222222222222';
    const owner = await client.query("SELECT id FROM users WHERE email='a.schmidt@ffm-sec.de'");
    const other = await client.query(
      `INSERT INTO users (email,password_hash,first_name,last_name)
       VALUES ($1,$2,'Browser','Other') RETURNING id`,
      ['other@browser.test.invalid', await argon2.hash(process.env.SECOPS_DEMO_USER_PASSWORD)]
    );
    for (const [tenantId, userId] of [[bavaria, owner.rows[0].id], [frankfurt, other.rows[0].id]]) {
      await client.query(
        `INSERT INTO tenant_memberships (tenant_id,user_id,first_name,last_name)
         VALUES ($1,$2,'Browser','Test')`,
        [tenantId, userId]
      );
      await client.query(
        `INSERT INTO tenant_role_permissions (tenant_id,role_id,permission_id,data_scope)
         SELECT $1,destination.id,source.permission_id,'TENANT'
         FROM tenant_roles destination
         JOIN tenant_roles original ON original.tenant_id=$2 AND original.name='Einsatzleitung'
         JOIN tenant_role_permissions source ON source.tenant_id=$2 AND source.role_id=original.id
         WHERE destination.tenant_id=$1 AND destination.name='Einsatzleitung'
         ON CONFLICT DO NOTHING`,
        [tenantId, frankfurt]
      );
      await client.query(
        `INSERT INTO tenant_user_roles (tenant_id,user_id,role_id)
         SELECT $1,$2,id FROM tenant_roles WHERE tenant_id=$1 AND name='Einsatzleitung'`,
        [tenantId, userId]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedBrowserAccounts().catch(() => {
  console.error('[BROWSER FIXTURE] Account setup failed; database details suppressed.');
  process.exitCode = 1;
});
