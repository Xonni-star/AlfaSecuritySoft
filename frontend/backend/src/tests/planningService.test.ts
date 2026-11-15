import { PoolClient } from 'pg';
import { validateShiftCandidate } from '../services/planningService';

const tenantId = '11111111-1111-4111-8111-111111111111';
const siteId = '22222222-2222-4222-8222-222222222222';
const employeeId = '33333333-3333-4333-8333-333333333333';
const absenceId = '44444444-4444-4444-8444-444444444444';
const conflictingShiftId = '55555555-5555-4555-8555-555555555555';

function planningClient(overrides: {
  employee?: Record<string, unknown>;
  siteAssignment?: Record<string, unknown>;
  qualification?: Record<string, unknown>;
  absence?: Record<string, unknown>;
  overlap?: Record<string, unknown>;
} = {}): PoolClient {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('FROM sites')) return { rows: [{ time_zone: 'UTC' }] };
    if (sql.includes('FROM schedule_rule_profile_versions')) return { rows: [] };
    if (sql.includes('FROM employees')) return { rows: [overrides.employee ?? { status: 'Aktiv', archived_at: null }] };
    if (sql.includes('FROM employee_site_assignments')) return { rows: [overrides.siteAssignment ?? { '?column?': 1 }] };
    if (sql.includes('FROM employee_qualifications')) return { rows: overrides.qualification ? [overrides.qualification] : [] };
    if (sql.includes('FROM employee_absences')) return { rows: overrides.absence ? [overrides.absence] : [] };
    if (sql.includes('FROM shifts s')) return { rows: overrides.overlap ? [overrides.overlap] : [] };
    return { rows: [] };
  });
  return { query } as unknown as PoolClient;
}

const candidate = {
  tenantId,
  siteId,
  employeeId,
  date: '2026-06-15',
  startTime: '08:00',
  endTime: '16:00',
  requiredQualification: 'Objektschutz'
};

describe('validateShiftCandidate employee eligibility', () => {
  test('blocks inactive employees', async () => {
    const result = await validateShiftCandidate(planningClient({
      employee: { status: 'Urlaub', archived_at: null }
    }), candidate);

    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEE_UNAVAILABLE', severity: 'blocking' })
    ]));
  });

  test('blocks employees without a valid required qualification', async () => {
    const result = await validateShiftCandidate(planningClient(), candidate);

    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'QUALIFICATION_MISSING',
        severity: 'blocking',
        details: { requiredQualification: 'Objektschutz', shiftEndDate: '2026-06-15' }
      })
    ]));
  });

  test('reports the approved absence that makes an employee unavailable', async () => {
    const result = await validateShiftCandidate(planningClient({
      qualification: { '?column?': 1 },
      absence: { id: absenceId, date_from: '2026-06-14', date_to: '2026-06-16' }
    }), candidate);

    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'APPROVED_ABSENCE',
        severity: 'blocking',
        details: { absenceId, absenceFrom: '2026-06-14', absenceTo: '2026-06-16' }
      })
    ]));
  });

  test('identifies the conflicting shift for an overlap finding', async () => {
    const result = await validateShiftCandidate(planningClient({
      qualification: { '?column?': 1 },
      overlap: { id: conflictingShiftId }
    }), candidate);

    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'SHIFT_OVERLAP',
        severity: 'blocking',
        details: { conflictingShiftId }
      })
    ]));
  });
});
