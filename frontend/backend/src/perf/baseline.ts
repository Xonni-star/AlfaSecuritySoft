import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';

const REQUESTS = 50;
const WARMUP_REQUESTS = 5;
const CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 10_000;

type JsonResponse = {
  status: number;
  body: { data?: unknown };
  headers: Headers;
};

function assertLoopbackBaseUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error('PERF_BASE_URL must use HTTP on localhost, 127.0.0.1, or ::1.');
  }
  return url;
}

async function requestJson(baseUrl: URL, path: string, init: RequestInit = {}): Promise<JsonResponse> {
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  const body = await response.json() as { data?: unknown };
  return { status: response.status, body, headers: response.headers };
}

function requireStatus(response: JsonResponse, expectedStatus: number, label: string): void {
  if (response.status !== expectedStatus) {
    throw new Error(`${label} returned HTTP ${response.status}; expected ${expectedStatus}.`);
  }
}

function percentile(sorted: number[], fraction: number): number {
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

async function measure(
  name: string,
  operation: (index: number) => Promise<void>
): Promise<Record<string, number | string>> {
  for (let index = 0; index < WARMUP_REQUESTS; index += 1) {
    await operation(index);
  }

  const latencies: number[] = [];
  let nextIndex = 0;
  let stopped = false;
  let failure: Error | undefined;
  const startedAt = performance.now();
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (!stopped && nextIndex < REQUESTS) {
      const index = nextIndex++;
      const requestStartedAt = performance.now();
      try {
        await operation(WARMUP_REQUESTS + index);
        latencies.push(performance.now() - requestStartedAt);
      } catch (error) {
        stopped = true;
        failure = error instanceof Error ? error : new Error('Benchmark request failed.');
      }
    }
  });
  await Promise.all(workers);
  if (failure) throw failure;
  const elapsedMs = performance.now() - startedAt;
  const sorted = latencies.sort((left, right) => left - right);

  return {
    name,
    requests: latencies.length,
    warmupRequests: WARMUP_REQUESTS,
    concurrency: CONCURRENCY,
    p50Ms: Number(percentile(sorted, 0.50).toFixed(3)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(3)),
    p99Ms: Number(percentile(sorted, 0.99).toFixed(3)),
    throughputPerSecond: Number((latencies.length / (elapsedMs / 1000)).toFixed(2)),
    errors: 0
  };
}

async function main(): Promise<void> {
  const baseUrl = assertLoopbackBaseUrl(process.env.PERF_BASE_URL ?? 'http://127.0.0.1:8000');
  const email = process.env.PERF_EMAIL;
  const password = process.env.PERF_PASSWORD;
  if (!email || !password) throw new Error('Set PERF_EMAIL and PERF_PASSWORD to a test account.');

  const origin = 'http://localhost:3000';
  const login = await requestJson(baseUrl, '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password })
  });
  requireStatus(login, 200, 'Test-account login');
  const loginData = login.body.data as { csrfToken?: string } | undefined;
  const csrfToken = loginData?.csrfToken;
  const sessionId = login.headers.get('set-cookie')?.match(/(?:^|,\s*)secops_session=([^;,]+)/)?.[1];
  if (!sessionId || !csrfToken) throw new Error('Login did not return the expected session cookie and CSRF token.');

  const headers = {
    Cookie: `secops_session=${sessionId}; secops_csrf=${csrfToken}`,
    'X-CSRF-Token': csrfToken,
    Origin: origin
  };
  const runId = randomUUID();

  const sop = await requestJson(baseUrl, '/api/v1/sops', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sopNumber: `PERF-${runId}`,
      title: `Performance baseline ${runId}`,
      content: 'Isolated performance test fixture'
    })
  });
  requireStatus(sop, 201, 'SOP fixture creation');
  const sopData = sop.body.data as { id?: string } | undefined;
  const sopId = sopData?.id;
  if (!sopId) throw new Error('SOP fixture creation returned no ID.');

  const customerIds: string[] = [];
  const syncOperation = async (index: number): Promise<void> => {
    const clientUuid = randomUUID();
    const clientId = randomUUID();
    const response = await requestJson(baseUrl, '/api/v1/customers/sync', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: `perf-${runId}`,
        mutations: [{
          clientUuid,
          action: 'CREATE',
          baseVersion: 1,
          payload: {
            id: clientId,
            clientNumber: `PERF-${runId}-${index}`,
            companyName: `Performance test ${runId} ${index}`,
            contactPerson: 'Performance Test',
            email: `perf-${runId}-${index}@example.test`,
            phone: '+490000000000',
            address: 'Isolated test fixture',
            contractStart: '2026-01-01',
            contractEnd: '2027-01-01'
          }
        }]
      })
    });
    requireStatus(response, 200, 'Customer sync create');
    const result = (response.body.data as Array<{ status?: string; serverId?: string }> | undefined)?.[0];
    if (result?.status !== 'SYNCED' || typeof result.serverId !== 'string') {
      throw new Error('Customer sync create did not return a SYNCED result.');
    }
    customerIds.push(result.serverId);
  };

  const syncMetrics = await measure('customer-sync-create', syncOperation);
  const customerListMetrics = await measure('tenant-customer-list', async () => {
    const response = await requestJson(baseUrl, '/api/v1/customers', { headers });
    requireStatus(response, 200, 'Tenant customer list');
    if (!Array.isArray(response.body.data)) throw new Error('Customer list response did not contain an array.');
  });

  let assignmentIndex = 0;
  const assignmentMetrics = await measure('sop-customer-assignment', async () => {
    const customerId = customerIds[assignmentIndex++];
    if (!customerId) throw new Error('No generated customer is available for the SOP assignment.');
    const response = await requestJson(baseUrl, `/api/v1/sops/${sopId}/assignments`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets: [{ type: 'customer', id: customerId }] })
    });
    requireStatus(response, 201, 'SOP customer assignment');
  });

  console.log(JSON.stringify({
    measuredAt: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      baseUrl: baseUrl.origin,
      rateLimitMax: process.env.RATE_LIMIT_MAX ?? '120'
    },
    workload: {
      requestsPerScenario: REQUESTS,
      warmupRequestsPerScenario: WARMUP_REQUESTS,
      concurrency: CONCURRENCY,
      timeoutMs: REQUEST_TIMEOUT_MS
    },
    scenarios: [customerListMetrics, syncMetrics, assignmentMetrics]
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unexpected benchmark failure.';
  console.error(`[PERF BASELINE FAILED] ${message}`);
  process.exitCode = 1;
});
