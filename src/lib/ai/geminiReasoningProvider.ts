/**
 * CSV Auditor Pro - Gemini Reasoning Engine Provider (Phase 2)
 * 
 * Provides server-side Gemini 3.7 Flash reasoning for:
 * 1. Conversational Auditor (real-time SSE streaming with multi-turn chat, search grounding, thinking mode)
 * 2. AI Insights Engine (grounded, deterministic error analysis, statistical profiles, and executive summaries)
 * 
 * All reasoning is grounded in deterministic statistical calculations and profiler results.
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
import { buildGroundedContext, formatGroundedPrompt } from './contextBuilder';
import { ResponseValidationMiddleware } from './responseValidator';

const DEFAULT_MODEL = 'gemini-3.7-flash';

const AUDITOR_CORE_SYSTEM_INSTRUCTION = `You are the Enterprise Data Auditor & Intelligence Engine for CSV Auditor Pro.

STRICT GROUNDING & REASONING DIRECTIVES:
1. DIRECT TASK-FIRST ANSWERS (ZERO GENERIC PREAMBLE):
   - When the user asks a question or gives a task (e.g. how to fix an issue, write a formula, generate SQL, explain a data quality finding, write Python script, transform a column, detect anomalies, analyze a trend, calculate a metric):
     * DIRECTLY AND IMMEDIATELY ANSWER THE USER'S QUESTION WITH FULL DEPTH, CLARITY, AND ACTIONABLE STEPS.
     * NEVER start your response with a generic dataset summary preamble (e.g. NEVER start with "Dataset 'xyz.csv' has 5,050 rows and a score of 100/100..."). Start immediately with the solution or direct answer to the user's question.
     * Only provide a dataset summary if the user explicitly asks for a dataset overview or summary (e.g. "Summarize this file", "Give me an overview of the dataset").

2. TRUTHFULNESS & GROUNDED EVIDENCE:
   - All numbers, sums, averages, rankings, trends, and quality metrics MUST come exclusively from the deterministic calculation evidence supplied in the context.
   - NEVER invent column names, row counts, percentage statistics, or duplicate counts.
   - Clearly distinguish verified calculated facts (e.g. "Total calculated revenue is $124,500 across 450 transactions") from analytical interpretations or recommendations.
   - If the requested analysis cannot be answered with the supplied dataset or columns, explicitly state that the data is insufficient.

3. SPECIFIC REMEDIATION PLANS:
   - When asked about implementing a remediation plan or fixing an issue:
     * Provide structured, expert data auditor guidance:
       - **Direct Answer**: The exact remediation action to take.
       - **Why (Rationale & Domain Context)**: Explain why (e.g. avoiding demographic mode imputation for sensitive attributes vs explicit 'Unknown' categorization).
       - **Recommended Remediation Strategy**: Step-by-step strategy.
       - **Implementation Steps**: Practical implementation recipes with Python/Pandas code, SQL query, and CSV Auditor Pro in-app workflow.
       - **Validation**: Queries and checks to verify the fix.

4. MULTI-TURN CONTINUITY:
   - For follow-up questions (e.g. "What should I replace them with?", "Show me the SQL for that", "Now convert that to PostgreSQL"), continue the active discussion context directly without reciting file metadata.

5. FORMATTING & TONE:
   - Format your answer with clean Markdown headers, bullet points, and code blocks as appropriate.
   - Do NOT use emojis. Maintain an objective, authoritative, and helpful professional tone.
`;

const PERSONA_PROMPTS: Record<string, string> = {
  auditor: "Role focus: Forensic Data Auditor. Prioritize data validation rules, duplicate detection, formatting errors, formula injection risks, and data integrity verification.",
  scientist: "Role focus: Principal Data Scientist. Prioritize statistical distributions, outlier z-scores, IQR boundaries, null imputation strategies, skewness, and variance.",
  developer: "Role focus: Senior Data Engineer & DBA. Prioritize schema definitions, SQL queries, Python (pandas) scripts, type normalization, and API/ETL pipelines.",
  compliance: "Role focus: Compliance & Privacy Officer. Prioritize PII detection, GDPR/SOC2 alignment, audit trail logging, and secure formula sanitization.",
  general: "Role focus: Technical Data Specialist. Provide balanced, actionable guidance across spreadsheet hygiene and data transformations."
};

export class GeminiReasoningProvider implements ReasoningEngineProvider {
  public name = 'Gemini Data-Grounded Reasoning Layer';
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
   * Stream a conversation turn with grounded context, multi-turn history, and search grounding
   */
  public async streamConversation(
    request: ConversationalAuditorRequest,
    callbacks: ConversationalAuditorStreamCallbacks
  ): Promise<void> {
    const ai = this.initClient();
    const requestId = `req_${Date.now()}`;
    const modelToUse = request.model || DEFAULT_MODEL;

    // 1. Build Data-Grounded Context
    const groundedContext = buildGroundedContext(request.prompt, request.analysisContext);

    // If Gemini client is not available, emit graceful upgrade message
    if (!ai) {
      const meta: ConversationalAuditorMeta = {
        requestId,
        model: modelToUse,
        status: 'upgrading',
        citations: [{ type: 'system', label: 'AI Architecture Phase 2' }],
        intent: groundedContext.routePlan.intent,
        confidenceScore: 1.0,
        confidenceStatus: 'moderate_confidence',
        routePlan: groundedContext.routePlan
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

      // Current turn with grounded evidence
      const currentParts: any[] = [];
      if (request.image && request.image.data) {
        currentParts.push({
          inlineData: {
            mimeType: request.image.mimeType || 'image/png',
            data: request.image.data
          }
        });
      }

      const formattedPrompt = formatGroundedPrompt(groundedContext, request.userContext);
      currentParts.push({ text: formattedPrompt });
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

      // Thinking config
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
        citations.push({ type: 'web', label: 'Google Search Grounding' });
      }

      const meta: ConversationalAuditorMeta = {
        requestId,
        model: modelToUse,
        status: groundedContext.hasSufficientData ? 'ready' : 'insufficient_data',
        citations,
        intent: groundedContext.routePlan.intent,
        confidenceScore: groundedContext.routePlan.confidence,
        confidenceStatus: groundedContext.hasSufficientData ? 'high_confidence' : 'insufficient_data',
        relevantColumns: groundedContext.routePlan.targetColumns,
        routePlan: groundedContext.routePlan
      };

      callbacks.onMeta(meta);

      // Stream response in real-time from Gemini 3.7 Flash
      try {
        const streamResult = await ai.models.generateContentStream({
          model: modelToUse,
          contents,
          config
        });

        let accumulatedText = '';
        for await (const chunk of streamResult) {
          const text = chunk.text || '';
          if (text) {
            accumulatedText += text;
            callbacks.onChunk(text);
          }
        }

        // If Gemini returned an empty stream, fallback deterministically
        if (!accumulatedText.trim()) {
          const fallback = ResponseValidationMiddleware.buildDeterministicFallback(groundedContext);
          callbacks.onChunk(fallback);
        }

        if (callbacks.onDone) {
          callbacks.onDone();
        }
      } catch (streamErr: any) {
        console.warn('[GeminiReasoningProvider] Streaming attempt encountered error, attempting generateContent fallback:', streamErr);
        
        // Single call fallback
        const singleResponse = await ai.models.generateContent({
          model: modelToUse,
          contents,
          config
        });

        const fullText = singleResponse.text || ResponseValidationMiddleware.buildDeterministicFallback(groundedContext);
        callbacks.onChunk(fullText);

        if (callbacks.onDone) {
          callbacks.onDone();
        }
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
   * Generates grounded, deterministic dataset insights
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
    if (!d || !d.fileName || (d.rowCount || 0) === 0) {
      return {
        id,
        insightType: request.insightType,
        content: "No active dataset loaded in the workspace. Upload a CSV file to generate automated insights.",
        status: 'insufficient_data',
        citations: [],
        generatedAt: new Date().toISOString()
      };
    }

    // Build grounded context for the insight type
    let promptGoal = '';
    switch (request.insightType) {
      case 'error_patterns':
        promptGoal = `Analyze the dataset quality findings and error breakdown. Total issues: ${d.issuesCount || 0}, Duplicates: ${d.duplicatesCount || 0}, Missing: ${d.missingValuesCount || 0}, Format errors: ${d.formatErrorsCount || 0}. Provide a prioritized remediation breakdown with concrete steps and SQL/Python snippets to fix the top issues.`;
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

    const groundedContext = buildGroundedContext(promptGoal, request.analysisContext);
    const promptText = formatGroundedPrompt(groundedContext, request.userContext);

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
        structuredData: groundedContext.deterministicResults,
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
