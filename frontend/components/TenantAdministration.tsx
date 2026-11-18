import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Building2, Plus, RefreshCw, Save, X } from 'lucide-react';
import { AuthUser, useSecurityStore } from '../store';
import { apiClient } from '../services/apiClient';

type LicenseTier = 'ENTERPRISE' | 'PROFESSIONAL' | 'STANDARD';
type ManagedTenant = {
  id: string;
  name: string;
  subdomain: string;
  tax_number: string;
  license_tier: LicenseTier;
  bwr_register_id: string;
  din77200_certified: boolean;
  is_active: boolean;
};
type TenantForm = {
  name: string;
  subdomain: string;
  taxNumber: string;
  licenseTier: LicenseTier;
  bwrRegisterId: string;
  din77200Certified: boolean;
};

const emptyForm: TenantForm = {
  name: '',
  subdomain: '',
  taxNumber: '',
  licenseTier: 'PROFESSIONAL',
  bwrRegisterId: '',
  din77200Certified: false
};
const input = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500';
const button = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50';

export const TenantAdministration: React.FC<{ authUser: AuthUser }> = ({ authUser }) => {
  const [tenants, setTenants] = useState<ManagedTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedTenant | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);

  const loadTenants = useCallback(async () => {
    if (!authUser.isSuperAdmin) {
      setLoading(false);
      setError('Die Mandantenverwaltung ist ausschließlich Systemadministratoren vorbehalten.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setTenants(await apiClient.get<ManagedTenant[]>('/system/tenants'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Mandanten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [authUser.isSuperAdmin]);

  useEffect(() => { void loadTenants(); }, [loadTenants]);

  const beginCreate = () => {
    setFormOpen(true);
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setNotice('');
  };

  const beginEdit = (tenant: ManagedTenant) => {
    setFormOpen(true);
    setEditing(tenant);
    setForm({
      name: tenant.name,
      subdomain: tenant.subdomain,
      taxNumber: tenant.tax_number,
      licenseTier: tenant.license_tier,
      bwrRegisterId: tenant.bwr_register_id,
      din77200Certified: tenant.din77200_certified
    });
    setError('');
    setNotice('');
  };

  const saveTenant = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editing) {
        await apiClient.patch(`/system/tenants/${editing.id}`, form);
        setNotice('Mandantendaten wurden gespeichert.');
      } else {
        await apiClient.post('/system/tenants', form);
        setNotice('Mandant wurde angelegt.');
      }
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await loadTenants();
      await useSecurityStore.getState().restoreSession();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Mandant konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTenant = async (tenant: ManagedTenant) => {
    const action = tenant.is_active ? 'deaktiviert' : 'reaktiviert';
    if (!window.confirm(`Soll der Mandant „${tenant.name}“ wirklich ${action} werden?`)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiClient.patch(`/system/tenants/${tenant.id}`, { isActive: !tenant.is_active });
      setNotice(`Mandant wurde ${action}.`);
      await loadTenants();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Mandantenstatus konnte nicht geändert werden.');
    } finally {
      setSaving(false);
    }
  };

  if (!authUser.isSuperAdmin) {
    return (
      <section className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200" role="alert">
        Die Mandantenverwaltung ist ausschließlich Systemadministratoren vorbehalten.
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            <Building2 className="h-5 w-5 text-blue-400" />
            Mandantenverwaltung
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Systemweite Mandantenstammdaten. Mandantenwechsel sowie Benutzer und Rollen werden getrennt verwaltet.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={button} onClick={() => void loadTenants()} disabled={loading || saving}>
            <RefreshCw className="h-3.5 w-3.5" /> Aktualisieren
          </button>
          <button type="button" className={button} onClick={beginCreate} disabled={saving}>
            <Plus className="h-3.5 w-3.5" /> Neuer Mandant
          </button>
        </div>
      </header>

      {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200" role="alert">{error}</p>}
      {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200" role="status">{notice}</p>}

      {formOpen && (
        <form onSubmit={saveTenant} className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-2" aria-label="Mandantendaten">
          <label className="space-y-1 text-xs text-slate-300">
            <span>Name</span>
            <input className={input} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} maxLength={200} required />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            <span>Subdomain</span>
            <input className={input} value={form.subdomain} onChange={event => setForm({ ...form, subdomain: event.target.value })} maxLength={100} pattern="[A-Za-z0-9](?:[A-Za-z0-9-]{0,98}[A-Za-z0-9])?" required />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            <span>Steuernummer</span>
            <input className={input} value={form.taxNumber} onChange={event => setForm({ ...form, taxNumber: event.target.value })} maxLength={50} required />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            <span>Bewacherregister-ID</span>
            <input className={input} value={form.bwrRegisterId} onChange={event => setForm({ ...form, bwrRegisterId: event.target.value })} maxLength={50} required />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            <span>Lizenzstufe</span>
            <select className={input} value={form.licenseTier} onChange={event => setForm({ ...form, licenseTier: event.target.value as LicenseTier })}>
              <option value="ENTERPRISE">Enterprise</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="STANDARD">Standard</option>
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-xs text-slate-300">
            <input type="checkbox" checked={form.din77200Certified} onChange={event => setForm({ ...form, din77200Certified: event.target.checked })} />
            DIN-77200-Zertifizierung als Selbstauskunft angegeben (nicht verifiziert)
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={`${button} border-blue-500/40 bg-blue-600/20`} disabled={saving}>
              <Save className="h-3.5 w-3.5" /> {saving ? 'Speichern…' : 'Mandant speichern'}
            </button>
            <button type="button" className={button} onClick={() => { setFormOpen(false); setEditing(null); setForm(emptyForm); }}>
              <X className="h-3.5 w-3.5" /> Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">Mandant</th>
              <th className="p-3">Subdomain</th>
              <th className="p-3">Lizenz</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/50">
            {loading ? (
              <tr><td className="p-4 text-slate-400" colSpan={5} role="status">Mandanten werden geladen…</td></tr>
            ) : tenants.map(tenant => (
              <tr key={tenant.id}>
                <td className="p-3">
                  <span className="block font-semibold text-slate-100">{tenant.name}</span>
                  <span className="text-slate-500">{tenant.bwr_register_id}</span>
                </td>
                <td className="p-3 font-mono text-slate-300">{tenant.subdomain}</td>
                <td className="p-3 text-slate-300">{tenant.license_tier}</td>
                <td className="p-3">
                  <span className={tenant.is_active ? 'text-emerald-300' : 'text-amber-300'}>
                    {tenant.is_active ? 'Aktiv' : 'Deaktiviert'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button type="button" className={button} onClick={() => beginEdit(tenant)}>Bearbeiten</button>
                    <button type="button" className={button} onClick={() => void toggleTenant(tenant)} disabled={saving}>
                      {tenant.is_active ? 'Deaktivieren' : 'Reaktivieren'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && tenants.length === 0 && (
              <tr><td className="p-4 text-slate-400" colSpan={5}>Noch keine Mandanten vorhanden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
