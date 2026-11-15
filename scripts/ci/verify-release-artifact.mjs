import { createHash } from 'node:crypto';
import { readdir, readFile, lstat } from 'node:fs/promises';
import path from 'node:path';

const releaseRoot = path.resolve(process.argv[2] ?? '');
const expectedCommit = process.env.EXPECTED_COMMIT;
const expectedRunId = process.env.EXPECTED_RUN_ID;
const expectedRunAttempt = process.env.EXPECTED_RUN_ATTEMPT;

if (!process.argv[2] || !expectedCommit || !expectedRunId || !expectedRunAttempt) {
  throw new Error(
    'Usage: EXPECTED_COMMIT=… EXPECTED_RUN_ID=… EXPECTED_RUN_ATTEMPT=… node verify-release-artifact.mjs <release-dir>'
  );
}

const requiredFiles = [
  'BUILD-MANIFEST.txt',
  'frontend/dist/index.html',
  'frontend/package.json',
  'frontend/package-lock.json',
  'frontend/index.html',
  'frontend/vite.config.ts',
  'frontend/backend/dist/server.js',
  'frontend/backend/dist/migrations/runner.js',
  'frontend/backend/package.json',
  'frontend/backend/package-lock.json',
  'frontend/backend/tsconfig.json',
  'frontend/backend/src/server.ts',
  'frontend/deploy/Dockerfile.backend',
  'frontend/deploy/Dockerfile.frontend',
  'frontend/deploy/docker-compose.production.yml',
  'frontend/deploy/Caddyfile',
  'frontend/deploy/.env.example',
  'frontend/deploy/install.sh',
  'frontend/deploy/backup_cron.sh'
];

async function assertFile(relativePath) {
  const fullPath = path.join(releaseRoot, relativePath);
  const info = await lstat(fullPath).catch(() => null);
  if (!info?.isFile() || info.isSymbolicLink()) {
    throw new Error(`Missing required release file: ${relativePath}`);
  }
}

for (const file of requiredFiles) {
  await assertFile(file);
}

const manifestText = await readFile(path.join(releaseRoot, 'BUILD-MANIFEST.txt'), 'utf8');
const manifest = new Map();
for (const line of manifestText.trim().split(/\r?\n/)) {
  const separator = line.indexOf('=');
  if (separator <= 0) throw new Error('Malformed release manifest');
  const key = line.slice(0, separator);
  if (manifest.has(key)) throw new Error(`Duplicate manifest field: ${key}`);
  manifest.set(key, line.slice(separator + 1));
}

for (const [field, expected] of [
  ['commit', expectedCommit],
  ['ci_run_id', expectedRunId],
  ['ci_run_attempt', expectedRunAttempt]
]) {
  if (manifest.get(field) !== expected) {
    throw new Error(`Manifest ${field} does not match the successful CI run`);
  }
}

if (!/^[0-9a-f]{40,64}$/i.test(manifest.get('commit') ?? '')) {
  throw new Error('Manifest commit is not a full Git object ID');
}
if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(manifest.get('created_utc') ?? '')) {
  throw new Error('Manifest created_utc is not a UTC timestamp');
}

const sourceMigrationsDir = path.join(releaseRoot, 'frontend/backend/src/migrations');
const builtMigrationsDir = path.join(releaseRoot, 'frontend/backend/dist/migrations');
const listSqlFiles = async (directory) =>
  (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();

const sourceMigrations = await listSqlFiles(sourceMigrationsDir);
const builtMigrations = await listSqlFiles(builtMigrationsDir);
if (sourceMigrations.length === 0 || sourceMigrations.join('\n') !== builtMigrations.join('\n')) {
  throw new Error('Built SQL migration assets do not match the checked-out source set');
}

for (const filename of sourceMigrations) {
  const source = await readFile(path.join(sourceMigrationsDir, filename));
  const built = await readFile(path.join(builtMigrationsDir, filename));
  if (createHash('sha256').update(source).digest('hex') !== createHash('sha256').update(built).digest('hex')) {
    throw new Error(`Built SQL migration differs from source: ${filename}`);
  }
}

async function rejectSecretEnvFiles(directory, relativeDirectory = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.name.startsWith('.env') && entry.name !== '.env.example') {
      throw new Error(`Unexpected environment file in release artifact: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      await rejectSecretEnvFiles(path.join(directory, entry.name), relativePath);
    }
  }
}

await rejectSecretEnvFiles(releaseRoot);
console.log(`Release artifact verified: ${sourceMigrations.length} migrations, CI run ${expectedRunId}.`);
