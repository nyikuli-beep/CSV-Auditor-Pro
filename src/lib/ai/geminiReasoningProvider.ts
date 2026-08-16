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
1. TRUTHFULNESS & GROUNDED EVIDENCE:
   - All numbers, sums, averages, rankings, trends, and quality metrics MUST come exclusively from the deterministic calculation evidence supplied in the context.
   - NEVER invent column names, row counts, percentage statistics, or duplicate counts.
   - Clearly distinguish verified calculated facts (e.g. "Total calculated revenue is $124,500 across 450 transactions") from analytical interpretations or recommendations.
   - If the requested analysis cannot be answered with the supplied dataset or columns, explicitly state that the data is insufficient (insufficient_data).

2. DIRECT, TARGETED & FORENSIC CONVERSATION:
   - When the user asks about a specific issue, recommendation, remediation plan, column, or error (e.g. "How should I implement the remediation plan for: 'Handle Missing Values in \"suspect_gender\" (293 cells)'?"):
     * ALWAYS ANSWER THAT SPECIFIC INQUIRY DIRECTLY AND COMPREHENSIVELY.
     * NEVER start with or substitute a generic dataset overview (e.g. DO NOT say "Dataset 'xyz.csv' contains X rows, score 100/100, with 0 detected issues").
     * Provide structured, expert data auditor guidance:
       - **Direct Answer**: The exact remediation action to take.
       - **Why (Rationale & Domain Context)**: Explain why (e.g. avoiding demographic mode imputation for sensitive attributes vs explicit 'Unknown' categorization).
       - **Recommended Remediation Strategy**: Step-by-step strategy.
       - **Implementation Steps**: Practical implementation recipes with Python/Pandas code, SQL query, and CSV Auditor Pro in-app workflow.
       - **Validation**: Queries and checks to verify the fix.
   - For follow-up questions (e.g. "What should I replace them with?", "Show me the SQL for that"), continue the active context directly without reciting file metadata.
   - For general conversational queries (greetings, formula requests, general SQL questions), answer helpfully, clearly, and concisely without dumping dataset statistics.
   - Avoid robotic prefixes like "Based on the provided dataset...". Start directly with the answer.
   - Avoid emojis and marketing fluff. Keep tone objective, precise, and forensic.
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

      // Generate response from Gemini
      const initialResponse = await ai.models.generateContent({
        model: modelToUse,
        contents,
        config
      });

      let finalResponseText = initialResponse.text || '';

      // Execute Response Validation Middleware to evaluate intent alignment
      const validation = ResponseValidationMiddleware.validate(
        finalResponseText,
        groundedContext,
        request.prompt
      );

      // If a generic summary or mismatch is returned for a specific intent (e.g. remediation), trigger re-prompting with strict constraints
      if (!validation.isValid && validation.repromptInstruction) {
        console.warn('[ResponseValidationMiddleware] AI output mismatch detected:', validation.detectedMismatches);

        try {
          const repromptContents = [
            ...contents,
            { role: 'model', parts: [{ text: finalResponseText }] },
            { role: 'user', parts: [{ text: validation.repromptInstruction }] }
          ];

          const repromptResponse = await ai.models.generateContent({
            model: modelToUse,
            contents: repromptContents,
            config: {
              ...config,
              temperature: 0.1
            }
          });

          const correctedText = repromptResponse.text || '';
          const revalidation = ResponseValidationMiddleware.validate(
            correctedText,
            groundedContext,
            request.prompt
          );

          if (revalidation.isValid) {
            finalResponseText = correctedText;
          } else if (validation.fallbackContent) {
            finalResponseText = validation.fallbackContent;
          } else {
            finalResponseText = correctedText || finalResponseText;
          }
        } catch (repromptErr) {
          console.error('[ResponseValidationMiddleware] Reprompting failed, applying deterministic fallback:', repromptErr);
          if (validation.fallbackContent) {
            finalResponseText = validation.fallbackContent;
          }
        }
      }

      // Stream the validated response text smoothly
      const chunkSize = 32;
      for (let i = 0; i < finalResponseText.length; i += chunkSize) {
        callbacks.onChunk(finalResponseText.slice(i, i + chunkSize));
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
