import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  store: {
    currentUserRole: 'Einsatzleitung',
    setCurrentUserRole: vi.fn(),
    authUser: { tenantName: 'Echter Mandant', role: 'BrowserSOPReader', isSuperAdmin: false },
    notifications: [],
    getTenantNotificationDeliveries: vi.fn(() => []),
    tenants: [],
    currentTenantId: 'tenant-a',
    setCurrentTenantId: vi.fn(),
    isOnline: true,
    toggleNetworkSimulation: vi.fn(),
    syncQueue: [],
    theme: 'dark',
    toggleTheme: vi.fn(),
    activeTab: 'dashboard',
    setActiveTab: vi.fn(),
    logout: vi.fn()
  }
}));

vi.mock('../store', () => ({
  useSecurityStore: () => mocks.store
}));

import { Navbar } from '../components/Navbar';

describe('Navbar accessibility', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const onOpenGlobalSearch = vi.fn();

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  test('navigation and icon-only actions are keyboard-operable and named', async () => {
    await act(async () => root.render(
      <Navbar
        onOpenNotifications={vi.fn()}
        onOpenSyncManager={vi.fn()}
        onOpenModuleManager={vi.fn()}
        onOpenGlobalSearch={onOpenGlobalSearch}
      />
    ));

    const searchButtons = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Globale Suche öffnen"]');
    expect(searchButtons).toHaveLength(2);
    expect(Array.from(searchButtons).every(button => button.tabIndex === 0)).toBe(true);
    await act(async () => searchButtons[0].click());
    expect(onOpenGlobalSearch).toHaveBeenCalledOnce();

    const dashboard = container.querySelector<HTMLButtonElement>('button[aria-label="Zum Dashboard"]');
    expect(dashboard).not.toBeNull();
    await act(async () => dashboard?.click());
    expect(mocks.store.setActiveTab).toHaveBeenCalledWith('dashboard');
    expect(container.querySelector('button[aria-label="Wechseln zu Light Mode"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Online. Offline-Modus aktivieren"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('button[aria-label^="Offline-Synchronisierung öffnen"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label^="Benachrichtigungscenter öffnen"]')).not.toBeNull();
    expect(container.textContent).toContain('Echter Mandant');
    expect(container.querySelector('[aria-label="Sitzungsrolle"]')?.textContent).toBe('BrowserSOPReader');
    expect(container.querySelector('select')).toBeNull();
    expect(container.querySelector('select[aria-label="Mandant auswählen"]')).toBeNull();
    const logout = container.querySelector<HTMLButtonElement>('button[aria-label="Abmelden"]');
    expect(logout?.tabIndex).toBe(0);
    await act(async () => logout?.click());
    expect(mocks.store.logout).toHaveBeenCalledOnce();
  });
});
