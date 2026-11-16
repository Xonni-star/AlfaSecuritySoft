import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

const scenarios = [
  ['Kunden und Objekte', 'Kundenanlage, Standortzuordnung, Versionskonflikte und erlaubte Tenant-/Standortgrenzen prüfen.'],
  ['Personal', 'Stammdaten, Nachweise und eigene/fremde Personaldaten mit unterschiedlichen Grants prüfen.'],
  ['Dienstplanung', 'Planung, Freigabe, Ist-Zeiten, Zeitumstellungen und konfigurierte Regeln fachlich prüfen.'],
  ['Digitales Wachbuch', 'Erfassung, serverseitige Speicherung, Korrekturen und verweigerte Kernfeldänderungen prüfen.'],
  ['Kritischer Vorfall', 'Dauerhafte Folgeaufgabe und idempotentes Replay nach Offline-Neustart und verlorenem Serverbeleg prüfen.'],
  ['Dienstanweisungen', 'Getrennte Erstellung/Prüfung/Freigabe und explizite versionsgebundene Offlinekenntnisnahme prüfen.'],
  ['Schlüssel', 'Ausgabe/Rücknahme, tatsächliche Bestätigung und erhaltene Eingaben bei Fehlern prüfen.'],
  ['Offline und Anhänge', 'Konten-/Tenantwechsel, Originalbytes, Dateiablehnung und Wiederholung ohne Duplikate prüfen.'],
  ['Berechtigungen', 'Positive und negative Rollen-/Standort-/Objektfälle einschließlich Export und Rechteentzug prüfen.'],
  ['Backup und Restore', 'DB und Objekte aus Off-host-Sicherung wiederherstellen und vereinbarte RPO/RTO tatsächlich messen.']
] as const;

const tabs = [
  ['suite', 'Abnahme-Prüfplan'],
  ['rights', 'Berechtigungsabnahme'],
  ['release', 'Entwicklungsstand'],
  ['environment', 'Infrastrukturstatus']
] as const;

export const E2EAcceptanceCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number][0]>('suite');
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-blue-400" />
        <h1 className="text-xl font-bold text-white">Systemintegration und Abnahme-Prüfplan</h1>
      </div>
      <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        OFFEN: Keine automatische Produktabnahme in dieser Ansicht.
        Es werden keine Testdatensätze angelegt und keine Rollen gewechselt;
        Prüfergebnisse werden nicht simuliert. Keine Produktionsfreigabe.
        Reale automatisierte Tests werden außerhalb dieser Oberfläche ausgeführt
        und gelten nur für ihren dokumentierten Commit.
      </p>
      <nav aria-label="Abnahmebereiche" className="flex flex-wrap gap-2 text-xs">
        {tabs.map(([id, name]) => (
          <button
            key={id}
            aria-pressed={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`rounded-lg px-3 py-2 ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            {name}
          </button>
        ))}
      </nav>
      {activeTab === 'suite' && (
        <div className="space-y-3">
          {scenarios.map(([name, description]) => (
            <section key={name} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-300">
              <h2 className="font-bold text-white">{name}</h2>
              <p className="mt-2">{description}</p>
              <p className="mt-2 text-amber-300">Abnahmestatus: NICHT VERIFIZIERT</p>
            </section>
          ))}
        </div>
      )}
      {activeTab === 'rights' && (
        <section className="space-y-3 text-xs text-slate-300">
          <h2 className="font-bold text-white">Verbindliche Rechte kommen vom Server</h2>
          <p>Rollennamen allein verleihen keine Rechte. Tenant-, Standort- und Eigenrechte sowie konkrete Objektzuordnungen sind anhand der tatsächlichen Grants zu prüfen.</p>
          <p>Eine lokale Rollenauswahl oder gefilterte Liste ist kein RLS-/API-Nachweis. Die vollständige authentifizierte Rollen-/Objektmatrix bleibt offen.</p>
        </section>
      )}
      {activeTab === 'release' && (
        <section className="space-y-3 text-xs text-slate-300">
          <h2 className="font-bold text-white">IN ENTWICKLUNG — keine Produktionsfreigabe</h2>
          <p>Aktiver Anwendungspfad: React/Vite, Express/TypeScript und PostgreSQL. Kein FastAPI-Produktionspfad und kein Gold-Master-Nachweis durch diese Ansicht.</p>
          <p>Verbindliche Revisionen und Grenzen: PROJECT_CURRENT_STATUS.md, CHANGELOG.md, PRODUCTION_READINESS_REPORT.md und PRODUCTION_RELEASE_CHECKLIST.md.</p>
        </section>
      )}
      {activeTab === 'environment' && (
        <section className="space-y-3 text-xs text-slate-300">
          <h2 className="font-bold text-white">Kein Live-Infrastrukturcheck angebunden</h2>
          <p>API-Erreichbarkeit, PostgreSQL-/RLS-Konfiguration, private Speicher-/Scanneranbindung und tatsächliche Gerätefreigaben sind hier NICHT VERIFIZIERT.</p>
          <p>Eine sichtbare Oberfläche beweist weder Datenbankzustand noch Service-Worker-, Kamera- oder QR-/NFC-Betrieb. Provider-Restore, Geräte und gemessene RPO/RTO benötigen eigene Nachweise.</p>
        </section>
      )}
    </div>
  );
};
