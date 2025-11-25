import React from 'react';
import { UnitStatus, RepairPriority } from '../types';

interface StatusBadgeProps {
  status?: UnitStatus | string;
  priority?: RepairPriority;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, priority }) => {
  if (priority) {
    let colorClass = 'bg-slate-100 text-slate-800';
    if (priority === RepairPriority.LOW) colorClass = 'bg-green-100 text-green-800 border border-green-200';
    if (priority === RepairPriority.MEDIUM) colorClass = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    if (priority === RepairPriority.HIGH) colorClass = 'bg-orange-100 text-orange-800 border border-orange-200';
    if (priority === RepairPriority.CRITICAL) colorClass = 'bg-red-100 text-red-800 border border-red-200';

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
        {priority}
      </span>
    );
  }

  if (status) {
    let colorClass = 'bg-slate-100 text-slate-800';
    const normalizedStatus = status.toString(); // Safety check

    if (normalizedStatus === UnitStatus.ACTIVE) colorClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (normalizedStatus === UnitStatus.NEEDS_REPAIR) colorClass = 'bg-amber-100 text-amber-800 border border-amber-200';
    if (normalizedStatus === UnitStatus.OUT_OF_SERVICE) colorClass = 'bg-rose-100 text-rose-800 border border-rose-200';
    
    // Report Statuses
    if (normalizedStatus === 'PENDING_APPROVAL') colorClass = 'bg-purple-100 text-purple-800 border border-purple-200';
    if (normalizedStatus === 'OPEN') colorClass = 'bg-blue-100 text-blue-700 border border-blue-200';
    if (normalizedStatus === 'RESOLVED') colorClass = 'bg-green-100 text-green-700 border border-green-200';
    if (normalizedStatus === 'IN_PROGRESS') colorClass = 'bg-yellow-100 text-yellow-700 border border-yellow-200';

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
        {normalizedStatus.replace(/_/g, ' ')}
      </span>
    );
  }

  return null;
};