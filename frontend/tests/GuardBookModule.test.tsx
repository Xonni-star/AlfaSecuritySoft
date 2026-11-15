import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addGuardBookEntry: vi.fn(),
  saveAttachment: vi.fn(),
  state: {
    currentTenantId: 'tenant-a',
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
  offlineVault: { saveAttachment: mocks.saveAttachment }
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
    vi.unstubAllGlobals();
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

  test('retries a failed photo write against the persisted entry without creating it again', async () => {
    const persistedEntryId = 'gb-persisted-entry-id';
    mocks.addGuardBookEntry.mockResolvedValueOnce(persistedEntryId);
    mocks.saveAttachment
      .mockRejectedValueOnce(new Error('IndexedDB write failed'))
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal('FileReader', class {
      onload?: (event: { target: { result: string } | null }) => void;
      readAsDataURL(): void {
        this.onload?.({ target: { result: 'data:image/jpeg;base64,cGhvdG8=' } });
      }
    });

    await act(async () => root.render(<GuardBookModule />));
    const openButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Ereignis erfassen'));
    await act(async () => openButton?.click());

    const title = container.querySelector<HTMLInputElement>('input[placeholder^="z. B."]');
    const description = container.querySelector<HTMLTextAreaElement>('textarea');
    const photoInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!title || !description || !photoInput) throw new Error('Wachbucheintragsformular fehlt');
    await act(async () => {
      setValue(title, 'Foto-Vorfall');
      setValue(description, 'Sachverhalt mit Fotodokumentation');
      Object.defineProperty(photoInput, 'files', {
        configurable: true,
        value: [new File(['photo'], 'incident.jpg', { type: 'image/jpeg' })]
      });
      photoInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.querySelector('img[alt="Vorschau"]')).not.toBeNull();

    const form = container.querySelector('form');
    if (!form) throw new Error('Wachbucheintragsformular fehlt');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Wachbucheintrag ist gespeichert');
    expect(container.querySelector('button[type="submit"]')?.textContent).toContain('Foto erneut speichern');
    expect(container.querySelector<HTMLInputElement>('input[placeholder^="z. B."]')?.disabled).toBe(true);
    expect(mocks.addGuardBookEntry).toHaveBeenCalledOnce();
    expect(mocks.saveAttachment).toHaveBeenNthCalledWith(1, expect.objectContaining({
      id: `att-${persistedEntryId}`,
      tenantId: 'tenant-a',
      entityId: persistedEntryId
    }));

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    });

    expect(mocks.addGuardBookEntry).toHaveBeenCalledOnce();
    expect(mocks.saveAttachment).toHaveBeenCalledTimes(2);
    expect(mocks.saveAttachment.mock.calls[1][0]).toMatchObject({
      id: `att-${persistedEntryId}`,
      tenantId: 'tenant-a',
      entityId: persistedEntryId,
      blobData: mocks.saveAttachment.mock.calls[0][0].blobData
    });
    expect(container.querySelector('form')).toBeNull();
  });
});
