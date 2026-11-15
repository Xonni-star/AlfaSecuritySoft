import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { apiClient } from '../services/apiClient';
import { IndexedDbService, offlineVault } from '../services/indexedDbService';
import { useSecurityStore } from '../store';

const tenantId = 'tenant-offline-test';
const userId = 'user-offline-test';

async function readAttachment(vault: IndexedDbService, id: string): Promise<unknown> {
  const db = await vault.init();
  return new Promise((resolve, reject) => {
    const request = db.transaction('attachments', 'readonly').objectStore('attachments').get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe('offline guardbook reconnect exercise', () => {
  let indexedDBDescriptor: PropertyDescriptor | undefined;
  let onlineDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.restoreAllMocks();
    indexedDBDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
    onlineDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    offlineVault.close();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: new IDBFactory()
    });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    useSecurityStore.setState({
      currentTenantId: tenantId,
      currentUserId: userId,
      authUser: {
        id: userId,
        email: 'offline@test.invalid',
        fullName: 'Offline Test',
        role: 'Wachdienstmitarbeiter',
        tenantId,
        tenantName: 'Offline Test',
        permissions: []
      },
      isAuthenticated: true,
      isOnline: true,
      syncQueue: [],
      guardBook: [],
      notifications: []
    });
  });

  afterEach(() => {
    offlineVault.close();
    vi.restoreAllMocks();
    if (indexedDBDescriptor) Object.defineProperty(globalThis, 'indexedDB', indexedDBDescriptor);
    else Reflect.deleteProperty(globalThis, 'indexedDB');
    if (onlineDescriptor) Object.defineProperty(navigator, 'onLine', onlineDescriptor);
    else Reflect.deleteProperty(navigator, 'onLine');
  });

  test('persists an offline entry and photo across reopen, then retries an unacknowledged mutation by its original ID', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    window.dispatchEvent(new Event('offline'));

    const entryId = await useSecurityStore.getState().addGuardBookEntry({
      siteId: 'site-offline-test',
      siteName: 'Testobjekt',
      guardId: 'guard-offline-test',
      guardName: 'Offline Test',
      category: 'Vorkommnis',
      priority: 'Normal',
      stage: 'Erfasst',
      title: 'Offline-Vorfall',
      description: 'Vorfall während eines simulierten Netzausfalls erfasst.',
      policeInvolved: false,
      resolved: false
    });
    const [queuedBeforeRestart] = await offlineVault.getOutbox(tenantId, 'guardbook', userId);
    await offlineVault.saveAttachment({
      id: `att-${entryId}`,
      tenantId,
      entityId: entryId,
      fileName: 'vorfall.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 5,
      blobData: 'data:image/jpeg;base64,cGhvdG8=',
      capturedAt: new Date().toISOString(),
      synced: false
    });

    const offlineResult = await useSecurityStore.getState().triggerManualSync();
    expect(offlineResult).toMatchObject({ success: 0, failed: 1, conflicts: 0 });

    offlineVault.close();
    const reopenedVault = new IndexedDbService();
    expect(await reopenedVault.getOutbox(tenantId, 'guardbook', userId)).toMatchObject([
      expect.objectContaining({
        id: queuedBeforeRestart.id,
        status: 'PENDING',
        payload: expect.objectContaining({ id: entryId, title: 'Offline-Vorfall', offlineCreated: true })
      })
    ]);
    expect(await readAttachment(reopenedVault, `att-${entryId}`)).toMatchObject({
      tenantId,
      entityId: entryId,
      blobData: 'data:image/jpeg;base64,cGhvdG8=',
      synced: false
    });
    reopenedVault.close();

    const serverReceipts = new Map<string, { clientUuid: string; status: string; serverId: string; serverVersion: number }>();
    let simulatedServerEffects = 0;
    const post = vi.spyOn(apiClient, 'post').mockImplementation(async (_endpoint, body) => {
      const mutation = body.mutations[0];
      let receipt = serverReceipts.get(mutation.clientUuid);
      if (!receipt) {
        simulatedServerEffects++;
        receipt = {
          clientUuid: mutation.clientUuid,
          status: 'SYNCED',
          serverId: 'simulated-server-entry',
          serverVersion: 1
        };
        serverReceipts.set(mutation.clientUuid, receipt);
        return [];
      }
      return [receipt];
    });

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    await vi.waitFor(async () => {
      expect(await offlineVault.getOutbox(tenantId, 'guardbook', userId)).toMatchObject([
        expect.objectContaining({
          id: queuedBeforeRestart.id,
          status: 'FAILED',
          retryable: true,
          errorMessage: 'Keine Synchronisationsquittung für diese Mutation erhalten; der Serverstatus ist ungeklärt.'
        })
      ]);
    });

    const retryResult = await useSecurityStore.getState().triggerManualSync({ retryFailed: true });
    expect(retryResult).toMatchObject({ success: 1, failed: 0, conflicts: 0 });
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls.map(([, body]) => body.mutations[0].clientUuid))
      .toEqual([queuedBeforeRestart.id, queuedBeforeRestart.id]);
    expect(simulatedServerEffects).toBe(1);
    expect(await offlineVault.getOutbox(tenantId, 'guardbook', userId)).toEqual([]);
    expect(post.mock.calls[0][1].mutations[0].payload).not.toHaveProperty('photo');
  });

  test('keeps a guardbook conflict visible instead of retrying it automatically', async () => {
    const mutation = {
      id: 'guardbook-conflict-mutation',
      tenantId,
      userId,
      entityType: 'guardbook' as const,
      action: 'CREATE' as const,
      payload: { title: 'Konfliktfall' },
      occurredAt: new Date().toISOString(),
      baseVersion: 1
    };
    await offlineVault.enqueueMutation(mutation);
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce([{
      clientUuid: mutation.id,
      status: 'CONFLICT',
      serverVersion: 2,
      conflictData: {
        serverVersion: 2,
        clientVersion: 1,
        serverPayload: { title: 'Servereintrag' },
        clientPayload: mutation.payload
      }
    }]);

    const result = await useSecurityStore.getState().triggerManualSync();

    expect(result).toMatchObject({ success: 0, failed: 0, conflicts: 1 });
    expect(await offlineVault.getOutbox(tenantId, 'guardbook', userId)).toMatchObject([
      expect.objectContaining({ id: mutation.id, status: 'CONFLICT' })
    ]);
    expect(useSecurityStore.getState().syncQueue).toMatchObject([
      expect.objectContaining({
        id: mutation.id,
        status: 'conflict',
        conflictDetails: expect.objectContaining({ serverVersion: 2, clientVersion: 1 })
      })
    ]);
    expect(await offlineVault.getPendingOutbox(tenantId, userId)).toEqual([]);
  });
});
