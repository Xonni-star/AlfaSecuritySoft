import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { KeyItem } from '../types';

const state = vi.hoisted(() => ({
  keys: [] as KeyItem[],
  employees: [] as Array<{ id: string; firstName: string; lastName: string; personnelNumber: string }>,
  currentTenantId: 'tenant-a',
  currentUserId: 'user-a',
  authUser: null,
  issueKey: vi.fn(),
  returnKey: vi.fn()
}));
vi.mock('../store', () => ({ useSecurityStore: () => state }));
import { KeysModule } from '../components/KeysModule';

describe('KeysModule confirmed persistence', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const setDate = (input: HTMLInputElement, value: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const button = (text: string) => {
    const result = Array.from(container.querySelectorAll('button')).find(item => item.textContent?.trim() === text);
    if (!result) throw new Error(`Button fehlt: ${text}`);
    return result;
  };
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.resetAllMocks();
    state.currentTenantId = 'tenant-a';
    state.currentUserId = 'user-a';
    state.employees = [];
    state.keys = [{
      id: 'key-a', tenantId: 'tenant-a', siteId: 'site-a', siteName: 'Objekt A',
      keyNumber: 'K-1', label: 'Tresorschlüssel', type: 'Transponder', status: 'Im Tresor'
    }];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  test('uses the displayed recipient after hydration and preserves the form until confirmation', async () => {
    let resolve!: (saved: boolean) => void;
    state.issueKey.mockReturnValueOnce(new Promise<boolean>(done => { resolve = done; }));
    await act(async () => root.render(<KeysModule />));
    state.employees = [{ id: 'employee-a', firstName: 'Ada', lastName: 'Guard', personnelNumber: 'E-1' }];
    await act(async () => root.render(<KeysModule />));
    await act(async () => button('Ausgeben').click());
    const date = container.querySelector<HTMLInputElement>('input[type="datetime-local"]');
    if (!date) throw new Error('Rückgabezeit fehlt');
    expect(date.value).toBe('');
    await act(async () => setDate(date, '2027-01-10T18:00'));
    await act(async () => button('Ausgabe buchen').click());
    expect(state.issueKey).toHaveBeenCalledWith('key-a', 'Ada Guard', 'employee-a', '2027-01-10T18:00');
    expect(button('Ausgabe buchen').disabled).toBe(true);
    expect(container.querySelector('form')).not.toBeNull();
    await act(async () => resolve(false));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('nicht bestätigt');
    expect(date.value).toBe('2027-01-10T18:00');
    state.issueKey.mockResolvedValueOnce(true);
    await act(async () => button('Ausgabe buchen').click());
    expect(container.querySelector('form')).toBeNull();
  });

  test('shows failed returns and permits a retry without claiming success', async () => {
    state.keys[0] = { ...state.keys[0], status: 'Ausgegeben' };
    state.returnKey.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await act(async () => root.render(<KeysModule />));
    await act(async () => button('Rücknahme bestätigen').click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('nicht bestätigt');
    await act(async () => button('Rücknahme bestätigen').click());
    expect(state.returnKey).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  test('clears private form state when the active identity changes', async () => {
    await act(async () => root.render(<KeysModule />));
    await act(async () => button('Ausgeben').click());
    state.currentUserId = 'user-b';
    await act(async () => root.render(<KeysModule />));
    expect(container.querySelector('form')).toBeNull();
    expect(state.issueKey).not.toHaveBeenCalled();
  });
});
