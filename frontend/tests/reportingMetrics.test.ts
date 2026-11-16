import { describe, expect, test } from 'vitest';
import { getReportDateRange, isDateInRange, ReportPeriod } from '../reportingMetrics';

describe('report date ranges', () => {
  const now = new Date(2026, 10, 15, 15, 30);
  const cases: Array<[ReportPeriod, string, string]> = [
    ['TODAY', '2026-11-15', '2026-11-15'],
    ['YESTERDAY', '2026-11-14', '2026-11-14'],
    ['THIS_WEEK', '2026-11-09', '2026-11-15'],
    ['LAST_WEEK', '2026-11-02', '2026-11-08'],
    ['THIS_MONTH', '2026-11-01', '2026-11-30'],
    ['LAST_MONTH', '2026-10-01', '2026-10-31'],
    ['THIS_QUARTER', '2026-10-01', '2026-12-31'],
    ['LAST_QUARTER', '2026-07-01', '2026-09-30'],
    ['THIS_YEAR', '2026-01-01', '2026-12-31']
  ];

  test.each(cases)('%s uses inclusive local calendar dates', (period, from, to) => {
    expect(getReportDateRange(period, now)).toEqual({ from, to });
  });

  test('accepts a valid custom range and falls back when it is invalid', () => {
    expect(getReportDateRange('CUSTOM', now, { from: '2026-02-01', to: '2026-02-28' }))
      .toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(getReportDateRange('CUSTOM', now, { from: '2026-03-01', to: '2026-02-28' }))
      .toEqual({ from: '2026-11-15', to: '2026-11-15' });
  });

  test('filters timestamps by local calendar day and excludes invalid dates', () => {
    const range = { from: '2026-03-29', to: '2026-03-29' };
    expect(isDateInRange('2026-03-29', range)).toBe(true);
    expect(isDateInRange('2026-03-28', range)).toBe(false);
    expect(isDateInRange('2026-02-31', range)).toBe(false);
    expect(isDateInRange('2026-03-29T00:15:00+01:00', range)).toBe(true);
    expect(isDateInRange('2026-03-30T00:00:00+02:00', range)).toBe(false);
    expect(isDateInRange('not-a-date', range)).toBe(false);
  });
});
