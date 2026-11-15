import React, { lazy, Suspense, useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { useSecurityStore } from './store';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SyncManagerModal } from './components/SyncManagerModal';
import { ModuleManager } from './components/ModuleManager';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { LoginScreen } from './components/LoginScreen';
import { X, AlertTriangle, RotateCcw } from 'lucide-react';

const Dashboard = lazy(() => import('./components/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));
const GuardBookModule = lazy(() => import('./components/GuardBookModule').then(({ GuardBookModule }) => ({ default: GuardBookModule })));
const RosterModule = lazy(() => import('./components/RosterModule').then(({ RosterModule }) => ({ default: RosterModule })));
const SitesModule = lazy(() => import('./components/SitesModule').then(({ SitesModule }) => ({ default: SitesModule })));
const ClientsModule = lazy(() => import('./components/ClientsModule').then(({ ClientsModule }) => ({ default: ClientsModule })));
const EmployeesModule = lazy(() => import('./components/EmployeesModule').then(({ EmployeesModule }) => ({ default: EmployeesModule })));
const SOPModule = lazy(() => import('./components/SOPModule').then(({ SOPModule }) => ({ default: SOPModule })));
const AlarmsModule = lazy(() => import('./components/AlarmsModule').then(({ AlarmsModule }) => ({ default: AlarmsModule })));
const HandoversModule = lazy(() => import('./components/HandoversModule').then(({ HandoversModule }) => ({ default: HandoversModule })));
const PatrolModule = lazy(() => import('./components/PatrolModule').then(({ PatrolModule }) => ({ default: PatrolModule })));
const KeysModule = lazy(() => import('./components/KeysModule').then(({ KeysModule }) => ({ default: KeysModule })));
const TasksModule = lazy(() => import('./components/TasksModule').then(({ TasksModule }) => ({ default: TasksModule })));
const DocumentsModule = lazy(() => import('./components/DocumentsModule').then(({ DocumentsModule }) => ({ default: DocumentsModule })));
const AutomationCenter = lazy(() => import('./components/AutomationCenter').then(({ AutomationCenter }) => ({ default: AutomationCenter })));
const ReportsModule = lazy(() => import('./components/ReportsModule').then(({ ReportsModule }) => ({ default: ReportsModule })));
const ArchitectureCenter = lazy(() => import('./components/ArchitectureCenter').then(({ ArchitectureCenter }) => ({ default: ArchitectureCenter })));
const SecurityAuditCenter = lazy(() => import('./components/SecurityAuditCenter').then(({ SecurityAuditCenter }) => ({ default: SecurityAuditCenter })));
const E2EAcceptanceCenter = lazy(() => import('./components/E2EAcceptanceCenter').then(({ E2EAcceptanceCenter }) => ({ default: E2EAcceptanceCenter })));
const BackendLiveConsole = lazy(() => import('./components/BackendLiveConsole').then(({ BackendLiveConsole }) => ({ default: BackendLiveConsole })));
const IllustratedUserGuide = lazy(() => import('./components/IllustratedUserGuide').then(({ IllustratedUserGuide }) => ({ default: IllustratedUserGuide })));
const UserAdministration = lazy(() => import('./components/UserAdministration').then(({ UserAdministration }) => ({ default: UserAdministration })));
const MobileAppShell = lazy(() => import('./components/MobileAppShell').then(({ MobileAppShell }) => ({ default: MobileAppShell })));

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-slate-900 border border-rose-500/40 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Anwendungsmodul wiederherstellen</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Ein untergeordnetes Modul hat einen Rendering-Fehler ausgelöst:
          </p>
          <div className="p-3 bg-slate-950 rounded-lg text-[11px] font-mono text-rose-300 text-left overflow-x-auto">
            {this.state.error?.message || 'Unbekannter Fehler'}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Neu laden</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App(): React.ReactNode {
  const {
    activeTab,
    theme,
    authUser,
    setActiveTab,
    isAuthenticated,
    restoreSession,
    isLoadingData,
    dataLoadError
  } = useSecurityStore();
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [isSyncManagerOpen, setIsSyncManagerOpen] = useState(false);
  const [isModuleManagerOpen, setIsModuleManagerOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuDialogRef = useRef<HTMLDivElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void restoreSession();
    const onUnauthorized = () => useSecurityStore.setState({
      authUser: null,
      isAuthenticated: false,
      syncQueue: [],
      authError: 'Sitzung abgelaufen. Bitte erneut anmelden.'
    });
    window.addEventListener('securityops:unauthorized', onUnauthorized);
    return () => window.removeEventListener('securityops:unauthorized', onUnauthorized);
  }, [restoreSession]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      mobileMenuTriggerRef.current?.focus();
      return;
    }

    mobileMenuDialogRef.current?.querySelector<HTMLButtonElement>('[aria-label="Menü schließen"]')?.focus();
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    if (!isMobileMenuOpen && document.activeElement instanceof HTMLElement) {
      mobileMenuTriggerRef.current = document.activeElement;
    }
    setIsMobileMenuOpen(open => !open);
  };

  const handleMobileMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsMobileMenuOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;

    const dialog = mobileMenuDialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'backend_console':
        return <BackendLiveConsole />;
      case 'user_guide':
        return <IllustratedUserGuide />;
      case 'mobile_app':
        return <MobileAppShell />;
      case 'guardbook':
        return <GuardBookModule />;
      case 'roster':
        return <RosterModule />;
      case 'sites':
        return <SitesModule />;
      case 'clients':
        return <ClientsModule />;
      case 'employees':
        return <EmployeesModule />;
      case 'sop':
        return <SOPModule />;
      case 'documents':
        return <DocumentsModule />;
      case 'automations':
        return <AutomationCenter />;
      case 'alarms':
        return <AlarmsModule />;
      case 'handovers':
        return <HandoversModule />;
      case 'patrol':
        return <PatrolModule />;
      case 'keys':
        return <KeysModule />;
      case 'tasks':
        return <TasksModule />;
      case 'reports':
        return <ReportsModule />;
      case 'e2e_acceptance':
        return <E2EAcceptanceCenter />;
      case 'security_audit':
        return <SecurityAuditCenter />;
      case 'architecture':
        return <ArchitectureCenter />;
      case 'user_admin':
        return authUser ? <UserAdministration authUser={authUser} /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0f1d] dark:bg-[#0a0f1d] text-slate-100 flex flex-col font-sans transition-colors selection:bg-blue-600 selection:text-white">
        {/* Top Header */}
        <Navbar
          onOpenNotifications={() => setIsNotifCenterOpen(true)}
          onOpenSyncManager={() => setIsSyncManagerOpen(true)}
          onOpenModuleManager={() => setIsModuleManagerOpen(true)}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onToggleMobileMenu={toggleMobileMenu}
        />

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Desktop Sidebar */}
          <div className="hidden md:flex">
            <Sidebar />
          </div>

          {/* Mobile Slide-Over Sidebar */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/80 md:hidden flex"
              onClick={event => {
                if (event.target === event.currentTarget) setIsMobileMenuOpen(false);
              }}
            >
              <div
                ref={mobileMenuDialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Mobiles Navigationsmenü"
                onKeyDown={handleMobileMenuKeyDown}
                className="w-64 bg-[#0a0f1d] h-full shadow-2xl flex flex-col"
              >
                <div className="p-3 flex justify-end">
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                    aria-label="Menü schließen"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <Sidebar onCloseMobileMenu={() => setIsMobileMenuOpen(false)} />
              </div>
            </div>
          )}

          {/* Content Viewport */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full focus:outline-none" tabIndex={-1}>
            {isLoadingData && (
              <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
                Mandantendaten werden aus PostgreSQL geladen…
              </div>
            )}
            {dataLoadError && (
              <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                Backend nicht erreichbar: {dataLoadError}
              </div>
            )}
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="p-4 text-sm text-slate-400" role="status">
                    Modul wird geladen…
                  </div>
                }
              >
                {renderActiveModule()}
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        <GlobalSearchModal isOpen={isGlobalSearchOpen} onClose={() => setIsGlobalSearchOpen(false)} />
        <SyncManagerModal isOpen={isSyncManagerOpen} onClose={() => setIsSyncManagerOpen(false)} />
        <ModuleManager isOpen={isModuleManagerOpen} onClose={() => setIsModuleManagerOpen(false)} />
        <NotificationCenterModal isOpen={isNotifCenterOpen} onClose={() => setIsNotifCenterOpen(false)} />
      </div>
    </ErrorBoundary>
  );
}
