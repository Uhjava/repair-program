import React from 'react';
import { Truck, LayoutDashboard, AlertTriangle, UserCircle, LogOut, Cloud, Database, Wifi, WifiOff } from 'lucide-react';
import { User, UserRole } from '../types';
import { isDbConfigured } from '../services/dbService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
  onOpenSync: () => void;
  isOffline: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, currentUser, onLogout, onOpenSync, isOffline }) => {
  const isDatabaseConnected = isDbConfigured();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FleetGuard</h1>
              <p className="text-xs text-slate-400">Repair & Damage Tracker</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Storage Status Indicator */}
             <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-slate-800/50 ${isDatabaseConnected ? 'border-emerald-900/50' : 'border-slate-700'}`}>
                {isDatabaseConnected ? (
                   <>
                     <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                     <span className="text-xs font-medium text-emerald-400">Neon DB</span>
                   </>
                ) : (
                   <>
                     <Database className="h-3.5 w-3.5 text-blue-400" />
                     <span className="text-xs font-medium text-blue-400">Local Data</span>
                   </>
                )}
             </div>

             {/* Sync Button (Only show if local mode, though handy for backup in DB mode too) */}
             <button
                onClick={onOpenSync}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="Sync/Backup Data"
             >
                <Cloud className="h-4 w-4" />
                <span className="text-xs font-medium">Backup</span>
             </button>

             <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold">{currentUser.name}</span>
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  currentUser.role === UserRole.MANAGER ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'
                }`}>
                  {currentUser.role}
                </span>
             </div>
             
             <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>

             <button 
                onClick={onLogout}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Log Out"
             >
                <LogOut className="h-5 w-5" />
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-6 pb-24">
        {children}
      </main>

      {/* Mobile/Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-xl z-50 pb-safe">
        <div className="max-w-7xl mx-auto flex justify-around items-center h-16">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs font-medium">Dashboard</span>
          </button>
          
          <button
            onClick={() => onTabChange('units')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              activeTab === 'units' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Truck className="h-5 w-5" />
            <span className="text-xs font-medium">Units</span>
          </button>

          <button
            onClick={() => onTabChange('reports')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              activeTab === 'reports' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="text-xs font-medium">Reports</span>
          </button>
          
          <button
            onClick={onOpenSync}
            className={`sm:hidden flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500 hover:text-slate-700`}
          >
            <Cloud className="h-5 w-5" />
            <span className="text-xs font-medium">Sync</span>
          </button>
        </div>
      </nav>
    </div>
  );
};