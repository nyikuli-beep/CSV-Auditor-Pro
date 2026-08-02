import { GoogleGenAI } from '@google/genai';

export interface KnowledgeChunk {
  id: string;
  sourceFile: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
}

export interface DatasetContext {
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
    id: 'about-architecture',
    sourceFile: 'about.md',
    title: 'Architecture & Privacy',
    category: 'Product Knowledge',
    content: 'Client-side processing keeps spreadsheet data in browser memory. AI reasoning uses Google Gemini (gemini-3.6-flash and gemini-3.1-pro-preview) via secure backend API routes. Persistence uses Firebase Firestore and Cloud SQL / Drizzle ORM.',
    keywords: ['architecture', 'privacy', 'security', 'client-side', 'gemini', 'firestore', 'backend', 'how it works']
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
 * Intent detection algorithm for user prompts
 */
export function detectUserIntent(prompt: string): { intent: string; plainLanguageMode: boolean } {
  const p = prompt.toLowerCase().trim();

  const isPlainLanguage = 
    p.includes('explain simply') ||
    p.includes('explain like i') ||
    p.includes('layman') ||
    p.includes('easy explanation') ||
    p.includes('for beginners') ||
    p.includes('simple terms') ||
    p.includes('in simple words');

  if (p.includes('what is this app') || p.includes('what is csv auditor') || p.includes('tell me about this app') || p.includes('what does this app do')) {
    return { intent: 'product_explanation', plainLanguageMode: isPlainLanguage };
  }

  if (p.includes('how does this work') || p.includes('how to use') || p.includes('workflow') || p.includes('what happens after i upload')) {
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
): { systemInstruction: string; fullPrompt: string; citations: Array<{ type: 'doc' | 'dataset' | 'memory' | 'product'; label: string }> } {
  const { prompt, datasetContext, userContext, history = [], persona = 'auditor' } = options;
  const { intent, plainLanguageMode } = detectUserIntent(prompt);

  const citations: Array<{ type: 'doc' | 'dataset' | 'memory' | 'product'; label: string }> = [
    { type: 'product', label: '⚙️ Product Knowledge' }
  ];

  // Base System Prompt as specified in guidelines
  let systemInstruction = 
    `You are the official AI assistant for CSV Auditor Pro. You understand every feature of the application.\n` +
    `Always answer using information from the knowledge base first. If the user asks about CSV Auditor Pro, explain using product documentation.\n` +
    `If information cannot be found, politely say that the feature is unavailable. Never invent functionality.\n` +
    `When the user requests simple language, explain as if talking to someone with no technical background. Use friendly, concise, accurate language.\n` +
    `Never mention unrelated technical fallbacks or PostgreSQL migration errors unless explicitly asked.`;

  if (persona === 'architect') {
    systemInstruction += `\nRole Persona: PostgreSQL Database Architect. Focus on relational schemas, SQL DDLs, and database normalization.`;
  } else if (persona === 'analyst') {
    systemInstruction += `\nRole Persona: Business Intelligence Analyst. Focus on dataset trends, executive summaries, and business growth.`;
  }

  if (plainLanguageMode) {
    systemInstruction += `\nCRITICAL: The user requested a simple explanation. Explain concepts in plain, easy-to-understand layman's terms without technical jargon.`;
  }

  // Construct Document Context
  let docsSection = '### KNOWLEDGE BASE DOCUMENTATION:\n';
  relevantDocs.forEach(doc => {
    docsSection += `- **[${doc.sourceFile} - ${doc.title}]**: ${doc.content}\n`;
    citations.push({ type: 'doc', label: `📄 Doc: ${doc.sourceFile}` });
  });

  // Construct Dataset Context
  let datasetSection = '### CURRENT ACTIVE DATASET SESSION:\n';
  if (datasetContext && datasetContext.fileName) {
    citations.push({ type: 'dataset', label: `📊 Dataset: ${datasetContext.fileName}` });
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
    citations.push({ type: 'memory', label: '💬 Conversation Memory' });
    historySection = '### PREVIOUS CONVERSATION HISTORY:\n';
    history.slice(-6).forEach(msg => {
      historySection += `${msg.role.toUpperCase()}: ${msg.content}\n`;
    });
  }

  const fullPrompt = `
${docsSection}

${datasetSection}

${userSection}

${historySection}

### USER QUESTION / COMMAND:
"${prompt}"

Please generate a grounded, accurate, and helpful response based on the above knowledge base, dataset context, user workspace, and conversation memory.
`;

  return {
    systemInstruction,
    fullPrompt,
    citations
  };
}

/**
 * Streaming Grounded RAG Handler using Gemini generateContentStream or Grounded Fallback
 */
export async function generateRAGResponseStream(
  ai: GoogleGenAI | null,
  options: RagRequestOptions,
  onMeta: (meta: { citations: any[]; intent: string; plainLanguageMode: boolean; retrievedDocs: string[] }) => void,
  onChunk: (textChunk: string) => void
): Promise<void> {
  const { prompt, model = 'gemini-3.6-flash', thinkingMode, image } = options;
  const { intent, plainLanguageMode } = detectUserIntent(prompt);

  // Retrieve top relevant knowledge docs
  const relevantDocs = retrieveKnowledgeChunks(prompt, 4);

  // Build prompt and citations
  const { systemInstruction, fullPrompt, citations } = buildDynamicRAGPrompt(options, relevantDocs);
  const docNames = relevantDocs.map(d => d.sourceFile);

  // Send metadata upfront
  onMeta({
    citations,
    intent,
    plainLanguageMode,
    retrievedDocs: docNames
  });

  // Select appropriate Gemini model
  let selectedModel = model;
  if (image || thinkingMode) {
    selectedModel = 'gemini-3.1-pro-preview';
  } else if (!selectedModel || selectedModel === 'gemini-2.5-flash' || selectedModel === 'gemini-2.0-flash') {
    selectedModel = 'gemini-3.6-flash';
  }

  if (ai) {
    try {
      let contentsPayload: any = fullPrompt;

      if (image && image.data) {
        contentsPayload = {
          parts: [
            { inlineData: { mimeType: image.mimeType || 'image/png', data: image.data } },
            { text: fullPrompt }
          ]
        };
      }

      const responseStream = await ai.models.generateContentStream({
        model: selectedModel,
        contents: contentsPayload,
        config: {
          systemInstruction,
          temperature: plainLanguageMode ? 0.3 : 0.4
        }
      });

      let streamedAny = false;
      for await (const chunk of responseStream) {
        if (chunk.text) {
          streamedAny = true;
          onChunk(chunk.text);
        }
      }

      if (streamedAny) {
        return;
      }
    } catch (err: any) {
      console.warn('Gemini RAG Streaming API call error, using grounded local fallback:', err.message);
    }
  }

  // Grounded Local Fallback Synthesis (Guaranteed Zero Generic / Error Responses)
  const docSummary = relevantDocs.map(d => `**${d.title}**: ${d.content}`).join('\n\n');
  let fallbackText = '';

  if (intent === 'product_explanation') {
    fallbackText = plainLanguageMode
      ? `CSV Auditor Pro is an easy-to-use tool that checks your spreadsheets for mistakes, duplicate rows, or missing information before you upload them into a database. It works right inside your browser so your data stays safe!`
      : `CSV Auditor Pro is an enterprise spreadsheet audit and data compliance platform. It provides automated anomaly detection, real-time data cleaning (deduplication, missing value imputation, ISO date formatting), schema validation, and team collaboration.`;
  } else if (intent === 'dataset_query' && options.datasetContext?.fileName) {
    const ds = options.datasetContext;
    fallbackText = `Here is the current audit breakdown for **${ds.fileName}**:
- **Quality Score**: ${ds.score ?? 100}/100
- **Total Rows**: ${ds.rowCount}
- **Duplicates Found**: ${ds.duplicatesCount ?? 0}
- **Blank/Missing Cells**: ${ds.missingValuesCount ?? 0}
- **Applied Cleanings**: ${ds.cleaningOperationsPerformed?.length ? ds.cleaningOperationsPerformed.join(', ') : 'None yet'}

You can run automated cleaning routines directly in the **Cleaning Center** tab!`;
  } else if (plainLanguageMode) {
    fallbackText = `Here is a simple explanation:\n${docSummary}\n\nIf you have an active spreadsheet loaded, you can ask me to help check for blank cells or duplicate rows!`;
  } else {
    fallbackText = `Based on CSV Auditor Pro product documentation and your current workspace context:\n\n${docSummary}`;
  }

  // Stream fallback text in smooth chunks
  const words = fallbackText.split(' ');
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
  const { prompt, model = 'gemini-3.6-flash', thinkingMode, image } = options;
  const { intent, plainLanguageMode } = detectUserIntent(prompt);

  // Retrieve top relevant knowledge docs
  const relevantDocs = retrieveKnowledgeChunks(prompt, 4);

  // Build prompt and citations
  const { systemInstruction, fullPrompt, citations } = buildDynamicRAGPrompt(options, relevantDocs);

  const docNames = relevantDocs.map(d => d.sourceFile);

  // Select appropriate Gemini model as per skill rules
  let selectedModel = model;
  if (image || thinkingMode) {
    selectedModel = 'gemini-3.1-pro-preview';
  } else if (!selectedModel || selectedModel === 'gemini-2.5-flash' || selectedModel === 'gemini-2.0-flash') {
    selectedModel = 'gemini-3.6-flash';
  }

  if (ai) {
    try {
      let contentsPayload: any = fullPrompt;

      if (image && image.data) {
        contentsPayload = {
          parts: [
            { inlineData: { mimeType: image.mimeType || 'image/png', data: image.data } },
            { text: fullPrompt }
          ]
        };
      }

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: contentsPayload,
        config: {
          systemInstruction,
          temperature: plainLanguageMode ? 0.3 : 0.4
        }
      });

      const responseText = response.text || '';
      if (responseText.trim()) {
        return {
          text: responseText,
          intent,
          plainLanguageMode,
          citations,
          retrievedDocs: docNames
        };
      }
    } catch (err: any) {
      console.warn('Gemini RAG API call error, using grounded local fallback:', err.message);
    }
  }

  // Grounded Local Fallback Synthesis (Guaranteed Zero Generic / Error Responses)
  const docSummary = relevantDocs.map(d => `**${d.title}**: ${d.content}`).join('\n\n');
  let fallbackText = '';

  if (intent === 'product_explanation') {
    fallbackText = plainLanguageMode
      ? `CSV Auditor Pro is an easy-to-use tool that checks your spreadsheets for mistakes, duplicate rows, or missing information before you upload them into a database. It works right inside your browser so your data stays safe!`
      : `CSV Auditor Pro is an enterprise spreadsheet audit and data compliance platform. It provides automated anomaly detection, real-time data cleaning (deduplication, missing value imputation, ISO date formatting), schema validation, and team collaboration.`;
  } else if (intent === 'dataset_query' && options.datasetContext?.fileName) {
    const ds = options.datasetContext;
    fallbackText = `Here is the current audit breakdown for **${ds.fileName}**:
- **Quality Score**: ${ds.score ?? 100}/100
- **Total Rows**: ${ds.rowCount}
- **Duplicates Found**: ${ds.duplicatesCount ?? 0}
- **Blank/Missing Cells**: ${ds.missingValuesCount ?? 0}
- **Applied Cleanings**: ${ds.cleaningOperationsPerformed?.length ? ds.cleaningOperationsPerformed.join(', ') : 'None yet'}

You can run automated cleaning routines directly in the **Cleaning Center** tab!`;
  } else if (plainLanguageMode) {
    fallbackText = `Here is a simple explanation:\n${docSummary}\n\nIf you have an active spreadsheet loaded, you can ask me to help check for blank cells or duplicate rows!`;
  } else {
    fallbackText = `Based on CSV Auditor Pro product documentation and your current workspace context:\n\n${docSummary}`;
  }

  return {
    text: fallbackText,
    intent,
    plainLanguageMode,
    citations,
    retrievedDocs: docNames
  };
}
