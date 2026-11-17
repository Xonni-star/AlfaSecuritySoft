import { Client } from 'pg';

/**
 * Sets the password of the least-privilege application role after migrations.
 * Runs once in the db-init container with the administrative migration URL.
 * The password is passed via environment, never as a command-line argument.
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_MIGRATION_URL;
  const password = process.env.POSTGRES_APP_PASSWORD;

  if (!connectionString) {
    throw new Error('DATABASE_MIGRATION_URL fehlt.');
  }
  if (!password || password.length < 16) {
    throw new Error('POSTGRES_APP_PASSWORD fehlt oder ist kürzer als 16 Zeichen.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const roles = await client.query(
      `SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])`,
      [['secops_app_user', 'alfasecuritysoft_app_user']]
    );
    if (roles.rowCount !== 2) {
      throw new Error('Application database roles are missing. Run migrations before setting passwords.');
    }

    await client.query(
      `ALTER ROLE secops_app_user WITH LOGIN PASSWORD ${client.escapeLiteral(password)}`
    );
    await client.query(
      `ALTER ROLE alfasecuritysoft_app_user WITH LOGIN PASSWORD ${client.escapeLiteral(password)}`
    );

    console.log('[DB INIT] Application role passwords set.');
  } finally {
    await client.end();
  }
}

main().catch(() => {
  console.error('[DB INIT FAILED] Application database credential setup failed; details were suppressed.');
  process.exit(1);
});
