import React, { useState } from 'react';
import {
  Bell,
  Mail,
  Check,
  X,
  Sliders,
  Filter
} from 'lucide-react';
import { useSecurityStore } from '../store';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ isOpen, onClose }) => {
  const {
    getTenantNotificationDeliveries,
    markNotificationAsRead,
    dismissNotification,
    authUser,
    currentTenantId
  } = useSecurityStore();

  const deliveries = getTenantNotificationDeliveries();

  const [activeTab, setActiveTab] = useState<'feed' | 'preferences'>('feed');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredDeliveries = deliveries.filter((d) => {
    return severityFilter === 'ALL' || d.severity === severityFilter;
  });

  const unreadCount = deliveries.filter((d) => !d.read).length;

  return (
    <div role="dialog" aria-modal="true" aria-label="Benachrichtigungscenter"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b1329] border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Zentrales Benachrichtigungscenter
                {unreadCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {unreadCount} Ungelesen
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Mandant: {authUser?.tenantName || currentTenantId} • Lokale In-App-Meldungen
              </p>
            </div>
          </div>

          <button onClick={onClose} aria-label="Benachrichtigungscenter schließen" className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Filter */}
        <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'feed' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Meldungen ({deliveries.length})
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'preferences' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Einstellungen</span>
            </button>
          </div>

          {activeTab === 'feed' && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={severityFilter}
                aria-label="Meldungen nach Schweregrad filtern"
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-800 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 text-xs focus:outline-none"
              >
                <option value="ALL">Alle Schweregrade</option>
                <option value="KRITISCH">Kritisch</option>
                <option value="ALARM">Alarm</option>
                <option value="WARNUNG">Warnung</option>
                <option value="INFO">Info</option>
              </select>
            </div>
          )}
        </div>

        {/* Feed Tab */}
        {activeTab === 'feed' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
            {filteredDeliveries.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Keine Benachrichtigungen für die ausgewählten Kriterien vorhanden.
              </div>
            ) : (
              filteredDeliveries.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition ${
                    item.read
                      ? 'bg-slate-900/60 border-slate-800/80 opacity-75'
                      : 'bg-slate-900 border-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg mt-0.5 ${
                      item.severity === 'KRITISCH'
                        ? 'bg-rose-500/20 text-rose-400'
                        : item.severity === 'ALARM'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {item.channel === 'EMAIL' ? <Mail className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{item.title}</span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-bold ${
                          item.severity === 'KRITISCH'
                            ? 'bg-rose-500/20 text-rose-400'
                            : item.severity === 'ALARM'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {item.severity}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.channel === 'IN_APP' ? 'Lokale In-App-Meldung' : `Kanal: ${item.channel} (${item.status})`}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.message}</p>

                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        Erstellt: {new Date(item.createdAt).toLocaleString('de-DE')} • Modul: {item.sourceModule}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!item.read && (
                      <button
                        onClick={() => markNotificationAsRead(item.id)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0"
                        aria-label={`Als gelesen markieren: ${item.title}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => dismissNotification(item.id)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0"
                      aria-label={`Meldung verwerfen: ${item.title}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Preferences Tab */
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            <span className="font-bold text-slate-200 block mb-2">Aktueller Funktionsumfang</span>
            <p>Dieses Center zeigt lokale Laufzeitmeldungen der aktuellen Sitzung. Lesen und Verwerfen
              werden nicht serverseitig gespeichert.</p>
            <p>E-Mail-/Push-Zustellung und konfigurierbare automatische Nachweis- oder
              Schlüsselrückgabe-Warnungen sind hier nicht angebunden. Deshalb können dafür
              keine Einstellungen gespeichert werden.</p>
            <p>Fachspezifische Alarm- und Planungsmeldungen bleiben in ihren jeweiligen Modulen.</p>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#0a0f1d] flex items-center justify-between text-xs text-slate-400">
          <span>Lokale Meldungen nur für diese Sitzung; kein serverseitiges Zustellprotokoll.</span>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
