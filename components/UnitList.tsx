import React, { useState } from 'react';
import { Unit, UnitType, UnitStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { Search, Filter, ChevronRight, Truck, Container, ArrowDownAZ, AlertCircle, X } from 'lucide-react';
import { Logo } from './Logo';

export type UnitFilterMode = 'ALL' | 'ISSUES' | UnitStatus;

interface UnitListProps {
  units: Unit[];
  onSelectUnit: (unit: Unit) => void;
  initialFilter?: UnitFilterMode;
}

export const UnitList: React.FC<UnitListProps> = ({ units, onSelectUnit, initialFilter = 'ALL' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | UnitType>('ALL');
  const [filterMode, setFilterMode] = useState<UnitFilterMode>(initialFilter);

  // Normalize string for fuzzy search (remove spaces, lowercase)
  const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');

  const filteredUnits = units.filter(unit => {
    const term = normalize(searchTerm);
    const matchesSearch = normalize(unit.id).includes(term) || 
                          normalize(unit.name).includes(term) ||
                          normalize(unit.model).includes(term);
    
    const matchesType = filterType === 'ALL' || unit.type === filterType;
    
    let matchesStatus = true;
    if (filterMode === 'ISSUES') {
        matchesStatus = unit.status === UnitStatus.NEEDS_REPAIR || unit.status === UnitStatus.OUT_OF_SERVICE;
    } else if (filterMode !== 'ALL') {
        matchesStatus = unit.status === filterMode;
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  const getFilterLabel = () => {
    if (filterMode === 'ISSUES') return 'Showing Only Issues';
    if (filterMode === UnitStatus.NEEDS_REPAIR) return 'Needs Repair Only';
    if (filterMode === UnitStatus.OUT_OF_SERVICE) return 'Out of Service Only';
    return 'Show Issues Only';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-140px)]">
      {/* Controls */}
      <div className="p-4 border-b border-slate-100 space-y-3 bg-white z-10 rounded-t-xl">
        <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ArrowDownAZ className="h-4 w-4 text-slate-500" />
                Fleet Inventory ({filteredUnits.length})
            </h3>
        </div>
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
             {/* Security Logo in Search Bar */}
             <Logo className="h-4 w-4 text-blue-400 group-focus-within:text-blue-600 transition-colors" />
             <div className="h-4 w-px bg-slate-300"></div>
          </div>
          <input
            type="text"
            placeholder="Search Fleet ID..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col gap-2">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['ALL', 'TRUCK', 'TRAILER'].map((type) => (
                <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                    filterType === type 
                    ? 'bg-slate-800 text-white border-slate-800' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                >
                {type === 'ALL' ? 'All Units' : type === 'TRUCK' ? 'Trucks' : 'Trailers'}
                </button>
            ))}
            </div>

            <button 
                onClick={() => setFilterMode(prev => prev !== 'ALL' ? 'ALL' : 'ISSUES')}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors border ${
                    filterMode !== 'ALL' 
                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
            >
                {filterMode !== 'ALL' ? (
                    <AlertCircle className="h-4 w-4 text-amber-600 fill-amber-100" />
                ) : (
                    <AlertCircle className="h-4 w-4" />
                )}
                
                {getFilterLabel()}
                
                {filterMode !== 'ALL' && (
                    <span className="ml-1 bg-amber-100 p-0.5 rounded-full">
                        <X className="h-3 w-3" />
                    </span>
                )}
            </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {filteredUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Filter className="h-8 w-8 mb-2 opacity-50" />
            <p>No units found matching criteria.</p>
            {filterMode !== 'ALL' && (
                <button 
                    onClick={() => setFilterMode('ALL')}
                    className="mt-2 text-blue-600 text-xs font-medium hover:underline"
                >
                    Clear Filters
                </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUnits.map((unit) => (
              <button
                key={unit.id}
                onClick={() => onSelectUnit(unit)}
                className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg flex-shrink-0 ${unit.type === UnitType.TRUCK ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    {unit.type === UnitType.TRUCK ? (
                      <Truck className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Container className="h-5 w-5 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{unit.id}</span>
                      <StatusBadge status={unit.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 truncate max-w-[180px]">
                        {unit.model}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};