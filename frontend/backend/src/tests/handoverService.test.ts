import { updateHandoverTask } from '../services/handoverService';

const tenantId = '11111111-1111-4111-8111-111111111111';
const otherTenantId = '99999999-9999-4999-8999-999999999999';
const actorUserId = '22222222-2222-4222-8222-222222222222';
const taskId = '33333333-3333-4333-8333-333333333333';
const employeeId = '44444444-4444-4444-8444-444444444444';
const nonexistentEmployeeId = '55555555-5555-4555-8555-555555555555';
const otherTenantEmployeeId = '66666666-6666-4666-8666-666666666666';

function database(employeeTenants: Record<string, string>) {
  const task = {
    id: taskId,
    revision_version: 1,
    status: 'open',
    title: 'Prüfung',
    description: '',
    assigned_employee_id: employeeId,
    priority: 'normal',
    due_at: new Date('2026-11-15T10:00:00.000Z'),
    completed_at: null,
    origin_handover_id: '77777777-7777-4777-8777-777777777777'
  };
  const query = jest.fn(async (sql: string, values: unknown[] = []) => {
    if (sql.includes('FROM handover_tasks') && sql.includes('FOR UPDATE')) return { rows: [task] };
    if (sql.includes('FROM employees')) {
      const [queryTenantId, queriedEmployeeId] = values as [string, string];
      return { rows: employeeTenants[queriedEmployeeId] === queryTenantId ? [{ '?column?': 1 }] : [] };
    }
    if (sql.includes('UPDATE handover_tasks')) {
      return { rows: [{
        ...task,
        title: values[0],
        description: values[1],
        assigned_employee_id: values[2],
        due_at: values[4],
        revision_version: 2
      }] };
    }
    return { rows: [] };
  });
  return { query };
}

describe('updateHandoverTask assignee tenant validation', () => {
  test('accepts an employee in the current tenant', async () => {
    const db = database({ [employeeId]: tenantId });

    await updateHandoverTask(db as any, tenantId, actorUserId, taskId, {
      expectedVersion: 1,
      assignedEmployeeId: employeeId
    });

    expect(db.query).toHaveBeenCalledWith(
      'SELECT 1 FROM employees WHERE tenant_id=$1 AND id=$2',
      [tenantId, employeeId]
    );
    expect(db.query.mock.calls.some(([sql]) => sql.includes('UPDATE handover_tasks'))).toBe(true);
  });

  test.each([
    ['nonexistent', nonexistentEmployeeId, {}],
    ['another tenant', otherTenantEmployeeId, { [otherTenantEmployeeId]: otherTenantId }]
  ])('rejects an assignee from %s', async (_label, assignedEmployeeId, employeeTenants) => {
    const db = database(employeeTenants as Record<string, string>);

    await expect(updateHandoverTask(db as any, tenantId, actorUserId, taskId, {
      expectedVersion: 1,
      assignedEmployeeId: assignedEmployeeId as string
    })).rejects.toMatchObject({ statusCode: 404 });

    expect(db.query.mock.calls.some(([sql]) => sql.includes('UPDATE handover_tasks'))).toBe(false);
  });

  test('leaves the assignee unchanged and still allows clearing the due date', async () => {
    const db = database({});

    await updateHandoverTask(db as any, tenantId, actorUserId, taskId, {
      expectedVersion: 1,
      dueAt: null
    });

    expect(db.query.mock.calls.some(([sql]) => sql.includes('FROM employees'))).toBe(false);
    const updateCall = db.query.mock.calls.find(([sql]) => sql.includes('UPDATE handover_tasks'));
    expect(updateCall?.[1]?.[2]).toBe(employeeId);
    expect(updateCall?.[1]?.[4]).toBeNull();
  });
});
