import React, { useEffect, useRef, useState } from 'react';
import { Building2, Plus, FileCheck, Shield, Phone, Mail, MapPin, Pencil, Archive } from 'lucide-react';
import { useSecurityStore } from '../store';

export const ClientsModule: React.FC = () => {
  const { clients, addClient, updateClient, archiveClient, currentTenantId, currentUserId, authUser } = useSecurityStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<(typeof clients)[number] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const identity = `${currentTenantId}:${authUser?.id || currentUserId}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [contractStart, setContractStart] = useState('');
  const [contractEnd, setContractEnd] = useState('');
  const [contractAutoRenew, setContractAutoRenew] = useState(false);
  const [noticePeriodMonths, setNoticePeriodMonths] = useState(0);
  const [slaLevel, setSlaLevel] = useState<'Gold (24/7 Vor-Ort)' | 'Silber (Revierdienst)' | 'Bronze (Alarmverfolgung)'>('Gold (24/7 Vor-Ort)');

  useEffect(() => {
    setIsModalOpen(false);
    setEditingClient(null);
    setCompanyName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setClientNumber(''); setContractStart(''); setContractEnd('');
    setContractAutoRenew(false); setNoticePeriodMonths(0);
    setSlaLevel('Gold (24/7 Vor-Ort)');
    setIsSaving(false);
    setSaveError('');
  }, [identity]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setSaveError('');
    setIsSaving(true);
    try {
      const saved = editingClient
        ? await updateClient(editingClient.id, { clientNumber, companyName, contactPerson, email, phone, address, slaLevel, contractStart, contractEnd, contractAutoRenew, noticePeriodMonths })
        : await addClient({
      clientNumber,
      companyName,
      contactPerson,
      email,
      phone,
      address,
      contractStart,
      contractEnd,
      contractAutoRenew,
      noticePeriodMonths,
      slaLevel,
      billingStatus: 'Regulär',
      assignedSiteCount: 0
        });
      if (identityRef.current !== identity) return;
      if (saved) {
        setEditingClient(null);
        setIsModalOpen(false);
      } else setSaveError('Die Speicherung wurde nicht bestätigt. Die Eingaben bleiben erhalten.');
    } catch (error) {
      if (identityRef.current === identity) setSaveError(error instanceof Error ? error.message : 'Kunde nicht gespeichert.');
    } finally {
      if (identityRef.current === identity) setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Kunden- & Vertragsverwaltung</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mandantenstammdaten, SLA-Vereinbarungen, Bewachungsverträge und Rechnungsstatus.
          </p>
        </div>

        <button
          disabled={isSaving}
          onClick={() => {
            setEditingClient(null); setSaveError(''); setCompanyName(''); setContactPerson('');
            setEmail(''); setPhone(''); setAddress(''); setClientNumber('');
            setContractStart(''); setContractEnd(''); setContractAutoRenew(false);
            setNoticePeriodMonths(0); setSlaLevel('Gold (24/7 Vor-Ort)'); setIsModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 transition flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Mandant hinzufügen</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => (
          <div key={c.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-bold">
                  {c.clientNumber}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {c.billingStatus}
                </span>
              </div>

              <h3 className="font-bold text-slate-200 text-sm mt-3">{c.companyName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ansprechpartner: {c.contactPerson}</p>

              <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300 truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300">{c.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300 truncate">{c.address}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-blue-400">{c.slaLevel}</span>
              <span className="text-slate-500 text-[10px]">Vertrag bis: {c.contractEnd}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className="text-xs text-blue-300 hover:text-white flex items-center gap-1" onClick={() => {
                if (isSaving) return;
                setSaveError('');
                setEditingClient(c);
                setCompanyName(c.companyName); setContactPerson(c.contactPerson); setEmail(c.email); setPhone(c.phone); setAddress(c.address); setSlaLevel(c.slaLevel);
                setClientNumber(c.clientNumber); setContractStart(c.contractStart); setContractEnd(c.contractEnd);
                setContractAutoRenew(c.contractAutoRenew); setNoticePeriodMonths(c.noticePeriodMonths);
                setIsModalOpen(true);
              }}><Pencil className="w-3.5 h-3.5" /> Bearbeiten</button>
              <button type="button" className="text-xs text-amber-300 hover:text-white flex items-center gap-1 ml-auto" onClick={() => {
                if (window.confirm(`„${c.companyName}“ archivieren? Zugeordnete Objekte bleiben erhalten.`)) void archiveClient(c.id);
              }}><Archive className="w-3.5 h-3.5" /> Archivieren</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">{editingClient ? 'Kundendaten bearbeiten' : 'Neuen Kunden erfassen'}</h3>
              <button disabled={isSaving} onClick={() => { setIsModalOpen(false); setEditingClient(null); }} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 mt-4 text-xs">
              <fieldset disabled={isSaving} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Firmenname *</label>
                <input
                  type="text"
                  value={companyName}
                  aria-label="Firmenname"
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Ansprechpartner *</label>
                <input
                  type="text"
                  value={contactPerson}
                  aria-label="Ansprechpartner"
                  onChange={(e) => setContactPerson(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">E-Mail</label>
                  <input
                    type="email"
                    value={email}
                    aria-label="Kunden-E-Mail"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={phone}
                    aria-label="Kunden-Telefon"
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Anschrift</label>
                <input
                  type="text"
                  value={address}
                  aria-label="Kundenanschrift"
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-slate-400">Kundennummer *
                  <input aria-label="Kundennummer" required minLength={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200" value={clientNumber} onChange={event => setClientNumber(event.target.value)} />
                </label>
                <label className="text-slate-400">Kündigungsfrist in Monaten
                  <input aria-label="Kündigungsfrist in Monaten" required type="number" min="0" max="2147483647" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200" value={noticePeriodMonths} onChange={event => setNoticePeriodMonths(Number(event.target.value))} />
                </label>
                <label className="text-slate-400">Vertragsbeginn *
                  <input aria-label="Vertragsbeginn" required type="date" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200" value={contractStart} onChange={event => setContractStart(event.target.value)} />
                </label>
                <label className="text-slate-400">Vertragsende *
                  <input aria-label="Vertragsende" required type="date" min={contractStart || undefined} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200" value={contractEnd} onChange={event => setContractEnd(event.target.value)} />
                </label>
                <label className="col-span-2 text-slate-400 flex gap-2 items-center">
                  <input aria-label="Automatische Vertragsverlängerung" type="checkbox" checked={contractAutoRenew} onChange={event => setContractAutoRenew(event.target.checked)} />
                  Automatische Vertragsverlängerung
                </label>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">SLA Stufe</label>
                <select
                  value={slaLevel}
                  onChange={(e) => setSlaLevel(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                >
                  <option value="Gold (24/7 Vor-Ort)">Gold (24/7 Vor-Ort)</option>
                  <option value="Silber (Revierdienst)">Silber (Revierdienst)</option>
                  <option value="Bronze (Alarmverfolgung)">Bronze (Alarmverfolgung)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingClient(null); }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  {isSaving ? 'Wird gespeichert…' : editingClient ? 'Änderungen speichern' : 'Kunde anlegen'}
                </button>
              </div>
              </fieldset>
              {saveError && <p role="alert" className="text-rose-300">{saveError}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
