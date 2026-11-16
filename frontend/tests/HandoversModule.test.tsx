import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { OutboxMutation } from '../services/indexedDbService';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  enqueueMutation: vi.fn(),
  getOutbox: vi.fn(),
  triggerManualSync: vi.fn(),
  state: {
    authUser: {
      id: 'user-1', email: 'outgoing@example.test', tenantId: 'tenant-a',
      permissions: ['handovers:read', 'handovers:create']
    },
    currentTenantId: 'tenant-a',
    isOnline: false,
    isSyncing: false,
    triggerManualSync: vi.fn(),
    getTenantSites: vi.fn(),
    getTenantEmployees: vi.fn(),
    getTenantShifts: vi.fn(),
    getTenantDocuments: vi.fn()
  }
}));

vi.mock('../services/apiClient', () => ({
  apiClient: { get: mocks.get, post: mocks.post, patch: mocks.patch }
}));

vi.mock('../services/indexedDbService', () => ({
  offlineVault: { enqueueMutation: mocks.enqueueMutation, getOutbox: mocks.getOutbox }
}));

vi.mock('../store', () => ({
  useSecurityStore: (selector?: (state: typeof mocks.state) => unknown) =>
    selector ? selector(mocks.state) : mocks.state
}));

import { HandoversModule } from '../components/HandoversModule';

describe('HandoversModule', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const localRecord = (userId: string): OutboxMutation => ({
    id: `local-${userId}`, userId, tenantId: 'tenant-a', deviceId: 'device-1',
    entityType: 'handover', action: 'CREATE', payload: {}, occurredAt: new Date().toISOString(),
    baseVersion: 1, retryCount: 1, status: 'FAILED', errorMessage: `error-${userId}`
  });
  const persistedHandover = (id = 'handover-1', siteName = 'Objekt Nord') => ({
    id, siteId: 'site-1', siteName, occurredAt: '2026-11-13T06:00:00.000Z',
    generalText: '', incidents: '', importantNotes: '', safetyInformation: '',
    status: 'pending_handover_confirmation', revisionVersion: 7,
    clientMutationId: `create-${id}`, createdByUserId: 'creator-1', createdByName: 'Test',
    outgoingEmployeeId: 'employee-1', outgoingEmployeeName: 'Alex Alt',
    incomingEmployeeId: 'employee-2', incomingEmployeeName: 'Sam Neu',
    openTasksCount: 0, createdTasksCount: 0, documentCount: 0
  });

  function setDraft(value: string) {
    const field = container.querySelector<HTMLTextAreaElement>('form textarea');
    if (!field) throw new Error('Übergabeentwurf fehlt');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function setSearch(value: string) {
    const field = container.querySelector<HTMLInputElement>('input[aria-label="Übergaben durchsuchen"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function fieldValue(selector: string, value: string) {
    const field = container.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector);
    if (!field) throw new Error(`Missing field: ${selector}`);
    const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype
      : field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(field, value);
    field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  }

  function button(label: string) {
    const result = Array.from(container.querySelectorAll('button')).find(item => item.textContent?.trim() === label);
    if (!result) throw new Error(`Missing button: ${label}`);
    return result;
  }

  async function renderDetailWrites() {
    mocks.state.isOnline = true;
    mocks.state.authUser.permissions.push('handovers:update', 'handovers:tasks', 'handovers:confirm', 'handovers:manage', 'documents:read');
    mocks.state.getTenantDocuments.mockReturnValue([
      { id: 'document-1', title: 'Document one' }, { id: 'document-2', title: 'Document two' }
    ]);
    mocks.get.mockImplementation(async (path: string) => {
      if (path.includes('/dashboard')) return {};
      if (path.startsWith('/handovers?')) return {
        items: [persistedHandover(), persistedHandover('handover-2', 'Objekt Süd')], total: 2
      };
      if (path.includes('/events')) return { items: [] };
      return [];
    });
    await act(async () => root.render(<HandoversModule />));
  }

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.state.authUser = {
      id: 'user-1', email: 'outgoing@example.test', tenantId: 'tenant-a',
      permissions: ['handovers:read', 'handovers:create']
    };
    mocks.state.currentTenantId = 'tenant-a';
    mocks.state.isOnline = false;
    mocks.state.isSyncing = false;
    mocks.state.triggerManualSync = mocks.triggerManualSync;
    mocks.state.getTenantSites.mockReturnValue([{ id: 'site-1', name: 'Objekt Nord' }]);
    mocks.state.getTenantEmployees.mockReturnValue([
      { id: 'employee-1', firstName: 'Alex', lastName: 'Alt', email: 'outgoing@example.test' },
      { id: 'employee-2', firstName: 'Sam', lastName: 'Neu', email: 'incoming@example.test' }
    ]);
    mocks.state.getTenantShifts.mockReturnValue([]);
    mocks.state.getTenantDocuments.mockReturnValue([]);
    mocks.get.mockImplementation((path: string) => path.includes('/dashboard')
      ? Promise.resolve({
        today: 0, waiting_handover_confirmation: 0, waiting_takeover_acknowledgement: 0,
        open_handovers: 0, open_tasks: 0, overdue_tasks: 0
      })
      : Promise.resolve({ items: [], total: 0, limit: 50, offset: 0 }));
    mocks.enqueueMutation.mockResolvedValue({});
    mocks.getOutbox.mockReset().mockResolvedValue([]);
    mocks.triggerManualSync.mockResolvedValue({ success: 0, failed: 0, conflicts: 0 });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  test('offline handover is persisted to IndexedDB and never reported server-confirmed', async () => {
    await act(async () => root.render(<HandoversModule />));
    const create = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Neue Übergabe'));
    await act(async () => create?.click());
    const submit = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Übergabe lokal sichern'));
    await act(async () => submit?.click());

    expect(mocks.enqueueMutation).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      userId: 'user-1',
      entityType: 'handover',
      action: 'CREATE',
      payload: expect.objectContaining({
        siteId: 'site-1',
        outgoingEmployeeId: 'employee-1',
        incomingEmployeeId: 'employee-2'
      })
    }));
    expect(container.textContent).toContain('Offline in der IndexedDB gespeichert.');
    expect(container.textContent).toContain('Serverbestätigung steht noch aus.');
    expect(container.textContent).not.toContain('Serverseitig bestätigt');
    expect(mocks.triggerManualSync).not.toHaveBeenCalled();
  });

  test('read-only users do not receive a handover creation action', async () => {
    mocks.state.authUser.permissions = ['handovers:read'];
    await act(async () => root.render(<HandoversModule />));
    expect(Array.from(container.querySelectorAll('button')).some(button => button.textContent?.includes('Neue Übergabe'))).toBe(false);
  });

  test('confirmation sends the displayed handover revision to the API', async () => {
    const displayedHandover = {
      id: 'handover-1',
      siteId: 'site-1',
      siteName: 'Objekt Nord',
      occurredAt: '2026-11-13T06:00:00.000Z',
      generalText: '',
      incidents: '',
      importantNotes: '',
      safetyInformation: '',
      status: 'pending_handover_confirmation',
      revisionVersion: 7,
      clientMutationId: 'handover-create-1',
      createdByUserId: 'creator-1',
      createdByName: 'Test',
      outgoingEmployeeId: 'employee-1',
      outgoingEmployeeName: 'Alex Alt',
      isOutgoingAccount: true,
      incomingEmployeeId: 'employee-2',
      incomingEmployeeName: 'Sam Neu',
      isIncomingAccount: false,
      openTasksCount: 0,
      createdTasksCount: 0,
      documentCount: 0
    };
    mocks.state.authUser = {
      id: 'user-1', email: 'outgoing@example.test', tenantId: 'tenant-a',
      permissions: ['handovers:read', 'handovers:confirm']
    };
    mocks.state.isOnline = true;
    mocks.get.mockImplementation((path: string) => {
      if (path.includes('/dashboard')) return Promise.resolve({
        today: 0, waiting_handover_confirmation: 1, waiting_takeover_acknowledgement: 0,
        open_handovers: 1, open_tasks: 0, overdue_tasks: 0
      });
      if (path.startsWith('/handovers?')) return Promise.resolve({
        items: [displayedHandover], total: 1, limit: 50, offset: 0
      });
      if (path.endsWith('/tasks')) return Promise.resolve([]);
      if (path.includes('/events')) return Promise.resolve({ items: [] });
      return Promise.resolve([]);
    });
    mocks.post.mockResolvedValue({});

    await act(async () => {
      root.render(<HandoversModule />);
      await Promise.resolve();
      await Promise.resolve();
    });
    const confirmButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Übergabe bestätigen'));
    expect(confirmButton).toBeDefined();
    await act(async () => {
      confirmButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.post).toHaveBeenCalledWith('/handovers/handover-1/confirm', expect.objectContaining({
      expectedRevisionVersion: 7
    }));
  });

  test('shows linked current-version metadata and explicitly unavailable file metadata', async () => {
    mocks.state.isOnline = true;
    mocks.state.authUser.permissions.push('documents:read');
    mocks.get.mockImplementation(async (path: string) => {
      if (path.includes('/dashboard')) return {};
      if (path.startsWith('/handovers?')) return { items: [persistedHandover()], total: 1 };
      if (path.includes('/events')) return { items: [] };
      if (path.endsWith('/documents')) return [
        { id: 'document-current', title: 'Current version', mime_type: 'application/pdf', size_bytes: 20 },
        { id: 'document-missing', title: 'Metadata only', mime_type: null, size_bytes: null }
      ];
      return [];
    });
    await act(async () => root.render(<HandoversModule />));
    expect(container.textContent).toContain('Current version (application/pdf, 20 Bytes)');
    expect(container.textContent).toContain('Metadata only (Dateimetadaten nicht verfügbar)');
  });

  test.each(['edited', 'reopened'] as const)('a delayed local create cannot close or clear an %s creation draft', async change => {
    let finish!: (value: object) => void;
    mocks.enqueueMutation.mockReturnValueOnce(new Promise<object>(resolve => { finish = resolve; }));
    await act(async () => root.render(<HandoversModule />));
    await act(async () => button('Neue Übergabe').click());
    await act(async () => setDraft('submitted create'));
    await act(async () => button('Übergabe lokal sichern').click());
    if (change === 'reopened') {
      await act(async () => button('Neue Übergabe').click());
      await act(async () => button('Neue Übergabe').click());
    } else await act(async () => setDraft('new creation draft'));
    await act(async () => finish({}));
    expect(container.querySelector<HTMLTextAreaElement>('form textarea')?.value)
      .toBe(change === 'reopened' ? 'submitted create' : 'new creation draft');
    await act(async () => button('Übergabe lokal sichern').click());
    expect(container.querySelector('form')).toBeNull();
    expect(mocks.enqueueMutation).toHaveBeenCalledTimes(2);
  });

  test.each(['edit', 'task', 'note', 'document'] as const)('a delayed %s success retains a newer draft, which can then be saved normally', async kind => {
    await renderDetailWrites();
    let finish!: (value: object) => void;
    const pending = new Promise<object>(resolve => { finish = resolve; });
    if (kind === 'edit') mocks.patch.mockReturnValueOnce(pending);
    else mocks.post.mockReturnValueOnce(pending);
    if (kind === 'edit') await act(async () => button('Entwurf bearbeiten').click());
    const selector = kind === 'edit' ? 'form textarea'
      : kind === 'task' ? '[aria-label="Aufgabenbezeichnung"]'
        : kind === 'note' ? '[aria-label="Rückfrage oder Korrekturtext"]' : '[aria-label="DMS-Dokument auswählen"]';
    await act(async () => {
      fieldValue(selector, kind === 'document' ? 'document-1' : 'submitted draft');
      if (kind === 'task') fieldValue('[aria-label="Aufgabenzuständige Person"]', 'employee-1');
    });
    const submit = () => {
      if (kind === 'note' || kind === 'document') button(kind === 'note' ? 'Rückfrage' : 'Verknüpfen').click();
      else container.querySelector(selector)!.closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    };
    await act(async () => submit());
    if (kind === 'edit') {
      await act(async () => Array.from(container.querySelectorAll('button')).find(item => item.textContent?.includes('Objekt Süd'))!.click());
      await act(async () => button('Entwurf bearbeiten').click());
    }
    const newer = kind === 'document' ? 'document-2' : 'newer private draft';
    await act(async () => fieldValue(selector, newer));
    await act(async () => finish({}));
    expect(container.querySelector<HTMLInputElement>(selector)?.value).toBe(newer);
    expect(button('Hinzufügen').disabled).toBe(false);
    mocks.post.mockReset().mockResolvedValue({});
    mocks.patch.mockReset().mockResolvedValue({});
    await act(async () => submit());
    if (kind === 'edit') expect(container.querySelector(selector)).toBeNull();
    else expect(container.querySelector<HTMLInputElement>(selector)?.value).toBe('');
  });

  test('a note edited away and back remains a new draft after the old write completes', async () => {
    await renderDetailWrites();
    let finish!: (value: object) => void;
    mocks.post.mockReturnValueOnce(new Promise<object>(resolve => { finish = resolve; }));
    const selector = '[aria-label="Rückfrage oder Korrekturtext"]';
    await act(async () => fieldValue(selector, 'same text'));
    await act(async () => button('Rückfrage').click());
    await act(async () => fieldValue(selector, 'different text'));
    await act(async () => fieldValue(selector, 'same text'));
    await act(async () => finish({}));
    expect(container.querySelector<HTMLInputElement>(selector)?.value).toBe('same text');
  });

  test('a write from an earlier owner activation cannot clear a returned owner draft or release its pending write', async () => {
    await renderDetailWrites();
    let finishOld!: (value: object) => void;
    let finishNew!: (value: object) => void;
    mocks.post.mockReturnValueOnce(new Promise<object>(resolve => { finishOld = resolve; }))
      .mockReturnValueOnce(new Promise<object>(resolve => { finishNew = resolve; }));
    const selector = '[aria-label="Rückfrage oder Korrekturtext"]';
    await act(async () => fieldValue(selector, 'old activation draft'));
    await act(async () => button('Rückfrage').click());
    mocks.state.authUser = { ...mocks.state.authUser, id: 'user-2' };
    await act(async () => root.render(<HandoversModule />));
    mocks.state.authUser = { ...mocks.state.authUser, id: 'user-1' };
    await act(async () => root.render(<HandoversModule />));
    await act(async () => fieldValue(selector, 'returned owner draft'));
    await act(async () => button('Rückfrage').click());
    await act(async () => finishOld({}));
    const observed = {
      draft: container.querySelector<HTMLInputElement>(selector)?.value,
      busy: button('Hinzufügen').disabled
    };
    await act(async () => finishNew({}));
    expect(observed).toEqual({ draft: 'returned owner draft', busy: true });
  });

  test('lists only the current same-tenant owner local queue', async () => {
    const records = [localRecord('user-1'), localRecord('user-2')];
    mocks.getOutbox.mockImplementation(async (_tenant: string, _entity: string, owner?: string) =>
      records.filter(record => !owner || record.userId === owner));
    await act(async () => root.render(<HandoversModule />));
    expect(container.textContent).toContain('local-user-1');
    expect(container.textContent).not.toContain('local-user-2');
    expect(container.textContent).not.toContain('error-user-2');
    expect(mocks.getOutbox).toHaveBeenCalledWith('tenant-a', 'handover', 'user-1');
  });

  test.each(['success', 'failure'] as const)('ignores a previous owner delayed local-read %s', async outcome => {
    let finish!: (records: OutboxMutation[]) => void;
    let fail!: (error: Error) => void;
    mocks.getOutbox.mockReturnValueOnce(new Promise<OutboxMutation[]>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    }));
    await act(async () => root.render(<HandoversModule />));
    mocks.state.authUser = { ...mocks.state.authUser, id: 'user-2' };
    await act(async () => root.render(<HandoversModule />));
    await act(async () => {
      if (outcome === 'success') finish([localRecord('user-1')]);
      else fail(new Error('previous-owner-storage-error'));
    });
    expect(container.textContent).not.toContain('local-user-1');
    expect(container.textContent).not.toContain('previous-owner-storage-error');
    expect(mocks.getOutbox).toHaveBeenLastCalledWith('tenant-a', 'handover', 'user-2');
  });

  test('clears the previous owner queue while the new owner read is pending', async () => {
    mocks.getOutbox.mockResolvedValueOnce([localRecord('user-1')]);
    await act(async () => root.render(<HandoversModule />));
    expect(container.textContent).toContain('local-user-1');
    let finish!: (records: OutboxMutation[]) => void;
    mocks.getOutbox.mockReturnValueOnce(new Promise<OutboxMutation[]>(resolve => { finish = resolve; }));
    mocks.state.authUser = { ...mocks.state.authUser, id: 'user-2' };
    await act(async () => root.render(<HandoversModule />));
    const displayedPreviousOwner = container.textContent?.includes('local-user-1');
    await act(async () => finish([]));
    expect(displayedPreviousOwner).toBe(false);
  });

  test.each(['success', 'failure'] as const)('ignores a previous tenant delayed server list %s', async outcome => {
    let finish!: (value: { items: ReturnType<typeof persistedHandover>[]; total: number }) => void;
    let fail!: (error: Error) => void;
    const oldList = new Promise<{ items: ReturnType<typeof persistedHandover>[]; total: number }>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    });
    const normalGet = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/handovers?')) return mocks.state.currentTenantId === 'tenant-a'
        ? oldList : Promise.resolve({ items: [], total: 0 });
      if (path.endsWith('/tasks')) return Promise.resolve([]);
      return normalGet(path);
    });
    await act(async () => root.render(<HandoversModule />));
    mocks.state.currentTenantId = 'tenant-b';
    mocks.state.authUser = { ...mocks.state.authUser, id: 'user-2', tenantId: 'tenant-b' };
    await act(async () => root.render(<HandoversModule />));
    await act(async () => {
      if (outcome === 'success') finish({ items: [persistedHandover('old-a', 'OLD_PRIVATE_SITE')], total: 1 });
      else fail(new Error('old-list-error'));
    });
    expect(container.textContent).not.toContain('OLD_PRIVATE_SITE');
    expect(container.textContent).not.toContain('old-list-error');
  });

  test.each(['success', 'failure'] as const)('ignores a previous tenant delayed detail %s', async outcome => {
    const foreignIdRequests: string[] = [];
    let finish!: (value: Array<{ id: string; title: string; status: string; priority: string }>) => void;
    let fail!: (error: Error) => void;
    const oldTasks = new Promise<Array<{ id: string; title: string; status: string; priority: string }>>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    });
    const normalGet = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/handovers?')) return Promise.resolve({
        items: [persistedHandover(mocks.state.currentTenantId === 'tenant-a' ? 'old-a' : 'new-b', 'Current Site')], total: 1
      });
      if (path === '/handovers/old-a/tasks') {
        if (mocks.state.currentTenantId === 'tenant-a') return oldTasks;
        foreignIdRequests.push(path);
        return Promise.resolve([]);
      }
      if (path.endsWith('/tasks')) return Promise.resolve([]);
      return normalGet(path);
    });
    await act(async () => root.render(<HandoversModule />));
    mocks.state.currentTenantId = 'tenant-b';
    mocks.state.authUser = { ...mocks.state.authUser, id: 'user-2', tenantId: 'tenant-b' };
    await act(async () => root.render(<HandoversModule />));
    await act(async () => {
      if (outcome === 'success') finish([{ id: 'old-task', title: 'OLD_PRIVATE_TASK', status: 'open', priority: 'normal' }]);
      else fail(new Error('old-details-error'));
    });
    expect(container.textContent).not.toContain('OLD_PRIVATE_TASK');
    expect(container.textContent).not.toContain('old-details-error');
    expect(foreignIdRequests).toEqual([]);
  });

  test.each(['success', 'failure'] as const)('preserves the current owner draft after an old enqueue %s', async outcome => {
    let finish!: () => void;
    let fail!: (error: Error) => void;
    mocks.enqueueMutation.mockReturnValueOnce(new Promise<void>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    }));
    await act(async () => root.render(<HandoversModule />));
    const create = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Neue Übergabe'))!;
    await act(async () => create.click());
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    await act(async () => submit.click());
    expect(mocks.enqueueMutation).toHaveBeenCalledOnce();

    mocks.state.authUser = { ...mocks.state.authUser, id: 'user-2' };
    await act(async () => root.render(<HandoversModule />));
    const close = container.querySelector<HTMLButtonElement>('button[aria-label="Formular schließen"]');
    if (close) await act(async () => close.click());
    await act(async () => create.click());
    await act(async () => setDraft('CURRENT_OWNER_DRAFT'));
    await act(async () => {
      if (outcome === 'success') finish();
      else fail(new Error('old-enqueue-error'));
    });
    expect(container.querySelector<HTMLTextAreaElement>('form textarea')?.value).toBe('CURRENT_OWNER_DRAFT');
    expect(container.textContent).not.toContain('old-enqueue-error');
    expect(container.textContent).not.toContain('Offline in der IndexedDB gespeichert.');
  });

  test('clears an open private draft when the owner changes', async () => {
    await act(async () => root.render(<HandoversModule />));
    const create = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Neue Übergabe'))!;
    await act(async () => create.click());
    await act(async () => setDraft('OLD_OWNER_PRIVATE_DRAFT'));
    mocks.state.authUser = { ...mocks.state.authUser, id: 'user-2' };
    await act(async () => root.render(<HandoversModule />));
    expect(container.querySelector('form')).toBeNull();
    await act(async () => create.click());
    expect(container.querySelector<HTMLTextAreaElement>('form textarea')?.value).toBe('');
  });

  test('renders a stable populated form with real store-style fresh getter arrays', async () => {
    const sites = mocks.state.getTenantSites();
    let reads = 0;
    mocks.state.getTenantSites.mockImplementation(() => {
      if (++reads > 12) throw new Error('Repeated handover form render loop');
      return [...sites];
    });
    await act(async () => root.render(<HandoversModule />));
    const create = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Neue Übergabe'))!;
    await act(async () => create.click());
    expect(container.querySelector<HTMLSelectElement>('form select')?.value).toBe('site-1');
    expect(reads).toBeLessThan(12);
  });

  test.each([
    ['pending_handover_confirmation', 'isOutgoingAccount', 'Übergabe bestätigen', 'confirm'],
    ['pending_takeover_acknowledgement', 'isIncomingAccount', 'Übernahme bestätigen', 'acknowledge']
  ])('uses the mapped account for %s without employee-list visibility', async (status, accountFlag, label, action) => {
    mocks.state.authUser.permissions = ['handovers:read', 'handovers:confirm'];
    mocks.state.isOnline = true;
    mocks.state.getTenantEmployees.mockReturnValue([]);
    const handover = { ...persistedHandover(), status, [accountFlag]: true };
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/handovers?')) return Promise.resolve({ items: [handover], total: 1 });
      if (path.endsWith('/tasks')) return Promise.resolve([]);
      return Promise.resolve({ items: [] });
    });
    mocks.post.mockResolvedValue({});
    await act(async () => root.render(<HandoversModule />));
    const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent === label);
    expect(button).toBeDefined();
    await act(async () => button!.click());
    expect(mocks.post).toHaveBeenCalledWith(`/handovers/${handover.id}/${action}`, expect.objectContaining({
      expectedRevisionVersion: 7
    }));
  });

  test.each([
    ['pending_handover_confirmation', 'Übergabe bestätigen'],
    ['pending_takeover_acknowledgement', 'Übernahme bestätigen']
  ])('does not infer %s eligibility from equal contact emails', async (status, label) => {
    mocks.state.authUser.permissions = ['handovers:read', 'handovers:confirm'];
    mocks.state.isOnline = true;
    mocks.state.getTenantEmployees.mockReturnValue([
      { id: 'employee-1', email: mocks.state.authUser.email },
      { id: 'employee-2', email: mocks.state.authUser.email }
    ]);
    const handover = { ...persistedHandover(), status, isOutgoingAccount: false, isIncomingAccount: false };
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/handovers?')) return Promise.resolve({ items: [handover], total: 1 });
      if (path.endsWith('/tasks')) return Promise.resolve([]);
      return Promise.resolve({ items: [] });
    });
    await act(async () => root.render(<HandoversModule />));
    expect(Array.from(container.querySelectorAll('button')).some(item => item.textContent === label)).toBe(false);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  test.each(['success', 'failure'] as const)('keeps the newest list after returning to an earlier filter and an old %s', async outcome => {
    let finish!: (value: { items: ReturnType<typeof persistedHandover>[]; total: number }) => void;
    let fail!: (error: Error) => void;
    const oldList = new Promise<{ items: ReturnType<typeof persistedHandover>[]; total: number }>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    });
    const normalGet = mocks.get.getMockImplementation()!;
    let listReads = 0;
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/handovers?')) {
        if (++listReads === 1) return oldList;
        return Promise.resolve({
          items: [persistedHandover('current', path.includes('search=OTHER') ? 'MIDDLE_QUERY' : 'CURRENT_QUERY')], total: 1
        });
      }
      if (path.endsWith('/tasks')) return Promise.resolve([]);
      return normalGet(path);
    });
    await act(async () => root.render(<HandoversModule />));
    await act(async () => setSearch('OTHER'));
    await act(async () => setSearch(''));
    expect(container.textContent).toContain('CURRENT_QUERY');
    await act(async () => {
      if (outcome === 'success') finish({ items: [persistedHandover('old', 'OUTDATED_QUERY')], total: 1 });
      else fail(new Error('outdated-query-error'));
    });
    expect(container.textContent).toContain('CURRENT_QUERY');
    expect(container.textContent).not.toContain('OUTDATED_QUERY');
    expect(container.textContent).not.toContain('outdated-query-error');
  });

  test.each(['success', 'failure'] as const)('keeps the newest details after reselecting a record and an old %s', async outcome => {
    const currentTask = { id: 'current-task', title: 'CURRENT_DETAIL', status: 'open', priority: 'normal' };
    let finish!: (value: typeof currentTask[]) => void;
    let fail!: (error: Error) => void;
    const oldTasks = new Promise<typeof currentTask[]>((resolve, reject) => { finish = resolve; fail = reject; });
    const normalGet = mocks.get.getMockImplementation()!;
    let firstRecordReads = 0;
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/handovers?')) return Promise.resolve({
        items: [
          { ...persistedHandover('first'), area: 'First record' },
          { ...persistedHandover('second'), area: 'Second record' }
        ], total: 2
      });
      if (path === '/handovers/first/tasks') return ++firstRecordReads === 1 ? oldTasks : Promise.resolve([currentTask]);
      if (path.endsWith('/tasks')) return Promise.resolve([]);
      return normalGet(path);
    });
    await act(async () => root.render(<HandoversModule />));
    const select = (name: string) => Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes(name))!.click();
    await act(async () => select('Second record'));
    await act(async () => select('First record'));
    expect(container.textContent).toContain('CURRENT_DETAIL');
    await act(async () => {
      if (outcome === 'success') finish([{ ...currentTask, title: 'OUTDATED_DETAIL' }]);
      else fail(new Error('outdated-details-error'));
    });
    expect(container.textContent).toContain('CURRENT_DETAIL');
    expect(container.textContent).not.toContain('OUTDATED_DETAIL');
    expect(container.textContent).not.toContain('outdated-details-error');
  });

  test.each(['success', 'failure'] as const)('keeps a newer same-owner outbox read after an old %s', async outcome => {
    let finish!: (records: OutboxMutation[]) => void;
    let fail!: (error: Error) => void;
    mocks.getOutbox.mockReturnValueOnce(new Promise<OutboxMutation[]>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    }));
    await act(async () => root.render(<HandoversModule />));
    mocks.state.isSyncing = true;
    await act(async () => root.render(<HandoversModule />));
    expect(mocks.getOutbox).toHaveBeenCalledTimes(2);
    await act(async () => {
      if (outcome === 'success') finish([localRecord('user-1')]);
      else fail(new Error('outdated-local-error'));
    });
    expect(container.textContent).toContain('0 lokale Einträge');
    expect(container.textContent).not.toContain('local-user-1');
    expect(container.textContent).not.toContain('outdated-local-error');
  });

  test('an earlier write callback cannot reload the previous filter', async () => {
    let finish!: () => void;
    mocks.post.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
    mocks.state.authUser.permissions = ['handovers:read', 'handovers:confirm'];
    mocks.state.isOnline = true;
    const normalGet = mocks.get.getMockImplementation()!;
    const listRequests: string[] = [];
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/handovers?')) {
        listRequests.push(path);
        const current = path.includes('search=CURRENT');
        return Promise.resolve({
          items: [{ ...persistedHandover(current ? 'current' : 'old', current ? 'CURRENT_FILTER' : 'INITIAL_FILTER'), isOutgoingAccount: true }],
          total: 1
        });
      }
      if (path.endsWith('/tasks')) return Promise.resolve([]);
      return normalGet(path);
    });
    await act(async () => root.render(<HandoversModule />));
    const confirm = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Übergabe bestätigen')!;
    await act(async () => confirm.click());
    await act(async () => setSearch('CURRENT'));
    const requestsBeforeCompletion = listRequests.length;
    await act(async () => finish());
    expect(listRequests).toHaveLength(requestsBeforeCompletion);
    expect(container.textContent).toContain('CURRENT_FILTER');
    expect(container.textContent).not.toContain('INITIAL_FILTER');
  });
});
