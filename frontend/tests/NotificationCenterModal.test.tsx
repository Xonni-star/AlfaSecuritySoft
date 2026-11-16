import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Navbar } from '../components/Navbar';
import { NotificationCenterModal } from '../components/NotificationCenterModal';
import { useSecurityStore } from '../store';

describe('Runtime notification center', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    useSecurityStore.setState({
      currentTenantId: 'tenant-frankfurt', currentUserId: 'notification-user', authUser: null,
      notifications: [], notificationDeliveries: [], syncQueue: []
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  async function renderCenter() {
    await act(async () => root.render(<>
      <Navbar onOpenNotifications={vi.fn()} onOpenSyncManager={vi.fn()}
        onOpenModuleManager={vi.fn()} onOpenGlobalSearch={vi.fn()} />
      <NotificationCenterModal isOpen onClose={vi.fn()} />
    </>));
  }

  test('shows a real runtime error in the feed and bell, then reads and dismisses that message', async () => {
    await renderCenter();
    await act(async () => {
      useSecurityStore.getState().addNotification('Nicht gespeichert', 'Der Server hat die Änderung abgelehnt.', 'alert');
    });
    expect(container.textContent).toContain('Der Server hat die Änderung abgelehnt.');
    expect(container.querySelector('[aria-label="Benachrichtigungscenter öffnen. Ungelesen: 1"]')).not.toBeNull();
    const read = container.querySelector<HTMLButtonElement>('[aria-label="Als gelesen markieren: Nicht gespeichert"]');
    expect(read).not.toBeNull();
    await act(async () => read?.click());
    expect(container.querySelector('[aria-label="Benachrichtigungscenter öffnen. Ungelesen: 0"]')).not.toBeNull();
    expect(container.textContent).toContain('Der Server hat die Änderung abgelehnt.');
    const dismiss = container.querySelector<HTMLButtonElement>('[aria-label="Meldung verwerfen: Nicht gespeichert"]');
    expect(dismiss).not.toBeNull();
    await act(async () => dismiss?.click());
    expect(container.textContent).not.toContain('Der Server hat die Änderung abgelehnt.');
    expect(useSecurityStore.getState().notifications).toEqual([]);
    expect(useSecurityStore.getState().notificationDeliveries).toEqual([]);
  });

  test('keeps messages created in the same millisecond independently readable', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1794859200000);
    useSecurityStore.getState().addNotification('Erste Meldung', 'Erster Fehler', 'alert');
    useSecurityStore.getState().addNotification('Zweite Meldung', 'Zweiter Fehler', 'warning');
    await renderCenter();
    const read = container.querySelector<HTMLButtonElement>('[aria-label="Als gelesen markieren: Erste Meldung"]');
    expect(read).not.toBeNull();
    await act(async () => read?.click());
    expect(useSecurityStore.getState().getTenantNotificationDeliveries().filter(item => !item.read))
      .toMatchObject([{ title: 'Zweite Meldung' }]);
    expect(container.querySelector('[aria-label="Benachrichtigungscenter öffnen. Ungelesen: 1"]')).not.toBeNull();
  });

  test.each(['user', 'tenant'] as const)('does not expose or modify a previous %s context message', async change => {
    useSecurityStore.getState().addNotification('Private Meldung', 'Nur für die ursprüngliche Sitzung.', 'warning');
    const previousId = useSecurityStore.getState().notifications[0].id;
    await renderCenter();
    await act(async () => {
      useSecurityStore.setState(change === 'user' ? { currentUserId: 'different-user' } : { currentTenantId: 'tenant-berlin' });
      useSecurityStore.getState().markNotificationAsRead(previousId);
      useSecurityStore.getState().dismissNotification(previousId);
    });
    expect(container.textContent).not.toContain('Nur für die ursprüngliche Sitzung.');
    expect(container.querySelector('[aria-label="Benachrichtigungscenter öffnen. Ungelesen: 0"]')).not.toBeNull();
    expect(useSecurityStore.getState().notificationDeliveries).toMatchObject([{ id: previousId, read: false }]);
  });

  test('filters real warning and error messages by severity', async () => {
    useSecurityStore.getState().addNotification('API-Fehler', 'Nicht bestätigt', 'alert');
    useSecurityStore.getState().addNotification('Offline-Hinweis', 'Nur lokal gespeichert', 'warning');
    await renderCenter();
    const filter = container.querySelector<HTMLSelectElement>('select[aria-label="Meldungen nach Schweregrad filtern"]');
    expect(filter).not.toBeNull();
    await act(async () => {
      if (filter) {
        filter.value = 'ALARM';
        filter.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    expect(container.textContent).toContain('Nicht bestätigt');
    expect(container.textContent).not.toContain('Nur lokal gespeichert');
  });

  test('does not offer unconnected email or automated warning preferences as working settings', async () => {
    await renderCenter();
    expect(container.textContent).toContain('nur für diese Sitzung');
    const preferences = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Einstellungen'));
    await act(async () => preferences?.click());
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(container.textContent).toContain('nicht angebunden');
    expect(container.textContent).not.toContain('Multi-Channel Übermittlungsprotokolle');
  });
});
