import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, User, Clock, ArrowRightLeft } from 'lucide-react';
import { useSecurityStore } from '../store';

export const KeysModule: React.FC = () => {
  const { keys, employees, issueKey, returnKey, currentTenantId, currentUserId, authUser } = useSecurityStore();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [holderId, setHolderId] = useState(employees[0]?.id || '');
  const [returnDate, setReturnDate] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);
  const [returningKeyId, setReturningKeyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const identity = `${currentTenantId}:${authUser?.id || currentUserId}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const activeHolderId = employees.some(employee => employee.id === holderId) ? holderId : employees[0]?.id || '';

  useEffect(() => {
    setSelectedKeyId(null);
    setHolderId('');
    setReturnDate('');
    setIsIssuing(false);
    setReturningKeyId(null);
    setError('');
  }, [identity]);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isIssuing) return;
    const emp = employees.find((x) => x.id === activeHolderId);
    if (!selectedKeyId || !emp || !returnDate) {
      setError('Bitte einen verfügbaren Empfänger und eine Rückgabezeit angeben.');
      return;
    }

    setError('');
    setIsIssuing(true);
    try {
      const saved = await issueKey(selectedKeyId, `${emp.firstName} ${emp.lastName}`, emp.id, returnDate);
      if (identityRef.current !== identity) return;
      if (!saved) setError('Die Schlüsselausgabe wurde nicht bestätigt. Die Eingaben bleiben erhalten.');
      else setSelectedKeyId(null);
    } catch (failure) {
      if (identityRef.current === identity) setError(failure instanceof Error ? failure.message : 'Schlüsselausgabe fehlgeschlagen.');
    } finally {
      if (identityRef.current === identity) setIsIssuing(false);
    }
  };

  const handleReturn = async (keyId: string) => {
    if (returningKeyId) return;
    setError('');
    setReturningKeyId(keyId);
    try {
      const saved = await returnKey(keyId);
      if (identityRef.current === identity && !saved) setError('Die Schlüsselrücknahme wurde nicht bestätigt.');
    } catch (failure) {
      if (identityRef.current === identity) setError(failure instanceof Error ? failure.message : 'Schlüsselrücknahme fehlgeschlagen.');
    } finally {
      if (identityRef.current === identity) setReturningKeyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Schlüssel- & Zutrittsmedienverwaltung</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Lückenlose Dokumentation von Generalschlüsseln, Transpondern, Übergabequittungen und Rückgabefristen.
          </p>
        </div>
      </div>

      {error && !selectedKeyId && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {keys.map((k) => (
          <div
            key={k.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-bold">
                  {k.keyNumber}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  k.status === 'Im Tresor'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {k.status}
                </span>
              </div>

              <h3 className="font-bold text-slate-200 text-sm mt-3">{k.label}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{k.siteName}</p>
              <p className="text-[11px] text-slate-500 mt-1">Typ: {k.type}</p>

              {k.status === 'Ausgegeben' && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">
                  <div className="font-semibold">Aktueller Inhaber: {k.currentHolderName}</div>
                  <div className="text-[10px] text-amber-400/80 mt-1">Ausgabe: {k.issuedAt}</div>
                  <div className="text-[10px] text-amber-400/80">Rückgabe bis: {k.expectedReturn}</div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              {k.status === 'Im Tresor' ? (
                <button
                  onClick={() => { setError(''); setSelectedKeyId(k.id); }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  Ausgeben
                </button>
              ) : (
                <button
                  disabled={returningKeyId !== null}
                  onClick={() => void handleReturn(k.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
                >
                  Rücknahme bestätigen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedKeyId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Schlüssel ausgeben</h3>
            <form onSubmit={event => void handleIssue(event)} className="space-y-4 text-xs">
              {error && <p role="alert" className="text-rose-300">{error}</p>}
              <div>
                <label htmlFor="key-holder" className="block text-slate-400 mb-1">Empfänger (Mitarbeiter)</label>
                <select
                  id="key-holder"
                  required
                  disabled={isIssuing}
                  value={activeHolderId}
                  onChange={(e) => setHolderId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.personnelNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="key-return-date" className="block text-slate-400 mb-1">Geplante Rückgabe</label>
                <input
                  id="key-return-date"
                  type="datetime-local"
                  disabled={isIssuing}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isIssuing}
                  onClick={() => setSelectedKeyId(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isIssuing || !activeHolderId || !returnDate}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Ausgabe buchen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
