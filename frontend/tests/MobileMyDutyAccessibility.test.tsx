import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: {
    getTenantShifts: vi.fn(() => [{
      id: 'shift-1',
      employeeId: 'employee-1',
      employeeName: 'Alex Alt',
      siteId: 'site-1',
      siteName: 'Objekt Nord',
      date: '2026-11-15',
      startTime: '08:00',
      endTime: '16:00',
      type: 'Pforte',
      status: 'Geplant'
    }]),
    getTenantSites: vi.fn(() => [{ id: 'site-1', name: 'Objekt Nord', address: 'Hauptstraße 1' }]),
    getTenantEmployees: vi.fn(() => [
      { id: 'employee-1', firstName: 'Alex', lastName: 'Alt', role: 'Wachdienst' },
      { id: 'employee-2', firstName: 'Sam', lastName: 'Neu', role: 'Wachdienst' }
    ]),
    getTenantShiftSwaps: vi.fn(() => []),
    addShiftSwapRequest: vi.fn(),
    currentUserId: 'employee-1',
    currentUserName: 'Alex Alt',
    getCurrentTenant: vi.fn(() => ({ name: 'Test' }))
  }
}));

vi.mock('../store', () => ({
  useSecurityStore: () => mocks.state
}));

import { MobileMyDuty } from '../components/MobileMyDuty';

describe('MobileMyDuty accessibility', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

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

  test('shift-swap form is a touch-friendly dialog with trapped and restored keyboard focus', async () => {
    await act(async () => root.render(<MobileMyDuty />));

    const trigger = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Tausch anfragen'));
    expect(trigger?.className).toContain('min-h-11');
    await act(async () => trigger?.click());

    const dialog = container.querySelector('[role="dialog"]');
    const selector = dialog?.querySelector('select');
    const reason = dialog?.querySelector('input');
    const submit = Array.from(dialog?.querySelectorAll('button') ?? [])
      .find(button => button.textContent?.includes('Anfrage senden'));
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('shift-swap-dialog-title');
    expect(document.activeElement).toBe(selector);
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(selector?.className).toContain('min-h-11');
    expect(reason?.className).toContain('min-h-11');
    expect(submit?.className).toContain('min-h-11');

    await act(async () => {
      submit?.focus();
      submit?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(selector);

    await act(async () => {
      selector?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    });
    expect(document.activeElement).toBe(submit);

    await act(async () => {
      selector?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });
});
