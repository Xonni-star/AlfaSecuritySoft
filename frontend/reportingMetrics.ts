export type ReportPeriod =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'LAST_QUARTER'
  | 'THIS_YEAR'
  | 'CUSTOM';

export interface DateRange {
  from: string;
  to: string;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function firstDayOfQuarter(date: Date): Date {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

export function getReportDateRange(
  period: ReportPeriod,
  now = new Date(),
  customRange?: DateRange
): DateRange {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);

  switch (period) {
    case 'YESTERDAY':
      start.setDate(start.getDate() - 1);
      end.setTime(start.getTime());
      break;
    case 'THIS_WEEK':
    case 'LAST_WEEK': {
      const weekday = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - weekday);
      if (period === 'LAST_WEEK') start.setDate(start.getDate() - 7);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      break;
    }
    case 'THIS_MONTH':
    case 'LAST_MONTH':
      start.setDate(1);
      if (period === 'LAST_MONTH') start.setMonth(start.getMonth() - 1);
      end.setTime(start.getTime());
      end.setMonth(end.getMonth() + 1, 0);
      break;
    case 'THIS_QUARTER':
    case 'LAST_QUARTER':
      start.setTime(firstDayOfQuarter(start).getTime());
      if (period === 'LAST_QUARTER') start.setMonth(start.getMonth() - 3);
      end.setTime(start.getTime());
      end.setMonth(end.getMonth() + 3, 0);
      break;
    case 'THIS_YEAR':
      start.setMonth(0, 1);
      end.setFullYear(start.getFullYear(), 11, 31);
      break;
    case 'CUSTOM':
      if (customRange && /^\d{4}-\d{2}-\d{2}$/.test(customRange.from) &&
          /^\d{4}-\d{2}-\d{2}$/.test(customRange.to) && customRange.from <= customRange.to) {
        return customRange;
      }
      return { from: dateKey(start), to: dateKey(end) };
    case 'TODAY':
    default:
      break;
  }
  return { from: dateKey(start), to: dateKey(end) };
}

export function isDateInRange(value: string | null | undefined, range: DateRange): boolean {
  if (!value) return false;
  const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(value);
  if (dateOnly) {
    const parsedDate = new Date(`${dateOnly[1]}T00:00:00Z`);
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateOnly[1]) return false;
    return dateOnly[1] >= range.from && dateOnly[1] <= range.to;
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;
  const date = new Date(timestamp);
  const key = dateKey(date);
  return key >= range.from && key <= range.to;
}
