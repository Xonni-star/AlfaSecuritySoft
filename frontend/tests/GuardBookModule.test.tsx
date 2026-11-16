import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addGuardBookEntry: vi.fn(),
  saveAttachment: vi.fn(),
  state: {
    currentTenantId: 'tenant-a',
    currentUserId: 'user-a',
    triggerManualSync: vi.fn(),
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
  useSecurityStore: Object.assign(() => mocks.state, { getState: () => mocks.state })
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
    mocks.state.isOnline = false;
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

  test('submits the displayed defaults when reference data arrives after the module mounts', async () => {
    mocks.state.getTenantSites.mockReturnValueOnce([]);
    mocks.state.getTenantEmployees.mockReturnValueOnce([]);
    mocks.addGuardBookEntry.mockResolvedValueOnce('late-loaded-entry');
    await act(async () => root.render(<GuardBookModule />));
    await act(async () => root.render(<GuardBookModule />));
    const openButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Ereignis erfassen'));
    await act(async () => openButton?.click());
    const title = container.querySelector<HTMLInputElement>('input[placeholder^="z. B."]');
    const description = container.querySelector<HTMLTextAreaElement>('textarea');
    if (!title || !description) throw new Error('Wachbucheintragsformular fehlt');
    await act(async () => {
      setValue(title, 'Spät geladene Stammdaten');
      setValue(description, 'Die angezeigte Auswahl muss tatsächlich gespeichert werden.');
    });
    await act(async () => {
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(mocks.addGuardBookEntry).toHaveBeenCalledWith(expect.objectContaining({
      siteId: 'site-a',
      siteName: 'Objekt A',
      guardId: 'employee-a',
      guardName: 'Erika Muster'
    }));
    expect(container.querySelector('form')).toBeNull();
  });

  test('ignores a second submit while the first entry write is pending', async () => {
    let resolveEntry!: (id: string) => void;
    mocks.addGuardBookEntry.mockReturnValueOnce(new Promise(resolve => {
      resolveEntry = resolve;
    }));

    await act(async () => root.render(<GuardBookModule />));
    const openButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Ereignis erfassen'));
    await act(async () => openButton?.click());

    const title = container.querySelector<HTMLInputElement>('input[placeholder^="z. B."]');
    const description = container.querySelector<HTMLTextAreaElement>('textarea');
    if (!title || !description) throw new Error('Wachbucheintragsformular fehlt');
    await act(async () => {
      setValue(title, 'Doppelte Erfassung');
      setValue(description, 'Ein Formular darf nur einen Eintrag erzeugen.');
    });

    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!submit) throw new Error('Absenden-Schaltfläche fehlt');
    await act(async () => submit.click());

    expect(submit.disabled).toBe(true);
    await act(async () => submit.click());
    expect(mocks.addGuardBookEntry).toHaveBeenCalledOnce();

    await act(async () => {
      resolveEntry('gb-single-entry');
      await Promise.resolve();
    });
    expect(container.querySelector('form')).toBeNull();
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
      id: expect.stringMatching(/^[0-9a-f-]{36}$/i),
      tenantId: 'tenant-a',
      userId: 'user-a',
      entityId: persistedEntryId
    }));

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    });

    expect(mocks.addGuardBookEntry).toHaveBeenCalledOnce();
    expect(mocks.saveAttachment).toHaveBeenCalledTimes(2);
    expect(mocks.saveAttachment.mock.calls[1][0]).toMatchObject({
      id: mocks.saveAttachment.mock.calls[0][0].id,
      tenantId: 'tenant-a',
      userId: 'user-a',
      entityId: persistedEntryId,
      blobData: mocks.saveAttachment.mock.calls[0][0].blobData
    });
    expect(container.querySelector('form')).toBeNull();
  });

  test('does not label a locally stored photo as synced while online', async () => {
    mocks.state.isOnline = true;
    mocks.addGuardBookEntry.mockResolvedValueOnce('gb-local-photo');
    mocks.saveAttachment.mockResolvedValueOnce(undefined);
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
      setValue(title, 'Foto ohne Upload');
      setValue(description, 'Die Datei bleibt lokal gespeichert.');
      Object.defineProperty(photoInput, 'files', {
        configurable: true,
        value: [new File(['photo'], 'incident.jpg', { type: 'image/jpeg' })]
      });
      photoInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const form = container.querySelector('form');
    if (!form) throw new Error('Wachbucheintragsformular fehlt');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(mocks.saveAttachment).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/i),
      userId: 'user-a',
      synced: false
    }));
    expect(mocks.state.triggerManualSync).toHaveBeenCalledOnce();
  });
});
