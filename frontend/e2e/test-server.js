import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = 4173;
const distRoot = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const user = {
  id: '88888888-8888-4888-8888-888888888888',
  tenantId: '99999999-9999-4999-8999-999999999999',
  tenantName: 'Isolierter Browser-Test',
  email: 'offline@test.invalid',
  fullName: 'Offline Test',
  role: 'Wachdienstmitarbeiter',
  permissions: ['logbook:create', 'logbook:read']
};
const site = {
  id: '11111111-1111-4111-8111-111111111111',
  client_id: '22222222-2222-4222-8222-222222222222',
  client_name: 'Browser-Test GmbH',
  site_code: 'OFFLINE-1',
  name: 'Browser-Testobjekt',
  address: 'Testweg 1',
  security_level: 'Normal'
};
const employee = {
  id: '33333333-3333-4333-8333-333333333333',
  personnel_number: 'OFFLINE-1',
  first_name: 'Erika',
  last_name: 'Test',
  email: 'offline@test.invalid',
  phone: '',
  role: 'Wachdienstmitarbeiter',
  status: 'Aktiv'
};

const receipts = new Map();
const syncAttempts = [];
let authenticated = false;
let serverEffects = 0;
let photoUploadAttempts = 0;

function json(response, status, body, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  response.end(JSON.stringify(body));
}

function mimeType(path) {
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml'
  })[extname(path)] ?? 'application/octet-stream';
}

async function serveFile(request, response, pathname) {
  const requestedPath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const candidate = resolve(distRoot, `.${requestedPath}`);
  if (candidate !== distRoot && !candidate.startsWith(`${distRoot}${sep}`)) {
    response.writeHead(400).end();
    return;
  }

  let filePath = candidate;
  try {
    if (!(await stat(filePath)).isFile()) throw new Error('not a file');
  } catch {
    filePath = resolve(distRoot, 'index.html');
  }

  let bytes = await readFile(filePath);
  if (filePath.endsWith(`${sep}index.html`)) {
    bytes = Buffer.from(bytes.toString('utf8').replace(
      '<script src="https://cdn.tailwindcss.com"></script>',
      '<script>window.tailwind = window.tailwind || {};</script>'
    ));
  }
  response.writeHead(200, {
    'Content-Type': mimeType(filePath),
    'Cache-Control': 'no-store'
  });
  response.end(bytes);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  if (url.pathname === '/__test/state') {
    json(response, 200, {
      syncAttempts,
      serverEffects,
      photoUploadAttempts
    });
    return;
  }

  if (url.pathname === '/api/v1/auth/login' && request.method === 'POST') {
    authenticated = true;
    json(response, 200, { success: true, data: { user } }, {
      'Set-Cookie': 'securityops-test-session=active; HttpOnly; SameSite=Lax; Path=/',
      'X-CSRF-Token': 'isolated-test-csrf-token'
    });
    return;
  }

  if (url.pathname === '/api/v1/auth/me' && request.method === 'GET') {
    if (!authenticated || !request.headers.cookie?.includes('securityops-test-session=active')) {
      json(response, 401, { success: false, message: 'Nicht angemeldet' });
      return;
    }
    json(response, 200, { success: true, data: user });
    return;
  }

  if (url.pathname === '/api/v1/sync/push' && request.method === 'POST') {
    let body = '';
    for await (const chunk of request) body += chunk;
    const mutations = JSON.parse(body).mutations;
    const batchReceipts = mutations.map((mutation) => {
      syncAttempts.push(mutation.clientUuid);
      let receipt = receipts.get(mutation.clientUuid);
      if (!receipt) {
        serverEffects++;
        receipt = {
          clientUuid: mutation.clientUuid,
          serverId: '44444444-4444-4444-8444-444444444444',
          status: 'SYNCED',
          serverVersion: 1
        };
        receipts.set(mutation.clientUuid, receipt);
      }
      return receipt;
    });

    if (batchReceipts.some((receipt) => syncAttempts.filter(id => id === receipt.clientUuid).length === 1)) {
      response.destroy();
      return;
    }
    json(response, 200, { success: true, data: batchReceipts });
    return;
  }

  if (url.pathname === '/api/v1/documents' && request.method === 'POST') {
    photoUploadAttempts++;
    json(response, 501, { success: false, message: 'No attachment replay contract in browser fixture' });
    return;
  }

  if (url.pathname.startsWith('/api/v1/')) {
    const data = url.pathname === '/api/v1/sites' ? [site]
      : url.pathname === '/api/v1/employees' ? [employee]
        : [];
    json(response, 200, { success: true, data });
    return;
  }

  await serveFile(request, response, url.pathname);
});

server.listen(port, '127.0.0.1');
