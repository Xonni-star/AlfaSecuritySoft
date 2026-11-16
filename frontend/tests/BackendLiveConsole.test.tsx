import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { apiClient } from '../services/apiClient';

const state = vi.hoisted(() => ({
  currentTenantId: 'tenant-a', currentUserId: 'user-a', authUser: { id: 'user-a' }
}));
vi.mock('../store', () => ({ useSecurityStore: () => state }));
import { BackendLiveConsole } from '../components/BackendLiveConsole';

describe('BackendLiveConsole actual API responses', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  function runButton() {
    const result = container.querySelector('button');
    if (!result) throw new Error('API-Aktion fehlt');
    return result;
  }
  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    state.currentTenantId = 'tenant-a';
    state.currentUserId = 'user-a';
    state.authUser = { id: 'user-a' };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<BackendLiveConsole />));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  test('shows only data returned by the real API client and offers no mutation endpoint', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ userId: 'user-a', marker: 'Actual response' });
    await act(async () => runButton().click());
    expect(get).toHaveBeenCalledWith('/auth/me');
    expect(JSON.parse(container.querySelector('pre')!.textContent!)).toEqual({
      endpoint: '/auth/me', data: { userId: 'user-a', marker: 'Actual response' }
    });
    expect(Array.from(container.querySelectorAll('option')).map(option => option.value))
      .toEqual(['/auth/me', '/customers', '/logbook']);
  });

  test('surfaces a rejected API request without replacing it with a fabricated success', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('HTTP 403: Fehlende Berechtigung'));
    await act(async () => runButton().click());
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('HTTP 403: Fehlende Berechtigung');
    expect(container.querySelector('pre')?.textContent).toBe('Keine bestätigten Antwortdaten.');
  });

  test('ignores a delayed response for a previous identity and allows the current identity to request data', async () => {
    let resolve!: (value: unknown) => void;
    const get = vi.spyOn(apiClient, 'get')
      .mockReturnValueOnce(new Promise<unknown>(done => { resolve = done; }))
      .mockResolvedValueOnce({ marker: 'Current identity' });
    await act(async () => runButton().click());
    expect(runButton().disabled).toBe(true);
    state.currentTenantId = 'tenant-b';
    state.currentUserId = 'user-b';
    state.authUser = { id: 'user-b' };
    await act(async () => root.render(<BackendLiveConsole />));
    await act(async () => resolve({ marker: 'Private old identity' }));
    expect(container.textContent).not.toContain('Private old identity');
    await act(async () => runButton().click());
    expect(get).toHaveBeenCalledTimes(2);
    expect(container.querySelector('pre')?.textContent).toContain('Current identity');
  });
});
