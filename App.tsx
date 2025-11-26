import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { UnitList, UnitFilterMode } from './components/UnitList';
import { ReportForm } from './components/ReportForm';
import { StatusBadge } from './components/StatusBadge';
import { SyncModal } from './components/SyncModal';
import { Unit, DamageReport, UnitStatus, RepairPriority, UserRole, User, SyncData } from './types';
import { summarizeReports } from './services/geminiService';
import { fetchUnits, fetchReports, createReport, updateReport, updateUnitStatus, seedDatabaseIfEmpty, syncOfflineChanges } from './services/dbService';
import { CheckCircle2, AlertTriangle, ChevronRight, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';

const AUTO_LOGOUT_TIME_MS = 15 * 60 * 1000; // 15 Minutes

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Filter state passed to UnitList when navigating from Dashboard
  const [unitListFilter, setUnitListFilter] = useState<UnitFilterMode>('ALL');

  // Sync Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const [units, setUnits] = useState<Unit[]>([]);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Moved these up to avoid reference error in useEffect
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');

  // Security: Auto-Logout Timer
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivityTimer = () => {
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    if (currentUser) {
      activityTimerRef.current = setTimeout(() => {
        handleLogout();
        setSessionExpired(true);
      }, AUTO_LOGOUT_TIME_MS);
    }
  };

  useEffect(() => {
    // Listen for user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => resetActivityTimer();
    
    events.forEach(event => window.addEventListener(event, handler));
    
    // Initial start
    resetActivityTimer();

    return () => {
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      events.forEach(event => window.removeEventListener(event, handler));
    };
  }, [currentUser]);

  // Security: Dynamic Favicon Injection (Safe way to add logo to browser tab)
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'icon';
    // Truck SVG as Data URI to match the branding
    link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%232563eb%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2%22/><path d=%22M15 18H9%22/><path d=%22M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14%22/><circle cx=%2217%22 cy=%2218%22 r=%222%22/><circle cx=%227%22 cy=%2218%22 r=%222%22/></svg>`;
    document.getElementsByTagName('head')[0].appendChild(link);
    document.title = "Fleet Repair Tracker | Secure";
  }, []);

  // Load Data function
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      await seedDatabaseIfEmpty(); // Initialize if needed
      await syncOfflineChanges(); // Try to upload any offline work
      const fetchedUnits = await fetchUnits();
      const fetchedReports = await fetchReports();
      setUnits(fetchedUnits);
      setReports(fetchedReports);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load Data on Mount
  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(() => {
        if (!isCreatingReport) { // Don't refresh if user is typing
            loadData();
        }
    }, 30000);
    return () => clearInterval(interval);
  }, [isCreatingReport]);

  const handleSelectUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setActiveTab('unit_detail');
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setSessionExpired(false);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleImportData = (data: SyncData) => {
    // When importing, we update state AND local storage
    setUnits(data.units);
    setReports(data.reports);
    localStorage.setItem('fleetguard_units_v1', JSON.stringify(data.units));
    localStorage.setItem('fleetguard_reports_v1', JSON.stringify(data.reports));
  };

  const handleCreateReport = async (data: Partial<DamageReport>) => {
    if (!currentUser) return;
    
    const isManager = currentUser.role === UserRole.MANAGER;
    
    const newReport: DamageReport = {
      id: `RPT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: isManager ? 'OPEN' : 'PENDING_APPROVAL', 
      reportedBy: currentUser.name,
      unitId: data.unitId!,
      description: data.description || '',
      priority: data.priority || RepairPriority.MEDIUM,
      images: data.images || [],
      aiAnalysis: data.aiAnalysis,
      suggestedParts: data.suggestedParts,
      approvedBy: isManager ? 'Self' : undefined,
      approvedAt: isManager ? new Date().toISOString() : undefined
    };

    // Optimistic UI Update
    setReports(prev => [newReport, ...prev]);
    
    // DB Update
    await createReport(newReport);

    // Update unit status immediately ONLY if manager submits.
    if (isManager && (data.priority === RepairPriority.CRITICAL || data.priority === RepairPriority.HIGH)) {
        setUnits(prev => prev.map(u => u.id === data.unitId ? { ...u, status: UnitStatus.NEEDS_REPAIR } : u));
        await updateUnitStatus(data.unitId!, UnitStatus.NEEDS_REPAIR);
    }

    setIsCreatingReport(false);
  };

  const handleApproveReport = async (reportId: string) => {
    if (!currentUser || currentUser.role !== UserRole.MANAGER) return;

    const updates = {
        status: 'OPEN' as const,
        approvedBy: currentUser.name,
        approvedAt: new Date().toISOString()
    };

    // Optimistic Update
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updates } : r));

    // DB Update
    await updateReport(reportId, updates);

    // Also update unit status upon approval if needed
    const report = reports.find(r => r.id === reportId);
    if (report && (report.priority === RepairPriority.CRITICAL || report.priority === RepairPriority.HIGH)) {
        setUnits(prev => prev.map(u => u.id === report.unitId ? { ...u, status: UnitStatus.NEEDS_REPAIR } : u));
        await updateUnitStatus(report.unitId, UnitStatus.NEEDS_REPAIR);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    if (!currentUser || currentUser.role !== UserRole.MANAGER) return;

    const updates = {
        status: 'RESOLVED' as const,
        resolvedAt: new Date().toISOString()
    };

    // Optimistic Update
    setReports(prevReports => {
      const updatedReports = prevReports.map(r => r.id === reportId ? { ...r, ...updates } : r);
      return updatedReports;
    });

    // DB Update
    await updateReport(reportId, updates);

    // Check unit status update
    const targetReport = reports.find(r => r.id === reportId);
    if (targetReport) {
      const unitId = targetReport.unitId;
      const unitReports = reports.map(r => r.id === reportId ? { ...r, ...updates } : r);
      const hasOpenIssues = unitReports.filter(r => r.unitId === unitId).some(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS');
      
      if (!hasOpenIssues) {
        setUnits(prevUnits => prevUnits.map(u => u.id === unitId ? { ...u, status: UnitStatus.ACTIVE } : u));
        await updateUnitStatus(unitId, UnitStatus.ACTIVE);
      }
    }
  };

  const getUnitReports = (unitId: string) => reports.filter(r => r.unitId === unitId);

  // Summarize open issues on dashboard
  useEffect(() => {
    if (activeTab === 'reports' && currentUser) {
        const openIssues = reports.filter(r => r.status === 'OPEN').map(r => `Unit ${r.unitId}: ${r.description} (${r.priority})`);
        if (openIssues.length > 0) {
            summarizeReports(openIssues).then(setAiSummary);
        } else {
            setAiSummary('No open maintenance issues to summarize.');
        }
    }
  }, [activeTab, reports, currentUser]);

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  // If not logged in, show login screen
  if (!currentUser) {
    return (
        <>
            {sessionExpired && (
                <div className="fixed top-4 right-4 z-[100] bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-fade-in">
                    <Lock className="h-4 w-4 text-orange-400" />
                    Logged out due to inactivity
                </div>
            )}
            <LoginScreen onLogin={handleLogin} />
        </>
    );
  }

  // Render content based on active tab and state
  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <Dashboard 
            units={units} 
            reports={reports} 
            onViewReports={() => setActiveTab('reports')}
            onViewUnitStatus={(status) => {
                setUnitListFilter(status);
                setActiveTab('units');
            }}
        />
      );
    }

    if (activeTab === 'units') {
      return (
        <UnitList 
            units={units} 
            onSelectUnit={handleSelectUnit} 
            initialFilter={unitListFilter}
        />
      );
    }

    if (activeTab === 'unit_detail' && selectedUnit) {
      if (isCreatingReport) {
        return (
            <div className="max-w-2xl mx-auto">
                <ReportForm 
                    unit={selectedUnit} 
                    onSubmit={handleCreateReport} 
                    onCancel={() => setIsCreatingReport(false)} 
                />
            </div>
        );
      }

      const unitReports = getUnitReports(selectedUnit.id);
      const currentUnit = units.find(u => u.id === selectedUnit.id) || selectedUnit;

      return (
        <div className="space-y-6 animate-fade-in">
          {/* Unit Header */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <button 
                onClick={() => setActiveTab('units')}
                className="mb-4 text-slate-500 hover:text-blue-600 flex items-center text-sm font-medium"
            >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to List
            </button>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        {currentUnit.name}
                        <StatusBadge status={currentUnit.status} />
                    </h2>
                    <p className="text-slate-500 mt-1">{currentUnit.model} • {currentUnit.type}</p>
                    {currentUnit.mileage && (
                        <p className="text-slate-400 font-mono text-sm mt-1">Odometer: {currentUnit.mileage.toLocaleString()} mi</p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsCreatingReport(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        <AlertTriangle className="h-5 w-5" />
                        Report Damage
                    </button>
                </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Maintenance & Repair History</h3>
            </div>
            {unitReports.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                    <p>No damage reports found for this unit.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {unitReports.map(report => (
                        <div key={report.id} className={`p-4 transition-colors border-l-4 ${
                            report.status === 'RESOLVED' 
                            ? 'border-green-500 bg-slate-50' 
                            : report.status === 'PENDING_APPROVAL'
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-blue-500 bg-white shadow-sm'
                        }`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <StatusBadge priority={report.priority} />
                                    <span className="text-xs text-slate-400 font-mono">{new Date(report.timestamp).toLocaleDateString()}</span>
                                </div>
                                <StatusBadge status={report.status} />
                            </div>
                            
                            <p className="text-slate-800 text-sm mb-2 font-medium">{report.description}</p>
                            
                            {report.aiAnalysis && (
                                <div className="mt-2 bg-indigo-50 p-3 rounded-lg text-xs text-indigo-900 border border-indigo-100 flex gap-2">
                                    <div className="shrink-0 pt-0.5">✨</div>
                                    <div>{report.aiAnalysis}</div>
                                </div>
                            )}

                            {report.images.length > 0 && (
                                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                    {report.images.map((img, idx) => (
                                        <img key={idx} src={`data:image/jpeg;base64,${img}`} alt="Evidence" className="h-16 w-16 object-cover rounded border border-slate-200" />
                                    ))}
                                </div>
                            )}
                            
                            <div className="mt-2 text-xs text-slate-400">
                                Reported by: <span className="font-medium text-slate-600">{report.reportedBy}</span>
                                {report.approvedBy && (
                                    <span className="ml-2">• Approved by: <span className="font-medium text-slate-600">{report.approvedBy}</span></span>
                                )}
                            </div>

                            {/* Action Bar */}
                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end gap-2">
                                {report.status === 'PENDING_APPROVAL' && currentUser.role === UserRole.MANAGER && (
                                    <button
                                        onClick={() => handleApproveReport(report.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                                    >
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Approve Report
                                    </button>
                                )}
                                
                                {report.status === 'OPEN' && currentUser.role === UserRole.MANAGER && (
                                    <button
                                        onClick={() => handleResolveReport(report.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Mark as Repaired
                                    </button>
                                )}
                                
                                {report.status === 'PENDING_APPROVAL' && currentUser.role === UserRole.WORKER && (
                                     <span className="text-xs text-purple-700 flex items-center font-medium bg-purple-100 px-2 py-1 rounded">
                                        <Lock className="h-3.5 w-3.5 mr-1.5" />
                                        Pending Approval
                                    </span>
                                )}

                                {report.status === 'RESOLVED' && (
                                    <span className="text-xs text-green-700 flex items-center font-medium bg-green-50 px-2 py-1 rounded border border-green-100">
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                        Repaired on {report.resolvedAt ? new Date(report.resolvedAt).toLocaleDateString() : 'Unknown Date'}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'reports') {
        const pendingReports = reports.filter(r => r.status === 'PENDING_APPROVAL');
        const openReports = reports.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS');

        return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-2">AI Maintenance Summary</h2>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        {aiSummary || "Generating summary of all open repairs..."}
                    </p>
                </div>
                
                {/* Pending Approvals (Manager Only) */}
                {currentUser.role === UserRole.MANAGER && pendingReports.length > 0 && (
                     <div className="bg-purple-50 rounded-xl shadow-sm border border-purple-100 overflow-hidden">
                        <div className="p-4 border-b border-purple-200 flex justify-between items-center">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5" />
                                Pending Reviews ({pendingReports.length})
                            </h3>
                        </div>
                        <div className="divide-y divide-purple-200">
                            {pendingReports.map(report => (
                                <div key={report.id} className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono font-bold text-purple-900">{report.unitId}</span>
                                            <StatusBadge status="PENDING_APPROVAL" />
                                            <StatusBadge priority={report.priority} />
                                        </div>
                                        <p className="text-sm text-purple-800">{report.description}</p>
                                        <p className="text-xs text-purple-600 mt-1">Submitted by {report.reportedBy}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                const unit = units.find(u => u.id === report.unitId);
                                                if (unit) handleSelectUnit(unit);
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium bg-white text-purple-700 border border-purple-200 rounded hover:bg-purple-100"
                                        >
                                            View Unit
                                        </button>
                                        <button 
                                            onClick={() => handleApproveReport(report.id)}
                                            className="px-3 py-1.5 text-xs font-medium bg-purple-700 text-white rounded hover:bg-purple-800 shadow-sm"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800">All Open Reports</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {openReports.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                <p>No open issues. Good job!</p>
                            </div>
                        ) : (
                            openReports.map(report => (
                                <div key={report.id} className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-slate-50">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono font-bold text-slate-700">{report.unitId}</span>
                                            <StatusBadge priority={report.priority} />
                                        </div>
                                        <p className="text-sm text-slate-600">{report.description}</p>
                                        <p className="text-xs text-slate-400 mt-1">Reported by {report.reportedBy}</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const unit = units.find(u => u.id === report.unitId);
                                            if (unit) handleSelectUnit(unit);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                                    >
                                        View Unit <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }
    
    return null;
  };

  return (
    <Layout 
        activeTab={activeTab === 'unit_detail' ? 'units' : activeTab} 
        onTabChange={(tab) => {
            setIsCreatingReport(false);
            if (tab === 'units') setUnitListFilter('ALL'); // Reset filter if manually navigating
            setActiveTab(tab);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onRefreshData={loadData}
        isOffline={false}
        isRefreshing={isRefreshing}
    >
        {renderContent()}
        <SyncModal 
            isOpen={isSyncModalOpen}
            onClose={() => setIsSyncModalOpen(false)}
            units={units}
            reports={reports}
            onImport={handleImportData}
        />
    </Layout>
  );
};

export default App;