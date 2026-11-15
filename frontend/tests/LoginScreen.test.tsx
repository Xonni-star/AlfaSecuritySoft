// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  state: {
    login: vi.fn(),
    isAuthenticating: false,
    authError: null as string | null
  }
}));

vi.mock('../store', () => ({
  useSecurityStore: () => mocks.state
}));

import { LoginScreen } from '../components/LoginScreen';
import { ApiError } from '../services/apiClient';

function setValue(input: HTMLInputElement | HTMLSelectElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('LoginScreen tenant selection', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.state.login = mocks.login;
    mocks.state.isAuthenticating = false;
    mocks.state.authError = null;
    mocks.login.mockReset();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  test('shows available tenants after ambiguous login and retries with the explicit choice', async () => {
    const availableTenants = [
      { id: 'tenant-a', name: 'Tenant A', role: 'Operator' },
      { id: 'tenant-b', name: 'Tenant B', role: 'Administrator' }
    ];
    mocks.login
      .mockRejectedValueOnce(new ApiError(
        400,
        'Choose a tenant',
        undefined,
        false,
        'AMBIGUOUS_TENANT_SELECTION',
        undefined,
        undefined,
        availableTenants
      ))
      .mockResolvedValueOnce(undefined);

    await act(async () => root.render(<LoginScreen />));
    const email = container.querySelector<HTMLInputElement>('input[type="email"]');
    const password = container.querySelector<HTMLInputElement>('input[type="password"]');
    const form = container.querySelector('form');
    expect(email).toBeTruthy();
    expect(password).toBeTruthy();
    expect(form).toBeTruthy();

    await act(async () => {
      setValue(email!, 'multi-tenant@example.test');
      setValue(password!, 'valid-password');
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const tenantSelect = container.querySelector<HTMLSelectElement>('select');
    expect(tenantSelect?.options).toHaveLength(3);
    expect(container.textContent).toContain('Tenant A (Operator)');
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);

    await act(async () => {
      setValue(tenantSelect!, 'tenant-b');
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mocks.login).toHaveBeenNthCalledWith(1, 'multi-tenant@example.test', 'valid-password', undefined);
    expect(mocks.login).toHaveBeenNthCalledWith(2, 'multi-tenant@example.test', 'valid-password', 'tenant-b');
  });
});
