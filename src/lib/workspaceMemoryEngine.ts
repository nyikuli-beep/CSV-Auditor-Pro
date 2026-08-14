/**
 * CSV Auditor Pro - Workspace Intelligence Memory Engine
 * Phase 3: Persistent Workspace-Level Memory and Contextual Awareness
 * 
 * Maintains isolated, secure awareness of:
 * - Current uploaded dataset
 * - Previous datasets within the active workspace
 * - Audit, validation, and cleaning history
 * - Generated reports and team collaboration activities
 * - Saved user preferences and enterprise policies
 */

import { StructuredCSVContext } from './csvContextEngine';

export interface WorkspaceDatasetRecord {
  fileId: string;
  fileName: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  qualityScore: number;
  issuesSummary: {
    duplicates: number;
    missingValues: number;
    invalidFormats: number;
    outliers: number;
    formulaRisks: number;
  };
  cleanedAt?: string;
  auditedAt: string;
  retentionPolicy?: string;
}

export interface WorkspaceAuditHistoryItem {
  id: string;
  fileId: string;
  fileName: string;
  timestamp: string;
  score: number;
  rulesEvaluatedCount: number;
  criticalIssuesFound: number;
  auditedBy: string;
  status: 'passed' | 'warning' | 'critical' | 'remediated';
}

export interface WorkspaceCleaningHistoryItem {
  id: string;
  fileId: string;
  fileName: string;
  timestamp: string;
  operationsApplied: string[];
  rowsRemovedCount: number;
  cellsFixedCount: number;
  performedBy: string;
}

export interface WorkspaceReportRecord {
  id: string;
  title: string;
  fileId?: string;
  fileName?: string;
  generatedAt: string;
  templateType: 'executive' | 'technical' | 'compliance' | 'compact';
  generatedBy: string;
  recipientsCount?: number;
}

export interface WorkspaceTeamActivitySummary {
  recentActionsCount: number;
  lastActiveMember: string;
  lastAction: string;
  lastActionTime: string;
  activeMembersCount: number;
}

export interface WorkspaceMemoryState {
  workspaceId: string;
  workspaceName: string;
  currentDataset: WorkspaceDatasetRecord | null;
  previousDatasets: WorkspaceDatasetRecord[];
  auditHistory: WorkspaceAuditHistoryItem[];
  cleaningHistory: WorkspaceCleaningHistoryItem[];
  reportsGenerated: WorkspaceReportRecord[];
  teamActivity: WorkspaceTeamActivitySummary;
  savedPreferences: {
    strictComplianceMode: boolean;
    autoDeduplication: boolean;
    formulaSanitization: boolean;
    defaultDateFormat: string;
    retentionDays: number;
  };
  conversationInsightsSummary: string[];
  updatedAt: string;
}

// In-Memory Workspace Storage Cache (isolated by workspaceId)
const workspaceMemoryStore = new Map<string, WorkspaceMemoryState>();

/**
 * Get or initialize workspace memory for a given tenant/workspace
 */
export function getWorkspaceMemory(
  workspaceId: string = 'org-enterprise-root', 
  workspaceName: string = 'CSV Auditor Pro Workspace'
): WorkspaceMemoryState {
  if (!workspaceMemoryStore.has(workspaceId)) {
    // Try restoring from localStorage if client-side
    let storedState: WorkspaceMemoryState | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(`ws_memory_${workspaceId}`);
        if (raw) storedState = JSON.parse(raw);
      } catch (e) {
        console.warn('[WorkspaceMemory] Storage parse fallback:', e);
      }
    }

    const defaultState: WorkspaceMemoryState = storedState || {
      workspaceId,
      workspaceName,
      currentDataset: null,
      previousDatasets: [],
      auditHistory: [],
      cleaningHistory: [],
      reportsGenerated: [],
      teamActivity: {
        recentActionsCount: 0,
        lastActiveMember: 'Admin',
        lastAction: 'Workspace initialized',
        lastActionTime: new Date().toISOString(),
        activeMembersCount: 1
      },
      savedPreferences: {
        strictComplianceMode: true,
        autoDeduplication: true,
        formulaSanitization: true,
        defaultDateFormat: 'YYYY-MM-DD (ISO 8601)',
        retentionDays: 90
      },
      conversationInsightsSummary: [],
      updatedAt: new Date().toISOString()
    };

    workspaceMemoryStore.set(workspaceId, defaultState);
  }

  return workspaceMemoryStore.get(workspaceId)!;
}

/**
 * Save workspace memory update
 */
export function updateWorkspaceMemory(
  workspaceId: string, 
  updater: (state: WorkspaceMemoryState) => Partial<WorkspaceMemoryState>
): WorkspaceMemoryState {
  const current = getWorkspaceMemory(workspaceId);
  const updates = updater(current);
  const nextState: WorkspaceMemoryState = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  workspaceMemoryStore.set(workspaceId, nextState);

  // Persist to local storage if available
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`ws_memory_${workspaceId}`, JSON.stringify(nextState));
    } catch (e) {
      console.warn('[WorkspaceMemory] Local persistence write warning:', e);
    }
  }

  return nextState;
}

/**
 * Register or update the currently active dataset in workspace memory
 */
export function recordActiveDatasetInMemory(
  workspaceId: string,
  dataset: {
    fileId: string;
    fileName: string;
    rowCount: number;
    headers: string[];
    score: number;
    duplicatesCount?: number;
    missingValuesCount?: number;
    formatErrorsCount?: number;
    outliersCount?: number;
    formulaRisksCount?: number;
  }
): void {
  updateWorkspaceMemory(workspaceId, (state) => {
    const newRecord: WorkspaceDatasetRecord = {
      fileId: dataset.fileId,
      fileName: dataset.fileName,
      rowCount: dataset.rowCount,
      columnCount: dataset.headers.length,
      headers: dataset.headers,
      qualityScore: dataset.score,
      issuesSummary: {
        duplicates: dataset.duplicatesCount || 0,
        missingValues: dataset.missingValuesCount || 0,
        invalidFormats: dataset.formatErrorsCount || 0,
        outliers: dataset.outliersCount || 0,
        formulaRisks: dataset.formulaRisksCount || 0
      },
      auditedAt: new Date().toISOString()
    };

    // If there was an existing active dataset different from this one, shift to previous datasets
    const previous = state.previousDatasets.filter(d => d.fileId !== dataset.fileId);
    if (state.currentDataset && state.currentDataset.fileId !== dataset.fileId) {
      previous.unshift(state.currentDataset);
    }

    return {
      currentDataset: newRecord,
      previousDatasets: previous.slice(0, 10) // Retain top 10 recent datasets
    };
  });
}

/**
 * Record an audit event into workspace memory
 */
export function recordAuditEventInMemory(
  workspaceId: string,
  audit: {
    fileId: string;
    fileName: string;
    score: number;
    rulesEvaluatedCount: number;
    criticalIssuesFound: number;
    auditedBy: string;
  }
): void {
  updateWorkspaceMemory(workspaceId, (state) => {
    const item: WorkspaceAuditHistoryItem = {
      id: `audit-${Date.now()}`,
      fileId: audit.fileId,
      fileName: audit.fileName,
      timestamp: new Date().toISOString(),
      score: audit.score,
      rulesEvaluatedCount: audit.rulesEvaluatedCount,
      criticalIssuesFound: audit.criticalIssuesFound,
      auditedBy: audit.auditedBy,
      status: audit.score >= 90 ? 'passed' : audit.score >= 70 ? 'warning' : 'critical'
    };

    return {
      auditHistory: [item, ...state.auditHistory].slice(0, 25)
    };
  });
}

/**
 * Record a data cleaning event in workspace memory
 */
export function recordCleaningEventInMemory(
  workspaceId: string,
  cleaning: {
    fileId: string;
    fileName: string;
    operationsApplied: string[];
    rowsRemovedCount: number;
    cellsFixedCount: number;
    performedBy: string;
  }
): void {
  updateWorkspaceMemory(workspaceId, (state) => {
    const item: WorkspaceCleaningHistoryItem = {
      id: `clean-${Date.now()}`,
      fileId: cleaning.fileId,
      fileName: cleaning.fileName,
      timestamp: new Date().toISOString(),
      operationsApplied: cleaning.operationsApplied,
      rowsRemovedCount: cleaning.rowsRemovedCount,
      cellsFixedCount: cleaning.cellsFixedCount,
      performedBy: cleaning.performedBy
    };

    return {
      cleaningHistory: [item, ...state.cleaningHistory].slice(0, 25)
    };
  });
}

/**
 * Record report generation in workspace memory
 */
export function recordReportInMemory(
  workspaceId: string,
  report: {
    title: string;
    fileId?: string;
    fileName?: string;
    templateType: 'executive' | 'technical' | 'compliance' | 'compact';
    generatedBy: string;
    recipientsCount?: number;
  }
): void {
  updateWorkspaceMemory(workspaceId, (state) => {
    const item: WorkspaceReportRecord = {
      id: `rep-${Date.now()}`,
      title: report.title,
      fileId: report.fileId,
      fileName: report.fileName,
      generatedAt: new Date().toISOString(),
      templateType: report.templateType,
      generatedBy: report.generatedBy,
      recipientsCount: report.recipientsCount || 1
    };

    return {
      reportsGenerated: [item, ...state.reportsGenerated].slice(0, 20)
    };
  });
}

/**
 * Record key insight from conversational interaction
 */
export function recordConversationInsightInMemory(workspaceId: string, insight: string): void {
  if (!insight || insight.trim().length === 0) return;
  updateWorkspaceMemory(workspaceId, (state) => {
    const existing = state.conversationInsightsSummary.filter(i => i !== insight);
    return {
      conversationInsightsSummary: [insight.trim(), ...existing].slice(0, 15)
    };
  });
}

/**
 * Clear or reset workspace memory
 */
export function clearWorkspaceMemory(workspaceId: string): void {
  workspaceMemoryStore.delete(workspaceId);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(`ws_memory_${workspaceId}`);
    } catch (e) {
      console.warn('[WorkspaceMemory] Local storage removal warning:', e);
    }
  }
}

/**
 * Build a concise, high-density Memory Context Block for AI Prompts
 */
export function buildWorkspaceMemoryPromptBlock(workspaceId: string): string {
  const memory = getWorkspaceMemory(workspaceId);

  let block = `### WORKSPACE INTELLIGENCE MEMORY (Tenant ID: ${memory.workspaceId})\n`;
  block += `- Workspace: "${memory.workspaceName}"\n`;

  if (memory.currentDataset) {
    const cur = memory.currentDataset;
    block += `- Active Dataset: "${cur.fileName}" (${cur.rowCount.toLocaleString()} rows, ${cur.columnCount} columns, Quality Score: ${cur.qualityScore}%)\n`;
    block += `  * Known Issues: Duplicates: ${cur.issuesSummary.duplicates}, Missing Values: ${cur.issuesSummary.missingValues}, Outliers: ${cur.issuesSummary.outliers}, Formula Injection Risks: ${cur.issuesSummary.formulaRisks}\n`;
  } else {
    block += `- Active Dataset: None loaded currently\n`;
  }

  if (memory.previousDatasets.length > 0) {
    block += `- Previous Workspace Datasets (${memory.previousDatasets.length}):\n`;
    memory.previousDatasets.slice(0, 3).forEach(prev => {
      block += `  * "${prev.fileName}" (${prev.rowCount} rows, Score: ${prev.qualityScore}%, Audited: ${new Date(prev.auditedAt).toLocaleDateString()})\n`;
    });
  }

  if (memory.cleaningHistory.length > 0) {
    const recentClean = memory.cleaningHistory[0];
    block += `- Recent Data Cleaning: Applied [${recentClean.operationsApplied.join(', ')}] on "${recentClean.fileName}" (Fixed ${recentClean.cellsFixedCount} cells, Removed ${recentClean.rowsRemovedCount} rows)\n`;
  }

  if (memory.auditHistory.length > 0) {
    const recentAudit = memory.auditHistory[0];
    block += `- Last Audit Execution: Score ${recentAudit.score}% on "${recentAudit.fileName}" (Critical Issues: ${recentAudit.criticalIssuesFound}, Status: ${recentAudit.status.toUpperCase()})\n`;
  }

  if (memory.reportsGenerated.length > 0) {
    const recentRep = memory.reportsGenerated[0];
    block += `- Last Generated Report: "${recentRep.title}" (${recentRep.templateType} template on ${new Date(recentRep.generatedAt).toLocaleDateString()})\n`;
  }

  if (memory.conversationInsightsSummary.length > 0) {
    block += `- Persistent Workspace Insights:\n`;
    memory.conversationInsightsSummary.slice(0, 3).forEach(ins => {
      block += `  * ${ins}\n`;
    });
  }

  return block;
}
