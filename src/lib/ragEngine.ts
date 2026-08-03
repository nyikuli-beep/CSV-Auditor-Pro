import { GoogleGenAI } from '@google/genai';
import { detectUserIntent, AIIntentCategory, IntentAnalysisResult } from './intentDetectionEngine';
import { executeToolByName, ToolResult } from './aiToolRegistry';
import { buildStructuredCSVContext, StructuredCSVContext } from './csvContextEngine';

export interface KnowledgeChunk {
  id: string;
  sourceFile: string;
  title: string;
  category: string;
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
  Validate structured AI responses
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
  In-Memory Caching for repeated requests
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
  Detailed Server-Side Logging
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
  Format Structured Response to readable text for presentation
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
 * Model Selection helper:
 * - gemini-2.5-pro for complex reasoning (thinkingMode, image input, architect/analyst persona, complex audits)
 * - gemini-2.5-flash for fast conversational responses
 */
export function selectGeminiModel(options: { thinkingMode?: boolean; image?: any; persona?: string; model?: string }): string {
  if (options.thinkingMode || options.image || options.persona === 'architect' || options.persona === 'analyst') {
    return 'gemini-2.5-pro';
  }
  return 'gemini-2.5-flash';
}

export interface RagRequestOptions {
  prompt: string;
  history?: Array<{ role: string; content: string }>;
  datasetContext?: DatasetContext | null;
  userContext?: UserContext | null;
  model?: string;
  persona?: string;
  thinkingMode?: boolean;
  image?: { data: string; mimeType: string } | null;
}

export interface RagResponse {
  text: string;
  intent: string;
  plainLanguageMode: boolean;
  citations: Array<{ type: 'doc' | 'dataset' | 'memory' | 'product'; label: string }>;
  retrievedDocs: string[];
}

// Full knowledge base documents compiled into structured chunks for RAG search
export const KNOWLEDGE_BASE_CHUNKS: KnowledgeChunk[] = [
  // about.md
  {
    id: 'about-overview',
    sourceFile: 'about.md',
    title: 'CSV Auditor Pro Overview & Mission',
    category: 'Product Knowledge',
    content: 'CSV Auditor Pro is an enterprise-grade spreadsheet compliance, data cleaning, and dataset audit platform. It provides automated anomaly detection, schema validation, real-time data transformation, and team collaboration for CSV, TSV, and Excel files. Its mission is to eliminate corrupted spreadsheets, duplicate records, and dirty data before database migration.',
    keywords: ['about', 'what is', 'csv auditor pro', 'overview', 'mission', 'app', 'product', 'platform', 'spreadsheet']
  },
  {
    id: 'how-app-operates',
    sourceFile: 'about.md',
    title: 'How the Application Operates (System Operation & Workflow)',
    category: 'Product Knowledge',
    content: 'CSV Auditor Pro operates through an automated 5-step data quality pipeline: 1. Ingestion & Local Browser Parsing: Upload CSV, TSV, or XLSX files up to 50MB. File data is parsed in browser memory so private data stays secure. 2. Automated Audit Engine: The engine checks 15+ data health rules (duplicate rows, missing/blank values, invalid ISO dates, text casing errors, and numerical outliers >3 SDs) and calculates a 0-100 Quality Score. 3. Interactive Cleaning Center: Clean dataset issues with 1-click routines (deduplication, mean/median/mode value imputation, trim/casing, date normalization). 4. Schema Validation & Drift Detection: Verify dataset headers against team schemas and generate PostgreSQL DDLs. 5. AI Assistant & Compliance Reporting: Ask questions to the Gemini-powered AI Auditor Assistant, annotate spreadsheet cells, and export cleaned files or PDF compliance reports via Gmail.',
    keywords: ['operate', 'operates', 'operation', 'how the application operates', 'how it operates', 'how the app operates', 'how does it work', 'workflow', 'architecture', 'pipeline']
  },
  {
    id: 'about-architecture',
    sourceFile: 'about.md',
    title: 'Architecture & Privacy',
    category: 'Product Knowledge',
    content: 'Client-side processing keeps spreadsheet data in browser memory. AI reasoning uses Google Gemini (gemini-2.5-flash and gemini-2.5-pro) via secure backend API routes. Persistence uses Firebase Firestore and Cloud SQL / Drizzle ORM.',
    keywords: ['architecture', 'privacy', 'security', 'client-side', 'gemini', 'firestore', 'backend', 'how it works', 'operates']
  },

  // features.md
  {
    id: 'features-list',
    sourceFile: 'features.md',
    title: 'CSV Auditor Pro Complete Feature List',
    category: 'Features',
    content: 'Features include: 1. CSV/TSV/XLSX Upload up to 50MB with instant parsing. 2. Automated Audit Engine giving a 0-100 Quality Score. 3. Cleaning Center for deduplication, missing value imputation, text trim/casing, ISO date formatting, and numeric formatting. 4. Schema Manager and Drift Detection. 5. Conversational Auditor AI Assistant with RAG. 6. Cell Annotation Board for row/column team comments. 7. Team Collaboration with RBAC (Owner, Admin, Editor, Viewer). 8. Compliance Reports with PDF export & Gmail dispatch. 9. Regex Builder. 10. Pre-configured CSV Templates.',
    keywords: ['features', 'capabilities', 'what can it do', 'tools', 'cleaning', 'audit', 'deduplication', 'templates', 'schema', 'annotations']
  },

  // faq.md
  {
    id: 'faq-general',
    sourceFile: 'faq.md',
    title: 'Frequently Asked Questions',
    category: 'FAQ',
    content: 'Q: What is CSV Auditor Pro? A: An intelligent spreadsheet audit and cleaning platform. Q: Is dataset saved on public servers? A: No, parsing and cleaning occur locally in your browser. Q: How do I clean duplicate rows? A: Go to Cleaning Center -> Deduplication tab -> click Apply Deduplication. Q: Can I share reports? A: Yes, export as PDF, XLSX, or send via Gmail.',
    keywords: ['faq', 'questions', 'how to', 'share', 'saving', 'data privacy', 'help']
  },

  // security.md
  {
    id: 'security-governance',
    sourceFile: 'security.md',
    title: 'Security, Privacy & RBAC Permissions',
    category: 'Security',
    content: 'Security principles: No AI model training on customer spreadsheets. Local browser processing. Role-Based Access Control (Owner: full admin/keys; Admin: full audit/cleaning; Editor: upload/clean/export; Viewer: read-only). Encrypted TLS 1.3 transmission with Firebase Auth Bearer tokens. Google Workspace OAuth integration.',
    keywords: ['security', 'privacy', 'permissions', 'roles', 'rbac', 'owner', 'admin', 'editor', 'viewer', 'auth', 'token', 'keys']
  },

  // pricing.md
  {
    id: 'pricing-tiers',
    sourceFile: 'pricing.md',
    title: 'Account Tiers & Pricing',
    category: 'Pricing',
    content: 'Free Starter ($0/mo): Up to 10k rows/file, standard cleaning, 50 AI questions/day. Pro ($29/mo): Up to 250k rows/file, advanced anomaly scoring, unlimited Gemini AI questions, up to 10 team members, Gmail dispatch. Enterprise (Custom): Multi-million rows, dedicated Cloud SQL sync, custom compliance rules, SAML SSO.',
    keywords: ['pricing', 'plans', 'cost', 'free', 'pro', 'enterprise', 'limits', 'subscription', 'tiers']
  },

  // csv-cleaning.md
  {
    id: 'csv-cleaning-routines',
    sourceFile: 'csv-cleaning.md',
    title: 'Data Cleaning Routines',
    category: 'CSV Cleaning',
    content: 'Cleaning Center routines: 1. Deduplication (Exact match or Key-column match like transaction_id). 2. Missing Value Imputation (Fill with custom string like "N/A", or statistical Mean/Median/Mode). 3. Text Normalization (Trim whitespace, Case converter UPPER/lower/Title). 4. ISO Date Standardization (YYYY-MM-DD). 5. Numeric & Currency formatting (strip $, commas, fix decimals).',
    keywords: ['clean', 'cleaning', 'deduplication', 'imputation', 'blank cells', 'trim', 'casing', 'uppercase', 'date format', 'currency', 'fix']
  },

  // schema-validation.md
  {
    id: 'schema-validation-rules',
    sourceFile: 'schema-validation.md',
    title: 'Schema Validation & Drift Detection',
    category: 'Schema Validation',
    content: 'Schema Manager enforces column rules (String, Number, Date, Email, Regex), NOT NULL required constraints, and uniqueness. Schema Drift Detection alerts when uploaded files miss required headers, add unexpected columns, or alter data types. Generates PostgreSQL CREATE TABLE DDLs.',
    keywords: ['schema', 'validation', 'drift', 'schema drift', 'rules', 'columns', 'types', 'required', 'ddl', 'create table']
  },

  // duplicates.md
  {
    id: 'duplicates-detection',
    sourceFile: 'duplicates.md',
    title: 'Duplicate Row Detection & Resolution',
    category: 'Duplicates',
    content: 'Duplicates distort analytics and violate SQL primary keys. Modes: Full-row match or Key-column match (e.g. transaction_id). Resolution: Retain first occurrence, retain latest, or flag in Audit Results for manual team review.',
    keywords: ['duplicate', 'duplicates', 'dedupe', 'deduplication', 'double rows', 'primary key', 'unique']
  },

  // missing-values.md
  {
    id: 'missing-values-handling',
    sourceFile: 'missing-values.md',
    title: 'Missing Values & Blank Cell Imputation',
    category: 'Missing Values',
    content: 'Blank cells break NOT NULL constraints and skew calculations. Detection catches empty strings, spaces, "N/A", "null", "NaN". Fixing: Fill with default string, Mean (for normal numbers), Median (for skewed numbers), Mode (for categories), or purge incomplete rows.',
    keywords: ['missing', 'blank', 'null', 'empty', 'impute', 'mean', 'median', 'mode', 'fill']
  },

  // audit-engine.md
  {
    id: 'audit-engine-score',
    sourceFile: 'audit-engine.md',
    title: 'Automated Audit Score (0-100) & Taxonomy',
    category: 'Audit Engine',
    content: 'Calculates a 0-100 Quality Score: 90-100 (Green/Excellent), 70-89 (Yellow/Moderate Risk), 0-69 (Red/High Risk). Evaluates duplicates, missing values, malformed dates, invalid casing, and numerical outliers exceeding 3 standard deviations.',
    keywords: ['score', 'audit score', 'quality', 'audit engine', 'anomalies', 'outliers', 'health', 'issues']
  },

  // reports.md
  {
    id: 'reports-export',
    sourceFile: 'reports.md',
    title: 'Compliance Reports & Gmail Dispatch',
    category: 'Reports',
    content: 'Export options: Cleaned CSV/TSV download, multi-tab XLSX workbook, executive PDF report with charts, and direct HTML email dispatch via Google Gmail API or Compliance Gateway.',
    keywords: ['report', 'reports', 'pdf', 'excel', 'export', 'gmail', 'email', 'send report', 'dispatch']
  },

  // collaboration.md
  {
    id: 'collaboration-team',
    sourceFile: 'collaboration.md',
    title: 'Team Collaboration & Workspace Roles',
    category: 'Collaboration',
    content: 'Supports Owner, Admin, Editor, and Viewer roles. Tracks all file uploads, cleaning operations, schema edits, and email dispatches in immutable Audit Activity Logs.',
    keywords: ['team', 'collaboration', 'workspace', 'members', 'activity log', 'history', 'invite']
  },

  // cell-annotations.md
  {
    id: 'cell-annotations-board',
    sourceFile: 'cell-annotations.md',
    title: 'Cell Annotations & Row Comments',
    category: 'Cell Annotations',
    content: 'Cell Annotation Board allows tagging specific row indexes and column headers with Info, Warning, or Critical Error flags, tracking Open/Resolved status across team members.',
    keywords: ['annotation', 'annotations', 'comments', 'notes', 'flags', 'cell annotation board', 'row comment']
  },

  // authentication.md
  {
    id: 'authentication-methods',
    sourceFile: 'authentication.md',
    title: 'Authentication & Identity Integration',
    category: 'Authentication',
    content: 'Firebase Auth integration with Google OAuth sign-in and Email/Password. Issues JWT Bearer tokens for API authorization. Optional secondary OAuth popup flow for Gmail sending permissions.',
    keywords: ['authentication', 'auth', 'login', 'google login', 'firebase', 'password', 'oauth']
  },

  // limitations.md
  {
    id: 'limitations-specs',
    sourceFile: 'limitations.md',
    title: 'System Limits & Performance Specifications',
    category: 'Limitations',
    content: 'Upload limits: 50MB per file, up to 250k rows for interactive in-browser cleaning. Supports UTF-8, UTF-16, ISO-8859-1. Uses chunked context window optimization for AI queries.',
    keywords: ['limits', 'limitations', 'file size', 'max rows', 'row limit', 'performance', 'encodings']
  },

  // roadmap.md
  {
    id: 'roadmap-future',
    sourceFile: 'roadmap.md',
    title: 'Product Roadmap & Future Capabilities',
    category: 'Roadmap',
    content: 'Planned enhancements: Cron background scheduled audits, continuous PostgreSQL Cloud SQL replication, AI synthetic CSV data synthesizer, and sandboxed custom Python/JS scripts in the Cleaning Center.',
    keywords: ['roadmap', 'future', 'planned', 'upcoming', 'features coming soon', 'updates']
  }
];

/**
 * Legacy Intent detection helper for user prompts
 */
export function detectLegacyUserIntent(prompt: string): { intent: string; plainLanguageMode: boolean } {
  const p = prompt.toLowerCase().trim();

  const isPlainLanguage = 
    p.includes('explain simply') ||
    p.includes('explain like i') ||
    p.includes('layman') ||
    p.includes('easy explanation') ||
    p.includes('for beginners') ||
    p.includes('simple terms') ||
    p.includes('in simple words');

  if (p.includes('what is this app') || p.includes('what is csv auditor') || p.includes('tell me about this app') || p.includes('what does this app do') || p.includes('overview')) {
    return { intent: 'product_explanation', plainLanguageMode: isPlainLanguage };
  }

  if (p.includes('how does this work') || p.includes('how to use') || p.includes('workflow') || p.includes('what happens after i upload') || p.includes('operates') || p.includes('how the application operates') || p.includes('how the app operates') || p.includes('how it operates') || p.includes('operation') || p.includes('how does the app work') || p.includes('how does the application work')) {
    return { intent: 'workflow_explanation', plainLanguageMode: isPlainLanguage };
  }

  if (p.includes('clean') || p.includes('deduplicate') || p.includes('fix missing') || p.includes('autofix') || p.includes('impute')) {
    return { intent: 'cleaning_execution', plainLanguageMode: isPlainLanguage };
  }

  if (p.includes('report') || p.includes('export') || p.includes('pdf') || p.includes('gmail') || p.includes('email')) {
    return { intent: 'report_generation', plainLanguageMode: isPlainLanguage };
  }

  if (p.includes('schema') || p.includes('drift') || p.includes('validation') || p.includes('ddl') || p.includes('create table')) {
    return { intent: 'schema_explanation', plainLanguageMode: isPlainLanguage };
  }

  if (p.includes('why did validation fail') || p.includes('why was this flagged') || p.includes('debug') || p.includes('error')) {
    return { intent: 'debugging', plainLanguageMode: isPlainLanguage };
  }

  if (p.includes('dataset') || p.includes('active file') || p.includes('how many rows') || p.includes('duplicates count') || p.includes('columns')) {
    return { intent: 'dataset_query', plainLanguageMode: isPlainLanguage };
  }

  if (isPlainLanguage) {
    return { intent: 'layman_explanation', plainLanguageMode: true };
  }

  return { intent: 'general_assistant', plainLanguageMode: false };
}

/**
 * Keyword and semantic similarity scoring to retrieve top knowledge base chunks
 */
export function retrieveKnowledgeChunks(prompt: string, limit: number = 4): KnowledgeChunk[] {
  const pWords = prompt.toLowerCase().split(/\W+/).filter(w => w.length > 2);

  const scored = KNOWLEDGE_BASE_CHUNKS.map(chunk => {
    let score = 0;
    
    // Keyword matching
    chunk.keywords.forEach(kw => {
      if (prompt.toLowerCase().includes(kw.toLowerCase())) {
        score += 3;
      }
    });

    // Content word matching
    const chunkText = `${chunk.title} ${chunk.content}`.toLowerCase();
    pWords.forEach(word => {
      if (chunkText.includes(word)) {
        score += 1;
      }
    });

    return { chunk, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Return top matches with positive score, or top 2 default if none matched strongly
  const filtered = scored.filter(s => s.score > 0).map(s => s.chunk);
  if (filtered.length > 0) {
    return filtered.slice(0, limit);
  }

  return [KNOWLEDGE_BASE_CHUNKS[0], KNOWLEDGE_BASE_CHUNKS[1]];
}

/**
 * Formulate System Prompt and Dynamic Context for Gemini AI Call
 */
export function buildDynamicRAGPrompt(
  options: RagRequestOptions,
  relevantDocs: KnowledgeChunk[]
): {
  systemInstruction: string;
  fullPrompt: string;
  citations: Array<{ type: 'doc' | 'dataset' | 'memory' | 'product'; label: string }>;
  intentAnalysis: IntentAnalysisResult;
  executedToolsResults: ToolResult[];
} {
  const { prompt, datasetContext, userContext, history = [], persona = 'auditor' } = options;
  const hasActiveDataset = Boolean(datasetContext && datasetContext.fileName);
  const activeHeaders = datasetContext?.headers || [];

  const intentAnalysis = detectUserIntent(prompt, hasActiveDataset, activeHeaders);

  const citations: Array<{ type: 'doc' | 'dataset' | 'memory' | 'product'; label: string }> = [
    { type: 'product', label: 'Product Knowledge' }
  ];

  // System Prompt Customization by Intent Category
  let systemInstruction = '';

  if (intentAnalysis.category === 'GENERAL_AI') {
    systemInstruction =
      `You are an expert General AI Assistant and CSV Auditor Pro guide. You provide clear, accurate, and comprehensive answers to everyday questions across programming, math, science, database architecture, business, and general knowledge.\n` +
      `Since the user query is general, answer directly without forcing CSV dataset context if not relevant.\n` +
      `Always maintain high clarity, professional tone, and precise formatting using Markdown headers and lists.`;
  } else if (intentAnalysis.category === 'CSV_ANALYSIS') {
    systemInstruction =
      `You are a Senior CSV Data Auditor and Analytics Expert for CSV Auditor Pro.\n` +
      `Your task is to analyze, explain, clean, validate, and summarize the uploaded dataset.\n` +
      `Be accurate, reference exact headers and metrics, and NEVER invent fake data or raw rows that do not exist.\n` +
      `Provide actionable cleaning routines and clear statistical insights.`;
  } else if (intentAnalysis.category === 'MIXED_REQUEST') {
    systemInstruction =
      `You are a Senior AI Systems Architect and Data Scientist for CSV Auditor Pro.\n` +
      `The user has asked a hybrid question that combines CSV dataset analysis with general AI/programming concepts.\n` +
      `Address both parts thoroughly: answer the CSV dataset questions using exact metrics, and provide general explanations or code snippets where applicable.`;
  } else {
    systemInstruction =
      `You are the official AI assistant for CSV Auditor Pro. Provide polite, helpful, and grounded assistance.`;
  }

  if (persona === 'architect') {
    systemInstruction += `\nRole Persona: PostgreSQL Database Architect. Focus on relational schemas, SQL DDLs, and database normalization.`;
  } else if (persona === 'analyst') {
    systemInstruction += `\nRole Persona: Business Intelligence Analyst. Focus on dataset trends, executive summaries, and business growth.`;
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
        }
      } catch (err) {
        console.warn(`Failed to auto-execute tool "${toolName}":`, err);
      }
    });
  }

  // Construct Document Context
  let docsSection = '### KNOWLEDGE BASE DOCUMENTATION:\n';
  relevantDocs.forEach(doc => {
    docsSection += `- **[${doc.sourceFile} - ${doc.title}]**: ${doc.content}\n`;
    citations.push({ type: 'doc', label: `Doc: ${doc.sourceFile}` });
  });

  // Construct Dataset Context
  let datasetSection = '### CURRENT ACTIVE DATASET SESSION:\n';
  if (datasetContext && datasetContext.fileName) {
    citations.push({ type: 'dataset', label: `Dataset: ${datasetContext.fileName}` });
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
  let userSection = '### CURRENT USER & WORKSPACE CONTEXT:\n';
  if (userContext) {
    userSection += `
- Authenticated User: ${userContext.name || 'User'} (${userContext.email || 'authenticated-user@workspace'})
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
    citations.push({ type: 'memory', label: 'Conversation Memory' });
    historySection = '### PREVIOUS CONVERSATION HISTORY:\n';
    history.slice(-6).forEach(msg => {
      historySection += `${msg.role.toUpperCase()}: ${msg.content}\n`;
    });
  }

  const fullPrompt = `
${docsSection}

${datasetSection}

${toolResultsSection}

${userSection}

${historySection}

### USER QUESTION / COMMAND:
"${prompt}"

Please generate a grounded, accurate, and helpful response based on the above knowledge base, intent analysis, dataset context, tool results, user workspace, and conversation memory.
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
 * Streaming Grounded RAG Handler using Gemini generateContentStream or Grounded Fallback
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

  // Retrieve top relevant knowledge docs
  const relevantDocs = retrieveKnowledgeChunks(prompt, 4);
  const { systemInstruction, fullPrompt, citations, intentAnalysis, executedToolsResults } = buildDynamicRAGPrompt(options, relevantDocs);
  const docNames = relevantDocs.map(d => d.sourceFile);

  // Send metadata upfront
  onMeta({
    requestId,
    model: selectedModel,
    citations,
    intent: intentAnalysis.category,
    plainLanguageMode: false,
    retrievedDocs: docNames,
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

  // Attempt API Call with 1x Automatic Retry
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

        const responseStream = await ai.models.generateContentStream({
          model: selectedModel,
          contents: contentsPayload,
          config: {
            systemInstruction,
            temperature: 0.3,
            responseMimeType: 'application/json',
            responseSchema: STRUCTURED_RESPONSE_SCHEMA
          }
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
          // If markdown-wrapped
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

  // Grounded Local Fallback Synthesis (User-friendly message, zero raw API errors)
  logAIEngineEvent({
    requestId,
    model: selectedModel,
    latencyMs: Date.now() - startTime,
    validationStatus: 'FALLBACK',
    cacheStatus: 'MISS'
  });

  const docSummary = relevantDocs.map(d => `**${d.title}**: ${d.content}`).join('\n\n');
  let fallbackAnswer = '';

  if (intentAnalysis.category === 'CSV_ANALYSIS' && options.datasetContext?.fileName) {
    const ds = options.datasetContext;
    fallbackAnswer = `Here is the current audit breakdown for **${ds.fileName}**:\n- **Quality Score**: ${ds.score ?? 100}/100\n- **Total Rows**: ${ds.rowCount}\n- **Duplicates Found**: ${ds.duplicatesCount ?? 0}\n- **Blank/Missing Cells**: ${ds.missingValuesCount ?? 0}\n- **Applied Cleanings**: ${ds.cleaningOperationsPerformed?.length ? ds.cleaningOperationsPerformed.join(', ') : 'None yet'}\n\nYou can run automated cleaning routines directly in the **Cleaning Center** tab!`;
  } else if (intentAnalysis.category === 'GENERAL_AI') {
    fallbackAnswer = `I am here to assist with general questions, programming, database queries, and data science concepts! How else can I help you today?`;
  } else {
    fallbackAnswer = `Based on CSV Auditor Pro product documentation and your workspace context:\n\n${docSummary}`;
  }

  const fallbackStructured: StructuredAIResponse = {
    answer: fallbackAnswer,
    summary: 'CSV Auditor Pro audit insight retrieved from grounded knowledge base.',
    keyTakeaways: [
      'Grounded in local product documentation and session state.',
      'Data parsing and audit rules executed locally in browser.'
    ],
    recommendedAction: 'Navigate to the Cleaning Center or run an automated dataset scan.',
    confidenceScore: 0.9
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
 * Main Grounded RAG Handler using Gemini API or Grounded Local Fallback
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

  const relevantDocs = retrieveKnowledgeChunks(prompt, 4);
  const { systemInstruction, fullPrompt, citations } = buildDynamicRAGPrompt(options, relevantDocs);
  const docNames = relevantDocs.map(d => d.sourceFile);

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
      retrievedDocs: docNames
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

        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: contentsPayload,
          config: {
            systemInstruction,
            temperature: 0.3,
            responseMimeType: 'application/json',
            responseSchema: STRUCTURED_RESPONSE_SCHEMA
          }
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
            retrievedDocs: docNames
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

  const docSummary = relevantDocs.map(d => `**${d.title}**: ${d.content}`).join('\n\n');
  let fallbackAnswer = `Based on CSV Auditor Pro product documentation and your workspace context:\n\n${docSummary}`;

  if (intent === 'CSV_ANALYSIS') {
    fallbackAnswer = `CSV Auditor Pro is an enterprise spreadsheet audit and data compliance platform providing automated anomaly detection, real-time data cleaning, schema validation, and team collaboration.`;
  }

  const fallbackStructured: StructuredAIResponse = {
    answer: fallbackAnswer,
    summary: 'CSV Auditor Pro audit insight retrieved from grounded knowledge base.',
    keyTakeaways: [
      'Grounded in local product documentation and session state.',
      'Data parsing and audit rules executed locally in browser.'
    ],
    recommendedAction: 'Navigate to the Cleaning Center or run an automated dataset scan.',
    confidenceScore: 0.9
  };

  return {
    text: formatStructuredResponseMarkdown(fallbackStructured),
    intent,
    plainLanguageMode,
    citations,
    retrievedDocs: docNames
  };
}
