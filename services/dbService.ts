import { Unit, DamageReport, UnitStatus, RepairPriority } from '../types';
import { MOCK_FLEET, INITIAL_REPORTS } from '../constants';
import { neon } from '@neondatabase/serverless';

// --- CONFIGURATION ---

const MANUAL_URL_KEY = 'fleetguard_manual_db_url';

// Helper to extract the actual URL if user pastes a command like "psql 'postgres://...'"
const sanitizeDbUrl = (input: string): string => {
  if (!input) return '';
  
  // Check for the protocol pattern postgres:// or postgresql://
  // This regex grabs the URL until it hits a space, a quote, or the end of the line
  const match = input.match(/(postgres(?:ql)?:\/\/[^\s'"]+)/);
  if (match) {
    return match[1];
  }
  
  // Fallback: just strip quotes if the regex didn't match (e.g. valid url surrounded by quotes)
  return input.trim().replace(/^['"]|['"]$/g, '');
};

const getDbUrl = () => {
  let url = '';

  // 1. Try Environment Variable (Netlify)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    url = import.meta.env.VITE_FLEET_DATA_URL || import.meta.env.VITE_DATABASE_URL || import.meta.env.VITE_NEON_URL || '';
  }
  
  // Sanitize Env Var
  url = sanitizeDbUrl(url);

  // 2. Fallback to Manual Override (Local Storage)
  if (!url) {
    try {
      const manual = localStorage.getItem(MANUAL_URL_KEY);
      if (manual) {
        url = sanitizeDbUrl(manual);
      }
    } catch (e) {
      console.error("Error reading manual DB URL", e);
    }
  }

  return url;
};

const DB_URL = getDbUrl();

if (DB_URL) {
  console.log("Neon DB URL found. Initializing connection...");
} else {
  console.log("No DB URL found. App will run in Offline/Local Mode.");
}

// Establish connection only if URL is valid
let sql: any = null;
try {
  // Double check validity before initializing
  if (DB_URL && (DB_URL.startsWith('postgres://') || DB_URL.startsWith('postgresql://'))) {
    sql = neon(DB_URL);
  } else if (DB_URL) {
    console.error("Invalid DB URL format detected during init:", DB_URL);
  }
} catch (e) {
  console.error("Failed to initialize Neon client:", e);
}

// KEYS
const STORAGE_KEY_UNITS = 'fleetguard_units_v1';
const STORAGE_KEY_REPORTS = 'fleetguard_reports_v1';
const QUEUE_KEY = 'fleetguard_offline_queue';

interface OfflineAction {
  id: string;
  type: 'CREATE_REPORT' | 'UPDATE_REPORT' | 'UPDATE_STATUS';
  payload: any;
  timestamp: number;
}

// --- HELPER FUNCTIONS ---

export const saveManualDbUrl = (input: string) => {
  if (input) {
    const cleanUrl = sanitizeDbUrl(input);
    localStorage.setItem(MANUAL_URL_KEY, cleanUrl);
  } else {
    localStorage.removeItem(MANUAL_URL_KEY);
  }
};

const getStoredUnits = (): Unit[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_UNITS);
    return stored ? JSON.parse(stored) : MOCK_FLEET;
  } catch (e) {
    return MOCK_FLEET;
  }
};

const saveUnitsLocal = (units: Unit[]) => {
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

const saveReportsLocal = (reports: DamageReport[]) => {
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
};

const addToOfflineQueue = (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
  try {
    const queueStr = localStorage.getItem(QUEUE_KEY);
    const queue: OfflineAction[] = queueStr ? JSON.parse(queueStr) : [];
    queue.push({
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log("Action added to offline queue", action.type);
  } catch (e) {
    console.error("Failed to add to offline queue", e);
  }
};

export const getOfflineQueueSize = (): number => {
  try {
    const queueStr = localStorage.getItem(QUEUE_KEY);
    return queueStr ? JSON.parse(queueStr).length : 0;
  } catch {
    return 0;
  }
};

// --- SYNC FUNCTION ---

export const syncOfflineChanges = async () => {
  if (!sql) return; // No DB to sync to

  const queueStr = localStorage.getItem(QUEUE_KEY);
  if (!queueStr) return;

  const queue: OfflineAction[] = JSON.parse(queueStr);
  if (queue.length === 0) return;

  console.log(`Syncing ${queue.length} offline actions...`);
  const failed: OfflineAction[] = [];

  for (const action of queue) {
    try {
      if (action.type === 'CREATE_REPORT') {
        const report = action.payload;
        await sql`
          INSERT INTO damage_reports (id, unit_id, timestamp, description, reported_by, priority, status, images, ai_analysis, suggested_parts, resolved_at, approved_by, approved_at)
          VALUES (
            ${report.id}, ${report.unitId}, ${report.timestamp}, ${report.description}, 
            ${report.reportedBy}, ${report.priority}, ${report.status}, ${report.images}, 
            ${report.aiAnalysis || null}, ${report.suggestedParts || []},
            ${report.resolvedAt || null}, ${report.approvedBy || null}, ${report.approvedAt || null}
          )
        `;
      } 
      else if (action.type === 'UPDATE_REPORT') {
        const { id, updates } = action.payload;
        if (updates.status && updates.resolvedAt) {
          await sql`UPDATE damage_reports SET status=${updates.status}, resolved_at=${updates.resolvedAt} WHERE id=${id}`;
        } else if (updates.status && updates.approvedBy) {
          await sql`UPDATE damage_reports SET status=${updates.status}, approved_by=${updates.approvedBy}, approved_at=${updates.approvedAt} WHERE id=${id}`;
        }
      } 
      else if (action.type === 'UPDATE_STATUS') {
        const { unitId, status } = action.payload;
        await sql`UPDATE units SET status = ${status} WHERE id = ${unitId}`;
      }
    } catch (e) {
      console.error(`Failed to sync action ${action.type}`, e);
      failed.push(action);
    }
  }

  if (failed.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  } else {
    localStorage.removeItem(QUEUE_KEY);
    console.log("Sync complete!");
  }
};

// --- DATABASE FUNCTIONS ---

export const isDbConfigured = () => !!sql;

export const getDbDebugInfo = () => {
  const url = getDbUrl();
  return {
    hasUrl: !!url,
    urlMasked: url ? `${url.substring(0, 15)}...` : 'Not Set',
    isOffline: !sql
  };
};

export const seedDatabaseIfEmpty = async () => {
  if (!sql) {
    const storedUnits = localStorage.getItem(STORAGE_KEY_UNITS);
    if (!storedUnits) {
      saveUnitsLocal(MOCK_FLEET);
      saveReportsLocal(INITIAL_REPORTS);
    }
    return true;
  }

  try {
    // Ensure tables exist
    await sql`CREATE TABLE IF NOT EXISTS units (
      id text PRIMARY KEY, name text NOT NULL, type text NOT NULL, model text NOT NULL, 
      status text NOT NULL, mileage numeric, last_inspection text
    )`;

    await sql`CREATE TABLE IF NOT EXISTS damage_reports (
      id text PRIMARY KEY, unit_id text NOT NULL, timestamp text NOT NULL, description text NOT NULL, 
      reported_by text NOT NULL, priority text NOT NULL, status text NOT NULL, images text[], 
      ai_analysis text, suggested_parts text[], resolved_at text, approved_by text, approved_at text
    )`;

    // Check if empty
    const existingUnits = await sql`SELECT count(*) FROM units`;
    if (parseInt(existingUnits[0].count) === 0) {
      console.log("Seeding Database...");
      for (const unit of MOCK_FLEET) {
        await sql`INSERT INTO units (id, name, type, model, status, mileage, last_inspection)
          VALUES (${unit.id}, ${unit.name}, ${unit.type}, ${unit.model}, ${unit.status}, ${unit.mileage || 0}, ${unit.lastInspection || null})`;
      }
      for (const report of INITIAL_REPORTS) {
        await sql`INSERT INTO damage_reports (id, unit_id, timestamp, description, reported_by, priority, status, images, ai_analysis, suggested_parts, resolved_at, approved_by, approved_at)
          VALUES (${report.id}, ${report.unitId}, ${report.timestamp}, ${report.description}, ${report.reportedBy}, ${report.priority}, ${report.status}, ${report.images}, 
          ${report.aiAnalysis || null}, ${report.suggestedParts || []}, ${report.resolvedAt || null}, ${report.approvedBy || null}, ${report.approvedAt || null})`;
      }
    }
  } catch (err) {
    console.error("Database Seeding/Connection Error:", err);
  }
  return true;
};

export const fetchUnits = async (): Promise<Unit[]> => {
  // Always try SQL first if configured
  if (sql) {
    try {
      const rows = await sql`SELECT * FROM units ORDER BY id ASC`;
      const units = rows.map((row: any) => ({
        id: row.id, name: row.name, type: row.type, model: row.model,
        status: row.status, mileage: Number(row.mileage), lastInspection: row.last_inspection
      }));
      // Update local cache on successful fetch
      saveUnitsLocal(units);
      return units;
    } catch (err) {
      console.error("Fetch Units Error (Network), falling back to local:", err);
    }
  }
  return getStoredUnits();
};

export const fetchReports = async (): Promise<DamageReport[]> => {
  if (sql) {
    try {
      const rows = await sql`SELECT * FROM damage_reports ORDER BY timestamp DESC`;
      const reports = rows.map((row: any) => ({
        id: row.id, unitId: row.unit_id, timestamp: row.timestamp, description: row.description,
        reportedBy: row.reported_by, priority: row.priority as RepairPriority, status: row.status,
        images: row.images || [], aiAnalysis: row.ai_analysis, suggestedParts: row.suggested_parts || [],
        resolvedAt: row.resolved_at, approvedBy: row.approved_by, approvedAt: row.approved_at
      }));
      saveReportsLocal(reports);
      return reports;
    } catch (err) {
      console.error("Fetch Reports Error (Network), falling back to local:", err);
    }
  }
  return getStoredReports();
};

export const createReport = async (report: DamageReport) => {
  // Always save locally first for immediate UI responsiveness
  const reports = getStoredReports();
  saveReportsLocal([report, ...reports]);

  if (sql) {
    try {
      await sql`
        INSERT INTO damage_reports (id, unit_id, timestamp, description, reported_by, priority, status, images, ai_analysis, suggested_parts, resolved_at, approved_by, approved_at)
        VALUES (
          ${report.id}, ${report.unitId}, ${report.timestamp}, ${report.description}, 
          ${report.reportedBy}, ${report.priority}, ${report.status}, ${report.images}, 
          ${report.aiAnalysis || null}, ${report.suggestedParts || []},
          ${report.resolvedAt || null}, ${report.approvedBy || null}, ${report.approvedAt || null}
        )
      `;
    } catch (err) {
      console.error("Create Report DB Error, adding to queue:", err);
      addToOfflineQueue({ type: 'CREATE_REPORT', payload: report });
    }
  }
};

export const updateReport = async (reportId: string, updates: Partial<DamageReport>) => {
  const reports = getStoredReports();
  const updated = reports.map(r => r.id === reportId ? { ...r, ...updates } : r);
  saveReportsLocal(updated);

  if (sql) {
    try {
      if (updates.status && updates.resolvedAt) {
        await sql`UPDATE damage_reports SET status=${updates.status}, resolved_at=${updates.resolvedAt} WHERE id=${reportId}`;
      } else if (updates.status && updates.approvedBy) {
        await sql`UPDATE damage_reports SET status=${updates.status}, approved_by=${updates.approvedBy}, approved_at=${updates.approvedAt} WHERE id=${reportId}`;
      }
    } catch (err) {
      console.error("Update Report DB Error, adding to queue:", err);
      addToOfflineQueue({ type: 'UPDATE_REPORT', payload: { id: reportId, updates } });
    }
  }
};

export const updateUnitStatus = async (unitId: string, status: UnitStatus) => {
  const units = getStoredUnits();
  const updated = units.map(u => u.id === unitId ? { ...u, status } : u);
  saveUnitsLocal(updated);

  if (sql) {
    try {
      await sql`UPDATE units SET status = ${status} WHERE id = ${unitId}`;
    } catch (err) {
      console.error("Update Status DB Error, adding to queue:", err);
      addToOfflineQueue({ type: 'UPDATE_STATUS', payload: { unitId, status } });
    }
  }
};