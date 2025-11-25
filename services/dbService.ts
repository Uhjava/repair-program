import { Unit, DamageReport, UnitStatus } from '../types';
import { MOCK_FLEET, INITIAL_REPORTS } from '../constants';

// KEYS for LocalStorage
const STORAGE_KEY_UNITS = 'fleetguard_units_v1';
const STORAGE_KEY_REPORTS = 'fleetguard_reports_v1';

// --- HELPER FUNCTIONS ---

const getStoredUnits = (): Unit[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_UNITS);
    return stored ? JSON.parse(stored) : MOCK_FLEET;
  } catch (e) {
    return MOCK_FLEET;
  }
};

const saveUnits = (units: Unit[]) => {
  localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(units));
};

const getStoredReports = (): DamageReport[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_REPORTS);
    return stored ? JSON.parse(stored) : INITIAL_REPORTS;
  } catch (e) {
    return INITIAL_REPORTS;
  }
};

const saveReports = (reports: DamageReport[]) => {
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
};

// --- API IMPLEMENTATION (Simulating Async DB Calls) ---

export const isDbConfigured = () => true; // Always true for LocalStorage

export const seedDatabaseIfEmpty = async () => {
  // Check if data exists in local storage
  const storedUnits = localStorage.getItem(STORAGE_KEY_UNITS);
  if (!storedUnits) {
    console.log("Initializing Local Storage with Default Data...");
    saveUnits(MOCK_FLEET);
    saveReports(INITIAL_REPORTS);
  }
  return true;
};

export const fetchUnits = async (): Promise<Unit[]> => {
  // Simulate network delay for realism
  await new Promise(resolve => setTimeout(resolve, 300));
  return getStoredUnits();
};

export const updateUnitStatus = async (unitId: string, status: UnitStatus) => {
  const units = getStoredUnits();
  const updatedUnits = units.map(u => u.id === unitId ? { ...u, status } : u);
  saveUnits(updatedUnits);
};

export const fetchReports = async (): Promise<DamageReport[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return getStoredReports();
};

export const createReport = async (report: DamageReport) => {
  const reports = getStoredReports();
  // Add new report to the beginning of the list
  const updatedReports = [report, ...reports];
  saveReports(updatedReports);
};

export const updateReport = async (reportId: string, updates: Partial<DamageReport>) => {
  const reports = getStoredReports();
  const updatedReports = reports.map(r => r.id === reportId ? { ...r, ...updates } : r);
  saveReports(updatedReports);
};
