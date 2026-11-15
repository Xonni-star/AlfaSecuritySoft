import { afterEach, describe, expect, test, vi } from 'vitest';
import { apiClient } from '../services/apiClient';

describe('API retry hints', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('preserves the server Retry-After interval on an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
      headers: new Headers({ 'retry-after': '60' }),
      json: async () => ({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Please retry later'
      })
    }));

    await expect(apiClient.request('/sync/push')).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterMs: 60_000
    });
  });

  test('parses an HTTP-date Retry-After header', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00.000Z'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 503,
      ok: false,
      headers: new Headers({ 'retry-after': 'Sun, 15 Nov 2026 10:01:00 GMT' }),
      json: async () => ({
        success: false,
        code: 'TEMPORARY_UNAVAILABLE',
        message: 'Please retry later'
      })
    }));

    await expect(apiClient.request('/sync/push')).rejects.toMatchObject({
      status: 503,
      retryAfterMs: 60_000
    });
  });

  test('preserves tenant choices returned for an ambiguous login', async () => {
    const availableTenants = [
      { id: 'tenant-a', name: 'Tenant A', role: 'Operator' },
      { id: 'tenant-b', name: 'Tenant B', role: 'Administrator' }
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 400,
      ok: false,
      headers: new Headers(),
      json: async () => ({
        success: false,
        code: 'AMBIGUOUS_TENANT_SELECTION',
        message: 'Choose a tenant',
        availableTenants
      })
    }));

    await expect(apiClient.request('/auth/login')).rejects.toMatchObject({
      status: 400,
      code: 'AMBIGUOUS_TENANT_SELECTION',
      availableTenants
    });
  });
});
