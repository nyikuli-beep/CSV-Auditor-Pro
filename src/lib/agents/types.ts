/**
 * Enterprise Specialist AI Agents - Types and Definitions
 * Phase 2: Multi-Agent Architecture for CSV Auditor Pro
 */

import { ToolResult } from '../aiToolRegistry';
import { StructuredCSVContext } from '../csvContextEngine';
import { KnowledgeChunk } from '../ragEngine';
import { AIIntentCategory, FineGrainedIntentCategory } from '../intentDetectionEngine';
import { ConfidenceAssessment } from '../confidenceScoringEngine';
import { EnterpriseRiskAssessment } from '../riskAssessmentEngine';
import { ActionableRecommendation, ProactiveInsight, FollowUpSuggestion } from '../recommendationEngine';
import { ExplainabilityPackage } from '../explainableEngine';
import { ExecutiveReportData } from '../executiveReportEngine';

export type SpecialistAgentType = 
  | 'data_quality_auditor'
  | 'data_cleaning_expert'
  | 'statistical_analyst'
  | 'compliance_auditor'
  | 'business_intelligence_analyst'
  | 'product_support_agent'
  | 'general_knowledge_agent';

export interface AgentEvidence {
  sourceType: 'tool' | 'dataset' | 'profile' | 'knowledge_base' | 'rule' | 'metric';
  sourceName: string;
  metricLabel: string;
  metricValue: string | number;
  columnsInvolved?: string[];
  affectedRowCount?: number;
  confidence: number;
  rawDetails?: any;
}

export interface SpecialistAgentDefinition {
  id: SpecialistAgentType;
  name: string;
  title: string;
  description: string;
  iconName: string; // Lucide icon name for frontend SVG rendering
  badgeColor: string;
  borderColor: string;
  expertiseAreas: string[];
  toolAffinities: string[];
  requiresDataset: boolean;
  systemDirective: string;
  evidenceFormatter: (tools: ToolResult[], dataset?: any) => AgentEvidence[];
}

export interface MultiAgentPlan {
  primaryAgent: SpecialistAgentType;
  collaboratingAgents: SpecialistAgentType[];
  isCompoundQuery: boolean;
  routingRationale: string;
  requiredTools: string[];
  requiresRag: boolean;
  intentCategory: AIIntentCategory;
  fineCategory: FineGrainedIntentCategory;
  confidence: number;
}

export interface AgentContribution {
  agentId: SpecialistAgentType;
  agentName: string;
  focusArea: string;
  findingsSummary: string;
  evidenceProvided: AgentEvidence[];
}

export interface MultiAgentUnifiedResponseMeta {
  orchestratorPlan: MultiAgentPlan;
  activeAgents: Array<{
    id: SpecialistAgentType;
    name: string;
    role: string;
  }>;
  evidenceCollected: AgentEvidence[];
  executedTools: string[];
  retrievedDocs: string[];
  confidenceScore: number;
  confidenceAssessment?: ConfidenceAssessment;
  riskAssessment?: EnterpriseRiskAssessment;
  recommendations?: ActionableRecommendation[];
  proactiveInsights?: ProactiveInsight[];
  explainability?: ExplainabilityPackage;
  followUpSuggestions?: FollowUpSuggestion[];
  executiveReport?: ExecutiveReportData;
  modelUsed: string;
  latencyMs: number;
}

