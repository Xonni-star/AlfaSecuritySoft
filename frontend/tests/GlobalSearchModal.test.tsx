import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  store: {
    performGlobalSearch: vi.fn(),
    setActiveTab: vi.fn()
  }
}));

vi.mock('../store', () => ({
  useSecurityStore: () => mocks.store
}));

import { GlobalSearchModal } from '../components/GlobalSearchModal';

describe('GlobalSearchModal accessibility', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let trigger: HTMLButtonElement;
  const onClose = vi.fn();

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.store.performGlobalSearch.mockReturnValue([{
      id: 'customer-1',
      title: 'Example customer',
      subtitle: 'Customer number EX-1',
      category: 'Kunde',
      targetTab: 'clients'
    }]);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    trigger.remove();
  });

  test('exposes a labeled modal and keyboard-operable search results', async () => {
    await act(async () => root.render(<GlobalSearchModal isOpen onClose={onClose} />));

    const dialog = container.querySelector('[role="dialog"]');
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Globale Suche"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('global-search-dialog-title');
    expect(document.activeElement).toBe(input);

    if (!input) throw new Error('Search input is missing');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
      setter?.call(input, 'ex');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const result = container.querySelector<HTMLButtonElement>('button[type="button"]:not([aria-label])');
    expect(result?.tagName).toBe('BUTTON');
    expect(result?.tabIndex).toBe(0);
    expect(result?.textContent).toContain('Example customer');
    await act(async () => result?.click());
    expect(mocks.store.setActiveTab).toHaveBeenCalledWith('clients');
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('traps Tab, closes with Escape, and restores focus to the opener', async () => {
    await act(async () => root.render(<GlobalSearchModal isOpen onClose={onClose} />));

    const input = container.querySelector<HTMLInputElement>('input');
    const closeButton = container.querySelector<HTMLButtonElement>('button[aria-label="Suche schließen"]');
    expect(input).not.toBeNull();
    expect(closeButton).not.toBeNull();

    await act(async () => {
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    });
    expect(document.activeElement).toBe(closeButton);

    await act(async () => {
      closeButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledOnce();

    await act(async () => root.render(<GlobalSearchModal isOpen={false} onClose={onClose} />));
    expect(document.activeElement).toBe(trigger);
  });
});
