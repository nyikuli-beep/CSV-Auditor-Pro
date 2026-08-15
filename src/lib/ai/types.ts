/**
 * CSV Auditor Pro - AI Architectural Core Types (Phase 2)
 * Data-Grounded AI Intelligence Engine Contracts & Types
 */

export const AI_ENGINE_UPGRADE_MESSAGE = "AI analysis engine is currently being upgraded.";

export type ColumnDataType = 
  | 'numeric' 
  | 'categorical' 
  | 'datetime' 
  | 'boolean' 
  | 'text' 
  | 'identifier';

export interface ColumnProfileStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  q1: number;
  q3: number;
  iqr: number;
  sum: number;
}

export interface FrequencyItem {
  value: string;
  count: number;
  percentage: number;
}

export interface DateRangeStats {
  minDate: string;
  maxDate: string;
  spanDays: number;
}

export interface ColumnProfile {
  name: string;
  inferredType: ColumnDataType;
  totalCount: number;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  uniquePercentage: number;
  duplicateCount: number;
  sampleValues: any[];
  stats?: ColumnProfileStats;
  frequencyDistribution?: FrequencyItem[];
  dateRange?: DateRangeStats;
  invalidValuesCount?: number;
  suspiciousWhitespaceCount?: number;
  emptyStringCount?: number;
  formulaInjectionCount?: number;
}

export interface DatasetProfile {
  fileId?: string;
  fileName: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  duplicateRowCount: number;
  duplicateRowPercentage: number;
  totalCells: number;
  totalMissingCells: number;
  overallMissingPercentage: number;
  qualityScore: number;
  columnProfiles: Record<string, ColumnProfile>;
  numericColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
  booleanColumns: string[];
  textColumns: string[];
  identifierColumns: string[];
  sampleRows: Record<string, any>[];
  generatedAt: string;
}

// ==========================================
// DATA QUALITY FINDINGS & REPORT
// ==========================================

export type DataQualityCategory = 
  | 'missing_values'
  | 'duplicate_rows'
  | 'duplicate_identifiers'
  | 'inconsistent_types'
  | 'malformed_dates'
  | 'invalid_numeric'
  | 'inconsistent_categorical'
  | 'suspicious_whitespace'
  | 'empty_strings'
  | 'unexpected_null_representations'
  | 'extreme_numeric'
  | 'formula_injection'
  | 'formatting_inconsistency';

export type QualitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface DataQualityFinding {
  id: string;
  category: DataQualityCategory;
  severity: QualitySeverity;
  column?: string;
  count: number;
  percentage: number;
  description: string;
  evidence: any;
  sampleAffectedRows?: Record<string, any>[];
}

export interface DataQualityReport {
  totalIssuesCount: number;
  qualityScore: number;
  findings: DataQualityFinding[];
  issuesBySeverity: Record<QualitySeverity, number>;
  issuesByCategory: Record<DataQualityCategory, number>;
  generatedAt: string;
}

// ==========================================
// STATISTICAL ANALYSIS RESULTS
// ==========================================

export type AggregationOperation = 'sum' | 'mean' | 'median' | 'min' | 'max' | 'count' | 'distinct_count';
export type DateGranularity = 'day' | 'month' | 'quarter' | 'year';

export interface AggregationGroup {
  key: string;
  value: number;
  count: number;
  percentage?: number;
}

export interface AggregationResult {
  operation: AggregationOperation;
  targetColumn: string;
  groupByColumn?: string;
  dateGranularity?: DateGranularity;
  groups: AggregationGroup[];
  overallTotal?: number;
  overallMean?: number;
  overallMedian?: number;
  topGroup?: { key: string; value: number };
  bottomGroup?: { key: string; value: number };
  sampleSize: number;
}

export interface RankingItem {
  rank: number;
  key: string;
  value: number;
  row?: Record<string, any>;
}

export interface RankingResult {
  targetColumn: string;
  metricColumn: string;
  direction: 'desc' | 'asc';
  limit: number;
  items: RankingItem[];
  totalEntitiesCount: number;
}

export interface ComparisonGroupStats {
  name: string;
  value: number;
  count: number;
  mean?: number;
}

export interface ComparisonResult {
  groupColumn: string;
  metricColumn: string;
  groupA: ComparisonGroupStats;
  groupB: ComparisonGroupStats;
  difference: number;
  percentageDifference: number;
  higherGroup: string;
}

export interface TrendDataPoint {
  period: string;
  date: string;
  value: number;
  count: number;
  change?: number;
  percentageChange?: number;
}

export interface TrendResult {
  dateColumn: string;
  valueColumn: string;
  granularity: DateGranularity;
  dataPoints: TrendDataPoint[];
  overallTrend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  averageGrowthRate?: number;
  highestPeriod: { period: string; value: number };
  lowestPeriod: { period: string; value: number };
  totalPeriods: number;
}

export interface CorrelationResult {
  columnA: string;
  columnB: string;
  pearsonCoefficient: number;
  strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'none';
  direction: 'positive' | 'negative' | 'neutral';
  sampleSize: number;
}

// ==========================================
// ANOMALY DETECTION RESULTS
// ==========================================

export type AnomalyType = 
  | 'iqr_outlier'
  | 'zscore_outlier'
  | 'rare_category'
  | 'unusual_null_pattern'
  | 'extreme_value';

export interface AnomalyFinding {
  id: string;
  type: AnomalyType;
  column: string;
  value: any;
  rowIndex: number;
  score?: number;
  threshold?: number;
  reason: string;
  isPotentialAnomaly: true;
  rowData?: Record<string, any>;
}

export interface AnomalyReport {
  totalAnomaliesCount: number;
  findings: AnomalyFinding[];
  findingsByColumn: Record<string, AnomalyFinding[]>;
  generatedAt: string;
}

// ==========================================
// ANALYSIS ROUTER & INTENTS
// ==========================================

export type AnalysisIntent = 
  | 'dataset_summary'
  | 'column_lookup'
  | 'aggregation'
  | 'comparison'
  | 'ranking'
  | 'trend_analysis'
  | 'data_quality'
  | 'anomaly_analysis'
  | 'correlation'
  | 'filtering'
  | 'unsupported_request'
  | 'general_conversation';

export interface AnalysisRoutePlan {
  intent: AnalysisIntent;
  targetColumns: string[];
  groupColumns: string[];
  dateColumns: string[];
  metricColumns: string[];
  filterCriteria?: Record<string, any>;
  operation?: AggregationOperation | string;
  direction?: 'desc' | 'asc';
  limit?: number;
  granularity?: DateGranularity;
  requiresExecution: boolean;
  confidence: number;
  reasoning: string;
}

// ==========================================
// STRUCTURED GROUNDED CONTEXT FOR GEMINI
// ==========================================

export interface StructuredGroundedContext {
  userQuestion: string;
  routePlan: AnalysisRoutePlan;
  datasetProfileSummary: {
    fileName: string;
    rowCount: number;
    columnCount: number;
    headers: string[];
    qualityScore: number;
    duplicateRowCount: number;
    overallMissingPercentage: number;
  };
  relevantColumnProfiles: ColumnProfile[];
  deterministicResults: {
    aggregation?: AggregationResult;
    ranking?: RankingResult;
    comparison?: ComparisonResult;
    trend?: TrendResult;
    correlation?: CorrelationResult;
    qualityReport?: Partial<DataQualityReport>;
    anomalyReport?: Partial<AnomalyReport>;
    customCalculations?: Record<string, any>;
  };
  sampleRecords?: Record<string, any>[];
  hasSufficientData: boolean;
  insufficientDataReason?: string;
}

// ==========================================
// STRUCTURED GROUNDED AI RESULT CONTRACT
// ==========================================

export type ConfidenceStatus = 'high_confidence' | 'moderate_confidence' | 'insufficient_data' | 'unsupported_request';

export interface GroundedAIResponse {
  id: string;
  answer: string;
  summary: string;
  evidence: {
    datasetProfile?: any;
    calculations?: any;
    findings?: any[];
    anomalies?: any[];
  };
  relevantColumns: string[];
  confidenceStatus: ConfidenceStatus;
  warnings: string[];
  recommendedFollowUps: string[];
  status: 'ready' | 'insufficient_data' | 'error';
  generatedAt: string;
}

// ==========================================
// SERVICE REQUEST & META CONTRACTS
// ==========================================

export interface AnalysisContext {
  fileId?: string;
  fileName?: string;
  rowCount?: number;
  columnCount?: number;
  headers?: string[];
  score?: number;
  issuesCount?: number;
  duplicatesCount?: number;
  missingValuesCount?: number;
  formatErrorsCount?: number;
  outliersCount?: number;
  sampleRows?: Record<string, any>[];
  activeSchema?: string | null;
  cleaningOperationsPerformed?: string[];
  // Enriched Deterministic Data (Phase 2)
  profile?: DatasetProfile;
  qualityReport?: DataQualityReport;
  anomalyReport?: AnomalyReport;
  rawRows?: Record<string, any>[];
}

export interface UserContext {
  uid?: string;
  email?: string;
  name?: string;
  role?: string;
  workspaceName?: string;
  teamMembersCount?: number;
  subscriptionPlan?: 'free' | 'pro' | 'enterprise';
}

export interface AICitation {
  type: 'doc' | 'dataset' | 'system' | 'web' | 'tool' | 'model' | string;
  label: string;
  url?: string;
}

export interface AIInsightsRequest {
  insightType: 'error_patterns' | 'statistical_outliers' | 'compliance_scan' | 'executive_summary' | 'custom';
  prompt?: string;
  analysisContext?: AnalysisContext | null;
  userContext?: UserContext | null;
  model?: string;
}

export interface AIInsightsResponse {
  id: string;
  insightType: string;
  content: string;
  status: 'ready' | 'upgrading' | 'insufficient_data' | 'error';
  citations?: AICitation[];
  structuredData?: any;
  generatedAt: string;
}

export interface ConversationalAuditorRequest {
  prompt: string;
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  analysisContext?: AnalysisContext | null;
  userContext?: UserContext | null;
  model?: string;
  persona?: string;
  thinkingMode?: boolean;
  enableSearchGrounding?: boolean;
  image?: { data: string; mimeType: string } | null;
}

export interface ConversationalAuditorMeta {
  requestId: string;
  model: string;
  status: 'ready' | 'upgrading' | 'insufficient_data' | 'error';
  citations: AICitation[];
  intent?: string;
  confidenceScore?: number;
  confidenceStatus?: ConfidenceStatus;
  relevantColumns?: string[];
  routePlan?: AnalysisRoutePlan;
}

export interface ConversationalAuditorStreamCallbacks {
  onMeta: (meta: ConversationalAuditorMeta) => void;
  onChunk: (textChunk: string) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

export interface ConversationalAuditorResponse {
  id: string;
  content: string;
  meta: ConversationalAuditorMeta;
  generatedAt: string;
}

export interface ReasoningEngineProvider {
  name: string;
  version: string;
  isAvailable(): boolean;
  generateInsights?(request: AIInsightsRequest): Promise<AIInsightsResponse>;
  streamConversation?(
    request: ConversationalAuditorRequest,
    callbacks: ConversationalAuditorStreamCallbacks
  ): Promise<void>;
}
