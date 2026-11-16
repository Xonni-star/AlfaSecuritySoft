import React, { useState } from 'react';
import { Server } from 'lucide-react';
import { BackendLiveConsole } from './BackendLiveConsole';

export const ArchitectureCenter: React.FC = () => {
  const [showConsole, setShowConsole] = useState(false);
  return (
  <div className="space-y-6">
    <button
      onClick={() => setShowConsole(previous => !previous)}
      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
    >
      {showConsole ? 'Zur Architekturübersicht' : 'Schreibgeschützte API-Konsole öffnen'}
    </button>
    {showConsole ? <BackendLiveConsole /> : <>
    <div className="flex items-center gap-2">
      <Server className="w-6 h-6 text-blue-400" />
      <h1 className="text-xl font-bold text-white">Aktive Backend-Architektur</h1>
    </div>
    <p role="status" className="text-xs text-slate-400">
      Implementierungsübersicht, keine Live-Diagnose oder Testausführung.
      Der aktive npm-/Docker-Pfad verwendet Express und TypeScript, nicht FastAPI.
      Historische Python-/Alembic-Dateien werden durch die aktuellen
      Jest-/Vitest-Läufe nicht mitgeprüft.
    </p>
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 text-xs text-slate-300">
      <h2 className="font-bold text-white">Frontend → API → PostgreSQL</h2>
      <p>React/Vite und Zustand verwenden den API-Client mit serverseitig widerrufbarer Cookie-Sitzung und CSRF-Schutz.</p>
      <p>Die Express-Routen unter /api/v1 authentifizieren die Sitzung; Controller und Services prüfen Grants und erlaubte Standorte serverseitig.</p>
      <p>Die aktive Datenbankschicht setzt den Mandantenkontext transaktionslokal. PostgreSQL-RLS und Tenant-Fremdschlüssel ergänzen die Abfragegrenzen.</p>
      <p>Offline-Mutationen verbleiben besitzergebunden in IndexedDB bis zur passenden Serverquittung. Anhänge verwenden einen privaten Objektspeicher und den konfigurierten Scanner.</p>
      <h2 className="font-bold text-white">Verbindliche Quellpfade</h2>
      <ul className="list-disc space-y-1 pl-5 font-mono">
        <li>frontend/services/apiClient.ts</li>
        <li>frontend/backend/src/app.ts</li>
        <li>frontend/backend/src/migrations/</li>
        <li>frontend/services/indexedDbService.ts</li>
        <li>frontend/deploy/docker-compose.production.yml</li>
      </ul>
      <p>Aktuelle Revisions- und Testnachweise stehen in PROJECT_CURRENT_STATUS.md und der CI. Diese Ansicht generiert keine API-Antworten, Tokens oder bestandenen Tests.</p>
    </div>
    <p className="text-xs text-amber-300">
      Produktionskonfiguration, vollständige Rollen-/Objektabnahme,
      unabhängiger Penetrationstest und rechtliche Freigabe bleiben gesondert zu prüfen.
    </p>
    </>}
  </div>
  );
};
