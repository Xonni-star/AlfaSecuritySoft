import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ArchitectureCenter } from '../components/ArchitectureCenter';
import { E2EAcceptanceCenter } from '../components/E2EAcceptanceCenter';
import { AutomationCenter } from '../components/AutomationCenter';
import { useSecurityStore } from '../store';

describe('development status views do not fabricate acceptance', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  function button(text: string | RegExp) {
    const result = Array.from(container.querySelectorAll('button'))
      .find(item => typeof text === 'string'
        ? item.textContent?.trim() === text
        : text.test(item.textContent?.trim() ?? ''));
    if (!result) throw new Error(`Button fehlt: ${text}`);
    return result;
  }
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  test('shows a read-only acceptance plan rather than executing writes or claiming infrastructure approval', async () => {
    await act(async () => root.render(<E2EAcceptanceCenter />));
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Keine automatische Produktabnahme');
    expect(container.querySelectorAll('section')).toHaveLength(10);
    expect(container.textContent).not.toContain('100% ISOLIERT');
    expect(container.textContent).not.toContain('RELEASEFÄHIG');
    expect(Array.from(container.querySelectorAll('button')).some(item => item.textContent?.includes('Testen'))).toBe(false);
    await act(async () => button('Infrastrukturstatus').click());
    expect(container.textContent).toContain('NICHT VERIFIZIERT');
    expect(container.textContent).not.toContain('OPERATIONAL');
    await act(async () => button('Entwicklungsstand').click());
    expect(container.textContent).toContain('keine Produktionsfreigabe');
  });

  test('distinguishes the active TypeScript backend from Python history and opens the actual read-only console', async () => {
    await act(async () => root.render(<ArchitectureCenter />));
    expect(container.textContent).toContain('Express und TypeScript, nicht FastAPI');
    expect(container.textContent).not.toContain('100% PASS');
    expect(container.textContent).not.toContain('Produktionsbereite FastAPI');
    await act(async () => button('Schreibgeschützte API-Konsole öffnen').click());
    expect(container.querySelector('#backend-endpoint')).not.toBeNull();
    expect(button('Anfrage senden')).toBeDefined();
  });

  test('keeps automation drafts editable but disables unimplemented execution and labels example history', async () => {
    useSecurityStore.setState({
      currentTenantId: 'tenant-frankfurt',
      automations: [{
        id: 'local-rule', tenantId: 'tenant-frankfurt', name: 'Lokaler Entwurf',
        description: 'Keine angebundene Ausführung', trigger: 'LOGBOOK_ENTRY_CREATED',
        conditions: [{ field: 'priority', operator: 'equals', value: 'Kritisch' }],
        actions: [{ type: 'NOTIFY_MANAGER' }], active: true,
        category: 'Wachbuch', actionsTriggeredCount: 0
      }]
    });
    await act(async () => root.render(<AutomationCenter />));
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Keine serverseitige Regelpersistenz');
    expect(button('Ausführung nicht implementiert').disabled).toBe(true);
    expect(button('Test nicht implementiert').disabled).toBe(true);
    expect(button('Regel erstellen').disabled).toBe(false);
    expect(container.textContent).not.toContain('100% Mandant isoliert');
    await act(async () => button(/^Ausführungsprotokoll \(\d+\)$/).click());
    expect(container.textContent).toContain('Beispielprotokolle, nicht serverbestätigt');
  });
});
