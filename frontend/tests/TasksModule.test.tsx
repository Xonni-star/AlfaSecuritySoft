import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { TaskItem } from '../types';

const state = vi.hoisted(() => ({
  tasks: [] as TaskItem[],
  currentTenantId: 'tenant-a',
  currentUserId: 'user-a',
  authUser: null,
  addTask: vi.fn(),
  toggleTaskStatus: vi.fn()
}));
vi.mock('../store', () => ({ useSecurityStore: () => state }));
import { TasksModule } from '../components/TasksModule';

describe('TasksModule confirmed persistence', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const task: TaskItem = {
    id: 'task-a', tenantId: 'tenant-a', title: 'Wartung', assignedToName: 'Einsatzleitung',
    dueDate: '2027-01-10', priority: 'Mittel', status: 'Offen', category: 'Audit'
  };
  function input(label: string) {
    const result = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    if (!result) throw new Error(`Eingabe fehlt: ${label}`);
    return result;
  }
  function setValue(field: HTMLInputElement, value: string) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.resetAllMocks();
    state.currentTenantId = 'tenant-a';
    state.currentUserId = 'user-a';
    state.tasks = [task];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  test('retains the draft on rejection and clears it only after confirmed persistence', async () => {
    let resolve!: (saved: TaskItem | null) => void;
    state.addTask.mockReturnValueOnce(new Promise<TaskItem | null>(done => { resolve = done; }));
    await act(async () => root.render(<TasksModule />));
    await act(async () => {
      setValue(input('Aufgabentitel'), 'Wartung prüfen');
      setValue(input('Verantwortlich'), 'Einsatzleitung');
    });
    const save = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!save) throw new Error('Speichern fehlt');
    await act(async () => save.click());
    expect(save.disabled).toBe(true);
    expect(input('Aufgabentitel').value).toBe('Wartung prüfen');
    await act(async () => resolve(null));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('nicht bestätigt');
    expect(input('Aufgabentitel').value).toBe('Wartung prüfen');
    state.addTask.mockResolvedValueOnce(task);
    await act(async () => save.click());
    expect(input('Aufgabentitel').value).toBe('');
    expect(state.addTask).toHaveBeenCalledTimes(2);
  });

  test('uses an operable checkbox and exposes a failed status change', async () => {
    let resolve!: (saved: boolean) => void;
    state.toggleTaskStatus.mockReturnValueOnce(new Promise<boolean>(done => { resolve = done; }));
    await act(async () => root.render(<TasksModule />));
    const checkbox = input('Status von Wartung ändern');
    await act(async () => checkbox.click());
    expect(state.toggleTaskStatus).toHaveBeenCalledWith('task-a');
    expect(checkbox.disabled).toBe(true);
    await act(async () => resolve(false));
    expect(checkbox.checked).toBe(false);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('nicht bestätigt');
  });

  test('does not let an old request clear the next identity’s draft', async () => {
    let resolve!: (saved: TaskItem | null) => void;
    state.addTask.mockReturnValueOnce(new Promise<TaskItem | null>(done => { resolve = done; }));
    await act(async () => root.render(<TasksModule />));
    await act(async () => {
      setValue(input('Aufgabentitel'), 'Alter Entwurf');
      setValue(input('Verantwortlich'), 'Einsatzleitung');
    });
    const save = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!save) throw new Error('Speichern fehlt');
    await act(async () => save.click());
    state.currentUserId = 'user-b';
    await act(async () => root.render(<TasksModule />));
    expect(input('Aufgabentitel').value).toBe('');
    await act(async () => setValue(input('Aufgabentitel'), 'Neuer Entwurf'));
    await act(async () => resolve(task));
    expect(input('Aufgabentitel').value).toBe('Neuer Entwurf');
  });
});
