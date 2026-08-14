/**
 * CSV Auditor Pro - Enterprise Risk Assessment Engine
 * Phase 3: Risk Categorization & Threat Rationale
 * 
 * Classifies dataset risks across:
 * - Security (Formula injection, script vectors, unescaped payload)
 * - Regulatory Compliance (GDPR, HIPAA, SOC 2, CCPA, PII exposure)
 * - Data Integrity (Corrupt data types, high missing rates, unkeyed duplicates)
 * - Business & Financial (Pricing calculation drift, revenue reporting errors)
 * - Operational (Schema drift, pipeline failure risks)
 */

import { ToolResult } from './aiToolRegistry';
import { AgentEvidence } from './agents/types';
import { StructuredCSVContext } from './csvContextEngine';

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type RiskCategory = 'security' | 'compliance' | 'data_integrity' | 'business_financial' | 'operational';

export interface EnterpriseRiskItem {
  id: string;
  severity: RiskSeverity;
  category: RiskCategory;
  title: string;
  rationale: string;
  affectedColumns?: string[];
  affectedCount?: number;
  businessImpact: string;
  regulatoryRelevance?: string[];
  remediationUrgency: 'immediate' | 'high_priority' | 'scheduled' | 'advisory';
}

export interface EnterpriseRiskAssessment {
  overallRisk: RiskSeverity;
  riskScore: number; // 0 to 100 (100 = critical risk, 0 = no risk)
  headline: string;
  summaryRationale: string;
  risks: EnterpriseRiskItem[];
  mitigationPriority: 'urgent_action_required' | 'remediation_recommended' | 'routine_maintenance' | 'clean_compliance';
  complianceStatus: 'compliant' | 'warning' | 'non_compliant';
}

/**
 * Evaluate enterprise risk profile based strictly on empirical evidence
 */
export function evaluateEnterpriseRisks(
  dataset?: StructuredCSVContext | { rowCount?: number; headers?: string[]; qualityScore?: number; rows?: Record<string, any>[] },
  executedTools: ToolResult[] = [],
  evidence: AgentEvidence[] = []
): EnterpriseRiskAssessment {
  const risks: EnterpriseRiskItem[] = [];

  if (!dataset || !dataset.headers || dataset.headers.length === 0) {
    return {
      overallRisk: 'informational',
      riskScore: 0,
      headline: 'No Active Risk Vector Identified',
      summaryRationale: 'No active dataset is currently loaded for security and compliance audit.',
      risks: [],
      mitigationPriority: 'clean_compliance',
      complianceStatus: 'compliant'
    };
  }

  const headers = dataset.headers;
  const qualityScore = dataset.qualityScore !== undefined ? dataset.qualityScore : 95;

  // 1. Check Formula Injection Security Risk
  const formulaTool = executedTools.find(t => t.toolName === 'findInvalidCharacters' || t.toolName === 'detect_formula_injections');
  const formulaEvidence = evidence.find(e => e.metricLabel.includes('Formula') || e.metricLabel.includes('Security'));

  if (formulaEvidence && Number(formulaEvidence.metricValue) > 0) {
    const riskCount = Number(formulaEvidence.metricValue);
    risks.push({
      id: 'risk-formula-injection',
      severity: 'critical',
      category: 'security',
      title: 'CSV Command & Formula Injection Vulnerability',
      rationale: `Found ${riskCount} cells starting with formula trigger characters (=, +, -, @) which execute arbitrary formulas when opened in Excel/Sheets.`,
      affectedColumns: formulaEvidence.columnsInvolved || ['Spreadsheet Formulas'],
      affectedCount: riskCount,
      businessImpact: 'High risk of remote command execution, data exfiltration, or spreadsheet macro hijacking upon analyst export.',
      regulatoryRelevance: ['SOC 2 Security', 'OWASP Top 10 (CSV Injection)', 'ISO 27001'],
      remediationUrgency: 'immediate'
    });
  }

  // 2. Check PII & Compliance Exposure
  const piiHeaders = headers.filter(h => {
    const l = h.toLowerCase();
    return l.includes('ssn') || l.includes('social') || l.includes('credit') || l.includes('card') || l.includes('passport') || l.includes('tax_id') || l.includes('password') || l.includes('secret');
  });

  if (piiHeaders.length > 0) {
    risks.push({
      id: 'risk-pii-exposure',
      severity: 'high',
      category: 'compliance',
      title: 'Unencrypted Personally Identifiable Information (PII)',
      rationale: `Detected unmasked sensitive identity fields in column(s): [${piiHeaders.join(', ')}].`,
      affectedColumns: piiHeaders,
      businessImpact: 'Regulatory exposure to GDPR Article 32 / HIPAA privacy violations and substantial statutory fines.',
      regulatoryRelevance: ['GDPR Article 32', 'HIPAA Privacy Rule', 'CCPA/CPRA'],
      remediationUrgency: 'high_priority'
    });
  }

  // 3. Check High Duplicate Rate (Financial/Integrity Risk)
  const dupTool = executedTools.find(t => t.toolName === 'findDuplicates');
  const dupCount = dupTool?.data?.duplicateRowCount || (dataset as any).duplicateRowsCount || 0;

  if (dupCount > 0) {
    const isHigh = dupCount > 20 || (dataset.rowCount && (dupCount / dataset.rowCount) > 0.05);
    risks.push({
      id: 'risk-duplicate-records',
      severity: isHigh ? 'high' : 'medium',
      category: 'data_integrity',
      title: 'Duplicate Record Clustering',
      rationale: `Identified ${dupCount} redundant duplicate rows that skew analytical reporting and database key integrity.`,
      affectedCount: dupCount,
      businessImpact: 'Causes double-counting in financial ledgers, skewed revenue projections, and degraded ERP ingestion pipelines.',
      regulatoryRelevance: ['SOX Financial Reporting Accuracy', 'BCBS 239 Risk Data Aggregation'],
      remediationUrgency: isHigh ? 'high_priority' : 'scheduled'
    });
  }

  // 4. Check Missing Value Density
  const missingTool = executedTools.find(t => t.toolName === 'findMissingValues');
  const totalMissing = missingTool?.data?.totalMissingCells || 0;

  if (totalMissing > 0) {
    const isSevere = totalMissing > 100;
    risks.push({
      id: 'risk-missing-density',
      severity: isSevere ? 'medium' : 'low',
      category: 'data_integrity',
      title: 'Missing Value Sparsity',
      rationale: `${totalMissing} empty or null cells detected across required schema attributes.`,
      affectedCount: totalMissing,
      businessImpact: 'Downstream ETL pipeline failures, incomplete customer profiles, and corrupted aggregate sums.',
      regulatoryRelevance: ['Data Governance Quality Standards'],
      remediationUrgency: 'scheduled'
    });
  }

  // 5. Check Statistical Outliers
  const outlierTool = executedTools.find(t => t.toolName === 'detectOutliers');
  const outlierCount = outlierTool?.data?.totalOutliers || 0;

  if (outlierCount > 0) {
    risks.push({
      id: 'risk-statistical-outliers',
      severity: outlierCount > 10 ? 'medium' : 'low',
      category: 'business_financial',
      title: 'Extreme Statistical Outliers Detected',
      rationale: `Found ${outlierCount} records deviating beyond 2.5 standard deviations from median distribution.`,
      affectedCount: outlierCount,
      businessImpact: 'Distorts forecasting models, average transaction values, and automated pricing rules.',
      remediationUrgency: 'advisory'
    });
  }

  // Calculate Overall Risk Severity and Score
  let overallRisk: RiskSeverity = 'low';
  let riskScore = 15;
  let mitigationPriority: EnterpriseRiskAssessment['mitigationPriority'] = 'routine_maintenance';
  let complianceStatus: EnterpriseRiskAssessment['complianceStatus'] = 'compliant';

  if (risks.some(r => r.severity === 'critical')) {
    overallRisk = 'critical';
    riskScore = 95;
    mitigationPriority = 'urgent_action_required';
    complianceStatus = 'non_compliant';
  } else if (risks.some(r => r.severity === 'high')) {
    overallRisk = 'high';
    riskScore = 75;
    mitigationPriority = 'urgent_action_required';
    complianceStatus = 'warning';
  } else if (risks.some(r => r.severity === 'medium')) {
    overallRisk = 'medium';
    riskScore = 50;
    mitigationPriority = 'remediation_recommended';
    complianceStatus = 'warning';
  } else if (risks.length > 0) {
    overallRisk = 'low';
    riskScore = 25;
    mitigationPriority = 'routine_maintenance';
    complianceStatus = 'compliant';
  }

  const headline = overallRisk === 'critical'
    ? 'Critical Security or Compliance Risk Detected'
    : overallRisk === 'high'
    ? 'High-Priority Data Integrity Exposure'
    : overallRisk === 'medium'
    ? 'Moderate Quality & Consistency Anomalies'
    : 'Dataset Demonstrates Clean Risk Posture';

  const summaryRationale = `Identified ${risks.length} risk factor(s) across active schema. Dataset integrity score is ${qualityScore}%.`;

  return {
    overallRisk,
    riskScore,
    headline,
    summaryRationale,
    risks,
    mitigationPriority,
    complianceStatus
  };
}
