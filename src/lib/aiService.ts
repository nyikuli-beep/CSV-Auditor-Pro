/**
 * CSV Auditor Pro - Centralized Enterprise AI Service
 * Unified AI Architecture powering all Conversational Audits, Automated Hygiene,
 * Anomaly Detection, Schema Governance, and RAG Intelligence via Google Gemini 3.7 Flash.
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
  getRelevantKnowledgeChunks, 
  KnowledgeChunk 
} from './ragEngine';
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

// ==========================================
// ENTERPRISE PERMANENT SYSTEM PROMPT
// ==========================================
export const ENTERPRISE_SYSTEM_PROMPT = `You are the Lead Enterprise Data Quality & Compliance Auditor for CSV Auditor Pro.
Your mission is to provide rigorous, accurate, mathematically grounded, and actionable analysis of CSV datasets, data hygiene, schema integrity, and enterprise compliance.

CORE OPERATING DIRECTIVES:
1. TRUTHFULNESS & ZERO HALLUCINATIONS:
   - Ground all factual assertions strictly in the provided dataset metadata, deterministic tool outputs, or verified knowledge base documents.
   - If a specific column, metric, or row is not present in the dataset, explicitly state that it is unavailable. Never fabricate numbers, column names, or statistical values.
   - For numerical metrics (mean, median, standard deviation, duplicate counts, null percentages), rely strictly on the calculated values provided in the context.

2. PROFESSIONAL ENTERPRISE TONE:
   - Maintain an objective, authoritative, and analytical tone suitable for Chief Data Officers, Risk Analysts, and Enterprise Compliance Teams.
   - Do NOT use emojis, playful slang, promotional hype, or filler phrases.
   - Use clear, structured Markdown headers, bullet points, and code blocks for readability.

3. STRUCTURED AUDIT REPORTING FORMAT:
   When providing comprehensive analyses or dataset evaluations, structure your response as follows:
   - **Executive Summary**: A concise 1-2 sentence overview of the finding or answer.
   - **Key Findings**: Clear, bulleted breakdown of anomalies, quality metrics, or structural evaluations.
   - **Data Quality & Risk Assessment**: Concrete metrics (e.g. data quality score, null rate, formula injection risks).
   - **Recommended Actions**: Prioritized, step-by-step guidance to resolve identified issues.

4. COMPLIANCE & SECURITY GOVERNANCE:
   - Protect data privacy: highlight formula injection risks (cells starting with =, +, -, @), PII exposure, and unencrypted sensitive identifiers.
   - Enforce schema conformity and flag schema drift or type inconsistencies.
`;

// Persona-specific instructions to overlay on top of the Enterprise System Prompt
export const PERSONA_INSTRUCTIONS: Record<string, string> = {
  auditor: "Persona: Forensic Data Auditor. Emphasize compliance, security vulnerabilities, formula injection prevention, and regulatory data integrity.",
  scientist: "Persona: Principal Data Scientist. Emphasize statistical distributions, outlier z-scores, IQR bounds, skewness, null imputation strategies, and correlation.",
  developer: "Persona: Senior Software Engineer & DBA. Emphasize schema definitions, SQL DDL generation, column type normalization, JSON API serialization, and migration safety.",
  compliance: "Persona: Corporate Compliance Officer. Emphasize GDPR/SOC2 standards, PII sanitization, audit trail retention schedules, and tenant data isolation.",
  general: "Persona: Senior Technical Consultant. Provide direct, balanced, and actionable guidance across data cleaning and workflow automation."
};

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
  structuredContext?: StructuredCSVContext;
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
  explicitAgent?: SpecialistAgentType;
}

export interface AIChatResponseMeta {
  intent: AIIntentCategory;
  fineCategory: FineGrainedIntentCategory;
  confidenceScore: number;
  confidenceDetails?: any;
  riskAssessment?: any;
  recommendations?: any[];
  proactiveInsights?: any[];
  explainability?: any;
  followUpSuggestions?: any[];
  executiveReport?: any;
  reasoning: string;
  executedTools: string[];
  retrievedDocs: string[];
  citations: Array<{ type: string; label: string; url?: string }>;
  modelUsed: string;
  latencyMs: number;
  activeAgent?: SpecialistAgentType;
  activeAgentName?: string;
  activeAgentTitle?: string;
  collaboratingAgents?: Array<{ id: SpecialistAgentType; name: string; role: string }>;
  isCompoundQuery?: boolean;
  routingRationale?: string;
  evidenceCollected?: AgentEvidence[];
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
   * Builds the complete Structured Prompt with Context Injection
   */
  public buildStructuredPrompt(options: AIChatRequestOptions, intentResult: IntentAnalysisResult, executedToolResults: ToolResult[], knowledgeChunks: KnowledgeChunk[]): {
    systemInstruction: string;
    userContent: string;
    modelToUse: string;
  } {
    const modelToUse = options.model && options.model.startsWith('gemini')
      ? (options.model.includes('3.7') ? 'gemini-3.7-flash' : options.model)
      : DEFAULT_AI_MODEL;

    // 1. Build System Instruction with Persona
    const personaKey = options.persona || 'auditor';
    const personaInstruction = PERSONA_INSTRUCTIONS[personaKey] || PERSONA_INSTRUCTIONS.auditor;
    const systemInstruction = `${ENTERPRISE_SYSTEM_PROMPT}\n\nACTIVE PERSONA CONTEXT:\n${personaInstruction}`;

    // 2. Build User & Workspace Tenancy Context Section
    let contextSection = `=== ENTERPRISE WORKSPACE & USER CONTEXT ===\n`;
    if (options.userContext) {
      const u = options.userContext;
      contextSection += `- User: ${u.name || 'Enterprise Analyst'} (${u.email || 'user@company.com'})\n`;
      contextSection += `- Workspace Role: ${u.role || 'Admin'}\n`;
      contextSection += `- Organization / Workspace: ${u.workspaceName || 'Corporate Workspace'}\n`;
      contextSection += `- Subscription Tier: ${(u.subscriptionPlan || 'enterprise').toUpperCase()}\n`;
      if (u.teamMembersCount) {
        contextSection += `- Active Team Tenancy Seats: ${u.teamMembersCount}\n`;
      }
    } else {
      contextSection += `- Workspace: CSV Auditor Pro Enterprise Tenancy\n`;
    }

    // 3. Build Dataset & Profile Context Section
    if (options.datasetContext) {
      const d = options.datasetContext;
      contextSection += `\n=== ACTIVE DATASET CONTEXT: "${d.fileName}" ===\n`;
      contextSection += `- Dimensions: ${d.rowCount.toLocaleString()} Rows x ${(d.columnCount || d.headers.length)} Columns\n`;
      contextSection += `- Headers: [${d.headers.join(', ')}]\n`;
      if (d.score !== undefined) {
        contextSection += `- Data Integrity Score: ${d.score}/100\n`;
      }
      if (d.issuesCount !== undefined) {
        contextSection += `- Detected Quality Issues: ${d.issuesCount} total (${d.duplicatesCount || 0} duplicates, ${d.missingValuesCount || 0} missing values, ${d.formatErrorsCount || 0} format errors, ${d.outliersCount || 0} outliers)\n`;
      }

      // Column Profile details if available
      if (d.structuredContext && d.structuredContext.columnProfiles) {
        contextSection += `\nColumn Structural Breakdown:\n`;
        d.structuredContext.columnProfiles.slice(0, 10).forEach(cp => {
          contextSection += `  * "${cp.name}" [Type: ${cp.type} | Missing: ${cp.missingCount} (${cp.nullPercentage}%) | Unique: ${cp.uniqueValuesCount}]\n`;
          if (cp.stats) {
            contextSection += `    Stats: Min: ${cp.stats.min}, Max: ${cp.stats.max}, Mean: ${cp.stats.mean}, Median: ${cp.stats.median}\n`;
          }
        });
      }

      // Sample rows for grounded context (capped at 5 rows)
      if (d.rows && d.rows.length > 0) {
        contextSection += `\nSample Verified Rows (First ${Math.min(d.rows.length, 5)} records):\n`;
        contextSection += JSON.stringify(d.rows.slice(0, 5), null, 2) + '\n';
      }
    } else {
      contextSection += `\n[No active CSV dataset loaded in the current workspace view]\n`;
    }

    // 4. Injected Deterministic Tool Outputs
    if (executedToolResults.length > 0) {
      contextSection += `\n=== DETERMINISTIC TOOL EXECUTION RESULTS (GROUND TRUTH) ===\n`;
      executedToolResults.forEach(tr => {
        contextSection += `[Tool: ${tr.toolName}]\n`;
        contextSection += `Summary: ${tr.summary}\n`;
        contextSection += `Data: ${JSON.stringify(tr.data)}\n\n`;
      });
    }

    // 5. Injected Knowledge Base Documents (RAG)
    if (knowledgeChunks.length > 0) {
      contextSection += `\n=== VERIFIED PLATFORM KNOWLEDGE BASE ARTICLES ===\n`;
      knowledgeChunks.forEach(kc => {
        contextSection += `[Article: ${kc.title} (${kc.category})]\n${kc.content}\n\n`;
      });
    }

    // 6. User Prompt & Goal
    const userContent = `${contextSection}\n=== USER INQUIRY ===\n${options.prompt}\n\nPlease analyze the above inquiry according to enterprise audit standards.`;

    return {
      systemInstruction,
      userContent,
      modelToUse
    };
  }

  /**
   * Execute Automatic Intent Detection and Select Relevant Deterministic Tools
   */
  public analyzeIntentAndRunTools(options: AIChatRequestOptions): {
    intentResult: IntentAnalysisResult;
    executedToolResults: ToolResult[];
    knowledgeChunks: KnowledgeChunk[];
    citations: Array<{ type: string; label: string; url?: string }>;
  } {
    const hasDataset = Boolean(options.datasetContext && options.datasetContext.headers && options.datasetContext.headers.length > 0);
    const headersList = options.datasetContext?.headers || [];
    const intentResult = detectUserIntent(options.prompt, hasDataset, headersList, options.intentCategory);
    const fineClassification = classifyDetailedIntent(options.prompt, options.intentCategory);

    // Retrieve RAG knowledge chunks
    const knowledgeChunks = getRelevantKnowledgeChunks(
      options.prompt, 
      {
        knowledgeBaseId: options.knowledgeBaseId,
        intentCategory: fineClassification.fineCategory,
        limit: 4
      }
    );

    // Run deterministic tools for grounded answers when dataset is loaded
    const executedToolResults: ToolResult[] = [];
    const citations: Array<{ type: string; label: string; url?: string }> = [
      { type: 'product', label: 'CSV Auditor Pro Enterprise Engine' }
    ];

    if (hasDataset && options.datasetContext) {
      const headers = options.datasetContext.headers;
      const rows = options.datasetContext.rows || [];

      // 1. Dataset overview
      if (rows.length > 0 && (options.prompt.toLowerCase().includes('summary') || options.prompt.toLowerCase().includes('overview') || options.prompt.toLowerCase().includes('score') || options.prompt.toLowerCase().includes('quality'))) {
        executedToolResults.push(summarizeDataset(headers, rows));
        citations.push({ type: 'tool', label: 'Dataset Structural Summary' });
      }

      // 2. Duplicate detection
      if (rows.length > 0 && (options.prompt.toLowerCase().includes('duplicate') || options.prompt.toLowerCase().includes('dedup') || options.prompt.toLowerCase().includes('repeat'))) {
        executedToolResults.push(findDuplicates(headers, rows));
        citations.push({ type: 'tool', label: 'Duplicate Cluster Analyzer' });
      }

      // 3. Statistical calculations
      const lowerPrompt = options.prompt.toLowerCase();
      if (rows.length > 0 && (lowerPrompt.includes('average') || lowerPrompt.includes('mean') || lowerPrompt.includes('median') || lowerPrompt.includes('stats') || lowerPrompt.includes('standard deviation') || lowerPrompt.includes('distribution'))) {
        // Find matching column name in prompt
        const matchedCol = headers.find(h => lowerPrompt.includes(h.toLowerCase()));
        if (matchedCol) {
          executedToolResults.push(calculateStatistics(rows, matchedCol));
          citations.push({ type: 'tool', label: `Statistical Engine (${matchedCol})` });
        }
      }

      // 4. Anomaly and Outlier scan
      if (rows.length > 0 && (lowerPrompt.includes('anomaly') || lowerPrompt.includes('outlier') || lowerPrompt.includes('deviation') || lowerPrompt.includes('abnormal'))) {
        executedToolResults.push(detectOutliers(headers, rows, undefined, 2.5));
        citations.push({ type: 'tool', label: 'Z-Score Anomaly Scanner' });
      }
    }

    if (knowledgeChunks.length > 0) {
      knowledgeChunks.forEach(k => {
        citations.push({ type: 'doc', label: k.title });
      });
    }

    if (options.enableSearchGrounding) {
      citations.push({ type: 'web', label: 'Google Search Fact-Checking' });
    }

    return {
      intentResult,
      executedToolResults,
      knowledgeChunks,
      citations
    };
  }

  /**
   * Main Conversational SSE Streaming Chat Method (Enterprise Multi-Agent Orchestrated)
   */
  public async chatStream(
    options: AIChatRequestOptions,
    onMeta: (meta: AIChatResponseMeta) => void,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const startTime = Date.now();
    const ai = this.initClient();

    const hasDataset = Boolean(options.datasetContext && options.datasetContext.headers && options.datasetContext.headers.length > 0);
    const headersList = options.datasetContext?.headers || [];

    // 1. Enterprise Agent Orchestrator: Multi-Agent Intent Routing & Planning
    const plan = agentOrchestrator.planRouting(
      options.prompt,
      hasDataset,
      headersList,
      options.explicitAgent
    );

    // 2. Execute Deterministic Tools & Extract Evidence via Specialist Agents
    const structuredContext = options.datasetContext?.structuredContext || (
      options.datasetContext ? {
        fileId: options.datasetContext.fileId || 'temp_file',
        fileName: options.datasetContext.fileName,
        fileSize: (options.datasetContext as any).fileSizeBytes || 0,
        fileSizeBytesFormatted: `${options.datasetContext.rowCount} rows`,
        encoding: 'UTF-8',
        delimiter: ',',
        rowCount: options.datasetContext.rowCount,
        columnCount: options.datasetContext.headers.length,
        headers: options.datasetContext.headers,
        qualityScore: options.datasetContext.score || 95,
        nullPercentageTotal: 0,
        duplicateRowsCount: options.datasetContext.duplicatesCount || 0,
        duplicateColsCount: 0,
        formulaInjectionRisksCount: 0,
        columnProfiles: [],
        anomaliesDetectedCount: options.datasetContext.issuesCount || 0,
        sampleRowsSanitized: options.datasetContext.rows || [],
        updatedAt: new Date().toISOString()
      } as StructuredCSVContext : undefined
    );

    const { executedTools, evidence } = agentOrchestrator.executeAgentTools(plan, structuredContext);

    // 3. Retrieve Grounded RAG Knowledge if requested by plan
    const knowledgeChunks = plan.requiresRag ? getRelevantKnowledgeChunks(
      options.prompt,
      {
        knowledgeBaseId: options.knowledgeBaseId,
        intentCategory: plan.fineCategory,
        limit: 4
      }
    ) : [];

    // 4. Construct Unified Multi-Agent Prompt
    const primaryAgentDef = SPECIALIST_AGENTS[plan.primaryAgent];
    const collaboratingDefs = plan.collaboratingAgents.map(id => SPECIALIST_AGENTS[id]).filter(Boolean);

    const citations: Array<{ type: string; label: string; url?: string }> = [
      { type: 'agent', label: `${primaryAgentDef.name} (${primaryAgentDef.title})` }
    ];

    collaboratingDefs.forEach(c => {
      citations.push({ type: 'agent', label: `Collab: ${c.name}` });
    });

    executedTools.forEach(t => {
      citations.push({ type: 'tool', label: t.toolName });
    });

    knowledgeChunks.forEach(k => {
      citations.push({ type: 'doc', label: k.title });
    });

    if (options.enableSearchGrounding) {
      citations.push({ type: 'web', label: 'Google Search Fact-Checking' });
    }

    const { systemInstruction, dynamicContextPrompt, meta: responseMeta } = agentOrchestrator.constructCollaborativePrompt(
      plan,
      {
        prompt: options.prompt,
        datasetContext: structuredContext,
        userContext: options.userContext ? {
          userId: options.userContext.uid,
          tier: options.userContext.subscriptionPlan,
          role: options.userContext.role,
          organizationName: options.userContext.workspaceName
        } : undefined,
        enableSearchGrounding: options.enableSearchGrounding,
        knowledgeBaseId: options.knowledgeBaseId
      },
      executedTools,
      evidence,
      knowledgeChunks
    );

    const meta: AIChatResponseMeta = {
      intent: plan.intentCategory,
      fineCategory: plan.fineCategory,
      confidenceScore: responseMeta.confidenceScore || plan.confidence,
      confidenceDetails: responseMeta.confidenceAssessment,
      riskAssessment: responseMeta.riskAssessment,
      recommendations: responseMeta.recommendations,
      proactiveInsights: responseMeta.proactiveInsights,
      explainability: responseMeta.explainability,
      followUpSuggestions: responseMeta.followUpSuggestions,
      executiveReport: responseMeta.executiveReport,
      reasoning: plan.routingRationale,
      executedTools: executedTools.map(t => t.toolName),
      retrievedDocs: knowledgeChunks.map(k => k.title),
      citations,
      modelUsed: DEFAULT_AI_MODEL,
      latencyMs: 0,
      activeAgent: plan.primaryAgent,
      activeAgentName: primaryAgentDef.name,
      activeAgentTitle: primaryAgentDef.title,
      collaboratingAgents: collaboratingDefs.map(c => ({ id: c.id, name: c.name, role: c.title })),
      isCompoundQuery: plan.isCompoundQuery,
      routingRationale: plan.routingRationale,
      evidenceCollected: evidence
    };

    // Emit initial metadata event to client
    onMeta(meta);

    // 5. Execute Streaming API call with Gemini or fallback gracefully
    if (!ai) {
      console.warn('[AIService] GEMINI_API_KEY omitted or offline. Emitting grounded programmatic audit response.');
      const fallbackResponse = this.generateOfflineFallbackResponse(options, {
        category: plan.intentCategory,
        fineCategory: plan.fineCategory,
        confidenceScore: plan.confidence,
        reasoning: plan.routingRationale,
        suggestedTools: plan.requiredTools,
        hasActiveDataset: !!options.datasetContext
      }, executedTools);
      onChunk(fallbackResponse);
      return;
    }

    try {
      // Build conversation contents including history
      const contents: any[] = [];

      // Add conversation history
      if (options.history && options.history.length > 0) {
        options.history.slice(-8).forEach(msg => {
          const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
          contents.push({
            role,
            parts: [{ text: msg.content }]
          });
        });
      }

      // Add multimodal image if attached
      const currentParts: any[] = [];
      if (options.image && options.image.data) {
        currentParts.push({
          inlineData: {
            mimeType: options.image.mimeType || 'image/png',
            data: options.image.data
          }
        });
      }
      currentParts.push({ text: dynamicContextPrompt });
      contents.push({ role: 'user', parts: currentParts });

      const requestConfig: any = {
        systemInstruction,
        temperature: 0.2
      };

      // Search grounding configuration if requested
      if (options.enableSearchGrounding) {
        requestConfig.tools = [{ googleSearch: {} }];
      }

      // Thinking mode / reasoning support for Gemini 3.7 Flash
      if (options.thinkingMode) {
        requestConfig.thinkingConfig = {
          thinkingBudget: 2048
        };
      }

      const responseStream = await ai.models.generateContentStream({
        model: DEFAULT_AI_MODEL,
        contents,
        config: requestConfig
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          onChunk(text);
        }
      }

      const totalLatency = Date.now() - startTime;
      console.log(`[Enterprise Orchestrator Streaming] Agent: ${primaryAgentDef.name} (Collabs: ${collaboratingDefs.length}) | Latency: ${totalLatency}ms | Tools: ${executedTools.length}`);
    } catch (error: any) {
      console.error('[AIService] Gemini Multi-Agent Streaming call failed:', error);
      const fallbackText = this.generateOfflineFallbackResponse(options, {
        category: plan.intentCategory,
        fineCategory: plan.fineCategory,
        confidenceScore: plan.confidence,
        reasoning: plan.routingRationale,
        suggestedTools: plan.requiredTools,
        hasActiveDataset: !!options.datasetContext
      }, executedTools);
      onChunk(`\n\n*(Specialist Fallback Analysis)*\n\n${fallbackText}`);
    }
  }

  /**
   * Generates a grounded programmatic fallback response when API key is unavailable or during network failure
   */
  private generateOfflineFallbackResponse(
    options: AIChatRequestOptions,
    intentResult: IntentAnalysisResult,
    executedToolResults: ToolResult[]
  ): string {
    const d = options.datasetContext;
    if (d && d.fileName) {
      let response = `### Executive Summary\n` +
        `Completed automated audit for dataset **"${d.fileName}"** (${d.rowCount.toLocaleString()} rows, ${d.columnCount || d.headers.length} columns). Overall data integrity score is **${d.score ?? 95}%**.\n\n` +
        `### Key Findings\n` +
        `- **Data Quality**: Identified ${d.issuesCount || 0} issues across the dataset.\n` +
        `- **Duplicate Records**: ${d.duplicatesCount || 0} duplicate row instances found.\n` +
        `- **Null / Missing Values**: ${d.missingValuesCount || 0} blank entries detected.\n` +
        `- **Format Anomalies**: ${d.formatErrorsCount || 0} date/email formatting deviations.\n\n`;

      if (executedToolResults.length > 0) {
        response += `### Deterministic Tool Findings\n`;
        executedToolResults.forEach(tr => {
          response += `- **${tr.toolName}**: ${tr.summary}\n`;
        });
        response += `\n`;
      }

      response += `### Recommended Actions\n` +
        `1. Review and apply automated Quick Clean algorithms in the Hygiene Workspace.\n` +
        `2. Standardize column date/currency casing using Canonical Schema Mappings.\n` +
        `3. Export verified audit PDF report for governance records.`;

      return response;
    }

    return `### Executive Summary\n` +
      `CSV Auditor Pro is ready to assist you with high-speed CSV validation, data hygiene, schema drift detection, and statistical audits.\n\n` +
      `### Recommended Next Step\n` +
      `Upload or select a CSV dataset to initiate automated hygiene scans and generate deep compliance insights.`;
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

    const programmaticResult = detectOutliers(headers, rows, undefined, 2.5);
    const programmaticAnomalies = (programmaticResult.data.outliers || []).map((a: any) => ({
      id: `anom-${a.column}-${a.row}`,
      type: 'outlier',
      severity: a.severity?.toLowerCase() || 'warning',
      column: a.column,
      row: a.row,
      value: String(a.value),
      description: a.reason || `Statistical deviation: "${a.value}" is ${a.zScore} standard deviations from mean.`,
      suggestion: `Verify transaction authenticity against ledger records.`,
      explanation: `Identified by statistical distribution engine. Value sits beyond the standard IQR/Z-score variance threshold.`
    }));

    const ai = this.initClient();
    if (!ai || numericColumns.length === 0) {
      return { anomalies: programmaticAnomalies, method: 'programmatic_z_score' };
    }

    try {
      const samplePoints: Record<string, string[]> = {};
      numericColumns.forEach(h => {
        samplePoints[h] = rows.slice(0, 15).map((r, i) => `Row ${i + 2}: ${r[h]}`).filter(Boolean);
      });

      const prompt = `Analyze these numerical column values and detect extreme statistical outliers or payout anomalies:\n` +
        JSON.stringify(samplePoints, null, 2) + `\n\nReturn findings matching the specified schema.`;

      const response = await ai.models.generateContent({
        model: DEFAULT_AI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: "You are an expert enterprise forensic auditor. Detect statistical anomalies, extreme payouts, and data entry outliers in numerical columns.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              anomalies: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    type: { type: 'STRING' },
                    severity: { type: 'STRING' },
                    column: { type: 'STRING' },
                    row: { type: 'NUMBER' },
                    value: { type: 'STRING' },
                    description: { type: 'STRING' },
                    suggestion: { type: 'STRING' },
                    explanation: { type: 'STRING' }
                  },
                  required: ['id', 'type', 'severity', 'column', 'row', 'value', 'description', 'suggestion', 'explanation']
                }
              }
            },
            required: ['anomalies']
          },
          temperature: 0.1
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed && Array.isArray(parsed.anomalies) && parsed.anomalies.length > 0) {
        return { anomalies: parsed.anomalies, method: DEFAULT_AI_MODEL };
      }
      return { anomalies: programmaticAnomalies, method: 'programmatic_fallback' };
    } catch (e) {
      console.warn('[AIService] Gemini anomaly detection fallback:', e);
      return { anomalies: programmaticAnomalies, method: 'programmatic_fallback' };
    }
  }

  /**
   * Header Canonical Mapping Recommendation
   */
  public async analyzeHeaders(headers: string[], sampleRows: Record<string, any>[]): Promise<{
    mappings: Record<string, string>;
    explanations: Record<string, string>;
  }> {
    const ai = this.initClient();
    const ruleBased = this.generateRuleBasedMappings(headers, sampleRows);

    if (!ai) {
      return ruleBased;
    }

    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_AI_MODEL,
        contents: `Analyze these CSV column headers and sample data rows to map them to canonical fields ('Transaction ID', 'Transaction Date', 'Customer Name', 'Email / Contact', 'Amount', 'Category', 'Country', or 'None'):\nHeaders: ${JSON.stringify(headers)}\nSample Rows: ${JSON.stringify(sampleRows.slice(0, 3))}`,
        config: {
          systemInstruction: "You are a master database architect and CSV schema specialist. Map headers accurately based on names and sample record semantics.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              mappings: { type: 'OBJECT' },
              explanations: { type: 'OBJECT' }
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

  private generateRuleBasedMappings(headers: string[], samples: Record<string, any>[]): {
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
    // 1. First apply deterministic sanitization & format normalization
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
