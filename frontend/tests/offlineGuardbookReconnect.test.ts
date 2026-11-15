import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { apiClient } from '../services/apiClient';
import { IndexedDbService, offlineVault, type StoredAttachment } from '../services/indexedDbService';
import { useSecurityStore } from '../store';

const tenantId = 'tenant-offline-test';
const userId = 'user-offline-test';

async function readAttachment(vault: IndexedDbService, id: string): Promise<StoredAttachment | undefined> {
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
    const attachmentId = crypto.randomUUID();
    await offlineVault.saveAttachment({
      id: attachmentId,
      tenantId,
      userId,
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
    expect(await readAttachment(reopenedVault, attachmentId)).toMatchObject({
      tenantId,
      entityId: entryId,
      blobData: 'data:image/jpeg;base64,cGhvdG8=',
      synced: false
    });
    reopenedVault.close();

    const serverReceipts = new Map<string, { clientUuid: string; status: string; serverId: string; serverVersion: number }>();
    let simulatedServerEffects = 0;
    const upload = vi.spyOn(apiClient, 'uploadFile').mockResolvedValue({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      linked_entity_type: 'incident',
      linked_entity_id: entryId
    });
    const post = vi.spyOn(apiClient, 'post').mockImplementation(async (_endpoint, body) => {
      const mutation = body.mutations[0];
      let receipt = serverReceipts.get(mutation.clientUuid);
      if (!receipt) {
        simulatedServerEffects++;
        receipt = {
          clientUuid: mutation.clientUuid,
          status: 'SYNCED',
          serverId: entryId,
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
    expect(upload).toHaveBeenCalledOnce();
    expect(upload.mock.calls[0][3]).toEqual({ idempotencyKey: attachmentId });
    expect(await offlineVault.getOutbox(tenantId, 'guardbook', userId)).toEqual([]);
    expect(post.mock.calls[0][1].mutations[0].payload).not.toHaveProperty('photo');
  });

  test('recovers a lost attachment receipt after IndexedDB is reopened using the same idempotency key', async () => {
    const entryId = 'gb-legacy-local-id';
    const serverEntryId = crypto.randomUUID();
    const attachmentId = `att-${entryId}`;
    const mutationId = 'legacy-guardbook-mutation';
    await offlineVault.enqueueMutation({
      id: mutationId,
      tenantId,
      userId,
      entityType: 'guardbook',
      action: 'CREATE',
      payload: { id: entryId, title: 'Legacy offline entry', siteId: 'site-offline-test', guardId: 'guard-offline-test' },
      occurredAt: new Date().toISOString(),
      baseVersion: 1
    });
    await offlineVault.saveAttachment({
      id: attachmentId,
      tenantId,
      userId,
      entityId: entryId,
      fileName: 'vorfall.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 30,
      blobData: 'data:image/jpeg;base64,cGhvdG8=',
      capturedAt: new Date().toISOString(),
      synced: false
    });

    const acceptedDocuments = new Map<string, {
      id: string;
      tenant_id: string;
      linked_entity_type: string;
      linked_entity_id: string;
    }>();
    let serverDocumentCreates = 0;
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue([{
      clientUuid: mutationId,
      status: 'SYNCED',
      serverId: serverEntryId,
      serverVersion: 1
    }]);
    const upload = vi.spyOn(apiClient, 'uploadFile').mockImplementation(async (_endpoint, _file, _progress, options) => {
      const key = options?.idempotencyKey;
      if (!key) throw new Error('Idempotency key missing');
      let document = acceptedDocuments.get(key);
      if (!document) {
        serverDocumentCreates += 1;
        document = {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          linked_entity_type: 'incident',
          linked_entity_id: serverEntryId
        };
        acceptedDocuments.set(key, document);
        throw new Error('Response lost after durable server acceptance');
      }
      return document;
    });

    const firstAttempt = await useSecurityStore.getState().triggerManualSync();
    expect(firstAttempt).toMatchObject({ success: 1, failed: 1, conflicts: 0 });
    const pendingAttachment = await readAttachment(offlineVault, attachmentId);
    const persistedIdempotencyKey = pendingAttachment?.idempotencyKey;
    expect(pendingAttachment).toMatchObject({
      entityId: serverEntryId,
      synced: false,
      lastUploadError: 'Response lost after durable server acceptance',
      uploadRetryCount: 1,
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/i)
    });
    expect(post).toHaveBeenCalledTimes(1);

    offlineVault.close();
    await offlineVault.init();
    const recoveredAttempt = await useSecurityStore.getState().triggerManualSync();
    expect(recoveredAttempt).toMatchObject({ success: 0, failed: 0, conflicts: 0 });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls.map(([, , , options]) => options?.idempotencyKey)).toEqual([
      persistedIdempotencyKey,
      persistedIdempotencyKey
    ]);
    expect(upload.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      `/logbook/${serverEntryId}/attachments`,
      `/logbook/${serverEntryId}/attachments`
    ]);
    expect(serverDocumentCreates).toBe(1);
    expect(await readAttachment(offlineVault, attachmentId)).toMatchObject({
      synced: true,
      serverDocumentId: acceptedDocuments.get(persistedIdempotencyKey ?? '')?.id,
      lastUploadError: undefined
    });
    expect(await offlineVault.getPendingAttachments(tenantId, userId)).toEqual([]);
  });

  test('does not replay another same-tenant user’s or an ownerless legacy attachment after account switch', async () => {
    const ownerEntryId = crypto.randomUUID();
    const otherOwnerAttachmentId = crypto.randomUUID();
    const legacyAttachmentId = crypto.randomUUID();
    await offlineVault.saveAttachment({
      id: otherOwnerAttachmentId,
      tenantId,
      userId,
      entityId: ownerEntryId,
      fileName: 'user-a.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 5,
      blobData: 'data:image/jpeg;base64,cGhvdG8=',
      capturedAt: new Date().toISOString(),
      synced: false
    });
    await offlineVault.saveAttachment({
      id: legacyAttachmentId,
      tenantId,
      entityId: ownerEntryId,
      fileName: 'legacy.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 5,
      blobData: 'data:image/jpeg;base64,cGhvdG8=',
      capturedAt: new Date().toISOString(),
      synced: false
    });
    useSecurityStore.setState((state) => ({
      currentUserId: 'user-b',
      authUser: state.authUser ? { ...state.authUser, id: 'user-b', email: 'user-b@offline.test' } : null
    }));

    const upload = vi.spyOn(apiClient, 'uploadFile');
    const result = await useSecurityStore.getState().triggerManualSync();

    expect(result).toMatchObject({ success: 0, failed: 0, conflicts: 0 });
    expect(upload).not.toHaveBeenCalled();
    expect(await offlineVault.getPendingAttachments(tenantId, userId)).toHaveLength(1);
    expect(await offlineVault.getPendingAttachments(tenantId, 'user-b')).toEqual([]);
    expect(await readAttachment(offlineVault, otherOwnerAttachmentId)).toMatchObject({
      userId,
      synced: false
    });
    const ownerlessLegacyAttachment = await readAttachment(offlineVault, legacyAttachmentId);
    expect(ownerlessLegacyAttachment).toMatchObject({ synced: false });
    expect(ownerlessLegacyAttachment).not.toHaveProperty('userId');
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
