import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addGuardBookEntry: vi.fn(),
  state: {
    getTenantGuardBook: vi.fn(() => []),
    getTenantSites: vi.fn(() => [{
      id: 'site-a',
      tenantId: 'tenant-a',
      name: 'Objekt A',
      siteCode: 'A'
    }]),
    getTenantEmployees: vi.fn(() => [{
      id: 'employee-a',
      firstName: 'Erika',
      lastName: 'Muster',
      personnelNumber: 'E-1'
    }]),
    addGuardBookEntry: vi.fn(),
    updateGuardBookStage: vi.fn(),
    resolveGuardBookEntry: vi.fn(),
    isOnline: false
  }
}));

vi.mock('../store', () => ({
  useSecurityStore: () => mocks.state
}));

vi.mock('../services/indexedDbService', () => ({
  offlineVault: { saveAttachment: vi.fn() }
}));

import { GuardBookModule } from '../components/GuardBookModule';

function setValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('GuardBookModule offline capture', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.state.addGuardBookEntry = mocks.addGuardBookEntry;
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  test('keeps the report form open and preserves its data when durable enqueue fails', async () => {
    let rejectEnqueue!: (error: Error) => void;
    mocks.addGuardBookEntry.mockReturnValueOnce(new Promise((_, reject) => {
      rejectEnqueue = reject;
    }));

    await act(async () => root.render(<GuardBookModule />));
    const openButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Ereignis erfassen'));
    await act(async () => openButton?.click());

    const title = container.querySelector<HTMLInputElement>('input[placeholder^="z. B."]');
    const description = container.querySelector<HTMLTextAreaElement>('textarea');
    if (!title || !description) throw new Error('Wachbucheintragsformular fehlt');
    await act(async () => {
      setValue(title, 'Offline-Vorfall');
      setValue(description, 'Wichtiger Sachverhalt');
    });

    const form = container.querySelector('form');
    if (!form) throw new Error('Wachbucheintragsformular fehlt');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(container.querySelector('form')).not.toBeNull();
    await act(async () => {
      rejectEnqueue(new Error('IndexedDB quota exceeded'));
      await Promise.resolve();
    });

    expect(container.querySelector('form')).not.toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[placeholder^="z. B."]')?.value).toBe('Offline-Vorfall');
    expect(container.querySelector('textarea')?.value).toBe('Wichtiger Sachverhalt');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('IndexedDB quota exceeded');
  });
});
