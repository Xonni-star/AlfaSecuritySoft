import React, { useState } from 'react';
import { ShieldCheck, Laptop, Smartphone } from 'lucide-react';
import { useSecurityStore } from '../store';

export const SecurityAuditCenter: React.FC = () => {
  const {
    getTenantAuditLogs,
    activeSessions,
    gdprPolicies,
    getCurrentTenant
  } = useSecurityStore();

  const tenant = getCurrentTenant();
  const auditLogs = getTenantAuditLogs();

  const [activeTab, setActiveTab] = useState<'audit_trail' | 'sessions' | 'pen_test' | 'gdpr'>('audit_trail');
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Sicherheits-Audit, Datenschutz & Systemhärtung</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Übersicht vorhandener Sicherheits- und Datenschutzfunktionen. Diese Ansicht ist keine BSI-/DIN-Zertifizierungsprüfung oder externe Sicherheitsfreigabe.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-semibold">
            RLS-Livestatus: NICHT VERIFIZIERT
          </span>
        </div>
      </div>

      <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        TEILWEISE IMPLEMENTIERT: Diese Ansicht enthält Beispieldaten und lokale UI-Ereignisse,
        keine vollständigen serverseitigen Audit- oder Sitzungsdaten. Fernwiderruf,
        Penetrationstest und Datenschutzauskunft sind hier nicht angebunden.
        Die eigene Sitzung kann über „Abmelden“ serverseitig widerrufen werden.
      </p>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Aktiver Mandanten-Scope</span>
          <span className="text-sm font-bold text-slate-100 mt-1 block truncate">{tenant.name}</span>
          <span className="text-[10px] text-blue-400 font-mono">BWR: {tenant.bwrRegisterId}</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Aktive Gerätesitzungen</span>
          <span className="text-sm font-bold text-slate-100 mt-1 block">Nicht angebunden</span>
          <span className="text-[10px] text-slate-400">MFA-Status nicht verifiziert</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Lokale Auditansicht</span>
          <span className="text-sm font-bold text-slate-100 mt-1 block">{auditLogs.length} Ereignisse</span>
          <span className="text-[10px] text-slate-400">Keine nachgewiesene Revisionssicherheit</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Passwort-Kryptografie</span>
          <span className="text-sm font-bold text-emerald-400 mt-1 block">Argon2id KDF</span>
          <span className="text-[10px] text-slate-400">Backendimplementierung; keine Live-Parameterprüfung</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('audit_trail')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            activeTab === 'audit_trail' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Lokale Auditansicht ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            activeTab === 'sessions' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Sitzungen & Geräte (Beispiele)
        </button>
        <button
          onClick={() => setActiveTab('pen_test')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            activeTab === 'pen_test' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Sicherheitsprüfung (nicht angebunden)
        </button>
        <button
          onClick={() => setActiveTab('gdpr')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            activeTab === 'gdpr' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          DSGVO Lösch- & Aufbewahrungsfristen
        </button>
      </div>

      {/* Tab 1: Audit Log */}
      {activeTab === 'audit_trail' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Lokale Ereignisse und Beispieldaten</h2>
              <p className="text-xs text-slate-400">Nicht serverbestätigt, nicht vollständig und nicht unveränderlich. Keine Sicherheitsabnahme.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Zeitpunkt</th>
                  <th className="p-3">Akteur</th>
                  <th className="p-3">Aktion</th>
                  <th className="p-3">Schweregrad</th>
                  <th className="p-3">Zielobjekt</th>
                  <th className="p-3">Details</th>
                  <th className="p-3 text-right">IP-Adresse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 text-slate-400 text-[11px]">{log.timestamp}</td>
                    <td className="p-3 font-sans">
                      <div className="font-semibold text-slate-200">{log.actorEmail}</div>
                      <div className="text-[10px] text-slate-400">{log.actorRole}</div>
                    </td>
                    <td className="p-3 text-[11px] text-blue-400 font-bold">{log.actionType}</td>
                    <td className="p-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.severity === 'KRITISCH'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : log.severity === 'WARNUNG'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-sans text-xs">{log.targetEntity}</td>
                    <td className="p-3 font-sans text-xs text-slate-400 max-w-xs">{log.details}</td>
                    <td className="p-3 text-right text-slate-400 text-[11px]">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Sessions */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Beispielgeräte, keine tatsächlichen Anmeldungen:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSessions.map((sess) => (
              <div
                key={sess.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-slate-800 text-blue-400">
                      {sess.deviceName.toLowerCase().includes('tablet') || sess.deviceName.toLowerCase().includes('phone') ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <Laptop className="w-4 h-4" />
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sess.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {sess.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-200 text-xs mt-3">{sess.deviceName}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">{sess.browser}</p>

                  <div className="mt-3 text-[11px] text-slate-500 space-y-1 font-mono">
                    <div>IP: {sess.ipAddress}</div>
                    <div>Aktivität: {sess.lastActivity}</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  {sess.isCurrentSession ? (
                    <span className="text-[11px] text-slate-400">Beispiel, nicht dieses Gerät</span>
                  ) : sess.status === 'ACTIVE' ? (
                    <button
                      disabled
                      className="px-3 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                    >
                      Sitzungsverwaltung nicht angebunden
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500">Beispielstatus, nicht serverbestätigt</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Automated Pen-Test */}
      {activeTab === 'pen_test' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Sicherheitsprüfungen: OFFEN</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Keine ausführbare Prüfsuite in dieser Oberfläche angebunden.
                CI-Ergebnisse gelten nur für den jeweils geprüften Commit;
                ein unabhängiger Penetrationstest bleibt erforderlich.
              </p>
            </div>

            <button
              disabled
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <span>Keine Prüfsuite angebunden</span>
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Es wurde kein Test gestartet. Diese Ansicht erzeugt keine Prüfergebnisse oder Freigaben.
          </div>
        </div>
      )}

      {/* Tab 4: GDPR Retention */}
      {activeTab === 'gdpr' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white">DSGVO Aufbewahrungs- & Löschkonzept</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Beispielhafte Fristen, nicht rechtlich freigegeben oder als Löschlauf implementiert.
              Die konkrete Rechtsgrundlage und Aufbewahrung müssen vor dem Einsatz geprüft werden.
            </p>
          </div>

          <div className="space-y-3">
            {gdprPolicies.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-200 text-sm">{p.category}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Rechtsgrundlage: {p.statutoryBasis}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Beispiel-Frist: <strong className="text-slate-300">{p.retentionYears} Jahre</strong> • Automatische Bereinigung: nicht implementiert
                  </div>
                </div>

                <button
                  disabled
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold shrink-0"
                >
                  Auskunfts-Export nicht implementiert
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
