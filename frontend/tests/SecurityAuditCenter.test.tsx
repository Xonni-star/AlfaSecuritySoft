import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  getTenantAuditLogs: () => [],
  getCurrentTenant: () => ({ name: 'Testmandant', bwrRegisterId: 'Beispiel' }),
  activeSessions: [{
    id: 'example-device', deviceName: 'Beispielgerät', browser: 'Beispielbrowser',
    ipAddress: 'Nicht verifiziert', lastActivity: 'Beispiel', isCurrentSession: false,
    status: 'ACTIVE', mfaVerified: true
  }],
  gdprPolicies: [{
    id: 'example-policy', category: 'Beispielfrist', statutoryBasis: 'Nicht geprüft',
    retentionYears: 2, autoPurgeEnabled: true
  }],
  revokeSession: vi.fn()
}));
vi.mock('../store', () => ({ useSecurityStore: () => state }));
import { SecurityAuditCenter } from '../components/SecurityAuditCenter';

describe('SecurityAuditCenter evidence boundaries', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  function button(text: string) {
    const result = Array.from(container.querySelectorAll('button'))
      .find(item => item.textContent?.trim() === text);
    if (!result) throw new Error(`Button fehlt: ${text}`);
    return result;
  }
  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<SecurityAuditCenter />));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  test('labels local/example data and does not claim live RLS, MFA or immutable audit verification', () => {
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Beispieldaten und lokale UI-Ereignisse');
    expect(container.textContent).toContain('RLS-Livestatus: NICHT VERIFIZIERT');
    expect(container.textContent).toContain('Keine nachgewiesene Revisionssicherheit');
    expect(container.textContent).not.toContain('100% MFA verifiziert');
    expect(container.textContent).not.toContain('310k HMAC-SHA512 Salt');
  });

  test('does not simulate penetration-test execution or fabricate passing results', async () => {
    await act(async () => button('Sicherheitsprüfung (nicht angebunden)').click());
    const run = button('Keine Prüfsuite angebunden');
    expect(run.disabled).toBe(true);
    await act(async () => run.click());
    expect(container.textContent).toContain('Es wurde kein Test gestartet.');
    expect(container.textContent).not.toContain('SICHER (0 Leaks)');
  });

  test('cannot report remote revocation, retention or exports through unimplemented UI actions', async () => {
    await act(async () => button('Sitzungen & Geräte (Beispiele)').click());
    const revoke = button('Sitzungsverwaltung nicht angebunden');
    expect(revoke.disabled).toBe(true);
    await act(async () => revoke.click());
    expect(state.revokeSession).not.toHaveBeenCalled();
    await act(async () => button('DSGVO Lösch- & Aufbewahrungsfristen').click());
    expect(container.textContent).toContain('Automatische Bereinigung: nicht implementiert');
    expect(button('Auskunfts-Export nicht implementiert').disabled).toBe(true);
  });
});
