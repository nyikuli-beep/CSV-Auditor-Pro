/**
 * CSV Auditor Pro - AI Architectural Core Types (Phase 1)
 * Clean, decoupled contracts for AI Insights and Conversational Auditor.
 * 
 * Separation of Concerns:
 * - AI Insights and Conversational Auditor have independent contracts and lifecycles.
 * - Pure Analysis Context represents verified dataset metadata without fabricated metrics.
 * - Clean boundary for Phase 2 Gemini Reasoning Layer integration.
 */

export const AI_ENGINE_UPGRADE_MESSAGE = "AI analysis engine is currently being upgraded.";

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
  type: 'doc' | 'dataset' | 'system' | 'web' | 'tool' | string;
  label: string;
  url?: string;
}

// ==========================================
// 1. AI INSIGHTS CONTRACTS
// ==========================================

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
  status: 'ready' | 'upgrading' | 'error';
  citations?: AICitation[];
  generatedAt: string;
}

// ==========================================
// 2. CONVERSATIONAL AUDITOR CONTRACTS
// ==========================================

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
  status: 'ready' | 'upgrading' | 'error';
  citations: AICitation[];
  intent?: string;
  confidenceScore?: number;
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

// ==========================================
// 3. FUTURE REASONING ENGINE INTERFACE (PHASE 2 PLACEHOLDER)
// ==========================================

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
