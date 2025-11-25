
export enum UnitType {
  TRUCK = 'TRUCK',
  TRAILER = 'TRAILER'
}

export enum UnitStatus {
  ACTIVE = 'ACTIVE',
  NEEDS_REPAIR = 'NEEDS_REPAIR',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export enum RepairPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum UserRole {
  MANAGER = 'MANAGER',
  WORKER = 'WORKER'
}

export interface User {
  name: string;
  role: UserRole;
}

export interface Unit {
  id: string;
  name: string; // e.g., "Unit 104"
  type: UnitType;
  model: string; // e.g., "Freightliner Cascadia"
  status: UnitStatus;
  mileage?: number;
  lastInspection?: string;
}

export interface DamageReport {
  id: string;
  unitId: string;
  timestamp: string;
  description: string;
  reportedBy: string;
  priority: RepairPriority;
  images: string[]; // Base64 strings
  aiAnalysis?: string;
  suggestedParts?: string[];
  status: 'PENDING_APPROVAL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  resolvedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface AIAnalysisResult {
  damageSummary: string;
  estimatedPriority: RepairPriority;
  suggestedActions: string[];
}

export interface SyncData {
  units: Unit[];
  reports: DamageReport[];
  version: string;
  exportedAt: string;
}
