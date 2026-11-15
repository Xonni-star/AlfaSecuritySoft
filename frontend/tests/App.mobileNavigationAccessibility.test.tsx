import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: {
    activeTab: 'dashboard',
    theme: 'dark',
    authUser: { permissions: [] },
    isAuthenticated: true,
    setActiveTab: vi.fn(),
    restoreSession: vi.fn(async () => {}),
    isLoadingData: false,
    dataLoadError: null
  }
}));

vi.mock('../store', () => ({
  useSecurityStore: Object.assign(vi.fn(() => mocks.state), { setState: vi.fn() })
}));
vi.mock('../components/Navbar', () => ({
  Navbar: ({ onToggleMobileMenu }: { onToggleMobileMenu: () => void }) =>
    <button type="button" onClick={onToggleMobileMenu}>Open menu</button>
}));
vi.mock('../components/Sidebar', () => ({
  Sidebar: ({ onCloseMobileMenu }: { onCloseMobileMenu?: () => void }) =>
    <button type="button" onClick={onCloseMobileMenu}>Select destination</button>
}));
vi.mock('../components/SyncManagerModal', () => ({ SyncManagerModal: () => null }));
vi.mock('../components/ModuleManager', () => ({ ModuleManager: () => null }));
vi.mock('../components/GlobalSearchModal', () => ({ GlobalSearchModal: () => null }));
vi.mock('../components/NotificationCenterModal', () => ({ NotificationCenterModal: () => null }));
vi.mock('../components/LoginScreen', () => ({ LoginScreen: () => null }));
vi.mock('../components/Dashboard', () => ({ Dashboard: () => <div>Dashboard</div> }));

import App from '../App';

describe('App mobile navigation accessibility', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  test('traps focus, closes with Escape, and restores focus to the menu trigger', async () => {
    await act(async () => root.render(<App />));
    const trigger = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'Open menu');
    if (!trigger) throw new Error('Mobile menu trigger is missing');

    trigger.focus();
    await act(async () => trigger.click());
    const dialog = container.querySelector('[role="dialog"]');
    const closeButton = dialog?.querySelector<HTMLButtonElement>('[aria-label="Menü schließen"]');
    const destinationButton = Array.from(dialog?.querySelectorAll('button') ?? [])
      .find(button => button.textContent === 'Select destination');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(closeButton);

    await act(async () => {
      destinationButton?.focus();
      destinationButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(closeButton);

    await act(async () => {
      closeButton?.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true
      }));
    });
    expect(document.activeElement).toBe(destinationButton);

    await act(async () => {
      destinationButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test('closes after selecting a destination and restores trigger focus', async () => {
    await act(async () => root.render(<App />));
    const trigger = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'Open menu');
    trigger?.focus();
    await act(async () => trigger?.click());

    const destinationButton = container.querySelector<HTMLButtonElement>('[role="dialog"] button:last-child');
    await act(async () => destinationButton?.click());

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test('closes on backdrop click and restores trigger focus', async () => {
    await act(async () => root.render(<App />));
    const trigger = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'Open menu');
    trigger?.focus();
    await act(async () => trigger?.click());

    const backdrop = container.querySelector('[role="dialog"]')?.parentElement;
    if (!backdrop) throw new Error('Mobile menu backdrop is missing');
    await act(async () => backdrop.click());

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
