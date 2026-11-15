import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: {
    currentUserName: 'Test User',
    currentUserRole: 'Einsatzleitung',
    activeTab: 'dashboard',
    isOnline: true,
    authUser: { permissions: ['patrol:read', 'users:read'] },
    getCurrentTenant: vi.fn(() => ({ name: 'Test Tenant' })),
    getTenantGuardBook: vi.fn(() => []),
    getTenantShifts: vi.fn(() => []),
    getTenantTasks: vi.fn(() => []),
    getTenantKeys: vi.fn(() => []),
    getTenantDocuments: vi.fn(() => []),
    setActiveTab: vi.fn(),
    toggleNetworkSimulation: vi.fn()
  }
}));

vi.mock('../store', () => ({
  useSecurityStore: () => mocks.state
}));

vi.mock('../components/MobileMyDuty', () => ({
  MobileMyDuty: () => <div data-testid="mobile-duty-view" />
}));
vi.mock('../components/MobilePatrolScanner', () => ({
  MobilePatrolScanner: () => <div data-testid="mobile-patrol-view" />
}));
vi.mock('../components/MobileShiftHandover', () => ({
  MobileShiftHandover: () => <div data-testid="mobile-handover-view" />
}));
vi.mock('../components/GuardBookModule', () => ({
  GuardBookModule: () => <div data-testid="mobile-guardbook-view" />
}));
vi.mock('../components/SOPModule', () => ({
  SOPModule: () => <div data-testid="mobile-sop-view" />
}));
vi.mock('../components/TasksModule', () => ({
  TasksModule: () => <div data-testid="mobile-tasks-view" />
}));
vi.mock('../components/AlarmsModule', () => ({
  AlarmsModule: () => <div data-testid="mobile-alarms-view" />
}));

import { MobileAppShell } from '../components/MobileAppShell';
import { Sidebar } from '../components/Sidebar';

describe('navigation accessibility', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.state.activeTab = 'dashboard';
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  test('mobile home actions are named, keyboard-focusable buttons that activate their view', async () => {
    await act(async () => root.render(<MobileAppShell />));

    const dutyCard = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Mein Dienst'));
    expect(dutyCard?.tagName).toBe('BUTTON');
    expect(dutyCard?.textContent).toContain('Mein Dienst');
    expect(dutyCard?.tabIndex).toBe(0);
    expect(dutyCard?.className).toContain('focus-visible:ring');

    dutyCard?.focus();
    expect(document.activeElement).toBe(dutyCard);
    await act(async () => dutyCard?.click());
    expect(container.querySelector('[data-testid="mobile-duty-view"]')).not.toBeNull();
  });

  test('mobile navigation has a name and announces the active destination', async () => {
    await act(async () => root.render(<MobileAppShell />));

    const nav = container.querySelector('nav[aria-label="Mobile Navigation"]');
    expect(nav).not.toBeNull();
    expect(nav?.querySelector('button[aria-current="page"]')?.textContent).toContain('Home');

    const dutyButton = Array.from(nav?.querySelectorAll('button') ?? [])
      .find((button) => button.textContent?.includes('Dienst'));
    await act(async () => dutyButton?.click());

    expect(nav?.querySelector('button[aria-current="page"]')).toBe(dutyButton);
    expect(dutyButton?.getAttribute('aria-current')).toBe('page');
  });

  test('sidebar navigation is named and marks the active page', async () => {
    await act(async () => root.render(<Sidebar />));

    const nav = container.querySelector('nav[aria-label="Hauptnavigation"]');
    expect(nav).not.toBeNull();
    const activeButton = nav?.querySelector('button[aria-current="page"]');
    expect(activeButton?.textContent).toContain('Einsatz-Dashboard');
    expect(activeButton?.className).toContain('focus-visible:ring');
  });
});
