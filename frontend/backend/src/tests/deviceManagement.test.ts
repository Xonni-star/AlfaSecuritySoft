import { registerDevice, revokeDevice, listDevices } from '../controllers/deviceController';

jest.mock('../config/database', () => {
  const query = jest.fn();
  const withTenantTransaction = jest.fn(async (_tenantId: string, callback: (client: any) => unknown) => callback({ query }));
  return { withTenantTransaction, query };
});

const { query, withTenantTransaction } = jest.requireMock('../config/database') as {
  query: jest.Mock;
  withTenantTransaction: jest.Mock;
};

const TENANT = '22222222-2222-2222-2222-222222222222';
const USER = '11111111-1111-1111-1111-111111111111';
const SESSION_HASH = 'a'.repeat(64);

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return res; },
    json(payload: any) { res.body = payload; return res; }
  };
  return res;
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { tenantId: TENANT, userId: USER, sessionHash: SESSION_HASH },
    body: {},
    ...overrides
  } as any;
}

describe('deviceController (Gerätewiderruf)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerDevice', () => {
    test('bindet Sitzung an Gerät und legt Registry-Eintrag an', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // SELECT revoked_at -> nicht widerrufen
      const res = makeRes();
      const next = jest.fn();

      await registerDevice(makeReq({ body: { deviceId: 'dev-123', deviceName: 'Diensthandy' } }), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.body).toMatchObject({ success: true });

      const insertCall = query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO devices'));
      expect(insertCall).toBeTruthy();
      expect(insertCall![1]).toEqual([TENANT, USER, 'dev-123', 'Diensthandy']);

      const bindCall = query.mock.calls.find(([sql]) => String(sql).includes('UPDATE user_sessions SET device_id'));
      expect(bindCall).toBeTruthy();
      expect(bindCall![1]).toEqual(['dev-123', SESSION_HASH, TENANT]);
    });

    test('lehnt ein bereits widerrufenes Gerät mit 403 ab', async () => {
      query.mockResolvedValueOnce({ rows: [{ revoked_at: '2026-11-01T00:00:00.000Z' }] });
      const res = makeRes();
      const next = jest.fn();

      await registerDevice(makeReq({ body: { deviceId: 'dev-revoked' } }), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body).toMatchObject({ success: false });

      // Es darf weder ein INSERT noch ein Session-Binding stattfinden.
      expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO devices'))).toBe(false);
      expect(query.mock.calls.some(([sql]) => String(sql).includes('UPDATE user_sessions SET device_id'))).toBe(false);
    });
  });

  describe('revokeDevice', () => {
    test('setzt revoked_at und beendet zugehörige Sitzungen', async () => {
      query.mockResolvedValue({ rows: [] });
      const res = makeRes();
      const next = jest.fn();

      await revokeDevice(makeReq({ body: { deviceId: 'dev-123' } }), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.body).toMatchObject({ success: true });

      const revokeDeviceCall = query.mock.calls.find(([sql]) => String(sql).includes('UPDATE devices'));
      expect(revokeDeviceCall).toBeTruthy();
      expect(revokeDeviceCall![1]).toEqual([TENANT, 'dev-123']);

      const revokeSessionCall = query.mock.calls.find(([sql]) => String(sql).includes('UPDATE user_sessions SET revoked=true'));
      expect(revokeSessionCall).toBeTruthy();
      expect(revokeSessionCall![1]).toEqual([TENANT, 'dev-123']);
    });
  });

  describe('listDevices', () => {
    test('liefert die Geräte des Mandanten', async () => {
      const row = { id: 'device-uuid', device_id: 'dev-123', device_name: 'Diensthandy', revoked_at: null };
      query.mockResolvedValueOnce({ rows: [row] });
      const res = makeRes();
      const next = jest.fn();

      await listDevices(makeReq({}), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.body).toMatchObject({ success: true, data: [row] });
      const listCall = query.mock.calls.find(([sql]) => String(sql).includes('FROM devices'));
      expect(listCall![1]).toEqual([TENANT]);
    });
  });

  test('nutzt für alle Operationen die Mandanten-Transaktion', async () => {
    query.mockResolvedValue({ rows: [] });
    await revokeDevice(makeReq({ body: { deviceId: 'dev-123' } }), makeRes(), jest.fn());
    expect(withTenantTransaction).toHaveBeenCalledWith(TENANT, expect.any(Function));
  });
});
