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
import { DatasetProfile, AnalysisRoutePlan, ColumnProfile } from './types';

const CSV_AUDITOR_SYSTEM_INSTRUCTION = `You are CSV Auditor AI, the expert forensic data auditor, statistician, and data engineering assistant embedded in CSV Auditor Pro.

CRITICAL OPERATIONAL RULES:
1. TASK-FIRST DIRECT ANSWERS:
   - When the user asks a question, task, or asks for advice: DIRECTLY ANSWER THE QUESTION IMMEDIATELY.
   - NEVER start your response with a generic dataset overview preamble (DO NOT say "Dataset 'xyz.csv' contains X rows and a score of 100/100...").
   - Only describe the overall dataset size or profile if the user explicitly asks for an overview or summary (e.g., "Summarize this dataset", "Give me a dataset overview").

2. STRICT DATA GROUNDING & VERIFIED FACTS:
   - When verified dataset calculations and metrics are provided in the context:
     * Ground all numbers, counts, percentages, sums, and column names strictly in the provided evidence.
     * NEVER invent column names, row counts, or fake statistics.
     * Clearly distinguish verified mathematical facts from recommendations or interpretations.

3. REMEDIATION & ACTION PLANS:
   - When the user asks how to remediate, fix, or implement a recommendation (e.g., missing values in a column, replacing with 'Unknown', deduplication, outlier handling):
     * Provide structured, expert data auditor guidance:
       - **Direct Answer**: The exact remediation action to take.
       - **Why (Rationale & Domain Context)**: Explain why (e.g., avoiding demographic mode imputation for sensitive attributes vs explicit 'Unknown' categorization).
       - **Recommended Remediation Strategy**: Step-by-step strategy.
       - **Implementation Steps**: Practical implementation recipes with Python/Pandas code, SQL query, and CSV Auditor Pro in-app workflow.
       - **Validation**: Queries and checks to verify the fix.

4. GENERAL CONCEPTUAL & EDUCATIONAL QUESTIONS:
   - When the user asks general data science / database questions (e.g., "What is data normalization?", "What is an outlier?", "Explain referential integrity"):
     * Provide a clear, educational, and authoritative explanation.
     * DO NOT claim this was discovered from the user's CSV. Clearly frame it as general data management principles.

5. MULTI-TURN CONTINUITY:
   - For follow-up questions (e.g., "How should I fix that?", "What was my previous question?", "How does that compare?"):
     * Use the provided conversation history to maintain context seamlessly.

6. FORMATTING & PROFESSIONAL TONE:
   - Use clean Markdown with headers (###), bullet points, and code blocks (\`\`\`python, \`\`\`sql) where relevant.
   - Do NOT use emojis. Maintain an objective, authoritative, and helpful professional tone.
`;

export interface ProcessChatParams {
  request: CSVAuditorAIRequest;
  userEmail?: string;
  userId?: string;
  datasetFile?: {
    id: string;
    name: string;
    rows?: Record<string, any>[];
    headers?: string[];
    score?: number;
    issues?: any[];
  } | null;
}

export class CSVAuditorAIService {
  private static instance: CSVAuditorAIService | null = null;
  private client: GoogleGenAI | null = null;

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
            'User-Agent': 'csv-auditor-pro'
          }
        }
      });
    }
    return this.client;
  }

  /**
   * Main entry point to process a chat request from the floating assistant
   */
  public async processChat(params: ProcessChatParams): Promise<CSVAuditorAIResponse> {
    const startTime = Date.now();
    const { request, userEmail, userId, datasetFile } = params;
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

      if (datasetFile && Array.isArray(datasetFile.rows) && datasetFile.rows.length > 0) {
        rows = datasetFile.rows;
        headers = Array.isArray(datasetFile.headers) && datasetFile.headers.length > 0
          ? datasetFile.headers
          : Object.keys(rows[0] || {});

        // Build deterministic profile
        datasetProfile = CSVProfilingEngine.profileDataset(rows, headers, datasetFile.id, datasetFile.name);
      }

      // 3. Question Routing & Deterministic Execution
      let executionResults: any = {};
      let routePlan: AnalysisRoutePlan | undefined;

      if (!isGeneralQuery && (rows.length > 0 || (headers.length > 0))) {
        // If recommendation context is provided, attach to routing
        const previousPlan = this.extractPreviousPlanFromHistory(request.conversationHistory);
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

        // Determine grounding and populate evidence
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

      // 4. Build Context Payload for Gemini
      const promptPayload = this.buildGeminiPrompt({
        userPrompt,
        isGeneralQuery,
        datasetFile,
        datasetProfile,
        routePlan,
        executionResults,
        recommendationContext: request.recommendationContext,
        pageContext: request.pageContext,
        conversationHistory: request.conversationHistory || []
      });

      // 5. Call Gemini 3.7 Flash Server-Side
      const ai = this.initClient();
      let answerText = '';

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

        const response = await ai.models.generateContent({
          model: DEFAULT_GEMINI_MODEL,
          contents,
          config: {
            systemInstruction: CSV_AUDITOR_SYSTEM_INSTRUCTION,
            temperature: DEFAULT_GENERATION_CONFIG.temperature,
            topP: DEFAULT_GENERATION_CONFIG.topP,
            maxOutputTokens: DEFAULT_GENERATION_CONFIG.maxOutputTokens
          }
        });

        answerText = (response.text || '').trim();
      }

      // 6. Fallback if Gemini returned empty text or key not configured
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

      // 7. Structured Logging
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
      'difference between mean and median'
    ];

    if (generalKeywords.some(kw => text.includes(kw))) {
      return true;
    }

    if (
      (text.startsWith('what is ') || text.startsWith('explain ') || text.startsWith('define ')) &&
      !text.includes('this dataset') &&
      !text.includes('this file') &&
      !text.includes('my data') &&
      !text.includes('in column') &&
      !text.includes('remediation')
    ) {
      // If none of the words match dataset column terms or row terms
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
    conversationHistory?: any[];
  }): string {
    const {
      userPrompt,
      isGeneralQuery,
      datasetFile,
      datasetProfile,
      routePlan,
      executionResults,
      recommendationContext,
      pageContext
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

    if (!datasetFile || !datasetProfile) {
      p += `DATASET STATUS: No active dataset loaded in workspace.\n`;
      p += `INSTRUCTION: If the user asks about dataset facts, inform them that no CSV is currently active, and provide general advice on what to upload.\n`;
      return p;
    }

    // Include factual summary of dataset
    p += `DATASET METADATA (VERIFIED FACTS):\n`;
    p += `- File Name: "${datasetFile.name}"\n`;
    p += `- Total Rows: ${datasetProfile.rowCount.toLocaleString()}\n`;
    p += `- Total Columns: ${datasetProfile.columnCount} [${datasetProfile.headers.join(', ')}]\n`;
    p += `- Data Quality Score: ${datasetProfile.qualityScore}/100\n`;
    p += `- Duplicate Rows: ${datasetProfile.duplicateRowCount.toLocaleString()} (${datasetProfile.duplicateRowPercentage}%)\n`;
    p += `- Total Missing Cells: ${datasetProfile.totalMissingCells.toLocaleString()} (${datasetProfile.overallMissingPercentage}%)\n\n`;

    // Active recommendation context if viewing recommendations
    if (recommendationContext && recommendationContext.title) {
      p += `ACTIVE RECOMMENDATION CONTEXT:\n`;
      p += `- Title: "${recommendationContext.title}"\n`;
      p += `- Issue Category: ${recommendationContext.issueCategory || 'General'}\n`;
      if (recommendationContext.columnName) p += `- Target Column: "${recommendationContext.columnName}"\n`;
      if (recommendationContext.affectedCount !== undefined) p += `- Affected Records: ${recommendationContext.affectedCount.toLocaleString()}\n`;
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
    p += `3. Maintain a professional, objective tone without emojis.`;

    return p;
  }

  /**
   * Offline / Fallback generator if Gemini is temporarily unavailable
   */
  private generateOfflineFallbackAnswer(params: any): string {
    const { userPrompt, isGeneralQuery, datasetProfile, routePlan, executionResults } = params;

    if (isGeneralQuery) {
      return `### General Data Engineering Guidance\n\nFor conceptual questions regarding data modeling, normalization, or anomaly detection, standard database and statistical principles apply. Data normalization is the systematic structuring of database tables to minimize redundancy and dependency (e.g. 1NF, 2NF, 3NF).`;
    }

    if (!datasetProfile) {
      return `No active CSV dataset is currently selected. Please upload or open a dataset from the Upload Center to inspect row counts, data quality findings, and anomalies.`;
    }

    if (routePlan?.intent === 'remediation' && executionResults?.remediationEvidence) {
      const rem = executionResults.remediationEvidence;
      return `### Direct Answer\n${rem.recommendedAction}\n\n### Why (Rationale & Domain Context)\n${rem.rationale}\n\n### Implementation Steps\n\`\`\`python\n${rem.implementationStrategies?.pythonCodeSnippet || '# Imputation script'}\n\`\`\`\n\n### Validation\n${rem.validationCheck}`;
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

    return `The dataset **"${datasetProfile.fileName}"** contains **${datasetProfile.rowCount.toLocaleString()} rows** and **${datasetProfile.columnCount} columns** with an overall data quality score of **${datasetProfile.qualityScore}/100**.`;
  }

  /**
   * Helper to extract previous routing plan from history
   */
  private extractPreviousPlanFromHistory(history?: any[]): AnalysisRoutePlan | undefined {
    if (!Array.isArray(history) || history.length === 0) return undefined;
    // Inspect last user prompt
    const lastUserTurn = [...history].reverse().find(h => h.role === 'user');
    if (!lastUserTurn) return undefined;
    return undefined;
  }
}

export const csvAuditorAIService = CSVAuditorAIService.getInstance();
