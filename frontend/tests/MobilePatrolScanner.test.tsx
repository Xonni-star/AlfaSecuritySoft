import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { OutboxMutation } from '../services/indexedDbService';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getOutbox: vi.fn(),
  getPatrolCheckpointCache: vi.fn(),
  getPatrolRounds: vi.fn(),
  savePatrolCheckpointCache: vi.fn(),
  state: {
    currentTenantId: 'tenant-a',
    currentUserId: 'user-a',
    currentUserName: 'Owner A',
    authUser: { id: 'user-a', permissions: [] },
    isOnline: false,
    getTenantSites: vi.fn(),
    getTenantPatrolScans: vi.fn(),
    addPatrolScan: vi.fn(),
    triggerManualSync: vi.fn()
  }
}));

vi.mock('../store', () => ({ useSecurityStore: () => mocks.state }));
vi.mock('../services/apiClient', () => ({
  apiClient: { get: mocks.get },
  ApiError: class extends Error {}
}));
vi.mock('../services/indexedDbService', () => ({
  offlineVault: {
    getOutbox: mocks.getOutbox,
    getPatrolCheckpointCache: mocks.getPatrolCheckpointCache,
    getPatrolRounds: mocks.getPatrolRounds,
    savePatrolCheckpointCache: mocks.savePatrolCheckpointCache
  }
}));

import { MobilePatrolScanner, isPatrolCheckpointRecentlyScanned, parsePatrolQrPayload } from '../components/MobilePatrolScanner';

describe('Mobile patrol scanner', () => {
  const now = Date.parse('2026-11-12T12:00:00.000Z');

  test('permits scanning a checkpoint again after the two-minute window', () => {
    expect(isPatrolCheckpointRecentlyScanned(
      [{ checkpointId: 'checkpoint-1', scannedAt: '2026-11-12T11:57:59.999Z' }],
      'checkpoint-1',
      now
    )).toBe(false);
  });

  describe('Mobile patrol owner-bound restore', () => {
    let container: HTMLDivElement;
    let root: ReturnType<typeof createRoot>;
    const checkpoint = { id: 'checkpoint-1', siteId: 'site-1', code: 'CP-1', name: 'Entrance', active: true };
    const route = {
      id: 'route-1', siteId: 'site-1', name: 'Route', currentVersion: 1,
      checkpoints: [{ checkpointId: 'checkpoint-1', code: 'CP-1', name: 'Entrance', sequence: 1, plannedOffsetMinutes: 0 }]
    };
    const mutation = (id: string, userId: string, payload: Record<string, unknown>): OutboxMutation => ({
      id, userId, tenantId: 'tenant-a', deviceId: 'device-1', entityType: 'patrol',
      action: 'CREATE', payload, occurredAt: new Date().toISOString(),
      baseVersion: 1, retryCount: 0, status: 'PENDING'
    });

    beforeEach(() => {
      vi.resetAllMocks();
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);
      Object.assign(mocks.state, {
        currentTenantId: 'tenant-a', currentUserId: 'user-a', currentUserName: 'Owner A',
        authUser: { id: 'user-a', permissions: [] }, isOnline: false
      });
      mocks.state.getTenantSites.mockReturnValue([{ id: 'site-1', name: 'Site', tenantId: 'tenant-a' }]);
      mocks.state.getTenantPatrolScans.mockReturnValue([]);
      mocks.state.triggerManualSync.mockResolvedValue({ success: 0, failed: 0, conflicts: 0 });
      mocks.getPatrolCheckpointCache.mockResolvedValue({ checkpoints: [checkpoint], routes: [route] });
      mocks.getPatrolRounds.mockResolvedValue([]);
      mocks.getOutbox.mockResolvedValue([]);
      mocks.savePatrolCheckpointCache.mockResolvedValue(undefined);
    });

    afterEach(async () => {
      await act(async () => root.unmount());
      container.remove();
    });

    test('restores only the current same-tenant owner round and progress', async () => {
      mocks.state.authUser.id = 'user-b';
      mocks.state.currentUserId = 'user-b';
      const records = [
        mutation('start-a', 'user-a', { recordType: 'round_start', siteId: 'site-1', roundId: 'foreign-round', routeId: 'route-1' }),
        mutation('scan-a', 'user-a', { recordType: 'scan', siteId: 'site-1', roundId: 'foreign-round', checkpointId: 'checkpoint-1' }),
        mutation('start-b', 'user-b', { recordType: 'round_start', siteId: 'site-1', roundId: 'owned-round', routeId: 'route-1' })
      ];
      mocks.getOutbox.mockImplementation(async (_tenant: string, _entity: string, owner?: string) =>
        records.filter(record => !owner || record.userId === owner));

      await act(async () => root.render(<MobilePatrolScanner />));

      expect(container.textContent).toContain('owned-ro');
      expect(container.textContent).not.toContain('foreign-');
      expect(container.textContent).toContain('0/1 Kontrollpunkte');
      expect(mocks.getOutbox).toHaveBeenCalledWith('tenant-a', 'patrol', 'user-b');
    });

    test('does not perform an unscoped restore without an owner', async () => {
      mocks.state.authUser.id = '';
      mocks.state.currentUserId = '';
      await act(async () => root.render(<MobilePatrolScanner />));
      expect(mocks.getOutbox).not.toHaveBeenCalled();
      expect(container.textContent).toContain('angemeldeten Benutzer und Mandanten');
    });

    test('clears the previous owner round and scans while the new owner restore is pending', async () => {
      mocks.getOutbox.mockResolvedValueOnce([
        mutation('start-a', 'user-a', { recordType: 'round_start', siteId: 'site-1', roundId: 'owned-round', routeId: 'route-1' }),
        mutation('scan-a', 'user-a', { recordType: 'scan', siteId: 'site-1', roundId: 'owned-round', checkpointId: 'checkpoint-1' })
      ]);
      await act(async () => root.render(<MobilePatrolScanner />));
      expect(container.textContent).toContain('owned-ro');
      expect(container.textContent).toContain('1/1 Kontrollpunkte');
      let finish!: (records: OutboxMutation[]) => void;
      mocks.getOutbox.mockReturnValueOnce(new Promise<OutboxMutation[]>(resolve => { finish = resolve; }));
      mocks.state.authUser = { id: 'user-b', permissions: [] };
      mocks.state.currentUserId = 'user-b';
      await act(async () => root.render(<MobilePatrolScanner />));
      const previousRoundVisible = container.textContent?.includes('owned-ro');
      const previousScanVisible = container.textContent?.includes('Kürzlich erfasst');
      await act(async () => finish([]));
      expect(previousRoundVisible).toBe(false);
      expect(previousScanVisible).toBe(false);
    });

    test('ignores a previous owner server scan after its delayed cache write', async () => {
      let finishCache!: () => void;
      mocks.state.isOnline = true;
      mocks.savePatrolCheckpointCache.mockReturnValue(new Promise<void>(resolve => { finishCache = resolve; }));
      mocks.get.mockImplementation(async (path: string) => {
        if (path.startsWith('/patrol/checkpoints')) return [checkpoint];
        if (path.startsWith('/patrol/routes')) return [route];
        if (path.startsWith('/patrol/rounds')) return [];
        if (path.startsWith('/patrol/scans')) return [{
          id: 'server-scan-a', site_id: 'site-1', checkpoint_id: 'checkpoint-1',
          guard_id: 'user-a', scanned_at: new Date().toISOString(), method: 'MANUELL'
        }];
        throw new Error(`Unexpected API request: ${path}`);
      });
      await act(async () => root.render(<MobilePatrolScanner />));
      expect(mocks.savePatrolCheckpointCache).toHaveBeenCalledOnce();

      mocks.state.authUser = { id: 'user-b', permissions: [] };
      mocks.state.currentUserId = 'user-b';
      mocks.state.currentUserName = 'Owner B';
      mocks.state.isOnline = false;
      await act(async () => root.render(<MobilePatrolScanner />));
      await act(async () => finishCache());

      const scan = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Manuell erfassen');
      expect(scan).toBeDefined();
      expect(scan?.disabled).toBe(false);
      expect(container.textContent).not.toContain('Kürzlich erfasst');
    });
  });

  test('blocks only scans of the same checkpoint within the two-minute window', () => {
    const scans = [
      { checkpointId: 'checkpoint-1', scannedAt: '2026-11-12T11:59:00.000Z' },
      { checkpointId: 'checkpoint-2', scannedAt: '2026-11-12T11:59:30.000Z' }
    ];

    expect(isPatrolCheckpointRecentlyScanned(scans, 'checkpoint-1', now)).toBe(true);
    expect(isPatrolCheckpointRecentlyScanned(scans, 'checkpoint-3', now)).toBe(false);
  });

  test('parses only versioned QR tokens with site, checkpoint and random credential', () => {
    const token = 'A'.repeat(43);
    expect(parsePatrolQrPayload(
      `secops:patrol:v1:11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222:${token}`
    )).toEqual({
      siteId: '11111111-1111-4111-8111-111111111111',
      checkpointId: '22222222-2222-4222-8222-222222222222',
      token
    });
    expect(parsePatrolQrPayload('CP-01')).toBeNull();
    expect(parsePatrolQrPayload(
      `secops:patrol:v1:11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222:guessable`
    )).toBeNull();
  });
});
