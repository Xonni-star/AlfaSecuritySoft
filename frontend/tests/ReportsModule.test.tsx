import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: {
    calculateTenantKPIs: () => ({
      totalActualHours: 0,
      totalPlannedHours: 0,
      planFulfillmentRate: 0,
      openCriticalIncidentsCount: 0,
      activeEmployeesCount: 0,
      expiringQualificationsCount: 0,
      din77200ComplianceScore: 0
    }),
    getTenantReportDefinitions: vi.fn(),
    addReportDefinition: vi.fn(),
    deleteReportDefinition: vi.fn(),
    getTenantClients: () => [],
    getTenantSites: () => [],
    getTenantEmployees: vi.fn(),
    getTenantShifts: vi.fn(),
    getTenantGuardBook: vi.fn(),
    getTenantKeys: () => [],
    getTenantTasks: () => [],
    getCurrentTenant: () => ({ id: 'tenant-a', name: 'Test tenant' }),
    currentUserRole: 'Systemadministrator'
  }
}));

vi.mock('../store', () => ({ useSecurityStore: () => mocks.state }));
vi.mock('recharts', async (importOriginal) => ({
  ...await importOriginal<typeof import('recharts')>(),
  ResponsiveContainer: () => null
}));

import { ReportsModule } from '../components/ReportsModule';

const guardEntry = {
  id: 'entry-a',
  timestamp: '2026-01-01T10:00:00Z',
  siteName: 'Objekt A',
  category: 'Kontrolle',
  priority: 'Normal',
  title: 'Alles in Ordnung',
  guardName: 'Erika Muster',
  stage: 'Offen'
};
const guardHeaders = 'ID;Zeitpunkt;Objekt;Kategorie;Prioritaet;Titel;Wachkraft;Status';

describe('ReportsModule browser CSV export', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let downloads: HTMLAnchorElement[];

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.state.getTenantReportDefinitions.mockReturnValue([]);
    mocks.state.getTenantEmployees.mockReturnValue([]);
    mocks.state.getTenantShifts.mockReturnValue([]);
    mocks.state.getTenantGuardBook.mockReturnValue([guardEntry]);
    downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  async function clickButton(label: string): Promise<void> {
    const button = Array.from(container.querySelectorAll('button'))
      .find((candidate) => candidate.textContent?.includes(label));
    if (!button) throw new Error(`Missing button: ${label}`);
    await act(async () => button.click());
  }

  async function exportCsv(source = 'guardbook'): Promise<string> {
    mocks.state.getTenantReportDefinitions.mockReturnValue([{
      id: 'report-a',
      name: 'Test report',
      dataSource: source,
      category: 'PERSONAL',
      scheduleInterval: 'MONTHLY'
    }]);
    await act(async () => root.render(<ReportsModule />));
    if (source === 'guardbook') {
      await clickButton('Excel / CSV Export');
    } else {
      await clickButton('Berichtsgenerator & Vorlagen');
      await clickButton('Exportieren');
    }
    expect(downloads).toHaveLength(1);
    const link = downloads[0];
    expect(link.download).toMatch(new RegExp(`^SecurityOps_${source}_\\d{4}-\\d{2}-\\d{2}\\.csv$`));
    expect(link.isConnected).toBe(false);
    const prefix = 'data:text/csv;charset=utf-8,';
    expect(link.href.startsWith(prefix)).toBe(true);
    expect(link.hash).toBe('');
    return decodeURIComponent(link.href.slice(prefix.length));
  }

  test('quotes delimiters, embedded quotes and CR/LF while preserving Unicode and URI-sensitive text', async () => {
    mocks.state.getTenantGuardBook.mockReturnValue([{
      ...guardEntry,
      siteName: 'Objekt; Süd',
      category: 'Kontrolle "außen"',
      priority: 'Normal\rdringend',
      title: 'Zeile 1\nZeile 2\r\nZeile 3; "Ende"',
      guardName: 'Erika #1 & 50% ?'
    }]);

    expect(await exportCsv()).toBe(
      '\uFEFF' + guardHeaders + '\n' +
      'entry-a;2026-01-01T10:00:00Z;"Objekt; Süd";"Kontrolle ""außen""";"Normal\rdringend";' +
      '"Zeile 1\nZeile 2\r\nZeile 3; ""Ende""";Erika #1 & 50% ?;Offen'
    );
  });

  test('neutralizes every formula-leading text marker, including whitespace, controls and BOM prefixes', async () => {
    const formulas = ['', ' ', '\t', '\r\n', '\u0000\u001f', '\u007f\u0085', '\uFEFF', ' \u00a0\uFEFF\t']
      .flatMap((prefix) => ['=1+1', '+1+1', '-123', '@SUM(A1)'].map((formula) => prefix + formula));
    mocks.state.getTenantGuardBook.mockReturnValue(formulas.map((title) => ({ ...guardEntry, title })));

    const expectedRows = formulas.map((formula) => {
      const neutralized = `'${formula}`;
      const title = formula.includes('\n') ? `"${neutralized}"` : neutralized;
      return `entry-a;2026-01-01T10:00:00Z;Objekt A;Kontrolle;Normal;${title};Erika Muster;Offen`;
    });
    expect(await exportCsv()).toBe('\uFEFF' + [guardHeaders, ...expectedRows].join('\n'));
  });

  test('escapes embedded CSV syntax after neutralizing formulas in any exported text column', async () => {
    mocks.state.getTenantGuardBook.mockReturnValue([{
      ...guardEntry,
      id: '=1+1',
      timestamp: '+1+1',
      siteName: '-1+1',
      category: '@SUM(A1)',
      priority: '\t=1+1',
      title: '=HYPERLINK("https://example.test/#item";"Open")',
      guardName: '\uFEFF+1+1',
      stage: ' \r\n-1+1'
    }]);

    expect(await exportCsv()).toBe(
      '\uFEFF' + guardHeaders + '\n' +
      '\'=1+1;\'+1+1;\'-1+1;\'@SUM(A1);\'\t=1+1;' +
      '"\'=HYPERLINK(""https://example.test/#item"";""Open"")";\'\uFEFF+1+1;"\' \r\n-1+1"'
    );
  });

  test('preserves actual negative, zero and positive numbers but neutralizes numeric-looking text', async () => {
    mocks.state.getTenantEmployees.mockReturnValue([-12.5, 0, 40].map((weeklyHours) => ({
      personnelNumber: '-123',
      firstName: 'Anna-Maria',
      lastName: 'Müller',
      role: 'Wachkraft',
      status: 'Aktiv',
      weeklyHours,
      dateOfJoining: null
    })));

    expect(await exportCsv('employees')).toBe(
      '\uFEFFPersonalnr;Name;Rolle;Status;Stunden;Eintritt\n' +
      '\'-123;Anna-Maria Müller;Wachkraft;Aktiv;-12.5;\n' +
      '\'-123;Anna-Maria Müller;Wachkraft;Aktiv;0;\n' +
      '\'-123;Anna-Maria Müller;Wachkraft;Aktiv;40;'
    );
  });

  test('keeps plain shift exports and the unassigned employee fallback unchanged', async () => {
    mocks.state.getTenantShifts.mockReturnValue([{
      id: 'shift-a',
      siteName: 'Objekt A',
      date: '2026-01-01',
      startTime: '08:00',
      endTime: '16:00',
      type: 'Tagdienst',
      status: 'Offen'
    }]);

    expect(await exportCsv('shifts')).toBe(
      '\uFEFFID;Objekt;Datum;Uhrzeit;Typ;Status;Mitarbeiter\n' +
      'shift-a;Objekt A;2026-01-01;08:00-16:00;Tagdienst;Offen;Unbesetzt'
    );
  });

  test('does not download a CSV when there are no rows', async () => {
    mocks.state.getTenantGuardBook.mockReturnValue([]);
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    await act(async () => root.render(<ReportsModule />));
    await clickButton('Excel / CSV Export');

    expect(alert).toHaveBeenCalledWith('Keine Datensätze für diesen Export vorhanden.');
    expect(downloads).toHaveLength(0);
  });
});
