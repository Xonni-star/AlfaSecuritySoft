import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  store: {} as any,
  getStorageEstimates: vi.fn()
}));

vi.mock('../store', () => ({
  useSecurityStore: vi.fn(() => mocks.store)
}));

vi.mock('../services/indexedDbService', () => ({
  offlineVault: {
    getStorageEstimates: mocks.getStorageEstimates,
    hasOwnerlessPendingAttachments: vi.fn(async () => false),
    getDeviceId: vi.fn(() => 'device-a')
  }
}));

import { SyncManagerModal } from '../components/SyncManagerModal';
import { offlineVault } from '../services/indexedDbService';

function shiftConflict(serverPayload?: Record<string, unknown>) {
  return {
    id: 'mutation-shift-a',
    tenantId: 'tenant-a',
    userId: 'user-a',
    entityType: 'shift',
    action: 'UPDATE',
    payload: { id: 'shift-a', startTime: '08:00' },
    createdAt: '2026-11-13T10:00:00.000Z',
    retryCount: 0,
    status: 'conflict',
    conflictDetails: {
      clientVersion: 1,
      serverVersion: 2,
      clientPayload: {
        id: 'shift-a',
        shift_date: '2026-11-14',
        start_time: '08:00',
        revision_version: 1
      },
      ...(serverPayload ? { serverPayload } : {})
    }
  };
}

describe('SyncManagerModal shift conflict snapshots', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.mocked(offlineVault.hasOwnerlessPendingAttachments).mockResolvedValue(false);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.getStorageEstimates.mockResolvedValue({
      usageBytes: 1000,
      quotaBytes: 100000,
      percentage: 1
    });
    mocks.store = {
      isOnline: true,
      currentTenantId: 'tenant-a',
      currentUserId: 'user-a',
      authUser: { id: 'user-a' },
      toggleNetworkSimulation: vi.fn(),
      syncQueue: [shiftConflict({
        id: 'shift-a',
        shift_date: '2026-11-14',
        start_time: '09:00',
        revision_version: 2
      })],
      triggerManualSync: vi.fn(),
      resolveConflict: vi.fn().mockResolvedValue(undefined),
      clearCompletedSyncs: vi.fn(),
      getCurrentTenant: () => ({ name: 'Tenant A' })
    };
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  async function click(label: string) {
    const button = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes(label));
    if (!button) throw new Error(`Missing sync action: ${label}`);
    await act(async () => button.click());
    return button;
  }

  test('starts actual manual synchronization immediately and waits for completion', async () => {
    vi.useFakeTimers();
    mocks.store.syncQueue = [{ ...shiftConflict(), status: 'pending' }];
    let finish!: () => void;
    mocks.store.triggerManualSync.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    const button = await click('Jetzt Synchronisieren');
    expect(mocks.store.triggerManualSync).toHaveBeenCalledWith({ retryFailed: true });
    expect(button.disabled).toBe(true);
    await act(async () => { finish(); });
    expect(button.disabled).toBe(false);
  });

  test('reports rejected manual synchronization and releases the pending button', async () => {
    vi.useFakeTimers();
    mocks.store.syncQueue = [{ ...shiftConflict(), status: 'pending' }];
    mocks.store.triggerManualSync.mockRejectedValueOnce(new Error('Manual outbox storage failure'));
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    const button = await click('Jetzt Synchronisieren');
    await act(async () => { await vi.advanceTimersByTimeAsync(650); });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Manual outbox storage failure');
    expect(button.disabled).toBe(false);
  });

  test('surfaces an explicit storage error result instead of treating zero sync counts as success', async () => {
    mocks.store.syncQueue = [{ ...shiftConflict(), status: 'pending' }];
    mocks.store.triggerManualSync.mockResolvedValueOnce({
      success: 0, failed: 0, conflicts: 0, error: 'Durable outbox unavailable'
    });
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    await click('Jetzt Synchronisieren');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Durable outbox unavailable');
  });

  test.each(['success', 'failure'])('does not apply an old conflict %s to a new identity selection', async outcome => {
    let finish!: () => void;
    let fail!: (error: Error) => void;
    mocks.store.resolveConflict.mockReturnValueOnce(new Promise<void>((resolve, reject) => {
      finish = resolve; fail = reject;
    }));
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    await click('Konflikt lösen');
    await click('Lokale Version durchsetzen');
    mocks.store.authUser = { id: 'user-b' };
    mocks.store.currentUserId = 'user-b';
    mocks.store.syncQueue = [{ ...mocks.store.syncQueue[0], id: 'new-conflict', userId: 'user-b' }];
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    await click('Warteschlange');
    await click('Konflikt lösen');
    await act(async () => {
      if (outcome === 'success') finish();
      else fail(new Error('Previous owner private conflict error'));
    });
    expect(container.textContent).toContain('Lokale Version durchsetzen');
    expect(container.textContent).not.toContain('Previous owner private conflict error');
  });

  test('ignores a previous tenant ownerless-attachment result after identity replacement', async () => {
    let finish!: (exists: boolean) => void;
    vi.mocked(offlineVault.hasOwnerlessPendingAttachments)
      .mockReturnValueOnce(new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce(false);
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    await click('IndexedDB Speicher');
    mocks.store.currentTenantId = 'tenant-b';
    mocks.store.currentUserId = 'user-b';
    mocks.store.authUser = { id: 'user-b' };
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    await act(async () => { finish(true); });
    expect(container.textContent).not.toContain('Ältere Wachbuchanhänge ohne sichere Zuordnung');
  });

  test('does not publish an old conflict error after closing and reopening the dialog', async () => {
    let fail!: (error: Error) => void;
    mocks.store.resolveConflict.mockReturnValueOnce(new Promise<void>((_resolve, reject) => { fail = reject; }));
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    await click('Konflikt lösen');
    await click('Lokale Version durchsetzen');
    await act(async () => root.render(<SyncManagerModal isOpen={false} onClose={vi.fn()} />));
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    await click('Warteschlange');
    await click('Konflikt lösen');
    await act(async () => { fail(new Error('Previous dialog conflict error')); });
    expect(container.textContent).not.toContain('Previous dialog conflict error');
  });

  test('shows the server snapshot before enabling shift conflict decisions', async () => {
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    const openConflict = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Konflikt lösen'));
    if (!openConflict) throw new Error('Konflikt öffnen fehlt');
    await act(async () => openConflict.click());

    expect(container.textContent).toContain('"shift_date": "2026-11-14"');
    expect(container.textContent).toContain('"start_time": "08:00"');
    expect(container.textContent).toContain('Revision 1');
    expect(container.textContent).toContain('Revision 2');
    expect(container.textContent).not.toContain('Konfliktauflösung ist gesperrt');
    const useLocal = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Lokale Version durchsetzen'));
    expect(useLocal?.disabled).toBe(false);
    await act(async () => useLocal?.click());
    expect(mocks.store.resolveConflict).toHaveBeenCalledWith('mutation-shift-a', 'USE_LOCAL');
  });

  test('blocks shift decisions when the server has not returned a snapshot', async () => {
    mocks.store.syncQueue = [shiftConflict()];
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    const openConflict = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Konflikt lösen'));
    if (!openConflict) throw new Error('Konflikt öffnen fehlt');
    await act(async () => openConflict.click());

    expect(container.textContent).toContain('Der Server hat noch keinen aktuellen Schicht-Snapshot geliefert.');
    const decisions = Array.from(container.querySelectorAll('button')).filter(button =>
      button.textContent?.includes('Lokale Version durchsetzen') ||
      button.textContent?.includes('Server-Stand übernehmen')
    );
    expect(decisions).toHaveLength(2);
    expect(decisions.every(button => button.disabled)).toBe(true);
    expect(mocks.store.resolveConflict).not.toHaveBeenCalled();
  });

  test('shows server rejection details and keeps failed items retryable', async () => {
    mocks.store.syncQueue = [{
      ...shiftConflict(),
      status: 'failed',
      errorMessage: 'HTTP 403: Fehlende Berechtigung'
    }];
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));

    expect(container.textContent).toContain('HTTP 403: Fehlende Berechtigung');
    const retry = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Jetzt Synchronisieren'));
    expect(retry?.disabled).toBe(false);
    expect(container.textContent).toContain('Warteschlange (1)');
  });

  test('does not present fabricated storage estimates when the browser lacks support', async () => {
    mocks.getStorageEstimates.mockResolvedValue(null);
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    const storageTab = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('IndexedDB Speicher'));
    await act(async () => storageTab?.click());

    expect(container.textContent).toContain('Dieser Browser stellt keine verlässliche Speicherbelegung bereit.');
    expect(container.textContent).not.toContain('1.19 MB');
  });

  test('does not expose metadata or recovery actions for ownerless attachments', async () => {
    vi.mocked(offlineVault.hasOwnerlessPendingAttachments).mockResolvedValue(true);
    await act(async () => root.render(<SyncManagerModal isOpen onClose={vi.fn()} />));
    const storageTab = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('IndexedDB Speicher'));
    await act(async () => storageTab?.click());

    expect(container.textContent).toContain('Ältere Wachbuchanhänge ohne sichere Zuordnung');
    expect(container.textContent).toContain('weder einsehbar noch exportierbar');
    expect(container.textContent).not.toContain('legacy.jpg');
    expect(container.textContent).not.toContain('legacy-local-entry');
    expect(Array.from(container.querySelectorAll('button')).some(button =>
      button.textContent?.includes('Sichern') || button.textContent?.includes('Verwerfen')
    )).toBe(false);
  });
});
