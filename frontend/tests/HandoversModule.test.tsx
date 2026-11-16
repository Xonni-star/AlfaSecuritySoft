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
      incomingEmployeeId: 'employee-2',
      incomingEmployeeName: 'Sam Neu',
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
});
