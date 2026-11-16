import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  clients: [],
  employees: [],
  sites: [],
  currentTenantId: 'tenant-a',
  currentUserId: 'user-a',
  authUser: null,
  addClient: vi.fn(),
  updateClient: vi.fn(),
  archiveClient: vi.fn(),
  addSite: vi.fn(),
  updateSite: vi.fn(),
  archiveSite: vi.fn(),
  restoreSite: vi.fn(),
  addEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  archiveEmployee: vi.fn(),
  restoreEmployee: vi.fn(),
  getTenantSites: vi.fn(() => []),
  getTenantClients: vi.fn(() => [{ id: 'customer-a', companyName: 'Resource customer', clientNumber: 'C-1' }]),
  getTenantEmployees: vi.fn(() => []),
  getTenantShifts: vi.fn(() => []),
  getTenantGuardBook: vi.fn(() => []),
  getTenantKeys: vi.fn(() => []),
  getTenantEmergencyPlans: vi.fn(() => []),
  getTenantDocuments: vi.fn(() => [])
}));

vi.mock('../store', () => ({ useSecurityStore: () => state }));
import { ClientsModule } from '../components/ClientsModule';
import { SitesModule } from '../components/SitesModule';
import { EmployeesModule } from '../components/EmployeesModule';

const resources = [
  { name: 'customer', Component: ClientsModule, open: 'Mandant hinzufügen', save: state.addClient },
  { name: 'site', Component: SitesModule, open: 'Objekt anlegen', save: state.addSite },
  { name: 'employee', Component: EmployeesModule, open: 'Mitarbeiter anlegen', save: state.addEmployee }
];

describe('Resource forms confirmed persistence', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    state.currentUserId = 'user-a';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function openForm(label: string, value: string) {
    const open = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === label);
    if (!open) throw new Error(`Missing create action: ${label}`);
    await act(async () => open.click());
    const form = container.querySelector('form');
    const input = form?.querySelector('input');
    if (!form || !input) throw new Error('Missing resource form');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return { form, input };
  }

  test.each(resources)('$name retains unconfirmed data, rejects duplicate submit and closes only after success', async ({ Component, open, save }) => {
    let resolve!: (saved: boolean) => void;
    save.mockReturnValueOnce(new Promise<boolean>(done => { resolve = done; }));
    await act(async () => root.render(<Component />));
    const { form, input } = await openForm(open, 'Private resource draft');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    const submit = Array.from(form.querySelectorAll('button')).find(button => button.type === 'submit');
    expect(submit?.disabled).toBe(true);
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(save).toHaveBeenCalledOnce();
    await act(async () => resolve(false));
    expect(form.isConnected).toBe(true);
    expect(input.value).toBe('Private resource draft');
    expect(form.querySelector('[role="alert"]')?.textContent).toContain('nicht bestätigt');
    save.mockResolvedValueOnce(true);
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(form.isConnected).toBe(false);
  });

  test.each(resources)('$name ignores an old identity completion without closing a new draft', async ({ Component, open, save }) => {
    let resolve!: (saved: boolean) => void;
    save.mockReturnValueOnce(new Promise<boolean>(done => { resolve = done; }));
    await act(async () => root.render(<Component />));
    const old = await openForm(open, 'Old private draft');
    await act(async () => old.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    state.currentUserId = 'user-b';
    await act(async () => root.render(<Component />));
    expect(old.form.isConnected).toBe(false);
    const current = await openForm(open, 'New private draft');
    await act(async () => resolve(true));
    expect(current.form.isConnected).toBe(true);
    expect(current.input.value).toBe('New private draft');
    expect(current.form.querySelector('[role="alert"]')).toBeNull();
  });
});
