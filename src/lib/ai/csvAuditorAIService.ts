/**
 * CSV Auditor Pro - Server-Side CSV Auditor AI Service (Phase 2)
 * 
 * Bridges Floating CSV Auditor AI to Firebase + Gemini 3.7 Flash.
 * 
 * Architecture Flow:
 * 1. Authenticated User & Authorized Dataset Access
 * 2. Deterministic Intelligence Engine (profiling, statistics, anomalies, quality)
 * 3. Question Routing (Dataset queries vs Remediation vs General Knowledge vs Multi-turn)
 * 4. Grounded Context Construction (compact, verified numbers only)
 * 5. Gemini 3.7 Flash Reasoning
 * 6. Response Validation & Grounding State Assignment
 * 7. Structured Logging
 */

import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL, DEFAULT_GENERATION_CONFIG } from './modelConfig';
import {
  CSVAuditorAIRequest,
  CSVAuditorAIResponse,
  GroundingState,
  AssistantEvidence
} from '../../types/assistant';
import { CSVProfilingEngine } from './profiler';
import { DataQualityEngine } from './dataQuality';
import { StatisticalAnalysisEngine } from './statisticalEngine';
import { AnomalyDetectionEngine } from './anomalyEngine';
import { AnalysisRouter } from './router';
import { ResponseValidationMiddleware } from './responseValidator';
import { 
  DatasetProfile, 
  AnalysisRoutePlan, 
  ColumnProfile, 
  StructuredGroundedContext,
  DataQualityReport,
  AnomalyReport
} from './types';

const CSV_AUDITOR_SYSTEM_INSTRUCTION = `You are CSV Auditor AI, the expert forensic data auditor, statistician, and data engineering assistant embedded in CSV Auditor Pro.

CRITICAL OPERATIONAL RULES:
1. TASK-FIRST DIRECT ANSWERS:
   - When the user asks a question, task, or asks for advice: DIRECTLY ANSWER THE QUESTION IMMEDIATELY in the first sentence.
   - NEVER start your response with a generic dataset overview preamble (DO NOT say "Dataset 'xyz.csv' contains X rows and a score of 100/100...").
   - Only describe the overall dataset size or profile if the user explicitly asks for an overview or summary (e.g., "Summarize this dataset", "Give me a dataset overview").

2. STRICT DATA GROUNDING & VERIFIED FACTS VS INTERPRETATION:
   - When verified dataset calculations and metrics are provided in the context:
     * Ground all numbers, counts, percentages, sums, and column names strictly in the provided evidence.
     * NEVER invent column names, row counts, or fake statistics.
     * Clearly distinguish verified mathematical facts from recommendations or interpretations:
       - **VERIFIED DATA**: Factual numbers calculated from the dataset.
       - **AUDITOR INTERPRETATION**: What the finding means for data science, downstream pipelines, and reporting.
       - **RECOMMENDED ACTION**: Suggested remediation steps.
     * Do not present AI interpretation as if it were a calculated fact.

3. DATASET STATE & STALE ANALYSIS AWARENESS:
   - If the user or context references an earlier recommendation (e.g. "293 missing values in suspect_gender") but the current dataset state contains 0 missing values (or different counts):
     * Explicitly acknowledge the discrepancy: Explain that the current dataset no longer contains those issues and that the recommendation appears to refer to an earlier dataset state.
     * Never report contradictory numbers.

4. REMEDIATION & ACTION PLANS:
   - When the user asks how to remediate, fix, or implement a recommendation (e.g., missing values in a column, replacing with 'Unknown', deduplication, outlier handling):
     * Provide structured, expert data auditor guidance:
       - **Direct Answer**: The exact remediation action to take.
       - **Why (Rationale & Domain Context)**: Explain why (e.g., avoiding demographic mode imputation for sensitive attributes vs explicit 'Unknown' categorization).
       - **Recommended Remediation Strategy**: Step-by-step strategy.
       - **Implementation Steps**: Practical implementation recipes with Python/Pandas code, SQL query, and CSV Auditor Pro in-app workflow.
       - **Validation**: Queries and checks to verify the fix.

5. GENERAL CONCEPTUAL & EDUCATIONAL QUESTIONS:
   - When the user asks general data science / database questions (e.g., "What is data normalization?", "What is an outlier?", "Explain referential integrity"):
     * Provide a clear, educational, and authoritative explanation.
     * DO NOT claim this was discovered from the user's CSV. Clearly frame it as general data management principles.

6. MULTI-TURN CONTINUITY & PRONOUN RESOLUTION:
   - For follow-up questions (e.g., "How should I fix that?", "What about the second column?", "Would Unknown be better?"):
     * Use the provided conversation history to maintain context seamlessly and resolve pronouns accurately.

7. FORMATTING & PROFESSIONAL TONE:
   - Use clean Markdown with headers (###), bullet points, and code blocks (\`\`\`python, \`\`\`sql) where relevant.
   - Do NOT use emojis. Maintain an objective, authoritative, and helpful professional tone.
`;

export interface ProcessChatParams {
  request: CSVAuditorAIRequest;
  userEmail?: string;
  userId?: string;
  userIp?: string;
  datasetFile?: {
    id: string;
    name: string;
    rows?: Record<string, any>[];
    headers?: string[];
    score?: number;
    issues?: any[];
  } | null;
}

interface CachedDatasetAnalysis {
  datasetProfile: DatasetProfile;
  qualityReport?: DataQualityReport;
  anomalyReport?: AnomalyReport;
  timestamp: number;
}

export class CSVAuditorAIService {
  private static instance: CSVAuditorAIService | null = null;
  private client: GoogleGenAI | null = null;
  
  // In-memory cache for computed profiles & reports (LRU style, max 30 datasets)
  private analysisCache = new Map<string, CachedDatasetAnalysis>();
  
  // In-memory rate limiting store (user UID/IP -> timestamps[])
  private rateLimitStore = new Map<string, number[]>();

  private constructor() {
    this.initClient();
  }

  public static getInstance(): CSVAuditorAIService {
    if (!CSVAuditorAIService.instance) {
      CSVAuditorAIService.instance = new CSVAuditorAIService();
    }
    return CSVAuditorAIService.instance;
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

  /**
   * Enforces in-memory rate limiting per user/IP (30 requests / minute)
   */
  public checkRateLimit(identifier: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
    const now = Date.now();
    const timestamps = this.rateLimitStore.get(identifier) || [];
    const validTimestamps = timestamps.filter(t => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      this.rateLimitStore.set(identifier, validTimestamps);
      return false; // Rate limit exceeded
    }

    validTimestamps.push(now);
    this.rateLimitStore.set(identifier, validTimestamps);
    return true; // Allowed
  }

  /**
   * Main entry point to process a chat request from the floating assistant
   */
  public async processChat(params: ProcessChatParams): Promise<CSVAuditorAIResponse> {
    const startTime = Date.now();
    const { request, userEmail, userId, userIp, datasetFile } = params;
    const requestId = request.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userPrompt = (request.message || '').trim();

    if (!userPrompt) {
      return {
        success: false,
        answer: 'Please provide a message or inquiry.',
        grounding: 'error',
        requestId,
        timestamp: new Date().toISOString(),
        error: 'Empty prompt'
      };
    }

    // Rate Limit Check
    const rateLimitKey = userId || userEmail || userIp || 'anonymous_user';
    if (!this.checkRateLimit(rateLimitKey, 35, 60000)) {
      return {
        success: false,
        answer: 'You have reached the temporary rate limit for CSV Auditor AI inquiries. Please wait a moment before sending your next question.',
        grounding: 'error',
        requestId,
        timestamp: new Date().toISOString(),
        error: 'Rate limit exceeded'
      };
    }

    try {
      // 1. Check if query is a pure general data science / conceptual question
      const isGeneralQuery = this.isGeneralConceptQuery(userPrompt);

      // 2. Prepare Dataset Data & Deterministic Analysis if dataset is available
      let datasetProfile: DatasetProfile | undefined;
      let rows: Record<string, any>[] = [];
      let headers: string[] = [];
      let evidence: AssistantEvidence = {};
      let analysisType: string = isGeneralQuery ? 'general_knowledge' : 'dataset_inquiry';
      let grounding: GroundingState = isGeneralQuery ? 'general-ai' : 'data-verified';
      let suggestedFollowUps: string[] = [];

      if (datasetFile) {
        if (typeof datasetFile.rows === 'string') {
          try { datasetFile.rows = JSON.parse(datasetFile.rows); } catch {}
        }
        if (typeof datasetFile.headers === 'string') {
          try { datasetFile.headers = JSON.parse(datasetFile.headers); } catch {}
        }
        if (typeof datasetFile.issues === 'string') {
          try { datasetFile.issues = JSON.parse(datasetFile.issues); } catch {}
        }
      }

      if (datasetFile && Array.isArray(datasetFile.rows) && datasetFile.rows.length > 0) {
        rows = datasetFile.rows;
        headers = Array.isArray(datasetFile.headers) && datasetFile.headers.length > 0
          ? datasetFile.headers
          : Object.keys(rows[0] || {});

        // Build or retrieve cached deterministic profile
        const cacheKey = `${datasetFile.id}_${rows.length}_${headers.length}_${datasetFile.name || ''}`;
        const cached = this.analysisCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
          datasetProfile = cached.datasetProfile;
        } else {
          datasetProfile = CSVProfilingEngine.profileDataset(rows, headers, datasetFile.id, datasetFile.name);
          this.analysisCache.set(cacheKey, {
            datasetProfile,
            timestamp: Date.now()
          });

          // Trim cache if too large
          if (this.analysisCache.size > 30) {
            const oldestKey = this.analysisCache.keys().next().value;
            if (oldestKey) this.analysisCache.delete(oldestKey);
          }
        }
      }

      // 3. Detect Stale Recommendation State
      let staleStateDetected = false;
      let staleStateExplanation = '';

      if (request.recommendationContext && datasetProfile) {
        const rec = request.recommendationContext;
        const targetColName = rec.columnName;
        if (targetColName && datasetProfile.columnProfiles[targetColName]) {
          const colProf = datasetProfile.columnProfiles[targetColName];
          if (rec.affectedCount !== undefined && rec.affectedCount > 0 && colProf.missingCount === 0) {
            staleStateDetected = true;
            staleStateExplanation = `The active dataset currently contains 0 missing values in "${targetColName}". The referenced recommendation (${rec.affectedCount} missing cells) refers to an earlier dataset state before cleaning was applied.`;
          }
        }
      }

      // 4. Question Routing & Deterministic Execution
      let executionResults: any = {};
      let routePlan: AnalysisRoutePlan | undefined;

      if (!isGeneralQuery && (rows.length > 0 || headers.length > 0)) {
        const previousPlan = this.extractPreviousPlanFromHistory(request.conversationHistory, headers);
        const { routePlan: plan, results } = AnalysisRouter.planAndExecute(
          userPrompt,
          rows,
          headers,
          datasetProfile,
          previousPlan
        );
        routePlan = plan;
        executionResults = results;
        analysisType = plan.intent;

        // Populate evidence and follow-ups based on intent
        if (plan.intent === 'remediation') {
          grounding = 'interpretation';
          if (results.remediationEvidence) {
            evidence.remediationPlan = results.remediationEvidence;
            evidence.columns = [results.remediationEvidence.targetColumn];
            suggestedFollowUps = [
              `How does this impact the overall data quality score?`,
              `Is replacing missing values in "${results.remediationEvidence.targetColumn}" with "Unknown" reasonable?`,
              `Show me Python Pandas code to execute this fix.`
            ];
          }
        } else if (plan.intent === 'ranking') {
          grounding = 'data-verified';
          if (results.ranking) {
            evidence.calculations = { ranking: results.ranking };
            evidence.columns = [results.ranking.targetColumn, results.ranking.metricColumn];
            suggestedFollowUps = [
              `Show the bottom 5 for ${results.ranking.metricColumn}`,
              `What is the total sum across all categories?`
            ];
          }
        } else if (plan.intent === 'aggregation') {
          grounding = 'data-verified';
          if (results.aggregation) {
            evidence.calculations = { aggregation: results.aggregation };
            evidence.columns = [results.aggregation.targetColumn, results.aggregation.groupByColumn].filter(Boolean) as string[];
            suggestedFollowUps = [
              `Which group has the highest value?`,
              `What percentage of the total does each group represent?`
            ];
          }
        } else if (plan.intent === 'missing_values') {
          grounding = 'data-verified';
          evidence.calculations = {
            totalMissing: datasetProfile?.totalMissingCells,
            missingPercentage: datasetProfile?.overallMissingPercentage,
            columnsWithMissing: Object.values(datasetProfile?.columnProfiles || {})
              .filter(cp => cp.missingCount > 0)
              .map(cp => ({ column: cp.name, missing: cp.missingCount, pct: cp.missingPercentage }))
          };
          suggestedFollowUps = [
            `How should I remediate the column with the most missing values?`,
            `What is the best way to handle nulls in this dataset?`
          ];
        } else if (plan.intent === 'duplicate_analysis') {
          grounding = 'data-verified';
          evidence.calculations = {
            duplicateRows: datasetProfile?.duplicateRowCount,
            duplicatePercentage: datasetProfile?.duplicateRowPercentage
          };
          suggestedFollowUps = [
            `How should I deduplicate these rows safely?`,
            `Are there duplicate primary key identifiers?`
          ];
        } else if (plan.intent === 'data_quality') {
          grounding = 'data-verified';
          const qualityReport = results.qualityReport || (rows.length > 0 ? DataQualityEngine.analyze(rows, headers, datasetProfile) : null);
          if (qualityReport) {
            evidence.findings = qualityReport.findings.slice(0, 5);
            evidence.calculations = { qualityScore: qualityReport.qualityScore, totalIssues: qualityReport.totalIssuesCount };
          }
          suggestedFollowUps = [
            `Which issue is the highest priority to fix?`,
            `How can I improve the quality score?`
          ];
        } else if (plan.intent === 'anomaly_analysis') {
          grounding = 'data-verified';
          const anomalyReport = results.anomalyReport || (rows.length > 0 ? AnomalyDetectionEngine.detectAnomalies(rows, headers, datasetProfile) : null);
          if (anomalyReport) {
            evidence.findings = anomalyReport.findings.slice(0, 5);
            evidence.calculations = { totalAnomalies: anomalyReport.totalAnomaliesCount };
          }
          suggestedFollowUps = [
            `Are these anomalies errors or legitimate outliers?`,
            `How should I treat the extreme values?`
          ];
        } else if (plan.intent === 'column_information') {
          grounding = 'data-verified';
          const colName = plan.targetColumns[0];
          if (colName && datasetProfile?.columnProfiles[colName]) {
            evidence.calculations = { columnProfile: datasetProfile.columnProfiles[colName] };
            evidence.columns = [colName];
          }
          suggestedFollowUps = [
            `What are the unique value frequencies for "${colName}"?`,
            `Are there format violations in "${colName}"?`
          ];
        } else if (plan.intent === 'dataset_summary') {
          grounding = 'data-derived';
          evidence.metadata = {
            rowCount: datasetProfile?.rowCount || rows.length,
            columnCount: headers.length,
            score: datasetProfile?.qualityScore ?? datasetFile?.score
          };
          suggestedFollowUps = [
            `What are the biggest data-quality problems?`,
            `Which column has the most missing values?`
          ];
        }
      } else if (!isGeneralQuery && (!datasetFile || rows.length === 0)) {
        grounding = 'insufficient-data';
      }

      // 5. Build Context Payload for Gemini
      const promptPayload = this.buildGeminiPrompt({
        userPrompt,
        isGeneralQuery,
        datasetFile,
        datasetProfile,
        routePlan,
        executionResults,
        recommendationContext: request.recommendationContext,
        pageContext: request.pageContext,
        staleStateDetected,
        staleStateExplanation
      });

      // 6. Call Gemini 3.7 Flash Server-Side with Response Validation & Controlled Regeneration
      const ai = this.initClient();
      let answerText = '';

      const groundedContext: StructuredGroundedContext = {
        userQuestion: userPrompt,
        datasetProfileSummary: {
          fileName: datasetFile?.name || 'dataset.csv',
          rowCount: datasetProfile?.rowCount || rows.length,
          columnCount: datasetProfile?.columnCount || headers.length,
          headers,
          qualityScore: datasetProfile?.qualityScore || 100,
          duplicateRowCount: datasetProfile?.duplicateRowCount || 0,
          overallMissingPercentage: datasetProfile?.overallMissingPercentage || 0
        },
        relevantColumnProfiles: Object.values(datasetProfile?.columnProfiles || {}),
        routePlan: routePlan || {
          intent: 'general_conversation',
          targetColumns: [],
          groupColumns: [],
          dateColumns: [],
          metricColumns: [],
          requiresExecution: false,
          confidence: 0.9,
          reasoning: 'Fallback route'
        },
        deterministicResults: executionResults,
        hasSufficientData: rows.length > 0
      };

      if (ai) {
        const contents: any[] = [];

        // Attach compact conversation history (last 6 turns)
        if (Array.isArray(request.conversationHistory) && request.conversationHistory.length > 0) {
          request.conversationHistory.slice(-6).forEach(h => {
            contents.push({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.content }]
            });
          });
        }

        // Current turn prompt
        contents.push({
          role: 'user',
          parts: [{ text: promptPayload }]
        });

        let geminiError: any = null;
        const candidateModels = ['gemini-3.1-flash-lite', DEFAULT_GEMINI_MODEL, 'gemini-flash-latest'];
        
        for (const candidateModel of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: candidateModel,
              contents,
              config: {
                systemInstruction: CSV_AUDITOR_SYSTEM_INSTRUCTION,
                temperature: DEFAULT_GENERATION_CONFIG.temperature,
                topP: DEFAULT_GENERATION_CONFIG.topP,
                maxOutputTokens: DEFAULT_GENERATION_CONFIG.maxOutputTokens
              }
            });

            answerText = (response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
            if (answerText) {
              geminiError = null;
              break;
            }
          } catch (err: any) {
            geminiError = err;
            console.warn(`[CSV AUDITOR AI] Gemini model ${candidateModel} error:`, err?.message || err);
          }
        }

        if (!answerText && geminiError) {
          console.warn('[CSV AUDITOR AI] Utilizing grounded deterministic engine for response.');
          answerText = this.generateOfflineFallbackAnswer({
            userPrompt,
            isGeneralQuery,
            datasetProfile,
            datasetFile,
            routePlan,
            executionResults,
            recommendationContext: request.recommendationContext
          });
          grounding = 'data-verified';
        }

        // 7. Relevance & Response Validation Middleware
        if (answerText && !geminiError) {
          const validation = ResponseValidationMiddleware.validate(answerText, groundedContext, userPrompt);

          if (!validation.isValid && validation.repromptInstruction) {
            console.warn(`[CSV AUDITOR AI] Initial response failed validation (${validation.detectedMismatches.join('; ')}). Attempting controlled regeneration...`);
            try {
              const repromptContents = [
                ...contents,
                { role: 'model', parts: [{ text: answerText }] },
                { role: 'user', parts: [{ text: validation.repromptInstruction }] }
              ];

              let regenText = '';
              for (const m of candidateModels) {
                try {
                  const regenResponse = await ai.models.generateContent({
                    model: m,
                    contents: repromptContents,
                    config: {
                      systemInstruction: CSV_AUDITOR_SYSTEM_INSTRUCTION,
                      temperature: 0.1,
                      maxOutputTokens: DEFAULT_GENERATION_CONFIG.maxOutputTokens
                    }
                  });
                  regenText = (regenResponse.text || regenResponse.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
                  if (regenText) break;
                } catch (e) {
                  // try next model
                }
              }
              const secondValidation = ResponseValidationMiddleware.validate(regenText, groundedContext, userPrompt);

              if (secondValidation.isValid && regenText.length > 50) {
                answerText = regenText;
              } else if (validation.fallbackContent) {
                console.warn('[CSV AUDITOR AI] Regeneration was still generic. Using deterministic forensic fallback.');
                answerText = validation.fallbackContent;
              }
            } catch (regenErr) {
              console.error('[CSV AUDITOR AI] Regeneration error:', regenErr);
              if (validation.fallbackContent) {
                answerText = validation.fallbackContent;
              }
            }
          }
        }
      }

      // 8. Fallback if Gemini returned empty text or client not configured
      if (!answerText) {
        if (!ai) {
          answerText = this.generateOfflineFallbackAnswer({
            userPrompt,
            isGeneralQuery,
            datasetProfile,
            routePlan,
            executionResults,
            recommendationContext: request.recommendationContext
          });
        } else {
          answerText = 'I processed your data inquiry, but could not formulate a response. Please check your query or active dataset.';
          grounding = 'error';
        }
      }

      // 9. Structured Logging
      const durationMs = Date.now() - startTime;
      console.log(`[CSV AUDITOR AI] reqId=${requestId} user=${userId || 'anon'} dataset=${datasetFile?.name || 'none'} intent=${analysisType} grounding=${grounding} duration=${durationMs}ms`);

      return {
        success: true,
        answer: answerText,
        grounding,
        source: datasetFile?.name,
        analysisType,
        evidence: Object.keys(evidence).length > 0 ? evidence : undefined,
        suggestedFollowUps: suggestedFollowUps.length > 0 ? suggestedFollowUps : undefined,
        requestId,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`[CSV AUDITOR AI ERROR] reqId=${requestId}:`, error);
      return {
        success: false,
        answer: `An error occurred while processing your audit request: ${error.message || 'Service temporarily unavailable.'}`,
        grounding: 'error',
        requestId,
        timestamp: new Date().toISOString(),
        error: error.message || 'Internal error'
      };
    }
  }

  /**
   * Identifies if a query is purely conceptual / general data science knowledge
   */
  private isGeneralConceptQuery(prompt: string): boolean {
    const text = prompt.toLowerCase().trim();
    const generalKeywords = [
      'what is data normalization',
      'what is normalization',
      'explain normalization',
      'what is an outlier',
      'what is an anomaly',
      'what does duplicate data mean',
      'what is duplicate data',
      'what are duplicate records',
      'explain duplicate',
      'what is formula injection',
      'explain formula injection',
      'what is csv injection',
      'explain referential integrity',
      'what is referential integrity',
      'what is first normal form',
      'what is 1nf',
      'what is 2nf',
      'what is 3nf',
      'what is data profiling',
      'explain data imputation',
      'what is imputation',
      'what is z-score',
      'what is iqr',
      'explain interquartile range',
      'what is pearson correlation',
      'difference between mean and median',
      'what is data cleaning',
      'what is data quality'
    ];

    if (generalKeywords.some(kw => text.includes(kw))) {
      return true;
    }

    if (
      (text.startsWith('what is ') || text.startsWith('what does ') || text.startsWith('explain ') || text.startsWith('define ') || text.startsWith('tell me about ')) &&
      !text.includes('this dataset') &&
      !text.includes('this file') &&
      !text.includes('my data') &&
      !text.includes('in column') &&
      !text.includes('in my file')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Builds the formatted prompt with grounded facts for Gemini
   */
  private buildGeminiPrompt(params: {
    userPrompt: string;
    isGeneralQuery: boolean;
    datasetFile?: any;
    datasetProfile?: DatasetProfile;
    routePlan?: AnalysisRoutePlan;
    executionResults?: any;
    recommendationContext?: any;
    pageContext?: any;
    staleStateDetected?: boolean;
    staleStateExplanation?: string;
  }): string {
    const {
      userPrompt,
      isGeneralQuery,
      datasetFile,
      datasetProfile,
      routePlan,
      executionResults,
      recommendationContext,
      pageContext,
      staleStateDetected,
      staleStateExplanation
    } = params;

    let p = `USER INQUIRY:\n${userPrompt}\n\n`;

    if (isGeneralQuery) {
      p += `CONTEXT TYPE: General Data Science / Technical Knowledge Question.\n`;
      p += `INSTRUCTION: Provide a clear, educational, and accurate explanation of this concept. Do not pretend this was discovered from a specific CSV file.\n`;
      return p;
    }

    if (pageContext?.page) {
      p += `ACTIVE WORKSPACE PAGE: "${pageContext.page}" (${pageContext.title || pageContext.page})\n`;
    }

    if (!datasetFile && !datasetProfile) {
      p += `DATASET STATUS: No active dataset loaded in workspace.\n`;
      p += `INSTRUCTION: If the user asks about dataset facts, inform them that no CSV is currently active, and provide general advice on what to upload.\n`;
      return p;
    }

    // Include factual summary of dataset
    const fileName = datasetFile?.name || 'dataset.csv';
    const rowCount = datasetProfile?.rowCount ?? (Array.isArray(datasetFile?.rows) ? datasetFile.rows.length : (datasetFile?.rowCount || 'N/A'));
    const headersList = datasetProfile?.headers ?? datasetFile?.headers ?? [];
    const qualityScore = datasetProfile?.qualityScore ?? datasetFile?.score ?? 'N/A';
    const duplicateRows = datasetProfile?.duplicateRowCount ?? 0;
    const missingCells = datasetProfile?.totalMissingCells ?? 0;

    p += `DATASET METADATA (VERIFIED FACTS):\n`;
    p += `- File Name: "${fileName}"\n`;
    p += `- Total Rows: ${typeof rowCount === 'number' ? rowCount.toLocaleString() : rowCount}\n`;
    p += `- Total Columns: ${headersList.length} [${headersList.join(', ')}]\n`;
    p += `- Data Quality Score: ${qualityScore}/100\n`;
    if (datasetProfile) {
      p += `- Duplicate Rows: ${duplicateRows.toLocaleString()} (${datasetProfile.duplicateRowPercentage}%)\n`;
      p += `- Total Missing Cells: ${missingCells.toLocaleString()} (${datasetProfile.overallMissingPercentage}%)\n\n`;
    }

    if (Array.isArray(datasetFile?.issues) && datasetFile.issues.length > 0) {
      p += `AUDIT FINDINGS & DETECTED ISSUES (${datasetFile.issues.length} detected):\n`;
      datasetFile.issues.forEach((iss: any, idx: number) => {
        p += `${idx + 1}. [${iss.severity || 'Medium'}] ${iss.type || iss.title || 'Issue'} on column "${iss.column || 'General'}": ${iss.description || iss.message || ''} (${iss.count || iss.affectedCount || 0} affected rows)\n`;
      });
      p += `\n`;
    }

    // Stale Analysis Alert
    if (staleStateDetected && staleStateExplanation) {
      p += `CRITICAL DATASET STATE AWARENESS (STALE RECOMMENDATION DETECTED):\n`;
      p += `- ${staleStateExplanation}\n`;
      p += `- INSTRUCTION: You MUST explain that the active dataset no longer contains those missing values, and that the recommendation appears to refer to an earlier dataset state before cleaning.\n\n`;
    }

    // Active recommendation context if viewing recommendations
    if (recommendationContext && recommendationContext.title) {
      p += `ACTIVE RECOMMENDATION CONTEXT:\n`;
      p += `- Title: "${recommendationContext.title}"\n`;
      p += `- Issue Category: ${recommendationContext.issueCategory || 'General'}\n`;
      if (recommendationContext.columnName) p += `- Target Column: "${recommendationContext.columnName}"\n`;
      if (recommendationContext.affectedCount !== undefined) p += `- Affected Records in Finding: ${recommendationContext.affectedCount.toLocaleString()}\n`;
      if (recommendationContext.severity) p += `- Severity: ${recommendationContext.severity}\n`;
      if (recommendationContext.description) p += `- Description: ${recommendationContext.description}\n\n`;
    }

    // Deterministic results
    if (executionResults) {
      if (executionResults.remediationEvidence) {
        const rem = executionResults.remediationEvidence;
        p += `VERIFIED REMEDIATION EVIDENCE FOR COLUMN "${rem.targetColumn}":\n`;
        p += `- Issue Type: ${rem.issueType}\n`;
        p += `- Current Missing Count in Dataset: ${rem.currentDatasetMissingCount ?? 'N/A'}\n`;
        p += `- Total Rows: ${rem.currentDatasetTotalRows ?? 'N/A'}\n`;
        if (rem.topCategories && rem.topCategories.length > 0) {
          p += `- Top Categories: ${rem.topCategories.map((c: any) => `"${c.value}" (${c.count})`).join(', ')}\n`;
        }
        p += `- Forensic Rationale: ${rem.rationale}\n`;
        p += `- Recommended Action: ${rem.recommendedAction}\n`;
        if (rem.implementationStrategies?.pythonCodeSnippet) {
          p += `- Python Snippet:\n\`\`\`python\n${rem.implementationStrategies.pythonCodeSnippet}\n\`\`\`\n`;
        }
        if (rem.implementationStrategies?.sqlQuerySnippet) {
          p += `- SQL Snippet:\n\`\`\`sql\n${rem.implementationStrategies.sqlQuerySnippet}\n\`\`\`\n`;
        }
        p += `- Validation Check: ${rem.validationCheck}\n\n`;
      }

      if (executionResults.ranking) {
        const r = executionResults.ranking;
        p += `VERIFIED RANKING EVIDENCE:\n`;
        p += `- Direction: ${r.direction} on metric "${r.metricColumn}" grouped by "${r.targetColumn}"\n`;
        r.items.forEach((item: any) => {
          p += `  #${item.rank}. ${item.key}: ${item.value.toLocaleString()}\n`;
        });
        p += `\n`;
      }

      if (executionResults.aggregation) {
        const a = executionResults.aggregation;
        p += `VERIFIED AGGREGATION EVIDENCE:\n`;
        p += `- Operation: ${a.operation} on "${a.targetColumn}"${a.groupByColumn ? ` grouped by "${a.groupByColumn}"` : ''}\n`;
        if (a.overallTotal !== undefined) p += `- Overall Total: ${a.overallTotal.toLocaleString()}\n`;
        if (a.overallMean !== undefined) p += `- Overall Mean: ${a.overallMean.toLocaleString()}\n`;
        if (a.groups && a.groups.length > 0) {
          p += `- Computed Groups:\n`;
          a.groups.slice(0, 10).forEach((g: any) => {
            p += `  * ${g.key}: ${g.value.toLocaleString()} (${g.count} records)\n`;
          });
        }
        p += `\n`;
      }
    }

    // Directives
    p += `DIRECTIVES:\n`;
    p += `1. Directly answer the user's specific inquiry. Do not output a generic dataset summary unless asked.\n`;
    p += `2. Ground all numbers strictly in the provided verified evidence.\n`;
    p += `3. Separate verified facts from recommendations.\n`;
    p += `4. Maintain a professional, objective tone without emojis.`;

    return p;
  }

  /**
   * Offline / Fallback generator if Gemini is temporarily unavailable
   */
  private generateOfflineFallbackAnswer(params: any): string {
    const { userPrompt, isGeneralQuery, datasetProfile, datasetFile, routePlan, executionResults } = params;

    if (isGeneralQuery) {
      return `### General Data Engineering Guidance\n\nFor conceptual questions regarding data modeling, normalization, or anomaly detection, standard database and statistical principles apply. Data normalization is the systematic structuring of database tables to minimize redundancy and dependency (e.g. 1NF, 2NF, 3NF). Duplicate data refers to identical or near-identical records within a dataset that can skew analytics and reporting.`;
    }

    if (!datasetProfile && (!datasetFile || (!datasetFile.issues && !datasetFile.headers))) {
      return `No active CSV dataset is currently selected. Please upload or open a dataset from the Upload Center to inspect row counts, data quality findings, and anomalies.`;
    }

    const fileName = datasetProfile?.fileName || datasetFile?.name || 'dataset.csv';
    const score = datasetProfile?.qualityScore ?? datasetFile?.score ?? 85;

    if (routePlan?.intent === 'remediation' && executionResults?.remediationEvidence) {
      const rem = executionResults.remediationEvidence;
      return `### Direct Answer\n${rem.recommendedAction}\n\n### Why (Rationale & Domain Context)\n${rem.rationale}\n\n### Implementation Steps\n\`\`\`python\n${rem.implementationStrategies?.pythonCodeSnippet || '# Imputation script'}\n\`\`\`\n\n### Validation\n${rem.validationCheck}`;
    }

    if (Array.isArray(datasetFile?.issues) && datasetFile.issues.length > 0) {
      const issueLines = datasetFile.issues.map((iss: any, idx: number) => {
        return `${idx + 1}. **${iss.type || iss.title || 'Quality Issue'}** on column \`${iss.column || 'General'}\`: ${iss.description || iss.message || ''} (${iss.count || iss.affectedCount || 0} affected rows, ${iss.severity || 'Medium'} severity).`;
      });
      return `### Data Quality Assessment for "${fileName}"\n\nThe dataset currently has an overall data quality score of **${score}/100**.\n\n### Detected Quality Findings\n${issueLines.join('\n\n')}\n\n### Recommended Remediation Actions\n- Standardize missing or inconsistent entries in the flagged columns.\n- Apply data cleaning rules in the Clean tab or export a Python cleaning script.`;
    }

    if (routePlan?.intent === 'remediation' && executionResults?.remediationEvidence) {
      const rem = executionResults.remediationEvidence;
      return `### Direct Answer\n${rem.recommendedAction}\n\n### Why (Rationale & Domain Context)\n${rem.rationale}\n\n### Implementation Steps\n\`\`\`python\n${rem.implementationStrategies?.pythonCodeSnippet || '# Imputation script'}\n\`\`\`\n\n### Validation\n${rem.validationCheck}`;
    }

    if (routePlan?.intent === 'data_quality' || userPrompt.toLowerCase().includes('quality') || userPrompt.toLowerCase().includes('issue') || userPrompt.toLowerCase().includes('problem')) {
      const issues: string[] = [];
      const colProfiles: ColumnProfile[] = Object.values(datasetProfile.columnProfiles || {});
      const missingCols = colProfiles.filter((c: ColumnProfile) => c.missingCount > 0).sort((a, b) => b.missingCount - a.missingCount);
      
      if (missingCols.length > 0) {
        const topMissing = missingCols[0];
        issues.push(`1. **Missing Values**: Column \`${topMissing.name}\` contains **${topMissing.missingCount.toLocaleString()} missing cells** (${topMissing.missingPercentage}% of rows). Total missing across dataset: **${datasetProfile.totalMissingCells.toLocaleString()} cells**.`);
      }
      if (datasetProfile.duplicateRowCount > 0) {
        issues.push(`2. **Duplicate Records**: Identified **${datasetProfile.duplicateRowCount.toLocaleString()} duplicate rows** (${datasetProfile.duplicateRowPercentage}% of total dataset).`);
      }
      if (datasetProfile.formulaInjectionCount > 0) {
        issues.push(`3. **Formula Injection Security Hazard**: Found **${datasetProfile.formulaInjectionCount} cell(s)** beginning with formula characters (\`=\`, \`+\`, \`-\`, \`@\`) that pose dynamic execution hazards in spreadsheets.`);
      }
      if (datasetProfile.formatErrorCount > 0) {
        issues.push(`4. **Format Violations**: Identified **${datasetProfile.formatErrorCount.toLocaleString()} format inconsistencies** across typed columns.`);
      }
      if (datasetProfile.outlierCount > 0) {
        issues.push(`5. **Statistical Anomalies / Outliers**: Detected **${datasetProfile.outlierCount.toLocaleString()} extreme numeric values** exceeding 3 standard deviations from the mean.`);
      }

      if (issues.length === 0) {
        return `### Data Quality Assessment for "${datasetProfile.fileName}"\n\nNo critical data quality issues were detected. The dataset has an overall quality score of **${datasetProfile.qualityScore}/100** with 0 missing cells and 0 duplicate rows across ${datasetProfile.rowCount.toLocaleString()} records.`;
      }

      return `### Data Quality Audit for "${datasetProfile.fileName}"\n\nThe dataset currently has an overall data quality score of **${datasetProfile.qualityScore}/100** across **${datasetProfile.rowCount.toLocaleString()} rows** and **${datasetProfile.columnCount} columns**.\n\n### Primary Data Quality Issues\n${issues.join('\n\n')}\n\n### Recommended Remediation Actions\n- **Impute or Filter Nulls**: Address missing values in \`${missingCols[0]?.name || 'impacted columns'}\` via domain-appropriate fallback or removal.\n- **Deduplication**: Remove duplicate records to maintain primary key integrity.\n- **Formula Sanitization**: Strip or escape leading formula operators to safeguard spreadsheet viewing.`;
    }

    if (routePlan?.intent === 'missing_values') {
      const colProfiles: ColumnProfile[] = Object.values(datasetProfile.columnProfiles || {});
      const missingCols = colProfiles
        .filter((c: ColumnProfile) => c.missingCount > 0)
        .sort((a: ColumnProfile, b: ColumnProfile) => b.missingCount - a.missingCount);

      if (missingCols.length === 0) {
        return `The active dataset contains **0 missing values** across all ${datasetProfile.columnCount} columns.`;
      }

      const top = missingCols[0];
      return `The column with the highest number of missing values is **${top.name}** with **${top.missingCount.toLocaleString()} missing cells** (${top.missingPercentage}% of all rows). Across the entire dataset, there are ${datasetProfile.totalMissingCells.toLocaleString()} total missing cells.`;
    }

    if (routePlan?.intent === 'duplicate_analysis') {
      return `### Duplicate Analysis for "${datasetProfile.fileName}"\n\n- **Duplicate Rows**: ${datasetProfile.duplicateRowCount.toLocaleString()} (${datasetProfile.duplicateRowPercentage}% of total)\n- **Unique Rows**: ${(datasetProfile.rowCount - datasetProfile.duplicateRowCount).toLocaleString()}\n\nUse the Clean Data tab to deduplicate these records.`;
    }

    return `The dataset **"${datasetProfile.fileName}"** contains **${datasetProfile.rowCount.toLocaleString()} rows** and **${datasetProfile.columnCount} columns** with an overall data quality score of **${datasetProfile.qualityScore}/100**.`;
  }

  /**
   * Helper to extract previous routing plan from history to resolve pronouns
   */
  private extractPreviousPlanFromHistory(history?: any[], headers: string[] = []): AnalysisRoutePlan | undefined {
    if (!Array.isArray(history) || history.length === 0) return undefined;

    // Search backwards for the last user prompt and matched columns
    const userTurns = history.filter(h => h.role === 'user');
    if (userTurns.length === 0) return undefined;

    for (let i = userTurns.length - 1; i >= 0; i--) {
      const turn = userTurns[i];
      const matchedCols = AnalysisRouter.extractMatchedColumns(turn.content, headers);
      if (matchedCols.length > 0) {
        return {
          intent: 'column_information',
          targetColumns: matchedCols,
          groupColumns: [],
          dateColumns: [],
          metricColumns: [],
          requiresExecution: true,
          confidence: 0.9,
          reasoning: `Inherited column context "${matchedCols[0]}" from conversation history.`
        };
      }
    }

    return undefined;
  }
}

export const csvAuditorAIService = CSVAuditorAIService.getInstance();

