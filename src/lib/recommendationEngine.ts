/**
 * CSV Auditor Pro - Proactive Intelligence & Recommendation Engine
 * Phase 3: Actionable Prescriptions & Unprompted Anomaly Discovery
 * 
 * Generates:
 * - Prioritized, evidence-backed remediation recommendations
 * - Proactive insights distinguishing Confirmed Findings from Hypotheses
 * - Contextual intelligent follow-up suggestions for seamless conversational workflow
 */

import { ToolResult } from './aiToolRegistry';
import { AgentEvidence } from './agents/types';
import { StructuredCSVContext } from './csvContextEngine';
import { EnterpriseRiskAssessment } from './riskAssessmentEngine';

export interface ActionableRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  actionType: 'deduplicate' | 'sanitize_formulas' | 'impute_missing' | 'mask_pii' | 'clamp_outliers' | 'standardize_dates' | 'normalize_casing';
  rationale: string;
  expectedImpact: string;
  estimatedEffort: 'instant_auto_fix' | 'requires_review' | 'manual_verification';
  targetColumns?: string[];
  remediationCommandPrompt?: string;
}

export interface ProactiveInsight {
  id: string;
  type: 'confirmed_finding' | 'investigation_recommended';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  evidenceMetric: string;
  suggestedAction: string;
}

export interface FollowUpSuggestion {
  id: string;
  label: string;
  prompt: string;
  agentId?: string;
  category: 'report' | 'cleaning' | 'deep_audit' | 'statistics' | 'compliance' | 'compare';
}

/**
 * Generate prioritized recommendations based on empirical findings
 */
export function generatePrioritizedRecommendations(
  dataset?: StructuredCSVContext | { headers?: string[]; rowCount?: number; qualityScore?: number },
  riskAssessment?: EnterpriseRiskAssessment,
  executedTools: ToolResult[] = [],
  evidence: AgentEvidence[] = []
): ActionableRecommendation[] {
  const recs: ActionableRecommendation[] = [];

  if (!dataset || !dataset.headers || dataset.headers.length === 0) {
    return recs;
  }

  // 1. Critical Security Formula Sanitization
  const formulaEvidence = evidence.find(e => e.metricLabel.includes('Formula') || e.metricLabel.includes('Security'));
  if (formulaEvidence && Number(formulaEvidence.metricValue) > 0) {
    recs.push({
      id: 'rec-sanitize-formulas',
      priority: 'critical',
      title: 'Disarm Formula Injection Cells',
      actionType: 'sanitize_formulas',
      rationale: `Found ${formulaEvidence.metricValue} cells with executable prefixes (=, +, -, @) that pose an execution threat in Excel.`,
      expectedImpact: 'Neutralizes all spreadsheet injection vectors by prepending safe apostrophes without modifying cell display.',
      estimatedEffort: 'instant_auto_fix',
      targetColumns: formulaEvidence.columnsInvolved || ['Spreadsheet Formulas'],
      remediationCommandPrompt: 'Execute formula sanitization recipe across active spreadsheet'
    });
  }

  // 2. Deduplication Recommendation
  const dupEvidence = evidence.find(e => e.metricLabel.includes('Duplicate'));
  if (dupEvidence && Number(dupEvidence.metricValue) > 0) {
    const dupCount = Number(dupEvidence.metricValue);
    recs.push({
      id: 'rec-deduplicate',
      priority: dupCount > 10 ? 'high' : 'medium',
      title: `Purge ${dupCount} Redundant Duplicate Records`,
      actionType: 'deduplicate',
      rationale: 'Duplicate rows inflate metrics, distort transaction totals, and violate unique primary key constraints.',
      expectedImpact: `Reduces dataset by ${dupCount} rows, restores 100% relational integrity, and optimizes ingestion speed.`,
      estimatedEffort: 'instant_auto_fix',
      remediationCommandPrompt: 'Run automatic duplicate removal and keep first occurrence'
    });
  }

  // 3. Missing Value Imputation / Backfill
  const missingEvidence = evidence.find(e => e.metricLabel.includes('Missing'));
  if (missingEvidence && Number(missingEvidence.metricValue) > 0) {
    const missingCount = Number(missingEvidence.metricValue);
    recs.push({
      id: 'rec-impute-missing',
      priority: missingCount > 50 ? 'high' : 'medium',
      title: `Impute or Backfill ${missingCount} Null Values`,
      actionType: 'impute_missing',
      rationale: 'Missing attributes cause null-pointer exceptions in downstream ETL pipelines and create skewed analytics.',
      expectedImpact: 'Fills numeric columns with computed averages and categorical strings with standard fallback values (N/A).',
      estimatedEffort: 'requires_review',
      targetColumns: missingEvidence.columnsInvolved,
      remediationCommandPrompt: 'Impute missing values using column-specific averages and standard category placeholders'
    });
  }

  // 4. Outlier Bounds Clamping
  const outlierEvidence = evidence.find(e => e.metricLabel.includes('Outlier'));
  if (outlierEvidence && Number(outlierEvidence.metricValue) > 0) {
    const outlierCount = Number(outlierEvidence.metricValue);
    recs.push({
      id: 'rec-clamp-outliers',
      priority: 'medium',
      title: `Cap or Investigate ${outlierCount} Statistical Outliers`,
      actionType: 'clamp_outliers',
      rationale: `Outliers exceeding 2.5 standard deviations skew average and variance calculations across key performance indicators.`,
      expectedImpact: 'Applies Winsorization or boundary clamping to prevent statistical distortions.',
      estimatedEffort: 'requires_review',
      targetColumns: outlierEvidence.columnsInvolved,
      remediationCommandPrompt: 'Cap extreme outliers using 3.5x IQR boundary capping'
    });
  }

  // 5. Date Standardizations (Default best practice)
  recs.push({
    id: 'rec-standardize-dates',
    priority: 'low',
    title: 'Standardize Date Fields to ISO-8601',
    actionType: 'standardize_dates',
    rationale: 'Heterogeneous date formats (MM/DD/YYYY vs DD-MM-YYYY) cause incorrect timeline grouping and SQL parsing errors.',
    expectedImpact: 'Normalizes all timestamps to standard ISO-8601 format (YYYY-MM-DDTHH:mm:ssZ).',
    estimatedEffort: 'instant_auto_fix',
    remediationCommandPrompt: 'Standardize all date formats in active dataset to ISO 8601'
  });

  return recs;
}

/**
 * Scan for unprompted proactive findings
 */
export function scanProactiveInsights(
  dataset?: StructuredCSVContext | { headers?: string[]; rowCount?: number; qualityScore?: number },
  executedTools: ToolResult[] = [],
  evidence: AgentEvidence[] = []
): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];

  if (!dataset || !dataset.headers || dataset.headers.length === 0) {
    return insights;
  }

  // Check Confirmed Findings from Tools
  executedTools.forEach(tool => {
    if (tool.toolName === 'findDuplicates' && tool.data?.duplicateRowCount > 0) {
      insights.push({
        id: 'proactive-dup-confirmed',
        type: 'confirmed_finding',
        severity: 'warning',
        title: 'Confirmed Duplicate Rows',
        description: `Deterministic tool scan verified ${tool.data.duplicateRowCount} identical row instances in active dataset.`,
        evidenceMetric: `${tool.data.duplicateRowCount} duplicate rows`,
        suggestedAction: 'Deduplicate in Hygiene Workspace'
      });
    }

    if (tool.toolName === 'findInvalidCharacters' && tool.data?.count > 0) {
      insights.push({
        id: 'proactive-formula-confirmed',
        type: 'confirmed_finding',
        severity: 'critical',
        title: 'Confirmed Spreadsheet Injection Risks',
        description: `Verified ${tool.data.count} raw cells containing dangerous unescaped leading characters (=, +, -, @).`,
        evidenceMetric: `${tool.data.count} formula risks`,
        suggestedAction: 'Execute Instant Formula Neutralization'
      });
    }

    if (tool.toolName === 'detectOutliers' && tool.data?.totalOutliers > 0) {
      insights.push({
        id: 'proactive-outlier-investigation',
        type: 'investigation_recommended',
        severity: 'info',
        title: 'Potential Price / Volume Outlier Cluster',
        description: `Identified ${tool.data.totalOutliers} extreme values in column "${tool.data.column || 'Amount'}". These may represent legitimate mega-deals or data entry errors.`,
        evidenceMetric: `${tool.data.totalOutliers} outliers (Z-score > 2.5)`,
        suggestedAction: 'Review statistical distribution with Statistical Analyst'
      });
    }
  });

  return insights;
}

/**
 * Generate intelligent follow-up suggestions tailored to the current context
 */
export function generateFollowUpSuggestions(
  intentCategory: string = 'CSV_ANALYSIS',
  hasActiveDataset: boolean = true,
  riskLevel: string = 'low',
  primaryAgent: string = 'data_quality_auditor'
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];

  if (!hasActiveDataset) {
    return [
      {
        id: 'sug-demo',
        label: 'Upload Sample Enterprise Data',
        prompt: 'How can I upload and audit my customer transaction dataset?',
        category: 'deep_audit'
      },
      {
        id: 'sug-compliance',
        label: 'Compliance & Security Standards',
        prompt: 'What compliance frameworks (GDPR, SOC 2, HIPAA) does CSV Auditor Pro enforce?',
        category: 'compliance'
      },
      {
        id: 'sug-agents',
        label: 'Specialist AI Agents Overview',
        prompt: 'What are the capabilities of the 7 Specialist AI Agents?',
        category: 'deep_audit'
      }
    ];
  }

  // Context-aware suggestions when dataset is loaded
  if (riskLevel === 'critical' || riskLevel === 'high') {
    suggestions.push({
      id: 'sug-fix-critical',
      label: 'Auto-Remediate Critical Risks',
      prompt: 'Execute automatic remediation for all formula injections and duplicate records.',
      category: 'cleaning'
    });
    suggestions.push({
      id: 'sug-compliance-report',
      label: 'Generate Compliance Audit Trail',
      prompt: 'Generate an executive compliance report covering security risks and PII exposure.',
      category: 'report'
    });
  } else {
    suggestions.push({
      id: 'sug-exec-report',
      label: 'Generate Executive Brief',
      prompt: 'Generate an Executive Summary Report with quality score, key findings, and next actions.',
      category: 'report'
    });
  }

  suggestions.push({
    id: 'sug-stats',
    label: 'Deep Statistical Analysis',
    prompt: 'Calculate statistical distributions, IQR bounds, and correlation metrics across numeric columns.',
    category: 'statistics',
    agentId: 'statistical_analyst'
  });

  suggestions.push({
    id: 'sug-cleaning-recipe',
    label: 'Data Hygiene Recipe',
    prompt: 'What is the optimal multi-step cleaning recipe for standardizing this file?',
    category: 'cleaning',
    agentId: 'data_cleaning_expert'
  });

  return suggestions.slice(0, 4);
}
