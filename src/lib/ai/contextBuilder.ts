/**
 * CSV Auditor Pro - Analysis Context Builder (Phase 2)
 * Converts deterministic profiles, statistical aggregations, and data quality findings
 * into safe, compact, un-fabricated context structures for Gemini reasoning.
 */

import {
  AnalysisContext,
  AnalysisRoutePlan,
  DatasetProfile,
  StructuredGroundedContext,
  UserContext
} from './types';
import { CSVProfilingEngine } from './profiler';
import { DataQualityEngine } from './dataQuality';
import { AnomalyDetectionEngine } from './anomalyEngine';
import { AnalysisRouter } from './router';

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
 * Profiles the dataset deterministically if raw rows are provided.
 */
export function buildAnalysisContext(file?: CSVFileInput | null): AnalysisContext | null {
  if (!file || !file.name) {
    return null;
  }

  const rows = Array.isArray(file.rows) ? file.rows : [];
  const headers = Array.isArray(file.headers) && file.headers.length > 0
    ? file.headers
    : (rows.length > 0 ? Object.keys(rows[0]) : []);

  let profile: DatasetProfile | undefined;
  if (rows.length > 0) {
    profile = CSVProfilingEngine.profileDataset(rows, headers, file.id || 'current_file', file.name);
  }

  const qualityReport = rows.length > 0 ? DataQualityEngine.analyze(rows, headers, profile) : undefined;
  const anomalyReport = rows.length > 0 ? AnomalyDetectionEngine.detectAnomalies(rows, headers, profile) : undefined;

  return {
    fileId: file.id || 'current_file',
    fileName: file.name,
    rowCount: rows.length,
    columnCount: headers.length,
    headers,
    score: typeof file.score === 'number' ? file.score : (qualityReport ? qualityReport.qualityScore : undefined),
    issuesCount: qualityReport ? qualityReport.totalIssuesCount : (Array.isArray(file.issues) ? file.issues.length : 0),
    duplicatesCount: typeof file.duplicatesCount === 'number' ? file.duplicatesCount : profile?.duplicateRowCount,
    missingValuesCount: typeof file.missingValuesCount === 'number' ? file.missingValuesCount : profile?.totalMissingCells,
    formatErrorsCount: typeof file.formatErrorsCount === 'number' ? file.formatErrorsCount : undefined,
    outliersCount: typeof file.outliersCount === 'number' ? file.outliersCount : anomalyReport?.totalAnomaliesCount,
    sampleRows: rows.slice(0, 5),
    activeSchema: file.schema || null,
    cleaningOperationsPerformed: Array.isArray(file.cleaningLog) ? file.cleaningLog : [],
    profile,
    qualityReport,
    anomalyReport,
    rawRows: rows
  };
}

/**
 * Builds the compact StructuredGroundedContext for a specific query
 */
export function buildGroundedContext(
  prompt: string,
  analysisContext?: AnalysisContext | null
): StructuredGroundedContext {
  const rows = analysisContext?.rawRows || analysisContext?.sampleRows || [];
  const headers = analysisContext?.headers || (rows.length > 0 ? Object.keys(rows[0]) : []);
  const profile = analysisContext?.profile || (rows.length > 0 ? CSVProfilingEngine.profileDataset(rows, headers) : undefined);

  // 1. Route query and execute deterministic math
  const { routePlan, results } = AnalysisRouter.planAndExecute(prompt, rows, headers, profile);

  // 2. Identify relevant column profiles
  const relevantColumns = Array.from(new Set([
    ...routePlan.targetColumns,
    ...routePlan.groupColumns,
    ...routePlan.metricColumns,
    ...routePlan.dateColumns
  ]));

  const relevantColumnProfiles = relevantColumns
    .map(col => profile?.columnProfiles[col])
    .filter(Boolean) as any[];

  // 3. Compact profile summary
  const datasetProfileSummary = {
    fileName: analysisContext?.fileName || 'dataset.csv',
    rowCount: analysisContext?.rowCount || profile?.rowCount || 0,
    columnCount: headers.length,
    headers,
    qualityScore: analysisContext?.score ?? profile?.qualityScore ?? 100,
    duplicateRowCount: analysisContext?.duplicatesCount ?? profile?.duplicateRowCount ?? 0,
    overallMissingPercentage: profile?.overallMissingPercentage ?? 0
  };

  const hasSufficientData = datasetProfileSummary.rowCount > 0 && headers.length > 0;

  return {
    userQuestion: prompt,
    routePlan,
    datasetProfileSummary,
    relevantColumnProfiles,
    deterministicResults: {
      aggregation: results.aggregation,
      ranking: results.ranking,
      comparison: results.comparison,
      trend: results.trend,
      correlation: results.correlation,
      qualityReport: results.qualityReport || analysisContext?.qualityReport,
      anomalyReport: results.anomalyReport || analysisContext?.anomalyReport,
      remediationEvidence: results.remediationEvidence
    },
    sampleRecords: rows.slice(0, 3),
    hasSufficientData,
    insufficientDataReason: !hasSufficientData ? 'No active dataset or records loaded in the workspace.' : undefined
  };
}

/**
 * Formats the grounded context into a clean, compact prompt payload for Gemini
 */
export function formatGroundedPrompt(
  context: StructuredGroundedContext,
  userContext?: UserContext | null
): string {
  let prompt = `=== USER TASK / AUDIT INQUIRY ===\n${context.userQuestion}\n\n`;

  if (userContext) {
    prompt += `[WORKSPACE CONTEXT: "${userContext.workspaceName || 'Enterprise'}" | User: "${userContext.name || 'Auditor'}" | Tier: "${userContext.subscriptionPlan || 'pro'}"]\n\n`;
  }

  if (!context.hasSufficientData) {
    prompt += `[DATASET STATUS: Insufficient Data]\nReason: ${context.insufficientDataReason}\n\n`;
    prompt += `Please inform the user that no active dataset records were found in the workspace, and provide general data auditing advice or instructions to upload a CSV file.\n`;
    return prompt;
  }

  prompt += `=== DATASET AUDIT EVIDENCE & PROFILE (FOR YOUR REFERENCE) ===\n`;
  const d = context.datasetProfileSummary;
  prompt += `- Source File: "${d.fileName}" (${d.rowCount.toLocaleString()} rows x ${d.columnCount} columns)\n`;
  prompt += `- Available Columns: [${d.headers.join(', ')}]\n`;
  prompt += `- Data Quality Score: ${d.qualityScore}/100 | Duplicate Rows: ${d.duplicateRowCount} | Missing Data: ${d.overallMissingPercentage}%\n\n`;

  // Deterministic Execution Findings
  const res = context.deterministicResults;

  if (res.remediationEvidence) {
    const rem = res.remediationEvidence;
    prompt += `=== SPECIFIC REMEDIATION TARGET & EVIDENCE ===\n`;
    prompt += `- Target Column: "${rem.targetColumn}"\n`;
    prompt += `- Issue Type: ${rem.issueType}\n`;
    if (rem.referencedAffectedCount !== undefined) {
      prompt += `- Referenced Finding in Issue: ${rem.referencedAffectedCount.toLocaleString()} affected cells/occurrences\n`;
    }
    prompt += `- Active File State: ${rem.isCleanedOrResolvedInActiveState ? `Dataset in workspace is already cleaned (0 missing cells in current view; ${rem.referencedAffectedCount} cells identified in original audit)` : `${rem.currentDatasetMissingCount} missing cells currently in workspace (${rem.currentDatasetTotalRows} total rows)`}\n`;
    if (rem.topCategories && rem.topCategories.length > 0) {
      prompt += `- Distinct Categories (${rem.currentDatasetUniqueCount} unique): ${rem.topCategories.map(c => `"${c.value}" (${c.count}, ${c.percentage}%)`).join(', ')}\n`;
    }
    prompt += `- Recommended Action: ${rem.recommendedAction}\n`;
    prompt += `- Forensic Rationale: ${rem.rationale}\n`;
    prompt += `- Implementation Recipes:\n`;
    if (rem.implementationStrategies.pythonCodeSnippet) {
      prompt += `  * Python / Pandas:\n\`\`\`python\n${rem.implementationStrategies.pythonCodeSnippet}\n\`\`\`\n`;
    }
    if (rem.implementationStrategies.sqlQuerySnippet) {
      prompt += `  * SQL:\n\`\`\`sql\n${rem.implementationStrategies.sqlQuerySnippet}\n\`\`\`\n`;
    }
    if (rem.implementationStrategies.inAppAction) {
      prompt += `  * In-App Workflow: ${rem.implementationStrategies.inAppAction}\n`;
    }
    prompt += `- Validation: ${rem.validationCheck}\n\n`;
  }

  if (res.aggregation) {
    prompt += `=== DETERMINISTIC AGGREGATION EVIDENCE ===\n`;
    prompt += `- Operation: ${res.aggregation.operation} on column "${res.aggregation.targetColumn}"\n`;
    if (res.aggregation.groupByColumn) {
      prompt += `- Grouped By: "${res.aggregation.groupByColumn}"\n`;
      prompt += `- Computed Groups (${res.aggregation.groups.length}):\n`;
      res.aggregation.groups.slice(0, 10).forEach((g: any) => {
        prompt += `  * ${g.key}: ${g.value.toLocaleString()} (${g.count} records${g.percentage ? `, ${g.percentage}%` : ''})\n`;
      });
    }
    if (res.aggregation.overallTotal !== undefined) {
      prompt += `- Overall Total: ${res.aggregation.overallTotal.toLocaleString()}\n`;
    }
    if (res.aggregation.overallMean !== undefined) {
      prompt += `- Overall Average: ${res.aggregation.overallMean.toLocaleString()}\n`;
    }
    prompt += `\n`;
  }

  if (res.ranking) {
    prompt += `=== DETERMINISTIC RANKING EVIDENCE ===\n`;
    prompt += `- Metric: "${res.ranking.metricColumn}" | Direction: ${res.ranking.direction} (Top ${res.ranking.items.length} of ${res.ranking.totalEntitiesCount})\n`;
    res.ranking.items.forEach((item: any) => {
      prompt += `  #${item.rank}. ${item.key}: ${item.value.toLocaleString()}\n`;
    });
    prompt += `\n`;
  }

  if (res.trend) {
    prompt += `=== DETERMINISTIC TIME-SERIES TREND EVIDENCE ===\n`;
    prompt += `- Date Column: "${res.trend.dateColumn}" | Value Column: "${res.trend.valueColumn}" | Granularity: ${res.trend.granularity}\n`;
    prompt += `- Overall Direction: ${res.trend.overallTrend.toUpperCase()}${res.trend.averageGrowthRate ? ` (Avg Growth: ${res.trend.averageGrowthRate}%)` : ''}\n`;
    prompt += `- Highest Period: ${res.trend.highestPeriod.period} (${res.trend.highestPeriod.value.toLocaleString()})\n`;
    prompt += `- Lowest Period: ${res.trend.lowestPeriod.period} (${res.trend.lowestPeriod.value.toLocaleString()})\n`;
    prompt += `- Chronological Data Points:\n`;
    res.trend.dataPoints.slice(0, 12).forEach((p: any) => {
      prompt += `  * ${p.period}: ${p.value.toLocaleString()}${p.percentageChange !== undefined ? ` (${p.percentageChange > 0 ? '+' : ''}${p.percentageChange}%)` : ''}\n`;
    });
    prompt += `\n`;
  }

  if (res.correlation) {
    prompt += `=== DETERMINISTIC CORRELATION EVIDENCE ===\n`;
    prompt += `- Pair: "${res.correlation.columnA}" and "${res.correlation.columnB}"\n`;
    prompt += `- Pearson Coefficient (r): ${res.correlation.pearsonCoefficient} (${res.correlation.strength} ${res.correlation.direction})\n`;
    prompt += `- Sample Size: ${res.correlation.sampleSize} verified numeric pairs\n\n`;
  }

  if (res.qualityReport && res.qualityReport.findings && res.qualityReport.findings.length > 0) {
    prompt += `=== DATA QUALITY AUDIT FINDINGS ===\n`;
    prompt += `- Total Issues: ${res.qualityReport.totalIssuesCount} | Score: ${res.qualityReport.qualityScore}/100\n`;
    res.qualityReport.findings.slice(0, 6).forEach((f: any) => {
      prompt += `  * [${f.severity.toUpperCase()}] ${f.category} (${f.column || 'General'}): ${f.description}\n`;
    });
    prompt += `\n`;
  }

  if (res.anomalyReport && res.anomalyReport.findings && res.anomalyReport.findings.length > 0) {
    prompt += `=== ANOMALY & OUTLIER FINDINGS ===\n`;
    prompt += `- Total Flagged Anomalies: ${res.anomalyReport.totalAnomaliesCount}\n`;
    res.anomalyReport.findings.slice(0, 6).forEach((a: any) => {
      prompt += `  * Row ${a.rowIndex} (${a.column}): Value ${a.value} - ${a.reason}\n`;
    });
    prompt += `\n`;
  }

  if (context.relevantColumnProfiles.length > 0) {
    prompt += `=== RELEVANT COLUMN METADATA ===\n`;
    context.relevantColumnProfiles.forEach(col => {
      prompt += `- "${col.name}" [${col.inferredType}]: ${col.missingCount} missing (${col.missingPercentage}%), ${col.uniqueCount} unique`;
      if (col.stats) {
        prompt += `, Min: ${col.stats.min}, Max: ${col.stats.max}, Mean: ${col.stats.mean}, Median: ${col.stats.median}`;
      }
      if (col.dateRange) {
        prompt += `, Span: ${col.dateRange.minDate} to ${col.dateRange.maxDate} (${col.dateRange.spanDays} days)`;
      }
      prompt += `\n`;
    });
    prompt += `\n`;
  }

  if (context.routePlan.intent === 'remediation' || res.remediationEvidence) {
    prompt += `=== CRITICAL RESPONSE DIRECTIVES ===\n`;
    prompt += `1. Directly answer how to implement the remediation for the specified issue/column.\n`;
    prompt += `2. NEVER start with a generic dataset overview (DO NOT say "Dataset 'file.csv' contains X rows, score 100/100..."). Start immediately with the solution.\n`;
    prompt += `3. Structure your response clearly:\n`;
    prompt += `   ### Direct Answer\n`;
    prompt += `   (Clear summary of the remediation action to take)\n\n`;
    prompt += `   ### Why (Rationale & Domain Context)\n`;
    prompt += `   (Explain why this method is chosen, e.g. avoiding mode imputation for demographic/sensitive fields vs explicit 'Unknown' categorization)\n\n`;
    prompt += `   ### Recommended Remediation Strategy\n`;
    prompt += `   (Step-by-step strategy for handling the issue)\n\n`;
    prompt += `   ### Implementation Steps\n`;
    prompt += `   (Provide Python/Pandas code snippet, SQL query, and in-app cleaning recipe)\n\n`;
    prompt += `   ### Validation\n`;
    prompt += `   (How to verify the fix and ensure data integrity)\n`;
    prompt += `4. Ground all counts, categories, and code column names strictly in the provided evidence.`;
  } else {
    prompt += `=== RESPONSE DIRECTIVES ===\n`;
    prompt += `1. Answer the user's specific question directly, concisely, and accurately.\n`;
    prompt += `2. Do NOT recite generic dataset statistics unless the user explicitly requested a summary.\n`;
    prompt += `3. Ground all numbers and calculations strictly in the provided evidence.\n`;
    prompt += `4. Format your answer with clean Markdown headers, bullet points, and code blocks as appropriate.`;
  }

  return prompt;
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
