import React, { useMemo } from 'react';
import { Unit, UnitStatus, DamageReport, RepairPriority } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { AlertCircle, CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react';

interface DashboardProps {
  units: Unit[];
  reports: DamageReport[];
  onViewReports: () => void;
  onViewUnitStatus: (status: 'ALL' | 'ISSUES' | UnitStatus) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ units, reports, onViewReports, onViewUnitStatus }) => {
  
  const statusCounts = useMemo(() => {
    const counts = {
      [UnitStatus.ACTIVE]: 0,
      [UnitStatus.NEEDS_REPAIR]: 0,
      [UnitStatus.OUT_OF_SERVICE]: 0,
    };
    units.forEach(u => counts[u.status]++);
    return [
      { name: 'Active', value: counts[UnitStatus.ACTIVE], color: '#10b981' },
      { name: 'Repair Needed', value: counts[UnitStatus.NEEDS_REPAIR], color: '#f59e0b' },
      { name: 'Out of Service', value: counts[UnitStatus.OUT_OF_SERVICE], color: '#f43f5e' },
    ];
  }, [units]);

  const priorityCounts = useMemo(() => {
    const counts = {
        [RepairPriority.LOW]: 0,
        [RepairPriority.MEDIUM]: 0,
        [RepairPriority.HIGH]: 0,
        [RepairPriority.CRITICAL]: 0
    };
    // Only count OPEN or IN_PROGRESS reports for the chart
    reports.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS').forEach(r => {
        counts[r.priority] = (counts[r.priority] || 0) + 1;
    });
    return Object.entries(counts).map(([key, value]) => ({ name: key, value }));
  }, [reports]);

  const pendingCount = useMemo(() => {
    return reports.filter(r => r.status === 'PENDING_APPROVAL').length;
  }, [reports]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quick Stats Cards */}
        <button 
            onClick={() => onViewUnitStatus('ALL')}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all group text-left"
        >
            <div>
                <p className="text-slate-500 text-sm font-medium group-hover:text-blue-600 transition-colors">Total Fleet</p>
                <h3 className="text-3xl font-bold text-slate-800">{units.length}</h3>
            </div>
            <div className="bg-slate-100 p-3 rounded-full group-hover:bg-blue-50 transition-colors">
                <CheckCircle className="h-6 w-6 text-slate-600 group-hover:text-blue-600" />
            </div>
        </button>

        <button 
            onClick={onViewReports}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:border-purple-300 hover:shadow-md transition-all group text-left"
        >
            <div>
                <p className="text-purple-600 text-sm font-medium flex items-center gap-1">
                    Pending Approval <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <h3 className="text-3xl font-bold text-slate-800">{pendingCount}</h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-full group-hover:bg-purple-200 transition-colors">
                <Clock className="h-6 w-6 text-purple-600" />
            </div>
        </button>

        <button 
            onClick={() => onViewUnitStatus(UnitStatus.NEEDS_REPAIR)}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:border-amber-300 hover:shadow-md transition-all group text-left"
        >
            <div>
                <p className="text-amber-600 text-sm font-medium flex items-center gap-1">
                    Needs Attention <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <h3 className="text-3xl font-bold text-slate-800">
                    {units.filter(u => u.status === UnitStatus.NEEDS_REPAIR).length}
                </h3>
            </div>
            <div className="bg-amber-100 p-3 rounded-full group-hover:bg-amber-200 transition-colors">
                <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
        </button>

        <button 
            onClick={() => onViewUnitStatus(UnitStatus.OUT_OF_SERVICE)}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:border-rose-300 hover:shadow-md transition-all group text-left"
        >
            <div>
                <p className="text-rose-600 text-sm font-medium flex items-center gap-1">
                    Critical / OOS <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <h3 className="text-3xl font-bold text-slate-800">
                     {units.filter(u => u.status === UnitStatus.OUT_OF_SERVICE).length}
                </h3>
            </div>
            <div className="bg-rose-100 p-3 rounded-full group-hover:bg-rose-200 transition-colors">
                <XCircle className="h-6 w-6 text-rose-600" />
            </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Status Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Fleet Health Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Open Repairs Priority */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Open Repairs by Priority</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityCounts}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}/>
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};