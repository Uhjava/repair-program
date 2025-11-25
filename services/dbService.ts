import { neon } from '@neondatabase/serverless';
import { Unit, DamageReport, UnitStatus } from '../types';
import { MOCK_FLEET, INITIAL_REPORTS } from '../constants';

// Helper to safely get env vars in Vite environment
const getEnv = (key: string) => {
  // In Vite/Netlify, variables are exposed via import.meta.env
  // We explicitly check for VITE_ prefixed variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || import.meta.env[`VITE_${key}`];
  }
  return '';
};

// Initialize Neon Client
const dbUrl = getEnv('VITE_DATABASE_URL');

// Use the 'neon' function for stateless HTTP queries
// We explicitly check if dbUrl is a valid string to avoid empty connection errors
const sql = dbUrl && dbUrl.startsWith('postgres') ? neon(dbUrl) : null;

export const isDbConfigured = () => !!sql;

// --- SEEDING & SETUP ---
export const seedDatabaseIfEmpty = async () => {
  if (!sql) return;

  try {
    // 1. Auto-Create Tables (Schema Migration)
    // This ensures the database is ready even if the user didn't run SQL manually.
    await sql`
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        model TEXT NOT NULL,
        status TEXT NOT NULL,
        mileage NUMERIC,
        last_inspection TIMESTAMPTZ
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS damage_reports (
        id TEXT PRIMARY KEY,
        unit_id TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        description TEXT NOT NULL,
        reported_by TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        images TEXT[],
        ai_analysis TEXT,
        suggested_parts TEXT[],
        resolved_at TIMESTAMPTZ,
        approved_by TEXT,
        approved_at TIMESTAMPTZ
      );
    `;

    // 2. Check if empty
    const result = await sql`SELECT count(*) FROM units`;
    const count = parseInt(result[0].count);

    if (count === 0) {
      console.log("Database empty. Seeding fleet...");
      
      // Seed Units
      for (const unit of MOCK_FLEET) {
        await sql`
          INSERT INTO units (id, name, type, model, status, mileage)
          VALUES (${unit.id}, ${unit.name}, ${unit.type}, ${unit.model}, ${unit.status}, ${unit.mileage || 0})
        `;
      }

      // Seed Reports
      for (const report of INITIAL_REPORTS) {
        await sql`
          INSERT INTO damage_reports (
            id, unit_id, timestamp, description, reported_by, priority, status, images, ai_analysis, suggested_parts
          )
          VALUES (
            ${report.id}, ${report.unitId}, ${report.timestamp}, ${report.description}, 
            ${report.reportedBy}, ${report.priority}, ${report.status}, ${report.images}, 
            ${report.aiAnalysis || null}, ${report.suggestedParts || []}
          )
        `;
      }
      
      console.log("Seeding complete.");
      return true;
    }
  } catch (error) {
    console.error("Error setting up or seeding database:", error);
  }
  return false;
};

// --- UNITS ---

export const fetchUnits = async (): Promise<Unit[]> => {
  if (!sql) return MOCK_FLEET;

  try {
    const data = await sql`
      SELECT 
        id, 
        name, 
        type, 
        model, 
        status, 
        mileage, 
        last_inspection::text as "lastInspection" 
      FROM units 
      ORDER BY id ASC
    `;
    return data as Unit[];
  } catch (error) {
    console.error('Error fetching units:', error);
    return [];
  }
};

export const updateUnitStatus = async (unitId: string, status: UnitStatus) => {
  if (!sql) return;
  try {
    await sql`UPDATE units SET status = ${status} WHERE id = ${unitId}`;
  } catch (error) {
    console.error('Error updating unit status:', error);
  }
};

// --- REPORTS ---

export const fetchReports = async (): Promise<DamageReport[]> => {
  if (!sql) return INITIAL_REPORTS;

  try {
    const data = await sql`
      SELECT 
        id, 
        unit_id as "unitId", 
        timestamp::text, 
        description, 
        reported_by as "reportedBy", 
        priority, 
        status, 
        images, 
        ai_analysis as "aiAnalysis", 
        suggested_parts as "suggestedParts", 
        resolved_at::text as "resolvedAt", 
        approved_by as "approvedBy", 
        approved_at::text as "approvedAt"
      FROM damage_reports 
      ORDER BY timestamp DESC
    `;
    return data as DamageReport[];
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
};

export const createReport = async (report: DamageReport) => {
  if (!sql) return;

  try {
    await sql`
      INSERT INTO damage_reports (
        id, unit_id, timestamp, description, reported_by, priority, status, images, ai_analysis, suggested_parts, approved_by, approved_at
      )
      VALUES (
        ${report.id}, 
        ${report.unitId}, 
        ${report.timestamp}, 
        ${report.description}, 
        ${report.reportedBy}, 
        ${report.priority}, 
        ${report.status}, 
        ${report.images}, 
        ${report.aiAnalysis || null}, 
        ${report.suggestedParts || []},
        ${report.approvedBy || null},
        ${report.approvedAt || null}
      )
    `;
  } catch (error) {
    console.error('Error creating report:', error);
  }
};

export const updateReport = async (reportId: string, updates: Partial<DamageReport>) => {
  if (!sql) return;

  try {
    if (updates.status) await sql`UPDATE damage_reports SET status = ${updates.status} WHERE id = ${reportId}`;
    if (updates.approvedBy) await sql`UPDATE damage_reports SET approved_by = ${updates.approvedBy}, approved_at = ${updates.approvedAt} WHERE id = ${reportId}`;
    if (updates.resolvedAt) await sql`UPDATE damage_reports SET resolved_at = ${updates.resolvedAt} WHERE id = ${reportId}`;

  } catch (error) {
    console.error('Error updating report:', error);
  }
};