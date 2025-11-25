import React, { useRef, useState } from 'react';
import { Unit, DamageReport, SyncData } from '../types';
import { Download, Upload, AlertTriangle, CheckCircle, X, FileJson } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-600" />
            Data Synchronization
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            Since this app runs without a central server, use this tool to move your data between devices (e.g., from Laptop to Phone).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Section */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors flex flex-col items-center text-center space-y-3">
              <div className="bg-blue-50 p-3 rounded-full">
                <Download className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Export Data</h3>
                <p className="text-xs text-slate-500 mt-1">Save current units & reports to a file.</p>
              </div>
              <button 
                onClick={handleExport}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Download Backup
              </button>
            </div>

            {/* Import Section */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-purple-300 transition-colors flex flex-col items-center text-center space-y-3">
              <div className="bg-purple-50 p-3 rounded-full">
                <Upload className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Import Data</h3>
                <p className="text-xs text-slate-500 mt-1">Load data from a backup file.</p>
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
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
                Tip: Importing data will overwrite the current data on this device.
            </p>
        </div>
      </div>
    </div>
  );
};