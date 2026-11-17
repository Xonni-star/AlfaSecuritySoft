import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  ShieldCheck,
  CheckCircle2,
  Printer,
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  Plus,
  Trash2,
  Copy,
  Users,
  Building2,
  Clock,
  ShieldAlert,
  Key,
  Layers,
  FileText,
  AlertTriangle,
  Play
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { useSecurityStore } from '../store';
import { ReportDefinition, ReportCategory, UserRole } from '../types';
import { planningApi, WorkHoursReportRow } from '../services/planningService';
import { getReportDateRange, isDateInRange, ReportPeriod } from '../reportingMetrics';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const serializeCsvCell = (value: unknown): string => {
  let text = String(value ?? '');
  // Neutralize text formulas even after whitespace, control characters, or a BOM.
  if (typeof value === 'string' && /^[\s\u0000-\u001f\u007f-\u009f]*[=+\-@]/u.test(text)) {
    text = `'${text}`;
  }
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const ReportsModule: React.FC = () => {
  const {
    getTenantReportDefinitions,
    addReportDefinition,
    deleteReportDefinition,
    getTenantClients,
    getTenantSites,
    getTenantEmployees,
    getTenantShifts,
    getTenantGuardBook,
    getTenantKeys,
    getTenantTasks,
    getCurrentTenant,
    currentUserRole,
    currentTenantId,
    currentUserId,
    authUser
  } = useSecurityStore();

  const tenant = getCurrentTenant();
  const reportDefs = getTenantReportDefinitions();
  const clients = getTenantClients();
  const sites = getTenantSites();
  const employees = getTenantEmployees();
  const shifts = getTenantShifts();
  const guardBook = getTenantGuardBook();
  const keys = getTenantKeys();
  const tasks = getTenantTasks();

  const [activeTab, setActiveTab] = useState<'controlling' | 'generator' | 'export_audit'>('controlling');
  const [dateRangeFilter, setDateRangeFilter] = useState<ReportPeriod>('THIS_MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [hoursReportResult, setHoursReportResult] = useState<{ key: string; rows: WorkHoursReportRow[] }>({ key: '', rows: [] });
  const [hoursReportError, setHoursReportError] = useState('');
  const [hoursReportLoading, setHoursReportLoading] = useState(false);
  const dateRange = useMemo(() => getReportDateRange(dateRangeFilter, new Date(), {
    from: customFrom,
    to: customTo
  }), [dateRangeFilter, customFrom, customTo]);
  const tenantReportGrant = authUser?.permissions.includes('planning:reports:read') ?? false;
  const reportSites = (authUser?.sitePermissions ?? [])
    .filter(grant => grant.code === 'planning:reports:read').map(grant => grant.siteId).sort();
  const canReadHours = tenantReportGrant || reportSites.length > 0;
  const requestKey = JSON.stringify([
    currentTenantId || tenant.id, authUser?.id || currentUserId,
    tenantReportGrant ? 'tenant' : reportSites, dateRange.from, dateRange.to
  ]);
  const hoursReport = canReadHours && hoursReportResult.key === requestKey ? hoursReportResult.rows : [];
  const isCalendarDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  const customRangeValid = dateRangeFilter !== 'CUSTOM' ||
    (isCalendarDate(customFrom) && isCalendarDate(customTo) && customFrom <= customTo);

  useEffect(() => {
    setHoursReportResult({ key: requestKey, rows: [] });
    if (!canReadHours) {
      setHoursReportError('');
      setHoursReportLoading(false);
      return;
    }
    if (!customRangeValid) {
      setHoursReportError('Bitte wählen Sie einen gültigen Zeitraum aus.');
      setHoursReportLoading(false);
      return;
    }

    let active = true;
    setHoursReportLoading(true);
    setHoursReportError('');
    planningApi.workHoursReport(dateRange.from, dateRange.to)
      .then((rows) => { if (active) setHoursReportResult({ key: requestKey, rows }); })
      .catch((error: unknown) => {
        if (!active) return;
        setHoursReportResult({ key: requestKey, rows: [] });
        setHoursReportError(error instanceof Error ? error.message : 'Arbeitszeitbericht konnte nicht geladen werden.');
      })
      .finally(() => { if (active) setHoursReportLoading(false); });
    return () => { active = false; };
  }, [dateRange.from, dateRange.to, customRangeValid, canReadHours, requestKey]);

  // Generator State
  const [genName, setGenName] = useState('');
  const [genCategory, setGenCategory] = useState<ReportCategory>('GESCHAEFTSFUEHRUNG');
  const [genSource, setGenSource] = useState<ReportDefinition['dataSource']>('shifts');
  const [genInterval, setGenInterval] = useState<ReportDefinition['scheduleInterval']>('MONTHLY');
  const [previewData, setPreviewData] = useState<any[]>([]);

  const filteredShifts = useMemo(() => customRangeValid ? shifts.filter((shift) =>
    shift.planningStatus !== 'cancelled' && isDateInRange(shift.date, dateRange)
  ) : [], [shifts, dateRange, customRangeValid]);
  const filteredGuardBook = useMemo(() => customRangeValid ? guardBook.filter((entry) =>
    isDateInRange(entry.timestamp, dateRange)
  ) : [], [guardBook, dateRange, customRangeValid]);

  const shiftHoursComparison = useMemo(() => {
    return hoursReport.map((row) => ({
      name: `${row.first_name} ${row.last_name}`,
      Soll: row.planned_hours,
      Ist: row.actual_status === 'complete' && row.actual_hours !== null ? row.actual_hours : null
    }));
  }, [hoursReport]);

  const plannedHours = hoursReport.reduce((sum, row) => sum + row.planned_hours, 0);
  const actualHoursComplete = hoursReport.length > 0 &&
    hoursReport.every((row) => row.actual_status === 'complete' && row.actual_hours !== null);
  const approvedActualHours = actualHoursComplete
    ? hoursReport.reduce((sum, row) => sum + (row.actual_hours ?? 0), 0)
    : null;

  const incidentsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredGuardBook.forEach((g) => {
      counts[g.category] = (counts[g.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredGuardBook]);

  const employeeStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach((e) => {
      counts[e.status] = (counts[e.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const expiringQualificationsCount = employees.reduce((count, employee) =>
    count + (employee.qualifications ?? []).filter((qualification) => {
      if (!qualification.expiryDate) return false;
      const expiry = Date.parse(qualification.expiryDate);
      return Number.isFinite(expiry) && expiry >= Date.now() && expiry <= Date.now() + 30 * 86_400_000;
    }).length, 0);
  const expiringContractsCount = clients.filter((client) => {
    const expiry = Date.parse(client.contractEnd);
    return Number.isFinite(expiry) && expiry >= Date.now() && expiry <= Date.now() + 90 * 86_400_000;
  }).length;
  const openTasksCount = tasks.filter((task) => task.status !== 'Erledigt').length;
  // Export Handlers
  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportCSV = (dataSource: string) => {
    let rows: any[] = [];
    if (dataSource === 'shifts') {
      rows = filteredShifts.map((s) => ({
        ID: s.id,
        Objekt: s.siteName,
        Datum: s.date,
        Uhrzeit: `${s.startTime}-${s.endTime}`,
        Typ: s.type,
        Status: s.status,
        Mitarbeiter: s.employeeName || 'Unbesetzt'
      }));
    } else if (dataSource === 'guardbook') {
      rows = filteredGuardBook.map((g) => ({
        ID: g.id,
        Zeitpunkt: g.timestamp,
        Objekt: g.siteName,
        Kategorie: g.category,
        Prioritaet: g.priority,
        Titel: g.title,
        Wachkraft: g.guardName,
        Status: g.stage
      }));
    } else {
      rows = employees.map((e) => ({
        Personalnr: e.personnelNumber,
        Name: `${e.firstName} ${e.lastName}`,
        Rolle: e.role,
        Status: e.status,
        Stunden: e.weeklyHours,
        Eintritt: e.dateOfJoining
      }));
    }

    if (rows.length === 0) {
      alert('Keine Datensätze für diesen Export vorhanden.');
      return;
    }

    const headers = Object.keys(rows[0]).map(serializeCsvCell).join(';');
    const csvContent = '\uFEFF' + [headers, ...rows.map((r) => Object.values(r).map(serializeCsvCell).join(';'))].join('\r\n');
    const encodedUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AlfaSecuritySoft_${dataSource}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCreateCustomReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genName.trim()) return;

    addReportDefinition({
      tenantId: tenant.id,
      name: genName,
      description: `Benutzerdefinierte Auswertung über Datenquelle ${genSource}.`,
      category: genCategory,
      requiredRole: [UserRole.ADMIN, UserRole.GF],
      dataSource: genSource,
      selectedColumns: ['id', 'status', 'createdAt'],
      filterConfig: { dateRange: dateRangeFilter, from: dateRange.from, to: dateRange.to },
      scheduleInterval: genInterval
    });

    setGenName('');
    alert('Berichtsvorlage erfolgreich angelegt!');
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Berichtswesen, Controlling & Management-Dashboard</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tenantbezogene Auswertungen für {tenant.name}. Arbeitszeitberichte werden serverseitig berechtigt und nach dem ausgewählten Zeitraum geladen.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExportCSV('guardbook')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel / CSV Export</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF Druckversion</span>
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Angemeldete Rolle:</span>
          <span className="text-blue-300 font-semibold">{currentUserRole}</span>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Zeitraum:</span>
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value as ReportPeriod)}
            className="bg-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
          >
            <option value="TODAY">Heute</option>
            <option value="YESTERDAY">Gestern</option>
            <option value="THIS_WEEK">Aktuelle Woche</option>
            <option value="LAST_WEEK">Vorherige Woche</option>
            <option value="THIS_MONTH">Aktueller Monat</option>
            <option value="LAST_MONTH">Vorheriger Monat</option>
            <option value="THIS_QUARTER">Aktuelles Quartal</option>
            <option value="LAST_QUARTER">Vorheriges Quartal</option>
            <option value="THIS_YEAR">Aktuelles Jahr</option>
            <option value="CUSTOM">Benutzerdefiniert</option>
          </select>
          {dateRangeFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="report-range-from">Von</label>
              <input id="report-range-from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-slate-800 text-slate-200 px-2 py-1.5 rounded-lg border border-slate-700" />
              <span className="text-slate-500">bis</span>
              <label className="sr-only" htmlFor="report-range-to">Bis</label>
              <input id="report-range-to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="bg-slate-800 text-slate-200 px-2 py-1.5 rounded-lg border border-slate-700" />
            </div>
          )}
          <span role="status" className="text-slate-500">{dateRange.from} – {dateRange.to}</span>
        </div>
      </div>

      {/* Tenant-scoped metrics; hours come from the authorized server report. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Planstunden (zugewiesene Dienste)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-100">
              {!canReadHours ? '—' : hoursReportLoading ? '…' : hoursReportError ? '—' : `${plannedHours.toFixed(1)} h`}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Zeitfenster und Pausen aus Dienstplanung</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Genehmigte Ist-Stunden</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-100">{approvedActualHours === null ? '—' : `${approvedActualHours.toFixed(1)} h`}</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {!canReadHours ? 'Keine Berechtigung für Arbeitszeitberichte' : hoursReportError ? hoursReportError : actualHoursComplete ? 'Alle zugewiesenen Ist-Zeiten genehmigt' : 'Nicht vollständig genehmigt oder keine Daten'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Personalbestand</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-100">{employees.filter((employee) => employee.status === 'Aktiv').length}</span>
            <span className="text-xs text-slate-400">/ {employees.length} Gesamt</span>
          </div>
          <span className="text-[10px] text-amber-400 font-medium">{expiringQualificationsCount} Nachweise in 30 Tagen fällig</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Offene Aufgaben</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-100">{openTasksCount}</span>
          </div>
          <span className="text-[10px] text-slate-500">Mandantbezogener Aufgabenbestand</span>
        </div>
      </div>
      {!canReadHours && <p role="status" className="text-xs text-slate-400">
        Keine Berechtigung für Arbeitszeitberichte. Andere verfügbare Auswertungen bleiben zugänglich.
      </p>}
      {hoursReportError && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        Arbeitszeitdaten konnten für {dateRange.from} bis {dateRange.to} nicht geladen werden. Prüfen Sie die Berichtsberechtigung oder die Verbindung.
      </p>}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('controlling')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'controlling' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Controlling & Analysecharts</span>
        </button>
        <button
          onClick={() => setActiveTab('generator')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'generator' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Berichtsgenerator & Vorlagen ({reportDefs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('export_audit')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'export_audit' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Schichtübersicht</span>
        </button>
      </div>

      {/* Tab 1: Real Visual Charts & Analytics */}
      {activeTab === 'controlling' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Server-authorized work-hour report */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Plan- und genehmigte Ist-Stunden je Mitarbeiter</h3>
                <p className="text-xs text-slate-400">Ist-Stunden erscheinen nur bei vollständig genehmigten Zeitnachweisen</p>
              </div>
              <span className="text-[11px] font-mono text-blue-400 font-bold">{filteredShifts.length} Schichten im Zeitraum</span>
            </div>

            <div className="h-64 w-full">
              {!canReadHours ? <p className="pt-12 text-center text-xs text-slate-400">Keine Berechtigung für Arbeitszeitberichte.</p>
                : hoursReportLoading ? <p role="status" className="pt-12 text-center text-xs text-slate-400">Arbeitszeitbericht wird geladen.</p>
                : hoursReportError ? <p className="pt-12 text-center text-xs text-amber-300">Arbeitszeitbericht nicht verfügbar.</p>
                  : shiftHoursComparison.length === 0 ? <p className="pt-12 text-center text-xs text-slate-500">Keine zugewiesenen Schichten im ausgewählten Zeitraum.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftHoursComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="Soll" name="Geplant (netto)" fill="#334155" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ist" name="Ist (genehmigt)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Incidents by Category */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Vorfallsverteilung nach Kategorien</h3>
                <p className="text-xs text-slate-400">Ereignisse im gewählten Zeitraum</p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">{filteredGuardBook.length} Einträge</span>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incidentsByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  >
                    {incidentsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Role Perspective Box: Specific Insights */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-sm">
                Fokussierte Auswertung für angemeldete Rolle: <span className="text-blue-400">{currentUserRole}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Serverseitige Berechtigungsprüfung</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Verträge mit Ende in 90 Tagen:</span>
                <span className="text-sm font-bold text-amber-400 mt-1 block">
                  {expiringContractsCount} Verträge
                </span>
                <span className="text-[10px] text-slate-500">Enddatum liegt im nächsten Quartal</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Schlüssel im Umlauf:</span>
                <span className="text-sm font-bold text-slate-200 mt-1 block">
                  {keys.filter(k => k.status === 'Ausgegeben').length} ausgegeben
                </span>
                <span className={`text-[10px] ${keys.filter(k => k.status === 'Verlustmeldung').length ? 'text-rose-400' : 'text-slate-500'}`}>
                  {keys.filter(k => k.status === 'Verlustmeldung').length} Verlustmeldungen
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Unbesetzte Schichten:</span>
                <span className="text-sm font-bold text-rose-400 mt-1 block">
                  {filteredShifts.filter(s => s.status === 'Offen').length} Schichten
                </span>
                <span className="text-[10px] text-slate-500">Ersatzgestellung erforderlich</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Custom Report Generator & Template Management */}
      {activeTab === 'generator' && (
        <div className="space-y-6 text-xs">
          {/* Create Custom Report Form */}
          <form onSubmit={handleCreateCustomReport} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white">Benutzerdefinierte Berichtsvorlage</h3>
              <p className="text-slate-400 text-xs">Vorlagen verweisen auf vordefinierte Datenquellen.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Berichtsname *</label>
                <input
                  type="text"
                  value={genName}
                  onChange={(e) => setGenName(e.target.value)}
                  placeholder="z. B. Quartalsbericht Revierdienst"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Kategorie</label>
                <select
                  value={genCategory}
                  onChange={(e) => setGenCategory(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                >
                  <option value="GESCHAEFTSFUEHRUNG">Geschäftsführung</option>
                  <option value="EINSATZLEITUNG">Einsatzleitung</option>
                  <option value="OBJEKTLEITUNG">Objektleitung</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="WACHBUCH_EREIGNISSE">Wachbuch & Ereignisse</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Datenquelle</label>
                <select
                  value={genSource}
                  onChange={(e) => setGenSource(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                >
                  <option value="shifts">Dienstplan & Arbeitszeiten (shifts)</option>
                  <option value="guardbook">Digitales Wachbuch & Vorfälle (guardbook)</option>
                  <option value="employees">Personal & Qualifikationen (employees)</option>
                  <option value="clients">Kunden & Verträge (clients)</option>
                  <option value="sites">Schutzobjekte (sites)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
              >
                Vorlage speichern
              </button>
            </div>
          </form>

          {/* List of Report Definitions */}
          <div className="space-y-3">
            <span className="font-bold text-slate-300 block">Gespeicherte Berichtsvorlagen:</span>
            {reportDefs.map((def) => (
              <div
                key={def.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-sm">{def.name}</span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-blue-400">
                      {def.category}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">{def.description}</p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Quelle: {def.dataSource} • Turnus: {def.scheduleInterval} • Letzter Export: {def.lastGeneratedAt || 'Nie'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleExportCSV(def.dataSource)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Exportieren</span>
                  </button>
                  <button
                    onClick={() => deleteReportDefinition(def.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Printable Table */}
      {activeTab === 'export_audit' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm text-xs">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Schichtübersicht ({filteredShifts.length} Schichten)</h2>
              <p className="text-xs text-slate-400">Planungsdaten im ausgewählten Zeitraum; keine Abrechnungs- oder Rechtskonformitätsbestätigung</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-700 text-slate-300 border border-slate-600">
              Planungsübersicht
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Datum & Schicht</th>
                  <th className="p-3">Schutzobjekt</th>
                  <th className="p-3">Eingeteilte Wachkraft</th>
                  <th className="p-3">Geforderte Qualifikation</th>
                  <th className="p-3">Stunden</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredShifts.map((sh) => (
                  <tr key={sh.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 text-slate-200">
                      <div>{sh.date}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{sh.startTime} - {sh.endTime} ({sh.type})</div>
                    </td>
                    <td className="p-3 font-sans text-slate-300">{sh.siteName}</td>
                    <td className="p-3 font-sans font-semibold text-slate-200">
                      {sh.employeeName || <span className="text-rose-400 font-bold">Unbesetzt</span>}
                    </td>
                    <td className="p-3 font-sans text-[11px] text-blue-400">{sh.requiredQualification}</td>
                    <td className="p-3 text-slate-400" title="Eine exakte Dauer erfordert Zeitzone, Pause und freigegebene Ist-Zeiten.">—</td>
                    <td className="p-3 text-right font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sh.status === 'Besetzt' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {sh.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
