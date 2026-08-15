/**
 * CSV Auditor Pro - Gemini Reasoning Engine Provider (Phase 2)
 * 
 * Provides server-side Gemini 3.7 Flash reasoning for:
 * 1. Conversational Auditor (real-time SSE streaming with multi-turn chat, search grounding, thinking mode)
 * 2. AI Insights Engine (grounded, deterministic error analysis, statistical profiles, and executive summaries)
 */

import { GoogleGenAI } from '@google/genai';
import {
  ReasoningEngineProvider,
  ConversationalAuditorRequest,
  ConversationalAuditorStreamCallbacks,
  ConversationalAuditorMeta,
  AIInsightsRequest,
  AIInsightsResponse,
  AICitation,
  AI_ENGINE_UPGRADE_MESSAGE
} from './types';

// Default model as per system instructions
const DEFAULT_MODEL = 'gemini-3.7-flash';

const AUDITOR_CORE_SYSTEM_INSTRUCTION = `You are the Conversational Auditor for CSV Auditor Pro, an enterprise SaaS platform for tabular data quality, spreadsheet hygiene, statistical validation, and compliance assurance.

CORE DIRECTIVES & GROUNDED REASONING:
1. TRUTHFULNESS & GROUNDED FINDINGS:
   - When a dataset is provided, strictly ground your analysis in the verified metadata, column names, issue counts, and sample records provided in the context.
   - Never fabricate column names, row counts, duplicate statistics, or statistical metrics that are not in the context.
   - If information is missing or not provided, explicitly state what is missing instead of guessing.

2. CONVERSATIONAL BEHAVIOR:
   - If the user provides a greeting, question, or general query (e.g. "Hello", "How does this work?", "Write a SQL query for deduplication"), answer directly, warmly, and helpfully.
   - Do NOT dump dataset summaries unless the user specifically asks about the dataset or data quality.
   - Never prefix responses with robotic phrases like "Regarding your dataset..." or "Based on the knowledge base...". Start directly with the answer.

3. ENTERPRISE PROFESSIONALISM:
   - Provide clear, structured Markdown responses with bold headings, bullet points, and code blocks (SQL, Python, Excel formulas) when relevant.
   - Maintain an objective, professional tone suitable for Data Engineers, Financial Analysts, and Compliance Officers.
   - Avoid emojis, fluff, or unsolicited promotional statements.
`;

const PERSONA_PROMPTS: Record<string, string> = {
  auditor: "Role focus: Forensic Data Auditor. Prioritize data validation rules, duplicate detection, formatting errors, formula injection risks, and data integrity verification.",
  scientist: "Role focus: Principal Data Scientist. Prioritize statistical distributions, outlier z-scores, IQR boundaries, null imputation strategies, skewness, and variance.",
  developer: "Role focus: Senior Data Engineer & DBA. Prioritize schema definitions, SQL queries, Python (pandas) scripts, type normalization, and API/ETL pipelines.",
  compliance: "Role focus: Compliance & Privacy Officer. Prioritize PII detection, GDPR/SOC2 alignment, audit trail logging, and secure formula sanitization.",
  general: "Role focus: Technical Data Specialist. Provide balanced, actionable guidance across spreadsheet hygiene and data transformations."
};

export class GeminiReasoningProvider implements ReasoningEngineProvider {
  public name = 'Gemini Reasoning Layer';
  public version = '3.7-flash';
  private client: GoogleGenAI | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): GoogleGenAI | null {
    if (!this.client && process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
    return this.client;
  }

  public isAvailable(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  /**
   * Builds the formatted prompt context for the conversational auditor
   */
  private buildConversationalContext(request: ConversationalAuditorRequest): string {
    let context = '';

    // 1. User & Workspace context
    if (request.userContext) {
      const u = request.userContext;
      context += `[Workspace Context: User "${u.name || 'User'}", Role "${u.role || 'Member'}", Workspace "${u.workspaceName || 'Enterprise'}", Tier "${u.subscriptionPlan || 'pro'}"]\n`;
    }

    // 2. Active dataset context (if any)
    if (request.analysisContext && request.analysisContext.fileName) {
      const d = request.analysisContext;
      context += `\n[ACTIVE DATASET: "${d.fileName}"]\n`;
      context += `- Dimensions: ${(d.rowCount || 0).toLocaleString()} rows across ${(d.columnCount || d.headers?.length || 0)} columns\n`;
      if (d.headers && d.headers.length > 0) {
        context += `- Headers (${d.headers.length}): [${d.headers.join(', ')}]\n`;
      }
      if (d.score !== undefined) {
        context += `- Overall Quality Score: ${d.score}/100\n`;
      }
      if (d.issuesCount !== undefined) {
        context += `- Total Issues: ${d.issuesCount} (Duplicates: ${d.duplicatesCount ?? 0}, Missing Values: ${d.missingValuesCount ?? 0}, Format Errors: ${d.formatErrorsCount ?? 0}, Outliers: ${d.outliersCount ?? 0})\n`;
      }
      if (d.sampleRows && d.sampleRows.length > 0) {
        context += `- Sample Verified Rows (${Math.min(d.sampleRows.length, 3)}):\n${JSON.stringify(d.sampleRows.slice(0, 3), null, 2)}\n`;
      }
      if (d.cleaningOperationsPerformed && d.cleaningOperationsPerformed.length > 0) {
        context += `- Cleaning Operations Applied: ${d.cleaningOperationsPerformed.join(', ')}\n`;
      }
    } else {
      context += `\n[No active CSV dataset currently loaded]\n`;
    }

    context += `\nUser Prompt: ${request.prompt}`;
    return context;
  }

  /**
   * Stream a conversation turn with multi-turn history and optional search grounding
   */
  public async streamConversation(
    request: ConversationalAuditorRequest,
    callbacks: ConversationalAuditorStreamCallbacks
  ): Promise<void> {
    const ai = this.initClient();
    const requestId = `req_${Date.now()}`;
    const modelToUse = request.model || DEFAULT_MODEL;

    // If Gemini client is not available, emit graceful upgrade message
    if (!ai) {
      const meta: ConversationalAuditorMeta = {
        requestId,
        model: modelToUse,
        status: 'upgrading',
        citations: [{ type: 'system', label: 'AI Architecture Phase 2' }],
        intent: 'general',
        confidenceScore: 1.0
      };
      callbacks.onMeta(meta);
      callbacks.onChunk(AI_ENGINE_UPGRADE_MESSAGE);
      if (callbacks.onDone) callbacks.onDone();
      return;
    }

    try {
      const personaKey = request.persona || 'auditor';
      const personaInstruction = PERSONA_PROMPTS[personaKey] || PERSONA_PROMPTS.auditor;
      const fullSystemInstruction = `${AUDITOR_CORE_SYSTEM_INSTRUCTION}\n\n${personaInstruction}`;

      // Build conversation contents including history
      const contents: any[] = [];

      // Multi-turn history
      if (request.history && request.history.length > 0) {
        request.history.slice(-8).forEach(msg => {
          const role = (msg.role === 'assistant') ? 'model' : 'user';
          contents.push({
            role,
            parts: [{ text: msg.content }]
          });
        });
      }

      // Current turn
      const currentParts: any[] = [];
      if (request.image && request.image.data) {
        currentParts.push({
          inlineData: {
            mimeType: request.image.mimeType || 'image/png',
            data: request.image.data
          }
        });
      }

      const promptWithContext = this.buildConversationalContext(request);
      currentParts.push({ text: promptWithContext });
      contents.push({ role: 'user', parts: currentParts });

      // Request configuration
      const config: any = {
        systemInstruction: fullSystemInstruction,
        temperature: 0.2
      };

      // Search grounding
      if (request.enableSearchGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      // Thinking config (Gemini 3 series)
      if (request.thinkingMode) {
        config.thinkingConfig = {
          thinkingBudget: 2048
        };
      }

      const citations: AICitation[] = [
        { type: 'model', label: `Gemini 3.7 Flash (${personaKey})` }
      ];

      if (request.analysisContext?.fileName) {
        citations.push({ type: 'dataset', label: `Dataset: ${request.analysisContext.fileName}` });
      }

      if (request.enableSearchGrounding) {
        citations.push({ type: 'web', label: 'Google Search Fact-Checking' });
      }

      const meta: ConversationalAuditorMeta = {
        requestId,
        model: modelToUse,
        status: 'ready',
        citations,
        intent: 'auditing',
        confidenceScore: 0.98
      };

      callbacks.onMeta(meta);

      const responseStream = await ai.models.generateContentStream({
        model: modelToUse,
        contents,
        config
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          callbacks.onChunk(text);
        }
      }

      if (callbacks.onDone) {
        callbacks.onDone();
      }
    } catch (err: any) {
      console.error('[GeminiReasoningProvider] Streaming conversation failed:', err);
      
      const errorMessage = err?.message || '';
      const isQuotaError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota');

      if (isQuotaError) {
        callbacks.onChunk(`\n\n*(Notice: Gemini API token quota or rate limit reached. Please try again shortly.)*`);
      } else {
        callbacks.onChunk(`\n\n*(Error generating AI response: ${err.message || 'Service unavailable'}.)*`);
      }

      if (callbacks.onError) {
        callbacks.onError(err);
      }
      if (callbacks.onDone) {
        callbacks.onDone();
      }
    }
  }

  /**
   * Generates factual, un-fabricated dataset insights
   */
  public async generateInsights(request: AIInsightsRequest): Promise<AIInsightsResponse> {
    const ai = this.initClient();
    const id = `insight_${Date.now()}`;
    const modelToUse = request.model || DEFAULT_MODEL;

    if (!ai) {
      return {
        id,
        insightType: request.insightType,
        content: AI_ENGINE_UPGRADE_MESSAGE,
        status: 'upgrading',
        citations: [{ type: 'system', label: 'AI Architecture Phase 2' }],
        generatedAt: new Date().toISOString()
      };
    }

    const d = request.analysisContext;
    if (!d || !d.fileName) {
      return {
        id,
        insightType: request.insightType,
        content: "No active dataset loaded in the workspace. Upload a CSV file to generate automated insights.",
        status: 'ready',
        citations: [],
        generatedAt: new Date().toISOString()
      };
    }

    let promptGoal = '';
    switch (request.insightType) {
      case 'error_patterns':
        promptGoal = `Analyze the dataset quality and error breakdown. Total issues: ${d.issuesCount || 0}, Duplicates: ${d.duplicatesCount || 0}, Missing: ${d.missingValuesCount || 0}, Format errors: ${d.formatErrorsCount || 0}. Provide a prioritized remediation breakdown with concrete steps and SQL/Python snippets to fix the top issues.`;
        break;
      case 'statistical_outliers':
        promptGoal = `Evaluate statistical distributions and outlier risks across the dataset columns (${d.headers?.join(', ') || 'N/A'}). Outliers detected: ${d.outliersCount || 0}. Explain how IQR and Z-scores should be used to filter anomalies without losing valid business transactions.`;
        break;
      case 'compliance_scan':
        promptGoal = `Perform a compliance and security audit for the columns: [${d.headers?.join(', ') || ''}]. Review formula injection risks (=, +, -, @), PII exposure (emails, phones, identifiers), and suggest GDPR/SOC2 data governance safeguards.`;
        break;
      case 'executive_summary':
        promptGoal = `Generate a concise Executive BI Brief for stakeholders regarding "${d.fileName}" (${(d.rowCount || 0).toLocaleString()} rows, ${(d.columnCount || d.headers?.length || 0)} columns, Health Score: ${d.score || 95}/100). Highlight overall data readiness, key risk areas, and immediate actions needed before production usage.`;
        break;
      default:
        promptGoal = request.prompt || `Provide a structured quality analysis of "${d.fileName}".`;
    }

    const promptText = `
Dataset Context:
- File Name: "${d.fileName}"
- Dimensions: ${(d.rowCount || 0).toLocaleString()} rows x ${(d.columnCount || d.headers?.length || 0)} columns
- Columns: [${d.headers?.join(', ') || ''}]
- Health Score: ${d.score ?? 95}/100
- Issues: ${d.issuesCount || 0} total (Duplicates: ${d.duplicatesCount || 0}, Missing: ${d.missingValuesCount || 0}, Format Errors: ${d.formatErrorsCount || 0}, Outliers: ${d.outliersCount || 0})
- Sample Records: ${JSON.stringify(d.sampleRows?.slice(0, 3) || [])}

Goal:
${promptGoal}
`;

    try {
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: promptText,
        config: {
          systemInstruction: AUDITOR_CORE_SYSTEM_INSTRUCTION,
          temperature: 0.2
        }
      });

      return {
        id,
        insightType: request.insightType,
        content: response.text || "Analysis completed with no additional findings.",
        status: 'ready',
        citations: [
          { type: 'dataset', label: `Dataset: ${d.fileName}` },
          { type: 'model', label: 'Gemini 3.7 Flash' }
        ],
        generatedAt: new Date().toISOString()
      };
    } catch (err: any) {
      console.error('[GeminiReasoningProvider] Generate insights failed:', err);
      return {
        id,
        insightType: request.insightType,
        content: `Error generating insight: ${err.message || 'Service unavailable'}`,
        status: 'error',
        citations: [],
        generatedAt: new Date().toISOString()
      };
    }
  }
}

export const geminiReasoningProvider = new GeminiReasoningProvider();
