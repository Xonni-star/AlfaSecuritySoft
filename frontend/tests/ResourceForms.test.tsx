import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Client, Site } from '../types';

const state = vi.hoisted(() => ({
  clients: [] as Client[],
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
  getTenantSites: vi.fn<() => Site[]>(() => []),
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
    for (const { save } of resources) save.mockReset();
    state.updateClient.mockReset();
    state.updateSite.mockReset();
    state.currentUserId = 'user-a';
    state.clients = [];
    state.getTenantSites.mockReturnValue([]);
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

  async function fill(label: string, value: string) {
    const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`input[aria-label="${label}"], textarea[aria-label="${label}"]`);
    if (!input) throw new Error(`Missing editable metadata: ${label}`);
    await act(async () => {
      const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  test('customer creation submits explicitly entered contract identifiers and terms instead of fictional dates', async () => {
    state.addClient.mockResolvedValueOnce(false);
    await act(async () => root.render(<ClientsModule />));
    const { form } = await openForm('Mandant hinzufügen', 'Actual customer');
    expect(container.querySelector<HTMLInputElement>('input[aria-label="Vertragsende"]')?.value).toBe('');
    await fill('Kundennummer', 'ACTUAL-2026-412');
    await fill('Vertragsbeginn', '2026-02-14');
    await fill('Vertragsende', '2027-03-15');
    await fill('Kündigungsfrist in Monaten', '6');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(state.addClient).toHaveBeenCalledWith(expect.objectContaining({
      clientNumber: 'ACTUAL-2026-412', contractStart: '2026-02-14', contractEnd: '2027-03-15',
      contractAutoRenew: false, noticePeriodMonths: 6, assignedSiteCount: 0
    }));
  });

  const existingClient: Client = {
    id: 'customer-a', tenantId: 'tenant-a', companyName: 'Existing customer', clientNumber: 'ACTUAL-1',
    contactPerson: 'Actual contact', email: 'contact@example.test', phone: '12345', address: 'Actual street',
    contractStart: '2026-02-14', contractEnd: '2027-03-15', contractAutoRenew: false,
    noticePeriodMonths: 6, slaLevel: 'Silber (Revierdienst)', billingStatus: 'Regulär', assignedSiteCount: 0
  };
  const existingSite: Site = {
    id: 'site-a', tenantId: 'tenant-a', clientId: existingClient.id, clientName: existingClient.companyName,
    siteCode: 'ACTUAL-SITE', name: 'Existing site', address: 'Actual street', securityLevel: 'Mittel',
    requiredGuardsDay: 4, requiredGuardsNight: 3, alarmSystem: 'Actual alarm equipment',
    accessRules: 'Actual access rules', timeZone: 'Europe/Berlin', siteManagerId: '', siteManagerName: '',
    instructionsCount: 0, activeAlarms: 0, checkpoints: []
  };

  test('customer editing preserves actual contract terms and submits explicit changes', async () => {
    state.clients = [existingClient];
    state.updateClient.mockResolvedValueOnce(false);
    await act(async () => root.render(<ClientsModule />));
    const edit = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Bearbeiten');
    await act(async () => edit?.click());
    expect(container.querySelector<HTMLInputElement>('input[aria-label="Vertragsbeginn"]')?.value).toBe('2026-02-14');
    await fill('Kündigungsfrist in Monaten', '9');
    const form = container.querySelector('form');
    if (!form) throw new Error('Missing customer editor');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(state.updateClient).toHaveBeenCalledWith(existingClient.id, expect.objectContaining({
      clientNumber: 'ACTUAL-1', contractStart: '2026-02-14', contractEnd: '2027-03-15',
      contractAutoRenew: false, noticePeriodMonths: 9
    }));
  });

  test('site creation submits explicit operational requirements without fictional management or equipment', async () => {
    state.addSite.mockResolvedValueOnce(false);
    await act(async () => root.render(<SitesModule />));
    const { form } = await openForm('Objekt anlegen', 'ACTUAL-SITE');
    await fill('Wachkräfte tagsüber', '4');
    await fill('Wachkräfte nachts', '3');
    await fill('Alarmanlage', 'Actual alarm equipment');
    await fill('Zutrittsregeln', 'Actual access rules');
    await fill('Zeitzone', 'Europe/Berlin');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(state.addSite).toHaveBeenCalledWith(expect.objectContaining({
      requiredGuardsDay: 4, requiredGuardsNight: 3, alarmSystem: 'Actual alarm equipment',
      accessRules: 'Actual access rules', timeZone: 'Europe/Berlin',
      siteManagerId: '', siteManagerName: 'Nicht zugewiesen', instructionsCount: 0
    }));
  });

  test('site editing retains actual operational requirements instead of replacing them with creation defaults', async () => {
    state.getTenantSites.mockReturnValue([existingSite]);
    state.updateSite.mockResolvedValueOnce(false);
    await act(async () => root.render(<SitesModule />));
    const edit = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Bearbeiten');
    await act(async () => edit?.click());
    expect(container.querySelector<HTMLInputElement>('input[aria-label="Wachkräfte tagsüber"]')?.value).toBe('4');
    const form = container.querySelector('form');
    if (!form) throw new Error('Missing site editor');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(state.updateSite).toHaveBeenCalledWith(existingSite.id, expect.objectContaining({
      requiredGuardsDay: 4, requiredGuardsNight: 3, alarmSystem: 'Actual alarm equipment',
      accessRules: 'Actual access rules', timeZone: 'Europe/Berlin'
    }));
  });

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
