import { NextFunction, Request } from 'express';
import { withTenantTransaction } from '../config/database';
import { decideShiftSwap } from '../controllers/planningController';

jest.mock('../config/database', () => ({
  withTenantTransaction: jest.fn()
}));

const tenantId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const shiftId = '44444444-4444-4444-8444-444444444444';
const requesterEmployeeId = '55555555-5555-4555-8555-555555555555';
const proposedEmployeeId = '66666666-6666-4666-8666-666666666666';

const query = jest.fn();
const client = { query };
const next: NextFunction = jest.fn();

function response(): any {
  const res: any = { statusCode: 200, body: undefined };
  res.status = jest.fn((status: number) => { res.statusCode = status; return res; });
  res.json = jest.fn((body: unknown) => { res.body = body; return res; });
  return res;
}

function request(): Request {
  return {
    params: { requestId },
    body: { decision: 'rejected', expectedVersion: 1, decisionNote: 'Bitte neu planen.' },
    user: {
      userId: actorId,
      tenantId,
      email: 'planner@example.test',
      role: 'Dienstplanung',
      permissions: ['planning:swaps:approve'],
      sessionHash: 'test'
    }
  } as unknown as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
  (withTenantTransaction as jest.Mock).mockImplementation(
    (_tenantId: string, callback: (db: typeof client) => unknown) => callback(client)
  );
});

describe('decideShiftSwap', () => {
  test('prevents the request creator from approving or rejecting their own request', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        id: requestId,
        shift_id: shiftId,
        requester_employee_id: requesterEmployeeId,
        proposed_employee_id: proposedEmployeeId,
        requested_by: actorId,
        status: 'pending',
        revision_version: 1
      }]
    });
    const res = response();

    await decideShiftSwap(request(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Ersteller/);
    expect(query).toHaveBeenCalledTimes(1);
  });

  test('records the affected employees and decision note in the audit event', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        id: requestId,
        shift_id: shiftId,
        requester_employee_id: requesterEmployeeId,
        proposed_employee_id: proposedEmployeeId,
        requested_by: '77777777-7777-4777-8777-777777777777',
        status: 'pending',
        revision_version: 1
      }]
    }).mockResolvedValueOnce({ rows: [{ id: requestId, status: 'rejected' }] })
      .mockResolvedValue({ rows: [] });
    const res = response();

    await decideShiftSwap(request(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.body.success).toBe(true);
    const auditCall = query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO planning_audit_events'));
    expect(auditCall?.[1]).toEqual(expect.arrayContaining([
      tenantId,
      actorId,
      'shift_swap.rejected',
      'shift_swap_request',
      requestId,
      JSON.stringify({
        shiftId,
        requesterEmployeeId,
        proposedEmployeeId,
        decisionNote: 'Bitte neu planen.'
      })
    ]));
  });
});
