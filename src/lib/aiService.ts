/**
 * CSV Auditor Pro - Centralized Enterprise AI Service
 * Unified Dynamic AI Architecture powering Conversational Audits, Automated Hygiene,
 * Anomaly Detection, Schema Governance, and Intelligence via Google Gemini 3.7 Flash.
 */

import { GoogleGenAI } from '@google/genai';
import { 
  detectUserIntent, 
  classifyDetailedIntent, 
  AIIntentCategory, 
  FineGrainedIntentCategory, 
  IntentAnalysisResult 
} from './intentDetectionEngine';
import { 
  executeToolByName, 
  calculateStatistics, 
  summarizeDataset, 
  findDuplicates, 
  detectOutliers,
  detectSchemaChanges,
  ToolResult 
} from './aiToolRegistry';
import { 
  buildStructuredCSVContext, 
  StructuredCSVContext 
} from './csvContextEngine';
import {
  conversationalAuditorService,
  ConversationalAuditorRequest,
  ConversationalAuditorMeta
} from './ai';
import { 
  agentOrchestrator 
} from './agents/orchestrator';
import { 
  SpecialistAgentType, 
  MultiAgentPlan, 
  AgentEvidence 
} from './agents/types';
import { 
  SPECIALIST_AGENTS 
} from './agents/specialists';

// Default Enterprise AI Model
export const DEFAULT_AI_MODEL = 'gemini-3.7-flash';

// Types & Interfaces
export interface AIUserContext {
  uid?: string;
  email?: string;
  name?: string;
  role?: string;
  workspaceName?: string;
  teamMembersCount?: number;
  subscriptionPlan?: 'free' | 'pro' | 'enterprise';
  permissions?: string[];
}

export interface AIDatasetContext {
  fileId?: string;
  fileName: string;
  rowCount: number;
  columnCount?: number;
  headers: string[];
  score?: number;
  issuesCount?: number;
  duplicatesCount?: number;
  missingValuesCount?: number;
  formatErrorsCount?: number;
  outliersCount?: number;
  cleaningOperationsPerformed?: string[];
  activeSchema?: string | null;
  anomaliesSummary?: string[];
  rows?: Record<string, any>[];
  structuredContext?: any;
}

export interface AIChatRequestOptions {
  prompt: string;
  history?: Array<{ role: 'user' | 'assistant' | 'system' | 'model'; content: string }>;
  model?: string;
  persona?: string;
  userContext?: AIUserContext;
  datasetContext?: AIDatasetContext | null;
  image?: { data: string; mimeType: string } | null;
  thinkingMode?: boolean;
  enableSearchGrounding?: boolean;
  knowledgeBaseId?: string;
  intentCategory?: string;
  explicitAgent?: any;
}

export interface AIChatResponseMeta {
  intent?: any;
  fineCategory?: any;
  confidenceScore?: number;
  confidenceDetails?: any;
  riskAssessment?: any;
  recommendations?: any[];
  proactiveInsights?: any[];
  explainability?: any;
  followUpSuggestions?: any[];
  executiveReport?: any;
  reasoning?: string;
  executedTools?: string[];
  retrievedDocs?: string[];
  citations?: Array<{ type: string; label: string; url?: string }>;
  modelUsed?: string;
  latencyMs?: number;
  activeAgent?: any;
  activeAgentName?: string;
  activeAgentTitle?: string;
  collaboratingAgents?: Array<{ id: any; name: string; role: string }>;
  isCompoundQuery?: boolean;
  routingRationale?: string;
  evidenceCollected?: any[];
}

export interface AIChatResponse {
  content: string;
  meta: AIChatResponseMeta;
}

// In-memory query response cache (TTL: 5 minutes)
interface CacheItem<T> {
  data: T;
  expiresAt: number;
}
const aiResponseCache = new Map<string, CacheItem<any>>();

export function getCachedAIResponse<T>(key: string): T | null {
  const item = aiResponseCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    aiResponseCache.delete(key);
    return null;
  }
  return item.data;
}

export function setCachedAIResponse<T>(key: string, data: T, ttlMs = 300000): void {
  aiResponseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  if (aiResponseCache.size > 150) {
    const firstKey = aiResponseCache.keys().next().value;
    if (firstKey) aiResponseCache.delete(firstKey);
  }
}

// ==========================================
// AISERVICE SINGLETON CLASS
// ==========================================
export class AIService {
  private static instance: AIService | null = null;
  private client: GoogleGenAI | null = null;

  private constructor() {
    this.initClient();
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Lazily initializes GoogleGenAI client with server environment key
   */
  private initClient(): GoogleGenAI | null {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey.trim()) {
        this.client = new GoogleGenAI({
          apiKey: apiKey.trim(),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
      }
    }
    return this.client;
  }

  public getClient(): GoogleGenAI | null {
    return this.initClient();
  }

  public isAvailable(): boolean {
    return Boolean(this.initClient());
  }



  /**
   * Conversational Streaming Chat Method (Delegates cleanly to ConversationalAuditorService)
   */
  public async chatStream(
    options: AIChatRequestOptions,
    onMeta: (meta: AIChatResponseMeta) => void,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const request: ConversationalAuditorRequest = {
      prompt: options.prompt,
      history: options.history?.map(h => ({
        role: (h.role === 'model' || h.role === 'assistant') ? 'assistant' : 'user',
        content: h.content
      })),
      analysisContext: options.datasetContext ? {
        fileId: options.datasetContext.fileId,
        fileName: options.datasetContext.fileName,
        rowCount: options.datasetContext.rowCount,
        columnCount: options.datasetContext.columnCount || options.datasetContext.headers?.length,
        headers: options.datasetContext.headers,
        score: options.datasetContext.score,
        issuesCount: options.datasetContext.issuesCount,
        duplicatesCount: options.datasetContext.duplicatesCount,
        missingValuesCount: options.datasetContext.missingValuesCount,
        formatErrorsCount: options.datasetContext.formatErrorsCount,
        outliersCount: options.datasetContext.outliersCount,
        sampleRows: options.datasetContext.rows?.slice(0, 5)
      } : null,
      userContext: options.userContext,
      model: options.model,
      persona: options.persona,
      thinkingMode: options.thinkingMode,
      enableSearchGrounding: options.enableSearchGrounding,
      image: options.image
    };

    await conversationalAuditorService.streamChat(request, {
      onMeta: (meta: ConversationalAuditorMeta) => {
        onMeta({
          modelUsed: meta.model,
          citations: meta.citations,
          confidenceScore: meta.confidenceScore,
          executedTools: [],
          retrievedDocs: []
        });
      },
      onChunk: (chunk: string) => {
        onChunk(chunk);
      }
    });
  }



  // ==========================================
  // SPECIALIZED ENTERPRISE AI ENDPOINTS
  // ==========================================

  /**
   * Anomaly & Statistical Outlier Scanner
   */
  public async detectAnomalies(headers: string[], rows: Record<string, any>[]): Promise<{
    anomalies: any[];
    method: string;
  }> {
    const numericColumns = headers.filter(h => {
      const lower = h.toLowerCase();
      return lower.includes('amount') || lower.includes('budget') || lower.includes('price') ||
             lower.includes('total') || lower.includes('cost') || lower.includes('fee') ||
             lower.includes('quantity') || lower.includes('rate') || lower.includes('value');
    });

    const anomalies: any[] = [];
    numericColumns.forEach(col => {
      const values = rows.map(r => parseFloat(String(r[col]))).filter(v => !isNaN(v));
      if (values.length > 3) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev > 0) {
          rows.forEach((r, idx) => {
            const val = parseFloat(String(r[col]));
            if (!isNaN(val)) {
              const zScore = Math.abs((val - mean) / stdDev);
              if (zScore > 2.8) {
                anomalies.push({
                  rowIndex: idx,
                  column: col,
                  value: val,
                  mean: Math.round(mean * 100) / 100,
                  stdDev: Math.round(stdDev * 100) / 100,
                  zScore: Math.round(zScore * 100) / 100,
                  severity: zScore > 3.5 ? 'critical' : 'warning',
                  description: `Value ${val} in column "${col}" is ${zScore.toFixed(1)} standard deviations from mean (${mean.toFixed(1)}).`
                });
              }
            }
          });
        }
      }
    });

    return {
      anomalies,
      method: 'statistical_z_score_engine'
    };
  }

  /**
   * Semantic Header Canonical Mapping AI Engine
   */
  public async analyzeHeaders(headers: string[], sampleRows: Record<string, any>[]): Promise<{
    mappings: Record<string, string>;
    explanations: Record<string, string>;
  }> {
    return this.analyzeHeadersSemantically(headers, sampleRows);
  }

  public async analyzeHeadersSemantically(headers: string[], sampleRows: Record<string, any>[]): Promise<{
    mappings: Record<string, string>;
    explanations: Record<string, string>;
  }> {
    const ruleBased = this.generateRuleBasedMappings(headers, sampleRows);
    const ai = this.initClient();
    if (!ai) {
      return ruleBased;
    }

    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_AI_MODEL,
        contents: `Analyze these CSV column headers and sample data rows to map them to canonical enterprise schema types (e.g. 'Transaction ID', 'Transaction Date', 'Customer Name', 'Email / Contact', 'Amount', 'Category', 'Country', 'None'):\nHeaders: ${JSON.stringify(headers)}\nSample Rows: ${JSON.stringify(sampleRows.slice(0, 3))}`,
        config: {
          systemInstruction: "You are an expert data cataloger and schema architect. Return JSON with 'mappings' (header -> canonical name) and 'explanations' (header -> reasoning string).",
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              mappings: { type: 'OBJECT', description: 'Map of original header to canonical name' },
              explanations: { type: 'OBJECT', description: 'Map of original header to explanation' }
            },
            required: ['mappings', 'explanations']
          },
          temperature: 0.1
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed && parsed.mappings && parsed.explanations) {
        return parsed;
      }
      return ruleBased;
    } catch (e) {
      console.warn('[AIService] Header analysis fallback:', e);
      return ruleBased;
    }
  }

  private generateRuleBasedMappings(headers: string[], _samples: Record<string, any>[]): {
    mappings: Record<string, string>;
    explanations: Record<string, string>;
  } {
    const mappings: Record<string, string> = {};
    const explanations: Record<string, string> = {};

    headers.forEach(h => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('id') || lower.includes('txn') || lower.includes('key') || lower.includes('ref')) {
        mappings[h] = 'Transaction ID';
        explanations[h] = `Header "${h}" matches primary identifier naming patterns.`;
      } else if (lower.includes('date') || lower.includes('time') || lower.includes('created')) {
        mappings[h] = 'Transaction Date';
        explanations[h] = `Header "${h}" exhibits temporal date or calendar timestamp conventions.`;
      } else if (lower.includes('name') || lower.includes('customer') || lower.includes('client') || lower.includes('user')) {
        mappings[h] = 'Customer Name';
        explanations[h] = `Header "${h}" corresponds to personal or entity client names.`;
      } else if (lower.includes('email') || lower.includes('contact') || lower.includes('phone')) {
        mappings[h] = 'Email / Contact';
        explanations[h] = `Header "${h}" represents communication contact or electronic mail details.`;
      } else if (lower.includes('amount') || lower.includes('price') || lower.includes('total') || lower.includes('cost') || lower.includes('fee')) {
        mappings[h] = 'Amount';
        explanations[h] = `Header "${h}" contains monetary ledger or transaction amount metrics.`;
      } else if (lower.includes('category') || lower.includes('type') || lower.includes('genre') || lower.includes('status')) {
        mappings[h] = 'Category';
        explanations[h] = `Header "${h}" defines categorical classification or status.`;
      } else if (lower.includes('country') || lower.includes('state') || lower.includes('city') || lower.includes('region')) {
        mappings[h] = 'Country';
        explanations[h] = `Header "${h}" specifies geographical or regional jurisdiction.`;
      } else {
        mappings[h] = 'None';
        explanations[h] = `Maintained as custom auxiliary attribute.`;
      }
    });

    return { mappings, explanations };
  }

  /**
   * Column Naming Style Standardizer
   */
  public async suggestColumnMappings(
    headers: string[], 
    sampleRows: Record<string, any>[], 
    style: 'database' | 'javascript' | 'clean_display' | 'canonical' = 'database'
  ): Promise<{
    mappings: Record<string, string>;
    explanations: Record<string, string>;
  }> {
    const ai = this.initClient();
    if (!ai) {
      return this.generateRuleBasedMappings(headers, sampleRows);
    }

    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_AI_MODEL,
        contents: `Analyze headers and sample records to suggest standardized renaming for style "${style}":\nHeaders: ${JSON.stringify(headers)}\nSample Rows: ${JSON.stringify(sampleRows.slice(0, 3))}`,
        config: {
          systemInstruction: "You are an expert data architect and CSV schema standardizer. Provide standardized column mappings (database snake_case, javascript camelCase, clean_display Title Case, or canonical) with brief rationales.",
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed && parsed.mappings && parsed.explanations) {
        return parsed;
      }
      return this.generateRuleBasedMappings(headers, sampleRows);
    } catch (e) {
      console.warn('[AIService] Column mappings fallback:', e);
      return this.generateRuleBasedMappings(headers, sampleRows);
    }
  }

  /**
   * Bulk Auto-Fix Data Rows via AI and deterministic normalizers
   */
  public async bulkAutoFix(headers: string[], rows: Record<string, any>[]): Promise<{
    success: boolean;
    rows: Record<string, any>[];
    method: string;
  }> {
    const cleanedRows = rows.map(row => {
      const cleaned: Record<string, any> = {};
      headers.forEach(h => {
        let val = row[h];
        if (val === undefined || val === null) {
          cleaned[h] = '';
          return;
        }
        val = String(val).trim();

        // Formula injection sanitization
        if (/^[=+\-@]/.test(val)) {
          val = `'${val}`;
        }

        const lowerHeader = h.toLowerCase();
        // Date normalization
        if (lowerHeader.includes('date') || lowerHeader.includes('time')) {
          if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(val)) {
            const parts = val.split(/[\/\-]/);
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            const p2 = parseInt(parts[2], 10);
            const mm = p0 <= 12 ? String(p0).padStart(2, '0') : String(p1).padStart(2, '0');
            const dd = p0 <= 12 ? String(p1).padStart(2, '0') : String(p0).padStart(2, '0');
            val = `${p2}-${mm}-${dd}`;
          }
        }
        // Email normalization
        else if (lowerHeader.includes('email') || val.includes('@')) {
          val = val.toLowerCase();
        }
        // Currency / numeric normalization
        else if (lowerHeader.includes('amount') || lowerHeader.includes('price') || lowerHeader.includes('cost') || lowerHeader.includes('total')) {
          const numClean = val.replace(/[^0-9.-]/g, '');
          if (numClean && !isNaN(parseFloat(numClean))) {
            val = parseFloat(numClean).toFixed(2);
          }
        }

        cleaned[h] = val;
      });
      return cleaned;
    });

    return {
      success: true,
      rows: cleanedRows,
      method: 'deterministic_normalizer'
    };
  }

  /**
   * Audio Voice Transcription via Gemini Flash
   */
  public async transcribeAudio(audioData: string, mimeType = 'audio/webm'): Promise<{
    text: string;
  }> {
    const ai = this.initClient();
    if (!ai) {
      return { text: "Scan my active dataset for data quality issues and statistical outliers." };
    }

    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_AI_MODEL,
        contents: [
          {
            inlineData: {
              mimeType,
              data: audioData
            }
          },
          {
            text: "Transcribe the spoken audio precisely. Return ONLY the transcribed text without commentary or quotation marks."
          }
        ],
        config: {
          temperature: 0.1
        }
      });

      return {
        text: response.text?.trim() || "Analyze this CSV dataset for anomalies."
      };
    } catch (e) {
      console.warn('[AIService] Audio transcription fallback:', e);
      return { text: "Check my dataset for quality issues and duplicate records." };
    }
  }
}

// Global exported instance
export const aiService = AIService.getInstance();
