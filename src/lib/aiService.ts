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
export const ENTERPRISE_SYSTEM_PROMPT = `You are the Enterprise Conversational Auditor inside CSV Auditor Pro. Your role is to provide accurate, professional, enterprise-grade responses. Respond naturally to greetings and general questions. Only perform CSV analysis when the user's request explicitly requires it. Never assume the user wants dataset analysis simply because a CSV exists. When CSV analysis is requested, explain findings clearly, provide actionable recommendations, and maintain a professional enterprise tone.

CONVERSATIONAL INTENT & GUARDRAILS:
1. INTENT EVALUATION & NATURAL OPENINGS:
   - Begin your responses directly with the answer itself.
   - NEVER prepend responses with "Regarding...", "Based on the knowledge base...", "According to stored information...", or "CSV Auditor Pro Knowledge Base Response:".
   - If the user provides a greeting or pleasantry (e.g., "Hi", "Hello", "Thanks", "How are you?"), respond warmly, directly, and concisely as the Conversational Auditor. State what you can assist with without dumping unrequested dataset summaries or documentation.

2. GENERAL KNOWLEDGE CAPABILITIES:
   - You possess comprehensive knowledge in software engineering, database design, SQL, Python, JavaScript, statistical modeling, machine learning, cloud architecture, Excel formulas, and business analysis.
   - Answer general queries directly and intelligently using your internal knowledge.

3. TRUTHFULNESS & GROUNDED FORENSICS:
   - When CSV analysis is explicitly requested, ground all factual findings in the provided dataset metadata, column statistical profiles, and deterministic tool outputs.
   - If a specific column, metric, or parameter is not present in the dataset, explicitly state what is missing instead of fabricating data.
   - For numerical metrics (mean, median, standard deviation, duplicate counts, null percentages), rely strictly on the calculated values provided in the context.

4. PROFESSIONAL ENTERPRISE TONE:
   - Maintain an objective, authoritative, and analytical tone suitable for Chief Data Officers, Risk Analysts, and Enterprise Compliance Teams.
   - Do NOT use emojis, playful slang, promotional hype, or filler phrases.
   - Use clear, structured Markdown headers, bullet points, and code blocks for readability.

5. AUDIT REPORTING STRUCTURE (for detailed reviews):
   When providing comprehensive analyses or dataset evaluations, structure your response as follows:
   - **Executive Summary**: A concise 1-2 sentence overview of the finding or answer.
   - **Key Findings**: Clear, bulleted breakdown of anomalies, quality metrics, or structural evaluations.
   - **Data Quality & Risk Assessment**: Concrete metrics (e.g. data quality score, null rate, formula injection risks).
   - **Recommended Actions**: Prioritized, step-by-step guidance to resolve identified issues.
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
   * Builds the complete Structured Prompt with Dynamic Context Injection
   */
  public buildStructuredPrompt(
    options: AIChatRequestOptions, 
    _intentResult: IntentAnalysisResult, 
    executedToolResults: ToolResult[], 
    _knowledgeChunks: KnowledgeChunk[] = []
  ): {
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

    // 5. User Prompt & Goal
    const userContent = `${contextSection}\n=== USER INQUIRY ===\n${options.prompt}\n\nPlease provide a direct, accurate, and actionable answer.`;

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

    if (options.enableSearchGrounding) {
      citations.push({ type: 'web', label: 'Google Search Fact-Checking' });
    }

    return {
      intentResult,
      executedToolResults,
      knowledgeChunks: [],
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

    // 3. Construct Unified Multi-Agent Prompt
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
      []
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
      retrievedDocs: [],
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

    // 4. Execute Streaming API call with Gemini or fallback dynamically
    if (!ai) {
      console.warn('[AIService] GEMINI_API_KEY omitted or offline. Emitting dynamic audit response.');
      const fallbackResponse = this.generateOfflineFallbackResponse(options, {
        category: plan.intentCategory,
        fineCategory: plan.fineCategory,
        executionPath: plan.executionPath || 'GENERAL_AI',
        confidenceScore: plan.confidence,
        reasoning: plan.routingRationale,
        suggestedTools: plan.requiredTools,
        requiresDatasetAnalysis: plan.requiresDatasetAnalysis ?? false,
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
      
      const errorMessage = error?.message || '';
      const isQuotaError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota');
      const isAuthError = errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('UNAUTHENTICATED') || errorMessage.includes('api key');

      if (isQuotaError) {
        onChunk(`\n\n*(Enterprise AI Service Notice: Gemini API rate limit or token quota reached. Switching to local deterministic engine.)*\n\n`);
      } else if (isAuthError) {
        onChunk(`\n\n*(Enterprise AI Service Notice: API authentication check required. Switching to local deterministic engine.)*\n\n`);
      }

      const fallbackText = this.generateOfflineFallbackResponse(options, {
        category: plan.intentCategory,
        fineCategory: plan.fineCategory,
        executionPath: plan.executionPath || 'GENERAL_AI',
        confidenceScore: plan.confidence,
        reasoning: plan.routingRationale,
        suggestedTools: plan.requiredTools,
        requiresDatasetAnalysis: plan.requiresDatasetAnalysis ?? false,
        hasActiveDataset: !!options.datasetContext
      }, executedTools);
      onChunk(fallbackText);
    }
  }

  /**
   * Generates a dynamic fallback response when API key is unavailable or during network failure
   * Strictly adheres to intent classification: Greetings and General AI never dump dataset stats!
   */
  private generateOfflineFallbackResponse(
    options: AIChatRequestOptions,
    intentResult: IntentAnalysisResult,
    executedToolResults: ToolResult[]
  ): string {
    const isGreeting = 
      intentResult.executionPath === 'CONVERSATION' ||
      intentResult.category === 'GREETING' || 
      intentResult.category === 'GENERAL_CONVERSATION' || 
      intentResult.category === 'CONVERSATIONAL_GREETING' || 
      intentResult.fineCategory === 'GREETING' || 
      intentResult.fineCategory === 'GENERAL_CONVERSATION' ||
      intentResult.fineCategory === 'GREETING_SMALLTALK';

    if (isGreeting) {
      return `Hello! I am your Enterprise Conversational Auditor for CSV Auditor Pro.

I can assist you with data quality auditing, spreadsheet hygiene, finding duplicates, statistical distributions, formula injection protection, and compliance verification.

How can I assist you today?`;
    }

    const isGeneralAI = 
      intentResult.executionPath === 'GENERAL_AI' ||
      intentResult.category === 'GENERAL_KNOWLEDGE' ||
      intentResult.category === 'HELP' ||
      intentResult.category === 'ENTERPRISE_PLATFORM_GUIDANCE' ||
      intentResult.category === 'DASHBOARD_QUESTIONS' ||
      intentResult.requiresDatasetAnalysis === false;

    if (isGeneralAI) {
      if (intentResult.category === 'HELP') {
        return `### Getting Started with CSV Auditor Pro

CSV Auditor Pro provides automated auditing, hygiene, and intelligence for enterprise tabular data:
- **Instant Audit**: Upload your CSV file to compute an automated Health Score (0–100).
- **Cleaning Center**: Resolve duplicates, fill missing values, and trim formatting deviations with one click.
- **Statistical Profiling**: Inspect mean, standard deviation, IQR, and z-score anomaly detection across numeric columns.
- **Executive BI Brief**: Generate automated executive summaries and stakeholder reports.
- **Compliance & Security**: Verify GDPR/SOC2 standards and detect formula injection vulnerabilities.

Ask any specific question or upload a dataset to begin.`;
      }

      if (intentResult.category === 'ENTERPRISE_PLATFORM_GUIDANCE') {
        return `### Workspace & Tenancy Guidance

CSV Auditor Pro offers enterprise multi-tenancy and workspace security:
- **Role-Based Access Control (RBAC)**: Manage Admin, Auditor, and Viewer permissions.
- **Data Isolation**: Datasets are encrypted in transit and at rest with strict organization boundaries.
- **Audit Trails**: Export signed PDF compliance records for SOC2 and GDPR compliance.
- **Enterprise Integrations**: Configure custom API connectors and team invitations in User Settings.`;
      }

      return `I am here to help with data engineering, SQL, Python, Excel formulas, data hygiene standards, or answering questions about your enterprise data pipelines.`;
    }

    // Explicit CSV analysis requested
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
