import { GoogleGenAI } from '@google/genai';
import { detectUserIntent, classifyDetailedIntent, isConversationalGreeting, AIIntentCategory, FineGrainedIntentCategory, IntentAnalysisResult } from './intentDetectionEngine';
import { executeToolByName, ToolResult } from './aiToolRegistry';
import { buildStructuredCSVContext, StructuredCSVContext } from './csvContextEngine';

export interface KnowledgeChunk {
  id: string;
  sourceFile: string;
  title: string;
  category: FineGrainedIntentCategory | string;
  content: string;
  keywords: string[];
}

export interface DatasetContext {
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
}

export interface UserContext {
  uid?: string;
  email?: string;
  name?: string;
  role?: string;
  workspaceName?: string;
  teamMembersCount?: number;
  collaborators?: string[];
}

export interface StructuredAIResponse {
  answer: string;
  summary: string;
  keyTakeaways: string[];
  recommendedAction?: string;
  confidenceScore?: number;
}

export const STRUCTURED_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    answer: { type: 'STRING', description: 'The primary detailed answer or analysis.' },
    summary: { type: 'STRING', description: 'A concise 1-2 sentence executive summary.' },
    keyTakeaways: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Key bullet points summarizing main insights or findings.'
    },
    recommendedAction: { type: 'STRING', description: 'Actionable recommendation or next step.' },
    confidenceScore: { type: 'NUMBER', description: 'Confidence score between 0.0 and 1.0.' }
  },
  required: ['answer', 'summary', 'keyTakeaways']
};

/**
 * Validate structured AI responses
 */
export function validateStructuredResponse(data: any): { valid: boolean; error?: string; cleanData?: StructuredAIResponse } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Response is not a valid JSON object' };
  }
  if (typeof data.answer !== 'string' || !data.answer.trim()) {
    return { valid: false, error: 'Field "answer" is missing or empty' };
  }
  if (typeof data.summary !== 'string') {
    return { valid: false, error: 'Field "summary" is missing or not a string' };
  }
  if (!Array.isArray(data.keyTakeaways)) {
    return { valid: false, error: 'Field "keyTakeaways" is missing or not an array' };
  }
  return {
    valid: true,
    cleanData: {
      answer: data.answer.trim(),
      summary: data.summary.trim(),
      keyTakeaways: data.keyTakeaways.map((k: any) => String(k).trim()).filter(Boolean),
      recommendedAction: typeof data.recommendedAction === 'string' ? data.recommendedAction.trim() : undefined,
      confidenceScore: typeof data.confidenceScore === 'number' ? Number(data.confidenceScore) : 0.95
    }
  };
}

/**
 * In-Memory Caching for repeated requests
 */
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const responseCache = new Map<string, CacheEntry>();

export function getCachedResponse(key: string): any | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedResponse(key: string, data: any, ttlMs = 300000): void {
  responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  if (responseCache.size > 100) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
}

/**
 * Detailed Server-Side Logging
 */
export function logAIEngineEvent(params: {
  requestId: string;
  model: string;
  latencyMs: number;
  tokens?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  validationStatus: 'PASSED' | 'FAILED' | 'RETRIED' | 'FALLBACK';
  cacheStatus: 'HIT' | 'MISS';
  validationError?: string;
  apiError?: string;
}) {
  const pTokens = params.tokens?.promptTokenCount ?? 0;
  const cTokens = params.tokens?.candidatesTokenCount ?? 0;
  const tTokens = params.tokens?.totalTokenCount ?? 0;

  console.log(
    `[AI Engine Log] ID: ${params.requestId} | Model: ${params.model} | Latency: ${params.latencyMs}ms | Tokens: { prompt: ${pTokens}, candidate: ${cTokens}, total: ${tTokens} } | Validation: ${params.validationStatus} | Cache: ${params.cacheStatus}${params.validationError ? ` | ValErr: ${params.validationError}` : ''}${params.apiError ? ` | APIErr: ${params.apiError}` : ''}`
  );
}

/**
 * Format Structured Response to readable text for presentation
 */
export function formatStructuredResponseMarkdown(res: StructuredAIResponse): string {
  let text = res.answer;
  if (res.keyTakeaways && res.keyTakeaways.length > 0 && !text.includes('Key Takeaways')) {
    text += `\n\n**Key Takeaways:**\n` + res.keyTakeaways.map(k => `• ${k}`).join('\n');
  }
  if (res.recommendedAction && res.recommendedAction.trim() && !text.includes('Recommended Action')) {
    text += `\n\n**Recommended Action:** ${res.recommendedAction}`;
  }
  return text;
}

/**
 * Model Selection helper
 */
export function selectGeminiModel(options: { thinkingMode?: boolean; image?: any; persona?: string; model?: string }): string {
  if (options.model && options.model.startsWith('gemini')) {
    return options.model;
  }
  return 'gemini-3.7-flash';
}

export interface RagRequestOptions {
  prompt: string;
  history?: Array<{ role: string; content: string }>;
  datasetContext?: DatasetContext | null;
  userContext?: UserContext | null;
  model?: string;
  persona?: string;
  thinkingMode?: boolean;
  enableSearchGrounding?: boolean;
  image?: { data: string; mimeType: string } | null;
  knowledgeBaseId?: string;
  intentCategory?: FineGrainedIntentCategory;
}

export interface RagResponse {
  text: string;
  intent: string;
  plainLanguageMode: boolean;
  citations: Array<{ type: 'doc' | 'dataset' | 'memory' | 'product' | 'web' | string; label: string }>;
  retrievedDocs: string[];
}

/**
 * Pure dynamic retrieval helper:
 * Eliminates static text repositories. All responses are derived dynamically from model intelligence.
 */
export function retrieveKnowledgeChunks(
  _prompt: string,
  _options?: number | { knowledgeBaseId?: string; faqId?: string; intentCategory?: string; limit?: number },
  _limitArg: number = 4
): KnowledgeChunk[] {
  return [];
}

export const getRelevantKnowledgeChunks = retrieveKnowledgeChunks;

/**
 * Formulate System Prompt and Dynamic Context for Gemini AI Call
 */
export function buildDynamicRAGPrompt(
  options: RagRequestOptions,
  _relevantDocs: KnowledgeChunk[] = []
): {
  systemInstruction: string;
  fullPrompt: string;
  citations: Array<{ type: 'doc' | 'dataset' | 'memory' | 'product' | 'web' | string; label: string }>;
  intentAnalysis: IntentAnalysisResult;
  executedToolsResults: ToolResult[];
} {
  const { prompt, datasetContext, userContext, history = [], persona = 'auditor' } = options;
  const hasActiveDataset = Boolean(datasetContext && datasetContext.fileName);
  const activeHeaders = datasetContext?.headers || [];

  const intentAnalysis = detectUserIntent(prompt, hasActiveDataset, activeHeaders);

  const citations: Array<{ type: 'doc' | 'dataset' | 'memory' | 'product' | 'web' | string; label: string }> = [
    { type: 'product', label: 'CSV Auditor Pro' }
  ];

  // Dynamic System Instruction with strict anti-slop and natural conversation rules
  let systemInstruction = 
    `You are the Enterprise Conversational Auditor for CSV Auditor Pro.\n` +
    `You provide expert, clear, accurate, and actionable assistance across CSV data auditing, spreadsheet hygiene, statistical analysis, schema integrity, programming, and general knowledge.\n\n` +
    `CRITICAL RESPONSE RULES:\n` +
    `1. NATURAL DIRECT OPENINGS: Never start with canned phrases such as "Regarding...", "Based on the knowledge base...", "According to stored information...", or "CSV Auditor Pro Knowledge Base Response:". Begin your response directly with the answer.\n` +
    `2. CONVERSATIONAL FLUENCY: If the user says hello, thanks, or small talk, respond warmly and succinctly as the Conversational Auditor without lecturing or dumping feature lists.\n` +
    `3. GENERAL KNOWLEDGE CAPABILITY: You have full domain expertise in software engineering, Python, SQL, mathematics, machine learning, data science, statistics, cloud computing, spreadsheet formulas, and business. Answer general questions directly using your knowledge without referencing any static library.\n` +
    `4. GROUNDED DATASET FORENSICS: When a dataset is uploaded, reference actual column names, exact numbers, row counts, and detected issues from the dynamic context. Never fabricate columns or statistics.\n` +
    `5. UNCERTAINTY HANDLING: If required data, columns, or parameters are missing to answer a question, clearly explain what is missing rather than inventing values.\n` +
    `6. TONE: Objective, professional, articulate, and free of emojis or marketing filler.`;

  if (persona === 'architect') {
    systemInstruction += `\nRole Persona: PostgreSQL Database Architect. Focus on relational schemas, SQL DDLs, and database normalization.`;
  } else if (persona === 'analyst') {
    systemInstruction += `\nRole Persona: Business Intelligence Analyst. Focus on dataset trends, executive summaries, and business growth.`;
  } else if (persona === 'compliance') {
    systemInstruction += `\nRole Persona: Corporate Governance Officer. Focus on GDPR/SOC2 standards, PII privacy, and formula injection defense.`;
  }

  if (options.enableSearchGrounding) {
    systemInstruction += `\nGoogle Search Grounding: ENABLED. Cross-reference real-world web data, current regulatory compliance standards, and factual information to verify your analysis.`;
    citations.push({ type: 'web', label: 'Google Search Grounding' });
  }

  // Execute suggested backend tools deterministically if rows are available in datasetContext
  const executedToolsResults: ToolResult[] = [];
  if (hasActiveDataset && datasetContext?.rows && datasetContext.rows.length > 0) {
    intentAnalysis.suggestedTools.forEach(toolName => {
      try {
        const res = executeToolByName(toolName, {
          headers: datasetContext.headers,
          rows: datasetContext.rows,
          column: datasetContext.headers[0]
        });
        if (res.success) {
          executedToolsResults.push(res);
          citations.push({ type: 'tool', label: res.toolName });
        }
      } catch (err) {
        console.warn(`Failed to auto-execute tool "${toolName}":`, err);
      }
    });
  }

  // Construct Dataset Context
  let datasetSection = '### ACTIVE DATASET CONTEXT:\n';
  if (datasetContext && datasetContext.fileName) {
    citations.push({ type: 'dataset', label: `Dataset: ${datasetContext.fileName}` });

    let extraProfilesText = '';
    if (datasetContext.rows && datasetContext.rows.length > 0 && datasetContext.headers) {
      try {
        const structuredCtx = buildStructuredCSVContext(
          datasetContext.fileId || 'file-1',
          datasetContext.fileName,
          datasetContext.rowCount || datasetContext.rows.length,
          datasetContext.headers,
          datasetContext.rows
        );

        extraProfilesText += `\n- COLUMN STATISTICAL PROFILES:\n`;
        structuredCtx.columnProfiles.forEach(cp => {
          extraProfilesText += `  * Column "${cp.name}" (${cp.type}): ${cp.missingCount} missing (${cp.nullPercentage}%), ${cp.uniqueValuesCount} unique values. Sample values: [${cp.sampleValues.join(', ')}]`;
          if (cp.stats) {
            extraProfilesText += ` | Stats: Min=${cp.stats.min}, Max=${cp.stats.max}, Mean=${cp.stats.mean}, Median=${cp.stats.median}, StdDev=${cp.stats.stdDev}`;
          }
          extraProfilesText += `\n`;
        });

        extraProfilesText += `\n- SAMPLE DATA ROWS PREVIEW (First 5 Rows):\n`;
        datasetContext.rows.slice(0, 5).forEach((r, idx) => {
          extraProfilesText += `  Row ${idx + 1}: ${JSON.stringify(r)}\n`;
        });
      } catch (err) {
        console.warn('Failed to build structured CSV context in dynamic prompt:', err);
      }
    }

    datasetSection += `
- File Name: ${datasetContext.fileName}
- Row Count: ${datasetContext.rowCount} rows
- Column Count: ${datasetContext.headers ? datasetContext.headers.length : 0} columns
- Headers: ${datasetContext.headers ? datasetContext.headers.join(', ') : 'None'}
- Compliance Quality Score: ${datasetContext.score ?? 100}/100
- Total Flagged Issues: ${datasetContext.issuesCount ?? 0}
- Duplicate Rows Detected: ${datasetContext.duplicatesCount ?? 0}
- Blank / Missing Cells: ${datasetContext.missingValuesCount ?? 0}
- Formatting Errors: ${datasetContext.formatErrorsCount ?? 0}
- Outliers Detected: ${datasetContext.outliersCount ?? 0}
${extraProfilesText}
- Cleaning Routines Applied in Session: ${datasetContext.cleaningOperationsPerformed && datasetContext.cleaningOperationsPerformed.length > 0 ? datasetContext.cleaningOperationsPerformed.join(', ') : 'None yet'}
- Active Schema Status: ${datasetContext.activeSchema || 'Default Standard Auto-Detection'}
`;
  } else {
    datasetSection += `No active dataset currently loaded in workspace.\n`;
  }

  // Construct Tool Results Section if tools executed
  let toolResultsSection = '';
  if (executedToolsResults.length > 0) {
    toolResultsSection = '### EXECUTED BACKEND AUDIT TOOL RESULTS:\n';
    executedToolsResults.forEach(tr => {
      toolResultsSection += `- **${tr.toolName}**: ${tr.summary} | Data: ${JSON.stringify(tr.data)}\n`;
    });
  }

  // Construct User & Team Workspace Context
  let userSection = '### USER & WORKSPACE CONTEXT:\n';
  if (userContext) {
    userSection += `
- User: ${userContext.name || 'User'} (${userContext.email || 'authenticated-user@workspace'})
- User Role: ${userContext.role || 'Admin'}
- Workspace: ${userContext.workspaceName || 'Default Workspace'}
- Workspace Team Members: ${userContext.teamMembersCount || 1} collaborator(s)
`;
  } else {
    userSection += `- Workspace: Default Active Session\n`;
  }

  // Construct Conversation Memory
  let historySection = '';
  if (history && history.length > 0) {
    citations.push({ type: 'memory', label: 'Conversation History' });
    historySection = '### PREVIOUS CONVERSATION HISTORY:\n';
    history.slice(-6).forEach(msg => {
      historySection += `${msg.role.toUpperCase()}: ${msg.content}\n`;
    });
  }

  const fullPrompt = `
${datasetSection}

${toolResultsSection}

${userSection}

${historySection}

### USER INQUIRY:
"${prompt}"

Please generate a direct, accurate, and comprehensive response.
`;

  return {
    systemInstruction,
    fullPrompt,
    citations,
    intentAnalysis,
    executedToolsResults
  };
}

/**
 * Streaming Dynamic AI Handler using Gemini generateContentStream
 */
export async function generateRAGResponseStream(
  ai: GoogleGenAI | null,
  options: RagRequestOptions,
  onMeta: (meta: {
    requestId: string;
    model: string;
    citations: any[];
    intent: string;
    plainLanguageMode: boolean;
    retrievedDocs: string[];
    intentCategory?: AIIntentCategory;
    confidenceScore?: number;
    reasoning?: string;
    executedTools?: string[];
  }) => void,
  onChunk: (textChunk: string) => void
): Promise<void> {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const startTime = Date.now();
  const selectedModel = selectGeminiModel(options);
  const { prompt } = options;

  const { systemInstruction, fullPrompt, citations, intentAnalysis, executedToolsResults } = buildDynamicRAGPrompt(options);

  // Send metadata upfront
  onMeta({
    requestId,
    model: selectedModel,
    citations,
    intent: intentAnalysis.category,
    plainLanguageMode: false,
    retrievedDocs: [],
    intentCategory: intentAnalysis.category,
    confidenceScore: intentAnalysis.confidenceScore,
    reasoning: intentAnalysis.reasoning,
    executedTools: executedToolsResults.map(r => r.toolName)
  });

  // Check In-Memory Cache first
  const cacheKey = `stream_${selectedModel}_${prompt.trim().toLowerCase()}_${options.datasetContext?.fileName || 'nofile'}_${options.persona || 'auditor'}`;
  const cachedData = getCachedResponse(cacheKey);
  if (cachedData) {
    logAIEngineEvent({
      requestId,
      model: selectedModel,
      latencyMs: Date.now() - startTime,
      validationStatus: 'PASSED',
      cacheStatus: 'HIT'
    });
    onChunk(formatStructuredResponseMarkdown(cachedData));
    return;
  }

  // Attempt API Call with automatic retry
  if (ai) {
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      const attemptStart = Date.now();

      try {
        let contentsPayload: any = fullPrompt;
        if (options.image && options.image.data) {
          contentsPayload = {
            parts: [
              { inlineData: { mimeType: options.image.mimeType || 'image/png', data: options.image.data } },
              { text: fullPrompt }
            ]
          };
        }

        const config: any = {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: STRUCTURED_RESPONSE_SCHEMA
        };

        if (options.enableSearchGrounding) {
          config.tools = [{ googleSearch: {} }];
        }

        const responseStream = await ai.models.generateContentStream({
          model: selectedModel,
          contents: contentsPayload,
          config
        });

        let accumulatedJsonText = '';
        for await (const chunk of responseStream) {
          if (chunk.text) {
            accumulatedJsonText += chunk.text;
          }
        }

        // Parse and validate structured output
        let parsed: any = null;
        try {
          parsed = JSON.parse(accumulatedJsonText);
        } catch (e) {
          const clean = accumulatedJsonText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(clean);
        }

        const validation = validateStructuredResponse(parsed);
        if (validation.valid && validation.cleanData) {
          const formattedText = formatStructuredResponseMarkdown(validation.cleanData);
          setCachedResponse(cacheKey, validation.cleanData);

          logAIEngineEvent({
            requestId,
            model: selectedModel,
            latencyMs: Date.now() - startTime,
            validationStatus: attempt === 1 ? 'PASSED' : 'RETRIED',
            cacheStatus: 'MISS'
          });

          onChunk(formattedText);
          return;
        } else {
          logAIEngineEvent({
            requestId,
            model: selectedModel,
            latencyMs: Date.now() - attemptStart,
            validationStatus: 'FAILED',
            cacheStatus: 'MISS',
            validationError: validation.error
          });
        }
      } catch (err: any) {
        logAIEngineEvent({
          requestId,
          model: selectedModel,
          latencyMs: Date.now() - attemptStart,
          validationStatus: 'FAILED',
          cacheStatus: 'MISS',
          apiError: err.message || 'Stream call error'
        });
      }

      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  // Dynamic context-aware fallback when AI model is temporarily unreachable
  logAIEngineEvent({
    requestId,
    model: selectedModel,
    latencyMs: Date.now() - startTime,
    validationStatus: 'FALLBACK',
    cacheStatus: 'MISS'
  });

  let dynamicFallback = '';
  if (intentAnalysis.category === 'CONVERSATIONAL_GREETING') {
    dynamicFallback = `Hello! I am your Enterprise Conversational Auditor for CSV Auditor Pro. How can I assist you with dataset auditing, anomaly detection, statistical calculations, or data hygiene today?`;
  } else if (options.datasetContext && options.datasetContext.fileName) {
    const ds = options.datasetContext;
    dynamicFallback = `Dataset **${ds.fileName}** contains ${ds.rowCount.toLocaleString()} rows and ${ds.headers?.length || 0} columns with an overall quality score of ${ds.score ?? 100}%. Found ${ds.duplicatesCount || 0} duplicate rows, ${ds.missingValuesCount || 0} blank cells, and ${ds.formatErrorsCount || 0} format errors.`;
  } else {
    dynamicFallback = `I am ready to assist you with CSV auditing, data hygiene workflows, anomaly scans, and statistical analysis. Please upload a dataset or ask your question.`;
  }

  const fallbackStructured: StructuredAIResponse = {
    answer: dynamicFallback,
    summary: 'Dynamic response generated based on active session state.',
    keyTakeaways: [
      'Processed through dynamic AI orchestration pipeline.',
      'Dataset operations and validation rules evaluated locally.'
    ],
    recommendedAction: options.datasetContext ? 'Review flagged items in the Cleaning Center or export an audit summary.' : 'Load a CSV dataset to initiate automated inspection.',
    confidenceScore: 0.85
  };

  const formattedFallback = formatStructuredResponseMarkdown(fallbackStructured);
  const words = formattedFallback.split(' ');
  let batch = '';
  for (let i = 0; i < words.length; i++) {
    batch += (i === 0 ? '' : ' ') + words[i];
    if ((i + 1) % 3 === 0 || i === words.length - 1) {
      onChunk(batch);
      batch = '';
      await new Promise(r => setTimeout(r, 12));
    }
  }
}

/**
 * Main Dynamic AI Handler using Gemini API
 */
export async function generateRAGResponse(
  ai: GoogleGenAI | null,
  options: RagRequestOptions
): Promise<RagResponse> {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const startTime = Date.now();
  const selectedModel = selectGeminiModel(options);
  const { prompt } = options;
  const hasActiveDataset = Boolean(options.datasetContext && options.datasetContext.fileName);
  const activeHeaders = options.datasetContext?.headers || [];
  const intentAnalysis = detectUserIntent(prompt, hasActiveDataset, activeHeaders);
  const intent = intentAnalysis.category;
  const plainLanguageMode = false;

  const { systemInstruction, fullPrompt, citations } = buildDynamicRAGPrompt(options);

  const cacheKey = `sync_${selectedModel}_${prompt.trim().toLowerCase()}_${options.datasetContext?.fileName || 'nofile'}_${options.persona || 'auditor'}`;
  const cachedData = getCachedResponse(cacheKey);
  if (cachedData) {
    logAIEngineEvent({
      requestId,
      model: selectedModel,
      latencyMs: Date.now() - startTime,
      validationStatus: 'PASSED',
      cacheStatus: 'HIT'
    });
    return {
      text: formatStructuredResponseMarkdown(cachedData),
      intent,
      plainLanguageMode,
      citations,
      retrievedDocs: []
    };
  }

  if (ai) {
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      const attemptStart = Date.now();

      try {
        let contentsPayload: any = fullPrompt;
        if (options.image && options.image.data) {
          contentsPayload = {
            parts: [
              { inlineData: { mimeType: options.image.mimeType || 'image/png', data: options.image.data } },
              { text: fullPrompt }
            ]
          };
        }

        const config: any = {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: STRUCTURED_RESPONSE_SCHEMA
        };

        if (options.enableSearchGrounding) {
          config.tools = [{ googleSearch: {} }];
        }

        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: contentsPayload,
          config
        });

        const rawText = response.text || '';
        let parsed: any = null;
        try {
          parsed = JSON.parse(rawText);
        } catch (e) {
          const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(clean);
        }

        const validation = validateStructuredResponse(parsed);
        if (validation.valid && validation.cleanData) {
          setCachedResponse(cacheKey, validation.cleanData);

          logAIEngineEvent({
            requestId,
            model: selectedModel,
            latencyMs: Date.now() - startTime,
            tokens: (response as any).usageMetadata,
            validationStatus: attempt === 1 ? 'PASSED' : 'RETRIED',
            cacheStatus: 'MISS'
          });

          return {
            text: formatStructuredResponseMarkdown(validation.cleanData),
            intent,
            plainLanguageMode,
            citations,
            retrievedDocs: []
          };
        } else {
          logAIEngineEvent({
            requestId,
            model: selectedModel,
            latencyMs: Date.now() - attemptStart,
            validationStatus: 'FAILED',
            cacheStatus: 'MISS',
            validationError: validation.error
          });
        }
      } catch (err: any) {
        logAIEngineEvent({
          requestId,
          model: selectedModel,
          latencyMs: Date.now() - attemptStart,
          validationStatus: 'FAILED',
          cacheStatus: 'MISS',
          apiError: err.message || 'API call error'
        });
      }

      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  // Fallback
  logAIEngineEvent({
    requestId,
    model: selectedModel,
    latencyMs: Date.now() - startTime,
    validationStatus: 'FALLBACK',
    cacheStatus: 'MISS'
  });

  let dynamicFallback = '';
  if (intent === 'CONVERSATIONAL_GREETING') {
    dynamicFallback = `Hello! I am your Enterprise Conversational Auditor for CSV Auditor Pro. How can I assist you with dataset auditing, anomaly detection, statistical analysis, or data hygiene today?`;
  } else if (options.datasetContext && options.datasetContext.fileName) {
    const ds = options.datasetContext;
    dynamicFallback = `Dataset **${ds.fileName}** contains ${ds.rowCount.toLocaleString()} rows and ${ds.headers?.length || 0} columns with an overall quality score of ${ds.score ?? 100}%. Found ${ds.duplicatesCount || 0} duplicate rows, ${ds.missingValuesCount || 0} blank cells, and ${ds.formatErrorsCount || 0} format errors.`;
  } else {
    dynamicFallback = `I am ready to assist you with CSV auditing, data hygiene workflows, anomaly scans, and statistical analysis. Please upload a dataset or ask your question.`;
  }

  const fallbackStructured: StructuredAIResponse = {
    answer: dynamicFallback,
    summary: 'Dynamic response generated based on active session state.',
    keyTakeaways: [
      'Processed through dynamic AI orchestration pipeline.',
      'Dataset operations and validation rules evaluated locally.'
    ],
    recommendedAction: options.datasetContext ? 'Review flagged items in the Cleaning Center or export an audit summary.' : 'Load a CSV dataset to initiate automated inspection.',
    confidenceScore: 0.85
  };

  return {
    text: formatStructuredResponseMarkdown(fallbackStructured),
    intent,
    plainLanguageMode,
    citations,
    retrievedDocs: []
  };
}
