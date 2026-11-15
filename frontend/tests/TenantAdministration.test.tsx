import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { AuthUser } from '../store';
import { TenantAdministration } from '../components/TenantAdministration';

const systemAdmin: AuthUser = {
  id: 'admin-1',
  email: 'system@example.test',
  fullName: 'System Admin',
  role: 'Systemadministrator',
  tenantId: 'tenant-a',
  tenantName: 'Tenant A',
  permissions: [],
  isSuperAdmin: true
};
const tenantAdmin: AuthUser = { ...systemAdmin, isSuperAdmin: false, permissions: ['roles:delegate_admin'] };

function apiResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ success: true, data })
  } as Response;
}

describe('TenantAdministration', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.fn(async () => apiResponse([]));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  test('does not request system tenant data for a tenant administrator', async () => {
    await act(async () => {
      root.render(<TenantAdministration authUser={tenantAdmin} />);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain('ausschließlich Systemadministratoren');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('loads the system tenant list and exposes tenant creation separately', async () => {
    await act(async () => {
      root.render(<TenantAdministration authUser={systemAdmin} />);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/system/tenants',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(container.textContent).toContain('Mandantenwechsel sowie Benutzer und Rollen werden getrennt verwaltet.');

    const createButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Neuer Mandant'));
    await act(async () => createButton?.click());
    expect(container.querySelector('form[aria-label="Mandantendaten"]')).not.toBeNull();
  });
});
