export type AssistantRole = 'user' | 'assistant' | 'system';

export type AssistantMessageStatus = 'sending' | 'complete' | 'error';

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  content: string;
  timestamp: string;
  status: AssistantMessageStatus;
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

export interface FloatingAssistantState {
  isOpen: boolean;
  isMinimized: boolean;
  messages: AssistantMessage[];
  pageContext: AssistantPageContext;
  datasetContext: AssistantDatasetContext | null;
  recommendationContext: AssistantRecommendationContext | null;
}
