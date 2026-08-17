export type AssistantRole = 'user' | 'assistant' | 'system';

export type AssistantMessageStatus = 'sending' | 'complete' | 'error';

export type GroundingState = 
  | 'data-verified'
  | 'data-derived'
  | 'general-ai'
  | 'interpretation'
  | 'insufficient-data'
  | 'error';

export interface AssistantEvidence {
  columns?: string[];
  calculations?: Record<string, any>;
  findings?: any[];
  remediationPlan?: any;
  metadata?: Record<string, any>;
}

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  content: string;
  timestamp: string;
  status: AssistantMessageStatus;
  grounding?: GroundingState;
  source?: string;
  analysisType?: string;
  evidence?: AssistantEvidence;
  suggestedFollowUps?: string[];
  error?: string;
  suggestedActions?: string[];
}

export interface AssistantPageContext {
  page: string;
  title?: string;
}

export interface AssistantDatasetContext {
  fileId?: string;
  fileName?: string;
  rowCount?: number;
  columnCount?: number;
  headers?: string[];
  score?: number;
  dataQualitySummary?: {
    missingCount: number;
    duplicateCount: number;
    formatErrorsCount: number;
    formulaRisksCount: number;
    outliersCount: number;
  };
}

export interface AssistantRecommendationContext {
  recommendationId?: string;
  issueCategory?: string;
  columnName?: string;
  affectedCount?: number;
  affectedPercentage?: number;
  severity?: 'High' | 'Medium' | 'Low' | 'Immediate' | 'Scheduled' | string;
  title?: string;
  description?: string;
}

export interface ConversationHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface CSVAuditorAIRequest {
  requestId: string;
  message: string;
  datasetId?: string;
  pageContext: AssistantPageContext;
  recommendationContext?: AssistantRecommendationContext | null;
  conversationHistory?: ConversationHistoryItem[];
  analysisContext?: AssistantDatasetContext | null;
  selectedColumns?: string[];
}

export interface CSVAuditorAIResponse {
  success: boolean;
  answer: string;
  grounding: GroundingState;
  source?: string;
  analysisType?: string;
  evidence?: AssistantEvidence;
  suggestedFollowUps?: string[];
  requestId: string;
  timestamp: string;
  error?: string;
}

export interface FloatingAssistantState {
  isOpen: boolean;
  isMinimized: boolean;
  messages: AssistantMessage[];
  pageContext: AssistantPageContext;
  datasetContext: AssistantDatasetContext | null;
  recommendationContext: AssistantRecommendationContext | null;
}

