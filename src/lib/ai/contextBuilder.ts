/**
 * CSV Auditor Pro - AI Analysis Context Builder (Phase 1)
 * Extracts deterministic, un-fabricated dataset context from uploaded files.
 */

import { AnalysisContext, UserContext } from './types';

export interface CSVFileInput {
  id?: string;
  name: string;
  rows?: Record<string, any>[];
  headers?: string[];
  score?: number;
  issues?: any[];
  duplicatesCount?: number;
  missingValuesCount?: number;
  formatErrorsCount?: number;
  outliersCount?: number;
  schema?: string | null;
  cleaningLog?: string[];
}

/**
 * Builds a validated, factual AnalysisContext from a CSVFile object.
 * Does not fabricate missing statistics or invent values.
 */
export function buildAnalysisContext(file?: CSVFileInput | null): AnalysisContext | null {
  if (!file || !file.name) {
    return null;
  }

  const rows = Array.isArray(file.rows) ? file.rows : [];
  const headers = Array.isArray(file.headers) && file.headers.length > 0 
    ? file.headers 
    : (rows.length > 0 ? Object.keys(rows[0]) : []);

  const issues = Array.isArray(file.issues) ? file.issues : [];

  return {
    fileId: file.id || 'current_file',
    fileName: file.name,
    rowCount: rows.length,
    columnCount: headers.length,
    headers,
    score: typeof file.score === 'number' ? file.score : undefined,
    issuesCount: issues.length,
    duplicatesCount: typeof file.duplicatesCount === 'number' ? file.duplicatesCount : undefined,
    missingValuesCount: typeof file.missingValuesCount === 'number' ? file.missingValuesCount : undefined,
    formatErrorsCount: typeof file.formatErrorsCount === 'number' ? file.formatErrorsCount : undefined,
    outliersCount: typeof file.outliersCount === 'number' ? file.outliersCount : undefined,
    sampleRows: rows.slice(0, 5),
    activeSchema: file.schema || null,
    cleaningOperationsPerformed: Array.isArray(file.cleaningLog) ? file.cleaningLog : []
  };
}

/**
 * Builds standard UserContext safely
 */
export function buildUserContext(user?: any): UserContext | null {
  if (!user) return null;
  return {
    uid: user.uid || user.id,
    email: user.email,
    name: user.displayName || user.name,
    role: user.role,
    workspaceName: user.workspaceName || user.organizationName,
    subscriptionPlan: user.subscriptionPlan || user.tier || 'free'
  };
}
