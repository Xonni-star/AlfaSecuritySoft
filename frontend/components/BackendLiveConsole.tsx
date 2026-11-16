import React, { useEffect, useRef, useState } from 'react';
import { Server } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useSecurityStore } from '../store';

const endpoints = [
  { path: '/auth/me', name: 'Eigene Sitzung' },
  { path: '/customers', name: 'Erlaubte Kunden' },
  { path: '/logbook', name: 'Erlaubtes Wachbuch' }
] as const;

export const BackendLiveConsole: React.FC = () => {
  const { currentTenantId, currentUserId, authUser } = useSecurityStore();
  const identity = `${currentTenantId}:${authUser?.id || currentUserId}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const [selectedEndpoint, setSelectedEndpoint] = useState<(typeof endpoints)[number]['path']>('/auth/me');
  const [response, setResponse] = useState<{ identity: string; text: string; failed: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResponse(null);
    setLoading(false);
  }, [identity]);

  const execute = async () => {
    if (loading) return;
    setResponse(null);
    setLoading(true);
    try {
      const data = await apiClient.get<unknown>(selectedEndpoint);
      if (identityRef.current !== identity) return;
      setResponse({ identity, text: JSON.stringify({ endpoint: selectedEndpoint, data }, null, 2), failed: false });
    } catch (error) {
      if (identityRef.current !== identity) return;
      setResponse({
        identity, failed: true,
        text: error instanceof Error ? error.message : 'Die API-Anfrage ist fehlgeschlagen.'
      });
    } finally {
      if (identityRef.current === identity) setLoading(false);
    }
  };
  const currentResponse = response?.identity === identity ? response : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Server className="w-6 h-6 text-blue-400" />
        <h1 className="text-xl font-bold text-white">Backend: schreibgeschützte API-Konsole</h1>
      </div>
      <p role="status" className="text-xs text-slate-400">
        Echte GET-Anfragen an die konfigurierte Express-/TypeScript-API mit der
        aktuellen Cookie-Sitzung. Der Server prüft die Berechtigungen.
        Keine simulierten Antworten, Isolationstests oder Produktionsfreigaben.
      </p>
      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 text-xs">
        <label htmlFor="backend-endpoint" className="block text-slate-300">API-Endpunkt</label>
        <select
          id="backend-endpoint"
          value={selectedEndpoint}
          disabled={loading}
          onChange={event => {
            const endpoint = endpoints.find(item => item.path === event.target.value);
            if (endpoint) setSelectedEndpoint(endpoint.path);
          }}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200"
        >
          {endpoints.map(endpoint => (
            <option key={endpoint.path} value={endpoint.path}>
              GET /api/v1{endpoint.path} — {endpoint.name}
            </option>
          ))}
        </select>
        <button
          disabled={loading}
          onClick={() => void execute()}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Anfrage läuft…' : 'Anfrage senden'}
        </button>
        {currentResponse?.failed && <p role="alert" className="text-rose-300">{currentResponse.text}</p>}
        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-slate-300">
          {currentResponse && !currentResponse.failed ? currentResponse.text : 'Keine bestätigten Antwortdaten.'}
        </pre>
      </div>
      <p className="text-xs text-slate-400">
        RLS-, Rollen- und Restoreprüfungen laufen separat in den automatisierten
        Tests. Eine erreichbare Route beweist weder Mandantentrennung noch
        die vollständige Sicherheit der Zielumgebung.
      </p>
    </div>
  );
};
