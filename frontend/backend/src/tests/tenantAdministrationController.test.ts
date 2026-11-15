import { Request, NextFunction } from 'express';
import { withSystemTransaction } from '../config/database';
import {
  createTenant,
  listTenants,
  updateTenant
} from '../controllers/tenantAdministrationController';

jest.mock('../config/database', () => ({
  withSystemTransaction: jest.fn()
}));

const userId = '11111111-1111-4111-8111-111111111111';
const tenantId = '22222222-2222-4222-8222-222222222222';
const transaction = { query: jest.fn() };
const next: NextFunction = jest.fn();

function response(): any {
  const res: any = { statusCode: 200, body: undefined };
  res.status = jest.fn((status: number) => { res.statusCode = status; return res; });
  res.json = jest.fn((body: unknown) => { res.body = body; return res; });
  return res;
}

function request(options: {
  isSuperAdmin?: boolean;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
} = {}): Request {
  return {
    params: options.params ?? {},
    body: options.body ?? {},
    ip: '127.0.0.1',
    user: {
      userId,
      email: 'system-admin@example.test',
      tenantId,
      role: 'Systemadministrator',
      permissions: ['users:manage', 'roles:delegate_admin'],
      isSuperAdmin: options.isSuperAdmin ?? true,
      sessionHash: 'session-hash'
    }
  } as unknown as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
  (withSystemTransaction as jest.Mock).mockImplementation(
    (callback: (db: typeof transaction) => unknown) => callback(transaction)
  );
});

describe('system tenant administration', () => {
  test('rejects tenant-scoped administrators even when they can delegate tenant roles', async () => {
    const res = response();
    await listTenants(request({ isSuperAdmin: false }), res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(withSystemTransaction).not.toHaveBeenCalled();
  });

  test('creates a tenant in a system transaction and records a tenant-scoped audit event', async () => {
    const tenant = {
      id: tenantId,
      name: 'Example Security GmbH',
      subdomain: 'example-security',
      is_active: true
    };
    transaction.query
      .mockResolvedValueOnce({ rows: [tenant] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = response();

    await createTenant(request({
      body: {
        name: ' Example Security GmbH ',
        subdomain: 'Example-Security',
        taxNumber: 'DE-12345',
        licenseTier: 'PROFESSIONAL',
        bwrRegisterId: 'BWR-12345',
        din77200Certified: false
      }
    }), res, next);

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toEqual(tenant);
    expect(transaction.query.mock.calls[0][1]).toEqual([
      'Example Security GmbH',
      'example-security',
      'DE-12345',
      'PROFESSIONAL',
      'BWR-12345',
      false
    ]);
    expect(transaction.query.mock.calls.some(([sql, values]) =>
      String(sql).includes('INSERT INTO audit_logs') &&
      String(values).includes('TENANT_CREATED')
    )).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  test('updates only supplied fields and records which fields changed', async () => {
    const updated = { id: tenantId, is_active: false };
    transaction.query
      .mockResolvedValueOnce({ rows: [{ id: tenantId }] })
      .mockResolvedValueOnce({ rows: [updated] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = response();

    await updateTenant(request({
      params: { id: tenantId },
      body: { isActive: false }
    }), res, next);

    expect(res.body.data).toEqual(updated);
    expect(transaction.query.mock.calls[1][0]).toContain('UPDATE tenants SET is_active=$1');
    expect(transaction.query.mock.calls[1][1]).toEqual([false, tenantId]);
    expect(String(transaction.query.mock.calls[3][1])).toContain('isActive');
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects empty updates without opening a system transaction', async () => {
    const res = response();

    await updateTenant(request({
      params: { id: tenantId },
      body: {}
    }), res, next);

    expect(withSystemTransaction).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
