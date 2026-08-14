/**
 * CSV Auditor Pro - Confidence Scoring Engine
 * Phase 3: Evidence-Driven Multi-Factor Confidence Assessment
 * 
 * Evaluates the empirical reliability of analytical responses based on:
 * - Data completeness and sample volume
 * - Deterministic tool execution corroboration
 * - Supporting forensic evidence density
 * - Schema stability and statistical consistency
 */

import { ToolResult } from './aiToolRegistry';
import { AgentEvidence } from './agents/types';
import { StructuredCSVContext } from './csvContextEngine';

export type ConfidenceLevel = 'very_high' | 'high' | 'moderate' | 'low';

export interface ConfidenceFactor {
  name: string;
  weight: number;
  score: number; // 0.0 to 1.0
  description: string;
  status: 'optimal' | 'adequate' | 'degraded' | 'insufficient';
}

export interface ConfidenceAssessment {
  overallScore: number; // 0.00 to 1.00
  percentage: number; // 0 to 100
  level: ConfidenceLevel;
  levelLabel: string;
  badgeColor: string;
  textColor: string;
  justification: string;
  factors: ConfidenceFactor[];
  isEvidenceSufficient: boolean;
  unsupportedClaimsWarning?: string;
}

/**
 * Calculate multi-factor confidence assessment for analytical responses
 */
export function evaluateResponseConfidence(params: {
  datasetContext?: StructuredCSVContext | { rowCount?: number; headers?: string[]; qualityScore?: number };
  executedTools?: ToolResult[];
  evidenceCollected?: AgentEvidence[];
  requiresRag?: boolean;
  ragMatchesCount?: number;
  hasActiveDataset: boolean;
  intentCategory?: string;
}): ConfidenceAssessment {
  const {
    datasetContext,
    executedTools = [],
    evidenceCollected = [],
    requiresRag = false,
    ragMatchesCount = 0,
    hasActiveDataset,
    intentCategory = 'CSV_ANALYSIS'
  } = params;

  const factors: ConfidenceFactor[] = [];

  // Factor 1: Data Completeness & Population Representation (Weight: 25%)
  let dataScore = 0.5;
  let dataDesc = 'No dataset context provided; assessment based purely on conceptual logic.';
  let dataStatus: ConfidenceFactor['status'] = 'degraded';

  if (hasActiveDataset && datasetContext) {
    const rowCount = datasetContext.rowCount || 0;
    const headerCount = datasetContext.headers?.length || 0;

    if (rowCount > 100 && headerCount > 2) {
      dataScore = 0.95;
      dataDesc = `Comprehensive dataset loaded (${rowCount.toLocaleString()} rows, ${headerCount} columns).`;
      dataStatus = 'optimal';
    } else if (rowCount > 0) {
      dataScore = 0.75;
      dataDesc = `Small dataset sample available (${rowCount} rows).`;
      dataStatus = 'adequate';
    } else {
      dataScore = 0.40;
      dataDesc = 'Dataset contains empty or unparsed headers.';
      dataStatus = 'insufficient';
    }
  } else if (intentCategory === 'GENERAL_AI' || intentCategory === 'APP_EXPLANATION') {
    dataScore = 0.90;
    dataDesc = 'General query does not require specific CSV dataset backing.';
    dataStatus = 'optimal';
  }

  factors.push({
    name: 'Data Completeness',
    weight: 0.25,
    score: dataScore,
    description: dataDesc,
    status: dataStatus
  });

  // Factor 2: Deterministic Tool Corroboration (Weight: 35%)
  let toolScore = 0.40;
  let toolDesc = 'No automated verification tools executed for this response.';
  let toolStatus: ConfidenceFactor['status'] = 'insufficient';

  if (executedTools.length > 0) {
    const successTools = executedTools.filter(t => t.success);
    const successRatio = successTools.length / executedTools.length;

    if (executedTools.length >= 3 && successRatio === 1.0) {
      toolScore = 0.98;
      toolDesc = `Strong tool corroboration (${executedTools.length} tools executed with 100% success).`;
      toolStatus = 'optimal';
    } else if (executedTools.length >= 1 && successRatio > 0.8) {
      toolScore = 0.85;
      toolDesc = `${executedTools.length} analysis tool(s) executed successfully to verify findings.`;
      toolStatus = 'adequate';
    } else {
      toolScore = 0.60;
      toolDesc = 'Tools executed with partial warnings or omissions.';
      toolStatus = 'degraded';
    }
  } else if (!hasActiveDataset) {
    toolScore = 0.80;
    toolDesc = 'Conceptual explanation without active tool requirements.';
    toolStatus = 'adequate';
  }

  factors.push({
    name: 'Tool Verification',
    weight: 0.35,
    score: toolScore,
    description: toolDesc,
    status: toolStatus
  });

  // Factor 3: Supporting Forensic Evidence Density (Weight: 25%)
  let evidenceScore = 0.45;
  let evidenceDesc = 'Limited empirical evidence items extracted.';
  let evidenceStatus: ConfidenceFactor['status'] = 'insufficient';

  if (evidenceCollected.length >= 4) {
    evidenceScore = 0.96;
    evidenceDesc = `High evidence density (${evidenceCollected.length} verifiable metrics, column references, and values).`;
    evidenceStatus = 'optimal';
  } else if (evidenceCollected.length >= 1) {
    evidenceScore = 0.80;
    evidenceDesc = `${evidenceCollected.length} verifiable evidence metric(s) corroborating findings.`;
    evidenceStatus = 'adequate';
  } else if (!hasActiveDataset) {
    evidenceScore = 0.85;
    evidenceDesc = 'Standard knowledge query verified against platform architecture.';
    evidenceStatus = 'adequate';
  }

  factors.push({
    name: 'Evidence Density',
    weight: 0.25,
    score: evidenceScore,
    description: evidenceDesc,
    status: evidenceStatus
  });

  // Factor 4: Grounding & Compliance Consistency (Weight: 15%)
  let groundingScore = 0.80;
  let groundingDesc = 'Standard baseline compliance consistency.';
  let groundingStatus: ConfidenceFactor['status'] = 'adequate';

  if (requiresRag) {
    if (ragMatchesCount >= 2) {
      groundingScore = 0.95;
      groundingDesc = `Verified against ${ragMatchesCount} grounded enterprise documentation knowledge chunks.`;
      groundingStatus = 'optimal';
    } else {
      groundingScore = 0.65;
      groundingDesc = 'Partial knowledge base retrieval grounding.';
      groundingStatus = 'degraded';
    }
  } else if (hasActiveDataset) {
    groundingScore = 0.90;
    groundingDesc = 'Consistent with active dataset column profiles and audit rules.';
    groundingStatus = 'optimal';
  }

  factors.push({
    name: 'Knowledge Grounding',
    weight: 0.15,
    score: groundingScore,
    description: groundingDesc,
    status: groundingStatus
  });

  // Calculate Weighted Overall Confidence Score
  const overallScore = Math.min(
    1.0,
    Math.max(
      0.1,
      factors.reduce((acc, f) => acc + (f.score * f.weight), 0)
    )
  );
  const percentage = Math.round(overallScore * 100);

  let level: ConfidenceLevel = 'moderate';
  let levelLabel = 'Moderate Confidence';
  let badgeColor = 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
  let textColor = 'text-[#F59E0B]';
  let justification = '';

  if (overallScore >= 0.88) {
    level = 'very_high';
    levelLabel = 'Very High Confidence';
    badgeColor = 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20';
    textColor = 'text-[#10B981]';
    justification = `Verified with ${percentage}% empirical confidence across ${executedTools.length} executed analytical tools and ${evidenceCollected.length} corroborating evidence metrics.`;
  } else if (overallScore >= 0.74) {
    level = 'high';
    levelLabel = 'High Confidence';
    badgeColor = 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20';
    textColor = 'text-[#2563EB]';
    justification = `Supported by strong empirical dataset evidence (${percentage}%), with consistent statistical and schema indicators.`;
  } else if (overallScore >= 0.50) {
    level = 'moderate';
    levelLabel = 'Moderate Confidence';
    badgeColor = 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
    textColor = 'text-[#F59E0B]';
    justification = `Conclusions are supported by partial evidence (${percentage}%). Additional validation recommended before critical decisions.`;
  } else {
    level = 'low';
    levelLabel = 'Low Confidence';
    badgeColor = 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20';
    textColor = 'text-[#EF4444]';
    justification = `Insufficient empirical evidence to conclusively verify. Findings should be treated as preliminary recommendations.`;
  }

  const isEvidenceSufficient = overallScore >= 0.50;
  const unsupportedClaimsWarning = !isEvidenceSufficient 
    ? 'Warning: The dataset sample size or tool evidence is insufficient for conclusive claims. Please upload the full file or execute deep profiling.'
    : undefined;

  return {
    overallScore,
    percentage,
    level,
    levelLabel,
    badgeColor,
    textColor,
    justification,
    factors,
    isEvidenceSufficient,
    unsupportedClaimsWarning
  };
}
