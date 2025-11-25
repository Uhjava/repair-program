import React, { useRef, useState } from 'react';
import { Unit, DamageReport, SyncData } from '../types';
import { Download, Upload, AlertTriangle, CheckCircle, X, FileJson, Database, Activity, Save, RefreshCw, Wrench } from 'lucide-react';
import { isDbConfigured, getDbDebugInfo, saveManualDbUrl, reseedDatabase } from '../services/dbService';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  reports: DamageReport[];
  onImport: (data: SyncData) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, units, reports, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [manualUrl, setManualUrl] = useState('');
  const [isReseeding, setIsReseeding] = useState(false);
  
  const isDb = isDbConfigured();
  const dbInfo = getDbDebugInfo();

  if (!isOpen) return null;

  const handleExport = () => {
    const data: SyncData = {
      units,
      reports,
      version: '1.0',
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccessMsg('Data exported successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (!Array.isArray(json.units) || !Array.isArray(json.reports)) {
          throw new Error('Invalid file format: Missing units or reports.');
        }

        onImport(json as SyncData);
        setSuccessMsg('Data imported successfully!');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1500);
      } catch (err) {
        setError('Failed to import: Invalid file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveManualUrl = () => {
    if (!manualUrl.trim()) return;
    saveManualDbUrl(manualUrl);
    setSuccessMsg("URL Saved. Reloading...");
    setTimeout(() => {
        window.location.reload();
    }, 1000);
  };

  const handleClearManualUrl = () => {
    saveManualDbUrl('');
    setSuccessMsg("Override cleared. Reloading...");
    setTimeout(() => {
        window.location.reload();
    }, 1000);
  };

  const handleReseed = async () => {
    if (!confirm("This will attempt to add any missing units to the database. Existing units will not be affected. Continue?")) return;
    
    setIsReseeding(true);
    try {
        await reseedDatabase();
        setSuccessMsg("Fleet list updated successfully! Reloading...");
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } catch (e) {
        setError("Failed to reseed database. Check connection.");
    } finally {
        setIsReseeding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            System & Data
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Diagnostic Panel */}
          <div className={`rounded-xl p-4 border ${isDb ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 mb-2 ${isDb ? 'text-emerald-800' : 'text-amber-800'}`}>
                <Activity className="h-4 w-4" />
                {isDb ? 'Online: Connected to Database' : 'Offline: Local Mode Active'}
            </h3>
            <div className="text-xs space-y-1 opacity-80">
                <div className="flex justify-between">
                    <span>Config Variable (VITE_FLEET_DATA_URL):</span>
                    <span className="font-mono">{dbInfo.hasUrl ? 'DETECTED' : 'MISSING'}</span>
                </div>
                {dbInfo.hasUrl && (
                    <div className="flex justify-between">
                        <span>Connection Endpoint:</span>
                        <span className="font-mono">{dbInfo.urlMasked}</span>
                    </div>
                )}
                {dbInfo.error && (
                    <div className="mt-2 text-red-600 font-semibold border-t border-red-200 pt-1">
                        Error: {dbInfo.error}
                    </div>
                )}
                {!isDb && !dbInfo.error && (
                    <p className="mt-2 text-amber-900 font-medium">
                        To enable Database Mode, add VITE_FLEET_DATA_URL to Netlify settings and trigger a redeploy.
                    </p>
                )}
            </div>
          </div>

          {/* Manual Connection Override */}
          {!isDb && (
             <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h3 className="font-semibold text-slate-800 text-sm mb-2">Manual Connection Override</h3>
                <p className="text-xs text-slate-500 mb-3">If Netlify settings are not working, paste your Neon DB Connection String here.</p>
                <div className="space-y-2">
                    <input 
                        type="text" 
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        placeholder="postgres://user:pass@host/db..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    
                    {manualUrl && manualUrl.includes('psql') && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            <div>
                                We detected a full psql command. Don't worry, we'll automatically strip out just the URL for you.
                            </div>
                        </div>
                    )}
                    
                    {manualUrl && (
                        <div className="text-[10px] text-slate-400 font-mono break-all bg-slate-100 p-2 rounded">
                            Preview: {manualUrl.match(/(postgres(?:ql)?:\/\/[^\s'"]+)/)?.[1] || manualUrl.trim().replace(/^['"]|['"]$/g, '')}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button 
                            onClick={handleSaveManualUrl}
                            disabled={!manualUrl.trim()}
                            className="flex-1 py-1.5 bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                            <Save className="h-3 w-3" />
                            Save & Connect
                        </button>
                        <button 
                            onClick={handleClearManualUrl}
                            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>
             </div>
          )}
          
          {/* Manual Reseed Tool */}
          {isDb && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h3 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2">
                    <Wrench className="h-3 w-3 text-slate-500" />
                    Database Maintenance
                </h3>
                <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                        Missing units? Click here to check the master list and add any missing vehicles to the database.
                    </p>
                    <button
                        onClick={handleReseed}
                        disabled={isReseeding}
                        className="whitespace-nowrap px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                        {isReseeding ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        {isReseeding ? 'Updating...' : 'Repair Fleet List'}
                    </button>
                </div>
            </div>
          )}

          <div className="h-px bg-slate-100"></div>

          <p className="text-sm text-slate-600 leading-relaxed font-medium">
             Backup Tools
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Section */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors flex flex-col items-center text-center space-y-3">
              <div className="bg-blue-50 p-3 rounded-full">
                <Download className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Export Backup</h3>
                <p className="text-xs text-slate-500 mt-1">Save current state to JSON.</p>
              </div>
              <button 
                onClick={handleExport}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Download File
              </button>
            </div>

            {/* Import Section */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-purple-300 transition-colors flex flex-col items-center text-center space-y-3">
              <div className="bg-purple-50 p-3 rounded-full">
                <Upload className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Import Data</h3>
                <p className="text-xs text-slate-500 mt-1">Overwrite with backup file.</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-sm font-medium rounded-lg transition-colors"
              >
                Select File
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleFileChange} 
              />
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {successMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};