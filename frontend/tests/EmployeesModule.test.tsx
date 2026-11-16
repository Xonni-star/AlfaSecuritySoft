import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { QualificationType, UserRole, type Employee } from '../types';

const mocks = vi.hoisted(() => ({
  addEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  state: {
    currentTenantId: 'tenant-a',
    currentUserId: 'user-a',
    authUser: null,
    employees: [] as any[],
    sites: [] as any[],
    addEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    archiveEmployee: vi.fn(),
    restoreEmployee: vi.fn(),
    addQualification: vi.fn(),
    updateQualification: vi.fn(),
    addAbsence: vi.fn(),
    reviewAbsence: vi.fn(),
    getTenantDocuments: vi.fn(() => [])
  }
}));

vi.mock('../store', () => ({
  useSecurityStore: (selector?: (state: typeof mocks.state) => unknown) =>
    selector ? selector(mocks.state) : mocks.state
}));

import { EmployeesModule } from '../components/EmployeesModule';

const sites = [
  { id: 'site-1', name: 'Hauptwache', siteCode: 'HW-1', archivedAt: null },
  { id: 'site-2', name: 'Bürogebäude', siteCode: 'BG-2', archivedAt: null }
];

const employee: Employee = {
  id: 'employee-1', tenantId: 'tenant-a', personnelNumber: 'MA-1',
  firstName: 'Erika', lastName: 'Muster', email: 'erika@example.test',
  phone: '+49 30 123', role: UserRole.GUARD, status: 'Aktiv',
  weeklyHours: 40, qualifications: [], assignedSiteIds: ['site-1'],
  hourlyRate: 18.5, dateOfJoining: '2024-01-01'
};

describe('EmployeesModule site assignments', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.state.employees = [];
    mocks.state.sites = sites;
    mocks.state.currentUserId = 'user-a';
    mocks.state.addEmployee = mocks.addEmployee;
    mocks.state.updateEmployee = mocks.updateEmployee;
    mocks.addEmployee.mockResolvedValue(true);
    mocks.updateEmployee.mockResolvedValue(true);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  async function setField(label: string, value: string): Promise<void> {
    const field = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    if (!field) throw new Error(`Missing field: ${label}`);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')?.set;
      setter?.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  test('create submits selected assignedSiteIds to the employee store action', async () => {
    await act(async () => root.render(<EmployeesModule />));
    const create = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Mitarbeiter anlegen'));
    await act(async () => create?.click());

    const site = container.querySelector<HTMLInputElement>('input[aria-label="Standort Hauptwache"]');
    await act(async () => site?.click());
    await setField('Personalnummer', 'MA-NEW-1');
    await setField('Vorname', 'Erika');
    await setField('Nachname', 'Muster');
    await setField('E-Mail', 'erika@example.test');
    await setField('Telefon', '+49 30 123');

    const save = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'Speichern');
    await act(async () => save?.click());

    expect(mocks.addEmployee).toHaveBeenCalledWith(expect.objectContaining({
      personnelNumber: 'MA-NEW-1',
      assignedSiteIds: ['site-1']
    }));
  });

  test('edit loads and submits changed assignedSiteIds', async () => {
    mocks.state.employees = [{
      id: 'employee-1', tenantId: 'tenant-a', personnelNumber: 'MA-1',
      firstName: 'Erika', lastName: 'Muster', email: 'erika@example.test',
      phone: '+49 30 123', role: 'Wachdienstmitarbeiter', status: 'Aktiv',
      weeklyHours: 40, qualifications: [], assignedSiteIds: ['site-1'],
      hourlyRate: 18.5, dateOfJoining: '2024-01-01'
    }];
    await act(async () => root.render(<EmployeesModule />));
    const edit = container.querySelector<HTMLButtonElement>('button[title="Bearbeiten"]');
    await act(async () => edit?.click());

    expect(container.querySelector<HTMLInputElement>('input[aria-label="Standort Hauptwache"]')?.checked).toBe(true);
    const secondSite = container.querySelector<HTMLInputElement>('input[aria-label="Standort Bürogebäude"]');
    await act(async () => secondSite?.click());
    const save = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'Speichern');
    await act(async () => save?.click());

    expect(mocks.updateEmployee).toHaveBeenCalledWith('employee-1', expect.objectContaining({
      assignedSiteIds: ['site-1', 'site-2']
    }));
  });

  test('absence submission retains failed dates and resets the captured form only after confirmation', async () => {
    mocks.state.employees = [{ ...employee }];
    mocks.state.addAbsence.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await act(async () => root.render(<EmployeesModule />));
    const form = container.querySelector<HTMLInputElement>('input[name="employeeId"]')?.form;
    if (!form) throw new Error('Missing absence form');
    const dates = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="date"]'));
    await act(async () => {
      dates.forEach((input, index) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, `2026-12-0${index + 1}`);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    const reset = vi.spyOn(form, 'reset');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(reset).not.toHaveBeenCalled();
    expect(dates.map(input => input.value)).toEqual(['2026-12-01', '2026-12-02']);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('nicht bestätigt');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(reset).toHaveBeenCalledOnce();
    expect(mocks.state.addAbsence).toHaveBeenLastCalledWith(employee.id, expect.objectContaining({
      type: 'Urlaub', startDate: '2026-12-01', endDate: '2026-12-02'
    }));
    expect(dates.map(input => input.value)).toEqual(['', '']);
  });

  test('qualification submission retains a failed draft and clears it only after confirmation', async () => {
    mocks.state.employees = [{ ...employee }];
    mocks.state.addQualification.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await act(async () => root.render(<EmployeesModule />));
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Qualifikation Mitarbeiter"]');
    if (!select) throw new Error('Missing qualification selector');
    await act(async () => {
      select.value = QualificationType.GEWO_34A_SACHKUNDE;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const certificate = container.querySelector<HTMLInputElement>('input[placeholder="Nachweis-Nr."]');
    const form = certificate?.form;
    if (!certificate || !form) throw new Error('Missing qualification form');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(certificate, 'Private certificate');
      certificate.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(certificate.isConnected).toBe(true);
    expect(certificate.value).toBe('Private certificate');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('nicht bestätigt');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(certificate.isConnected).toBe(false);
    expect(mocks.state.addQualification).toHaveBeenLastCalledWith(employee.id, expect.objectContaining({
      certificateNumber: 'Private certificate'
    }));
  });

  test('uncontrolled absence drafts and delayed reset are isolated across identities', async () => {
    mocks.state.employees = [{ ...employee }];
    let resolve!: (saved: boolean) => void;
    mocks.state.addAbsence.mockReturnValueOnce(new Promise<boolean>(done => { resolve = done; }));
    await act(async () => root.render(<EmployeesModule />));
    const oldForm = container.querySelector<HTMLInputElement>('input[name="employeeId"]')?.form;
    if (!oldForm) throw new Error('Missing old absence form');
    const oldDate = oldForm.querySelector<HTMLInputElement>('input[name="startDate"]');
    if (!oldDate) throw new Error('Missing old start date');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(oldDate, '2026-12-01');
      oldForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    mocks.state.currentUserId = 'user-b';
    await act(async () => root.render(<EmployeesModule />));
    expect(oldForm.isConnected).toBe(false);
    const currentForm = container.querySelector<HTMLInputElement>('input[name="employeeId"]')?.form;
    const currentDate = currentForm?.querySelector<HTMLInputElement>('input[name="startDate"]');
    if (!currentForm || !currentDate) throw new Error('Missing current absence form');
    expect(currentDate.value).toBe('');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(currentDate, '2026-12-10');
      resolve(true);
    });
    expect(currentDate.value).toBe('2026-12-10');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  test('editing a qualification without expiry preserves rejection and submits a genuine nullable expiry', async () => {
    mocks.state.employees = [{
      ...employee, qualifications: [{
        id: 'qualification-1', type: QualificationType.GEWO_34A_SACHKUNDE,
        certificateNumber: 'Existing certificate', issueDate: '2026-01-01',
        expiryDate: null, verified: false
      }]
    }];
    mocks.state.updateQualification.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await act(async () => root.render(<EmployeesModule />));
    const edit = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Bearbeiten');
    await act(async () => edit?.click());
    const certificate = container.querySelector<HTMLInputElement>('input[aria-label="Nachweisnummer bearbeiten"]');
    const expiry = container.querySelector<HTMLInputElement>('input[aria-label="Ablaufdatum bearbeiten"]');
    const form = certificate?.form;
    if (!certificate || !expiry || !form) throw new Error('Missing qualification editor');
    expect(expiry.required).toBe(false);
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(certificate.isConnected).toBe(true);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('nicht bestätigt');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(certificate.isConnected).toBe(false);
    expect(mocks.state.updateQualification).toHaveBeenLastCalledWith(employee.id, 'qualification-1', expect.objectContaining({
      certificateNumber: 'Existing certificate', expiryDate: null
    }));
  });
});
