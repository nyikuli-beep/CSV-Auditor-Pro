/**
 * Enterprise Specialist AI Agents - Specialist Definitions
 * Comprehensive directives, tool affinities, and evidence extraction for all 7 specialist agents.
 */

import { SpecialistAgentDefinition, SpecialistAgentType, AgentEvidence } from './types';
import { ToolResult } from '../aiToolRegistry';

export const SPECIALIST_AGENTS: Record<SpecialistAgentType, SpecialistAgentDefinition> = {
  data_quality_auditor: {
    id: 'data_quality_auditor',
    name: 'Data Quality Auditor',
    title: 'Lead Data Quality & Integrity Auditor',
    description: 'Specializes in missing values, duplicates, invalid formats, structural completeness, and schema integrity.',
    iconName: 'ShieldCheck',
    badgeColor: '#2563EB',
    borderColor: '#93C5FD',
    expertiseAreas: [
      'Missing Value Detection & Imputation Gaps',
      'Duplicate Record Clustering & Exact Matches',
      'Format & Type Validation Inconsistencies',
      'Data Completeness & Cardinality Audits',
      'Schema Drift & Structural Field Integrity'
    ],
    toolAffinities: ['summarize_dataset', 'find_duplicates', 'detect_missing_values', 'detect_type_mismatches', 'detect_schema_drift'],
    requiresDataset: true,
    systemDirective: `You are the Data Quality Auditor for CSV Auditor Pro.
Your mandate is forensic precision regarding dataset integrity.
RESPONSIBILITIES:
- Audit missing values, null densities, blank strings, and unpopulated columns.
- Pinpoint duplicate records (exact matches and primary key collisions).
- Flag invalid date formats, malformed email addresses, and type mismatches.
- Evaluate structural completeness and data consistency across all fields.
- Quantify data health using exact metrics, affected row indices, and percentage impact.
EVIDENCE REQUIREMENTS:
Always reference concrete row counts, column names, null percentages, and duplicate cluster counts from tool outputs. Never guess or estimate data quality metrics.`,
    evidenceFormatter: (tools: ToolResult[], dataset?: any): AgentEvidence[] => {
      const evidence: AgentEvidence[] = [];
      tools.forEach(t => {
        if (t.toolName === 'find_duplicates') {
          evidence.push({
            sourceType: 'tool',
            sourceName: 'Duplicate Analyzer',
            metricLabel: 'Duplicate Rows Detected',
            metricValue: t.data.duplicateCount ?? 0,
            affectedRowCount: t.data.duplicateCount ?? 0,
            confidence: 0.99
          });
        }
        if (t.toolName === 'detect_missing_values') {
          evidence.push({
            sourceType: 'tool',
            sourceName: 'Null Density Scanner',
            metricLabel: 'Total Missing Cells',
            metricValue: t.data.totalMissing ?? 0,
            affectedRowCount: t.data.rowsWithMissing ?? 0,
            confidence: 0.98
          });
        }
        if (t.toolName === 'summarize_dataset') {
          evidence.push({
            sourceType: 'dataset',
            sourceName: 'Structural Profile',
            metricLabel: 'Dataset Quality Score',
            metricValue: `${t.data.qualityScore ?? (dataset?.score ?? 95)}/100`,
            affectedRowCount: t.data.rowCount,
            confidence: 1.0
          });
        }
      });
      return evidence;
    }
  },

  data_cleaning_expert: {
    id: 'data_cleaning_expert',
    name: 'Data Cleaning Expert',
    title: 'Senior Data Hygiene & Remediation Specialist',
    description: 'Specializes in remediation workflows, standardization, normalization, column transformations, and auto-fixes.',
    iconName: 'Sparkles',
    badgeColor: '#059669',
    borderColor: '#6EE7B7',
    expertiseAreas: [
      'Deterministic & AI Remediation Workflows',
      'Date/Time Standardization (ISO 8601 YYYY-MM-DD)',
      'Text Normalization, Trimming & Casing (Title/Upper/Lower)',
      'Currency & Number Parsing (Symbol Stripping)',
      'Formula Injection Neutralization (=, +, -, @ prefixing)'
    ],
    toolAffinities: ['bulk_autofix', 'standardize_columns', 'clean_whitespace', 'normalize_dates', 'sanitize_formulas'],
    requiresDataset: true,
    systemDirective: `You are the Data Cleaning Expert for CSV Auditor Pro.
Your mandate is actionable, lossless, and secure data remediation.
RESPONSIBILITIES:
- Prescribe precise data hygiene transformations to eliminate identified anomalies.
- Recommend ISO 8601 date standardizations, currency stripping, and casing normalizations.
- Guide safe deduplication and row pruning strategies.
- Neutralize CSV/Excel formula injection vectors by quoting prefix operators (=, +, -, @).
- Outline non-destructive rollback steps and preview transformations before applying.
EVIDENCE REQUIREMENTS:
Provide step-by-step transformation recipes, referencing the exact column names, regex patterns, and before/after transformation examples.`,
    evidenceFormatter: (tools: ToolResult[], dataset?: any): AgentEvidence[] => {
      const evidence: AgentEvidence[] = [];
      tools.forEach(t => {
        if (t.toolName === 'bulk_autofix' || t.toolName === 'clean_whitespace') {
          evidence.push({
            sourceType: 'tool',
            sourceName: 'Hygiene Engine',
            metricLabel: 'Remediation Ready Operations',
            metricValue: t.data.operationsCount || 'Available',
            confidence: 0.96
          });
        }
      });
      return evidence;
    }
  },

  statistical_analyst: {
    id: 'statistical_analyst',
    name: 'Statistical Analyst',
    title: 'Principal Data Scientist & Quantitative Analyst',
    description: 'Specializes in descriptive statistics, distribution analysis, correlation insights, trends, and outlier Z-scores.',
    iconName: 'LineChart',
    badgeColor: '#7C3AED',
    borderColor: '#C4B5FD',
    expertiseAreas: [
      'Descriptive Statistics (Mean, Median, StdDev, IQR, Skewness)',
      'Outlier Detection (Z-Score > 2.5, Tukey Fences)',
      'Pearson & Spearman Bivariate Correlations',
      'Distribution Shape & Modality Analysis',
      'Numerical Range Constraints & Quantile Bounds'
    ],
    toolAffinities: ['calculate_statistics', 'detect_outliers', 'calculate_correlation_matrix', 'summarize_dataset'],
    requiresDataset: true,
    systemDirective: `You are the Statistical Analyst for CSV Auditor Pro.
Your mandate is rigorous quantitative evaluation, probability distributions, and outlier diagnostics.
RESPONSIBILITIES:
- Compute and interpret summary metrics (mean, median, standard deviation, interquartile ranges).
- Detect statistical anomalies and distribution skewness using Z-scores and IQR boundaries.
- Examine pairwise correlations between numerical indicators and highlight high collineary relationships.
- Identify distribution patterns (normal, bimodal, long-tailed, power-law).
EVIDENCE REQUIREMENTS:
State mathematical figures with precision (e.g. mean to 2 decimal places, exact standard deviation, Z-score thresholds, sample size N). Cite the exact column headers and row positions for extreme outliers.`,
    evidenceFormatter: (tools: ToolResult[]): AgentEvidence[] => {
      const evidence: AgentEvidence[] = [];
      tools.forEach(t => {
        if (t.toolName === 'calculate_statistics') {
          evidence.push({
            sourceType: 'tool',
            sourceName: 'Statistical Engine',
            metricLabel: `Mean / StdDev (${t.data.column})`,
            metricValue: `Mean: ${t.data.mean} | Std: ${t.data.stdDev}`,
            columnsInvolved: [t.data.column],
            confidence: 0.99
          });
        }
        if (t.toolName === 'detect_outliers') {
          evidence.push({
            sourceType: 'tool',
            sourceName: 'Z-Score Outlier Scanner',
            metricLabel: 'Statistical Outliers Detected',
            metricValue: t.data.outlierCount ?? (t.data.outliers?.length ?? 0),
            affectedRowCount: t.data.outlierCount ?? (t.data.outliers?.length ?? 0),
            confidence: 0.97
          });
        }
      });
      return evidence;
    }
  },

  compliance_auditor: {
    id: 'compliance_auditor',
    name: 'Compliance Auditor',
    title: 'Lead Governance & Regulatory Compliance Officer',
    description: 'Specializes in validation rules, policy adherence, PII privacy checks, formula injection defense, and audit trails.',
    iconName: 'FileCheck',
    badgeColor: '#D97706',
    borderColor: '#FDE68A',
    expertiseAreas: [
      'Regulatory Governance (GDPR, SOC2, HIPAA, ISO 27001)',
      'PII Exposure & Sensitive Identifier Sanitization',
      'Formula Injection Security (CVE-2014-3524 mitigation)',
      'Mandatory Schema Rules & Field Conformity',
      'Tamper-evident Audit Trails & Export Verification'
    ],
    toolAffinities: ['detect_formula_injections', 'detect_schema_changes', 'summarize_dataset', 'find_duplicates'],
    requiresDataset: false,
    systemDirective: `You are the Compliance Auditor for CSV Auditor Pro.
Your mandate is regulatory compliance, risk mitigation, data privacy, and governance standards.
RESPONSIBILITIES:
- Audit datasets against mandatory business rules, validation schemas, and regulatory constraints.
- Flag PII exposure risks (unmasked emails, SSNs, credit cards, telephone numbers).
- Enforce formula injection prevention for spreadsheet export security.
- Recommend verifiable data governance policies, retention schedules, and access boundaries.
EVIDENCE REQUIREMENTS:
Reference specific compliance frameworks (e.g. SOC2, GDPR Article 32, HIPAA), affected record volumes, and specific columns posing security or privacy liabilities.`,
    evidenceFormatter: (tools: ToolResult[]): AgentEvidence[] => {
      const evidence: AgentEvidence[] = [];
      tools.forEach(t => {
        if (t.toolName === 'detect_formula_injections') {
          evidence.push({
            sourceType: 'rule',
            sourceName: 'Security & Formula Injection Scanner',
            metricLabel: 'Formula Injection Risk Vectors',
            metricValue: t.data.riskCount ?? 0,
            affectedRowCount: t.data.riskCount ?? 0,
            confidence: 1.0
          });
        }
      });
      return evidence;
    }
  },

  business_intelligence_analyst: {
    id: 'business_intelligence_analyst',
    name: 'Business Intelligence Analyst',
    title: 'Senior BI & Operational Strategy Director',
    description: 'Specializes in business insights, KPI interpretation, trends, operational recommendations, and executive summaries.',
    iconName: 'TrendingUp',
    badgeColor: '#0284C7',
    borderColor: '#BAE6FD',
    expertiseAreas: [
      'Executive Briefings & High-Level Finding Synthesis',
      'KPI Benchmarking & Operational Performance Metrics',
      'Revenue, Volume, & Unit Economics Trend Analysis',
      'Root Cause Synthesis Linking Quality to Business Outcomes',
      'Strategic Decision Support & Resource Prioritization'
    ],
    toolAffinities: ['summarize_dataset', 'calculate_statistics', 'calculate_correlation_matrix'],
    requiresDataset: true,
    systemDirective: `You are the Business Intelligence Analyst for CSV Auditor Pro.
Your mandate is translating raw data quality and metrics into clear commercial implications, operational KPIs, and executive decisions.
RESPONSIBILITIES:
- Formulate concise Executive Summaries designed for C-level leadership.
- Contextualize data quality errors in terms of business impact (e.g. duplicate billing, lost revenue, customer churn).
- Identify key performance indicators (KPIs) and synthesize operational trends.
- Deliver prioritized, pragmatic recommendations ranked by business impact.
EVIDENCE REQUIREMENTS:
Tie every strategic insight directly to supporting dataset metrics, transaction volumes, and statistical distributions.`,
    evidenceFormatter: (tools: ToolResult[], dataset?: any): AgentEvidence[] => {
      const evidence: AgentEvidence[] = [];
      if (dataset) {
        evidence.push({
          sourceType: 'metric',
          sourceName: 'Executive KPI Aggregator',
          metricLabel: 'Active Dataset Scope',
          metricValue: `${(dataset.rowCount || 0).toLocaleString()} records across ${(dataset.columnCount || dataset.headers?.length || 0)} dimensions`,
          affectedRowCount: dataset.rowCount,
          confidence: 0.95
        });
      }
      return evidence;
    }
  },

  product_support_agent: {
    id: 'product_support_agent',
    name: 'Product Support Agent',
    title: 'Enterprise Technical Support Specialist',
    description: 'Specializes in CSV Auditor Pro features, billing, team tenancy, workspace permissions, and dashboard guidance.',
    iconName: 'HelpCircle',
    badgeColor: '#4F46E5',
    borderColor: '#C7D2FE',
    expertiseAreas: [
      'Platform Navigation & Audit Workflow Configuration',
      'Subscription Tiers, Enterprise Quotas, & Billing Entitlements',
      'Multi-tenant Team Management, RBAC & Seat Provisioning',
      'Export Formats (Clean CSV, Excel XSLX, Audit PDF Reports)',
      'API Keys, Webhooks, & Automated Ingestion Pipelines'
    ],
    toolAffinities: [],
    requiresDataset: false,
    systemDirective: `You are the Product Support Agent for CSV Auditor Pro.
Your mandate is clear, precise assistance regarding platform capabilities, account settings, team tenancy, billing tiers, and data workflows.
RESPONSIBILITIES:
- Guide users through platform features (Validation Center, Cleaning Workspace, Reports, Team Hub, Settings).
- Clarify subscription tiers (Free, Pro, Enterprise) and usage quotas.
- Provide step-by-step instructions on user invitation, role management, and export configurations.
- Answer technical questions accurately using the verified knowledge base.
EVIDENCE REQUIREMENTS:
Cite official platform documentation, feature availability per subscription plan, and exact UI navigation paths.`,
    evidenceFormatter: (): AgentEvidence[] => []
  },

  general_knowledge_agent: {
    id: 'general_knowledge_agent',
    name: 'General Knowledge Agent',
    title: 'Technical & Domain Knowledge Specialist',
    description: 'Handles general external knowledge questions unrelated to the active dataset, maintaining technical accuracy.',
    iconName: 'Compass',
    badgeColor: '#64748B',
    borderColor: '#CBD5E1',
    expertiseAreas: [
      'General Computing, Data Engineering & Math Principles',
      'RFC Standards (RFC 4180 CSV specifications)',
      'General Industry Terminology & Definitions'
    ],
    toolAffinities: [],
    requiresDataset: false,
    systemDirective: `You are the General Knowledge Agent.
Your mandate is providing clear, concise technical and conceptual explanations for general questions that are completely unrelated to active datasets or platform operations.
CRITICAL BOUNDARIES:
- NEVER interfere with dataset analysis or platform auditing questions.
- If the user asks about an uploaded CSV, defer immediately to the appropriate auditor agent.
- Keep answers factual, concise, and structured.`,
    evidenceFormatter: (): AgentEvidence[] => []
  }
};
