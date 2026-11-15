import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Radio,
  FileCheck2,
  Users,
  Wifi,
  WifiOff,
  Bell,
  ArrowRightLeft,
  ChevronRight,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Menu
} from 'lucide-react';
import { useSecurityStore } from '../store';
import { MobileMyDuty } from './MobileMyDuty';
import { MobilePatrolScanner } from './MobilePatrolScanner';
import { MobileShiftHandover } from './MobileShiftHandover';
import { GuardBookModule } from './GuardBookModule';
import { SOPModule } from './SOPModule';
import { AlarmsModule } from './AlarmsModule';
import { TasksModule } from './TasksModule';
import { UserRole } from '../types';

export const MobileAppShell: React.FC = () => {
  const {
    currentUserName,
    currentUserRole,
    getCurrentTenant,
    isOnline,
    toggleNetworkSimulation,
    getTenantGuardBook,
    getTenantShifts,
    getTenantTasks,
    setActiveTab
  } = useSecurityStore();

  const tenant = getCurrentTenant();
  const guardBook = getTenantGuardBook();
  const shifts = getTenantShifts();
  const tasks = getTenantTasks();

  const [activeMobileView, setActiveMobileView] = useState<'home' | 'duty' | 'guardbook' | 'patrol' | 'handover' | 'sop' | 'tasks' | 'alarms'>('home');

  const unreadIncidents = guardBook.filter((g) => g.priority === 'Kritisch' && !g.resolved).length;
  const openTasks = tasks.filter((t) => t.status !== 'Erledigt').length;

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-6rem)] flex flex-col justify-between font-sans">
      {/* Mobile Top Header Banner */}
      <div className="mb-4 p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-slate-400 font-mono block leading-none">{tenant.name}</span>
          <div className="font-extrabold text-sm text-white mt-1 truncate max-w-[200px]">{currentUserName}</div>
          <span className="text-[10px] text-blue-400 font-medium">{currentUserRole}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleNetworkSimulation}
            className={`p-2 rounded-xl flex items-center gap-1 text-[11px] font-semibold transition ${
              isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/20 text-rose-400 animate-pulse'
            }`}
            title="Netzwerk umschalten"
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main View Switcher */}
      <div className="flex-1">
        {activeMobileView === 'home' && (
          <div className="space-y-4 pb-20 text-xs">
            {/* Quick Status Cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveMobileView('duty')}
                className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left hover:border-blue-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 w-fit mb-2 inline-flex">
                  <CalendarDays className="w-5 h-5" />
                </span>
                <span className="font-bold text-white text-sm block">Mein Dienst</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Schichten & Tausch</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMobileView('patrol')}
                className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left hover:border-blue-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit mb-2 inline-flex">
                  <Radio className="w-5 h-5" />
                </span>
                <span className="font-bold text-white text-sm block">Kontrollgang</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">QR & NFC Scanner</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMobileView('guardbook')}
                className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left hover:border-blue-500 transition relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 w-fit mb-2 inline-flex">
                  <BookOpen className="w-5 h-5" />
                </span>
                <span className="font-bold text-white text-sm block">Wachbuch</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Ereignisse erfassen</span>
                {unreadIncidents > 0 && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveMobileView('alarms')}
                className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left hover:border-rose-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 w-fit mb-2 inline-flex">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <span className="font-bold text-white text-sm block">Notfallmanagement</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Alarme melden & reagieren</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMobileView('handover')}
                className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left hover:border-blue-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit mb-2 inline-flex">
                  <FileCheck2 className="w-5 h-5" />
                </span>
                <span className="font-bold text-white text-sm block">Schichtwechsel</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Übergabeprotokoll</span>
              </button>
            </div>

            {/* Quick Action Links */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block mb-1">Weitere mobile Funktionen:</span>

              <button
                type="button"
                onClick={() => setActiveMobileView('tasks')}
                className="w-full p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-left hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <span>Meine Aufgaben</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {openTasks}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMobileView('sop')}
                className="w-full p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-left hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <span>Dienstanweisungen & QM</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="w-full p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-left hover:bg-slate-800/70 text-blue-400 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <span>Zurück zur Desktop-Leitstelle</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeMobileView === 'duty' && <MobileMyDuty />}
        {activeMobileView === 'patrol' && <MobilePatrolScanner />}
        {activeMobileView === 'handover' && <MobileShiftHandover />}
        {activeMobileView === 'guardbook' && <GuardBookModule />}
        {activeMobileView === 'sop' && <SOPModule />}
        {activeMobileView === 'tasks' && <TasksModule />}
        {activeMobileView === 'alarms' && <AlarmsModule />}
      </div>

      {/* Sticky Mobile Bottom Navigation Bar (WCAG AA Compliant Touch-Targets) */}
      <nav aria-label="Mobile Navigation" className="fixed bottom-0 left-0 right-0 h-16 bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 z-40 max-w-md mx-auto">
        <button
          type="button"
          aria-current={activeMobileView === 'home' ? 'page' : undefined}
          onClick={() => setActiveMobileView('home')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition ${
            activeMobileView === 'home' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          aria-current={activeMobileView === 'duty' ? 'page' : undefined}
          onClick={() => setActiveMobileView('duty')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition ${
            activeMobileView === 'duty' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset`}
        >
          <CalendarDays className="w-4 h-4 mb-0.5" />
          <span>Dienst</span>
        </button>

        {/* Central Scan Button */}
        <button
          type="button"
          aria-current={activeMobileView === 'patrol' ? 'page' : undefined}
          onClick={() => setActiveMobileView('patrol')}
          className="flex flex-col items-center justify-center -top-3 relative px-3 py-2 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-[#0a0f1d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
        >
          <Radio className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5">Scan</span>
        </button>

        <button
          type="button"
          aria-current={activeMobileView === 'guardbook' ? 'page' : undefined}
          onClick={() => setActiveMobileView('guardbook')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition ${
            activeMobileView === 'guardbook' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span>Wachbuch</span>
        </button>

        <button
          type="button"
          aria-current={activeMobileView === 'handover' ? 'page' : undefined}
          onClick={() => setActiveMobileView('handover')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition ${
            activeMobileView === 'handover' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset`}
        >
          <FileCheck2 className="w-4 h-4 mb-0.5" />
          <span>Übergabe</span>
        </button>
      </nav>
    </div>
  );
};
