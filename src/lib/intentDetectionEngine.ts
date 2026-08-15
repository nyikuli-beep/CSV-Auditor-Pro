/**
 * CSV Auditor Pro - Intelligent Intent Detection Engine
 * Classifies user queries before tool or service execution.
 * Enforces strict routing:
 *   - Conversation (Greetings, pleasantries) -> Direct Gemini API (No dataset tools)
 *   - General AI (General knowledge, coding, help, platform guidance) -> Direct Gemini API (No dataset tools)
 *   - CSV Operations (Analysis, cleaning, BI brief, compliance, statistics) -> CSV Engine Tools + Gemini Explanation
 */

export type ExecutionPath = 'CONVERSATION' | 'GENERAL_AI' | 'CSV_OPERATIONS';

export type AIIntentCategory = 
  | 'GREETING'
  | 'GENERAL_CONVERSATION'
  | 'GENERAL_KNOWLEDGE'
  | 'CSV_ANALYSIS'
  | 'DATA_CLEANING'
  | 'EXECUTIVE_BI_BRIEF'
  | 'COMPLIANCE'
  | 'DASHBOARD_QUESTIONS'
  | 'HELP'
  | 'ENTERPRISE_PLATFORM_GUIDANCE'
  | 'CONVERSATIONAL_GREETING' // backwards compatibility
  | 'APP_EXPLANATION'         // backwards compatibility
  | 'MIXED_REQUEST'           // backwards compatibility
  | 'UNKNOWN';

export type FineGrainedIntentCategory =
  | 'GREETING'
  | 'GENERAL_CONVERSATION'
  | 'GENERAL_KNOWLEDGE'
  | 'CSV_ANALYSIS'
  | 'DATA_CLEANING'
  | 'EXECUTIVE_BI_BRIEF'
  | 'COMPLIANCE'
  | 'DASHBOARD_QUESTIONS'
  | 'HELP'
  | 'ENTERPRISE_PLATFORM_GUIDANCE'
  | 'GREETING_SMALLTALK'
  | 'SECURITY_PRIVACY'
  | 'CSV_AUDITING'
  | 'SCHEMA_ANALYSIS'
  | 'AI_ANALYSIS'
  | 'FILE_RETENTION'
  | 'AUTHENTICATION'
  | 'TEAM_COLLABORATION'
  | 'EMAIL'
  | 'PAYMENTS'
  | 'SUBSCRIPTIONS'
  | 'ACCOUNT_SETTINGS'
  | 'GENERAL_PRODUCT_INFORMATION'
  | 'GENERAL_AI'
  | 'UNKNOWN';

export interface IntentAnalysisResult {
  category: AIIntentCategory;
  fineCategory: FineGrainedIntentCategory;
  executionPath: ExecutionPath;
  confidenceScore: number;
  reasoning: string;
  suggestedTools: string[];
  requiresDatasetAnalysis: boolean;
  hasActiveDataset: boolean;
  isGreeting?: boolean;
  isNonTechnical?: boolean;
}

const GREETING_PATTERNS = [
  /^hi\b/i,
  /^hello\b/i,
  /^hey\b/i,
  /^howdy\b/i,
  /^greetings\b/i,
  /^good morning\b/i,
  /^good afternoon\b/i,
  /^good evening\b/i,
  /^good day\b/i,
  /^thanks\b/i,
  /^thank you\b/i,
  /^thx\b/i,
  /^appreciate it\b/i,
  /^how are you\b/i,
  /^how's it going\b/i,
  /^hows it going\b/i,
  /^what's up\b/i,
  /^who are you\b/i,
  /^what are you\b/i,
  /^nice to meet you\b/i,
  /^bye\b/i,
  /^goodbye\b/i,
  /^cheers\b/i
];

const CSV_EXPLICIT_KEYWORDS = [
  'dataset', 'this file', 'this csv', 'uploaded data', 'uploaded file',
  'my data', 'my csv', 'my dataset', 'these rows', 'the columns',
  'clean this', 'audit this', 'deduplicate', 'dedupe', 'impute',
  'outlier detection', 'anomaly detection', 'z-score in', 'mean of',
  'average of', 'calculate stats for', 'pii scan', 'health score',
  'quality score of file', 'generate bi report', 'executive brief for this'
];

/**
 * Checks if prompt is a casual conversational greeting, pleasantry, or smalltalk
 */
export function isConversationalGreeting(prompt: string): boolean {
  const p = prompt.trim().toLowerCase().replace(/[!.,?]+$/, '');
  if (!p) return false;

  // Single word checks
  const singleWordGreetings = ['hi', 'hello', 'hey', 'howdy', 'greetings', 'thanks', 'thankyou', 'thx', 'cheers', 'bye', 'goodbye'];
  if (singleWordGreetings.includes(p)) return true;

  // Exact phrase checks
  const shortPhrases = [
    'how are you', 'how are you doing', 'how is it going', 'hows it going',
    'good morning', 'good afternoon', 'good evening', 'good day',
    'thank you', 'thanks a lot', 'thanks so much', 'thank you very much',
    'who are you', 'what are you', 'what can you do', 'nice to meet you',
    'what is your name', 'tell me who you are', 'what is your role',
    'can you help me', 'are you there', 'hello there', 'hi there'
  ];
  if (shortPhrases.includes(p)) return true;

  // Regex pattern check (with word limit guard)
  if (GREETING_PATTERNS.some(pat => pat.test(p)) && p.split(/\s+/).length <= 7) {
    const hasExplicitCsvRequest = CSV_EXPLICIT_KEYWORDS.some(kw => p.includes(kw));
    return !hasExplicitCsvRequest;
  }

  return false;
}

/**
 * Classifies fine-grained knowledge category
 */
export function classifyDetailedIntent(
  prompt: string,
  hintCategory?: string
): { fineCategory: FineGrainedIntentCategory; confidence: number; matchedKeywords: string[] } {
  const p = prompt.trim().toLowerCase();

  // 1. GREETING & GENERAL CONVERSATION (Highest Priority Pre-filter)
  if (isConversationalGreeting(prompt)) {
    const greetingWords = ['hi', 'hello', 'hey', 'howdy', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    if (greetingWords.some(gw => p.startsWith(gw))) {
      return { fineCategory: 'GREETING', confidence: 0.99, matchedKeywords: ['greeting'] };
    }
    return { fineCategory: 'GENERAL_CONVERSATION', confidence: 0.99, matchedKeywords: ['conversation_smalltalk'] };
  }

  // 2. DATA CLEANING & REMEDIATION
  const cleaningKw = [
    'clean data', 'cleaning plan', 'how to clean', 'clean this', 'deduplicate', 'dedupe',
    'duplicate row', 'remove duplicates', 'missing value', 'imputation', 'impute', 'blank cell',
    'trim whitespace', 'text casing', 'date formatting', 'iso date', 'autofix', 'normalize values',
    'provide fix', 'provide a fix', 'provide fixes', 'give fix', 'how to fix', 'fix issues',
    'fix errors', 'fix anomalies', 'fix this', 'fix it', 'fix data', 'fix missing', 'fix duplicates',
    'fix outliers', 'fix formatting', 'fix', 'remediate', 'remediation', 'remediation plan',
    'resolve issues', 'resolve errors', 'resolve anomalies', 'repair data', 'correct data',
    'cleaning script', 'python fix', 'sql fix', 'excel fix', 'suggest fix', 'suggest fixes',
    'how can i fix', 'how do i fix', 'what should i fix', 'fix all', 'solve issues', 'solution'
  ];
  if (cleaningKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'DATA_CLEANING', confidence: 0.95, matchedKeywords: cleaningKw.filter(kw => p.includes(kw)) };
  }

  // 3. EXECUTIVE BI BRIEF
  const biKw = [
    'executive bi brief', 'executive brief', 'bi report', 'board summary', 'business intelligence',
    'executive summary of dataset', 'stakeholder report', 'kpi summary', 'c-suite brief'
  ];
  if (biKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'EXECUTIVE_BI_BRIEF', confidence: 0.96, matchedKeywords: biKw.filter(kw => p.includes(kw)) };
  }

  // 4. COMPLIANCE & SECURITY
  const compKw = [
    'compliance', 'gdpr', 'soc2', 'hipaa', 'pii', 'privacy', 'formula injection',
    'security audit', 'data retention', 'zero retention', 'confidentiality', 'encrypt', 'audit trail'
  ];
  if (compKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'COMPLIANCE', confidence: 0.94, matchedKeywords: compKw.filter(kw => p.includes(kw)) };
  }

  // 5. DASHBOARD QUESTIONS
  const dashKw = [
    'dashboard', 'quality score', 'health score', 'score calculation', 'chart on dashboard',
    'metric card', 'what does the score mean', 'how is the score computed', 'issue counter'
  ];
  if (dashKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'DASHBOARD_QUESTIONS', confidence: 0.93, matchedKeywords: dashKw.filter(kw => p.includes(kw)) };
  }

  // 6. ENTERPRISE PLATFORM GUIDANCE
  const platformKw = [
    'team tenancy', 'workspace', 'rbac', 'invite member', 'sso', 'tenant', 'enterprise plan',
    'pro plan', 'pricing', 'subscription', 'upgrade plan', 'billing', 'api key setting'
  ];
  if (platformKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'ENTERPRISE_PLATFORM_GUIDANCE', confidence: 0.93, matchedKeywords: platformKw.filter(kw => p.includes(kw)) };
  }

  // 7. HELP & TUTORIALS
  const helpKw = [
    'help me', 'how to use', 'get started', 'what does csv auditor pro do', 'how does this app work',
    'guide', 'tutorial', 'documentation', 'non technical guide', 'simple terms', 'layman terms'
  ];
  if (helpKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'HELP', confidence: 0.94, matchedKeywords: helpKw.filter(kw => p.includes(kw)) };
  }

  // 8. CSV ANALYSIS (Explicit dataset queries)
  const csvKw = [
    'analyze dataset', 'audit file', 'outlier', 'anomalies', 'z-score', 'statistical distribution',
    'correlation', 'null rate', 'column profile', 'inspect rows', 'mean', 'median', 'stddev'
  ];
  if (csvKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'CSV_ANALYSIS', confidence: 0.92, matchedKeywords: csvKw.filter(kw => p.includes(kw)) };
  }

  return { fineCategory: 'GENERAL_KNOWLEDGE', confidence: 0.85, matchedKeywords: [] };
}

/**
 * Intelligent Intent Router: Evaluates prompt and determines exact Execution Path
 */
export function detectUserIntent(
  prompt: string,
  hasActiveDataset: boolean = false,
  activeHeaders: string[] = [],
  hintCategory?: string
): IntentAnalysisResult {
  const p = prompt.trim().toLowerCase();

  if (!p || p.length < 2) {
    return {
      category: 'UNKNOWN',
      fineCategory: 'UNKNOWN',
      executionPath: 'CONVERSATION',
      confidenceScore: 0.3,
      reasoning: 'Prompt is too short or empty.',
      suggestedTools: [],
      requiresDatasetAnalysis: false,
      hasActiveDataset
    };
  }

  // 1. CONVERSATION PATH (Greetings, Pleasantries, Smalltalk)
  // CRITICAL: NEVER executes dataset analysis, even if an active dataset is in memory!
  if (isConversationalGreeting(prompt)) {
    const greetingWords = ['hi', 'hello', 'hey', 'howdy', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    const isGreeting = greetingWords.some(gw => p.startsWith(gw));
    const category: AIIntentCategory = isGreeting ? 'GREETING' : 'GENERAL_CONVERSATION';
    const fineCategory: FineGrainedIntentCategory = isGreeting ? 'GREETING' : 'GENERAL_CONVERSATION';

    return {
      category,
      fineCategory,
      executionPath: 'CONVERSATION',
      confidenceScore: 0.99,
      reasoning: 'User message is a greeting or conversational pleasantry. Routing directly to Gemini API without dataset analysis.',
      suggestedTools: [],
      requiresDatasetAnalysis: false,
      hasActiveDataset,
      isGreeting: true
    };
  }

  const { fineCategory } = classifyDetailedIntent(prompt, hintCategory);

  // 2. HELP & ONBOARDING (General AI Path)
  if (fineCategory === 'HELP') {
    const isNonTech = p.includes('non technical') || p.includes('non-technical') || p.includes('layman') || p.includes('simple terms');
    return {
      category: 'HELP',
      fineCategory: 'HELP',
      executionPath: 'GENERAL_AI',
      confidenceScore: 0.96,
      reasoning: 'User requested platform help, onboarding explanation, or product overview.',
      suggestedTools: [],
      requiresDatasetAnalysis: false,
      hasActiveDataset,
      isNonTechnical: isNonTech
    };
  }

  // 3. ENTERPRISE PLATFORM GUIDANCE & BILLING (General AI Path)
  if (fineCategory === 'ENTERPRISE_PLATFORM_GUIDANCE') {
    return {
      category: 'ENTERPRISE_PLATFORM_GUIDANCE',
      fineCategory: 'ENTERPRISE_PLATFORM_GUIDANCE',
      executionPath: 'GENERAL_AI',
      confidenceScore: 0.95,
      reasoning: 'User query pertains to team workspaces, role-based access, security policies, or subscription plans.',
      suggestedTools: [],
      requiresDatasetAnalysis: false,
      hasActiveDataset
    };
  }

  // 4. DASHBOARD QUESTIONS (General AI Path)
  if (fineCategory === 'DASHBOARD_QUESTIONS') {
    return {
      category: 'DASHBOARD_QUESTIONS',
      fineCategory: 'DASHBOARD_QUESTIONS',
      executionPath: 'GENERAL_AI',
      confidenceScore: 0.94,
      reasoning: 'User asked about dashboard UI cards, quality score calculation formulas, or chart interpretations.',
      suggestedTools: [],
      requiresDatasetAnalysis: false,
      hasActiveDataset
    };
  }

  // 5. CSV OPERATIONS (Explicit dataset analysis requested by user)
  // Determine if prompt explicitly asks about active dataset or references specific headers
  const mentionsActiveColumn = activeHeaders.length > 0 && activeHeaders.some(h => {
    const cleanH = h.toLowerCase().trim();
    return cleanH.length > 2 && p.includes(cleanH);
  });

  const hasExplicitAnalysisPhrase = 
    p.includes('this file') || p.includes('this dataset') || p.includes('uploaded file') ||
    p.includes('my dataset') || p.includes('my data') || p.includes('these rows') ||
    p.includes('the columns') || p.includes('in the dataset') || p.includes('in this csv') ||
    p.includes('audit report') || p.includes('executive brief') || p.includes('bi brief') ||
    p.includes('clean this') || p.includes('deduplicate') || p.includes('remove duplicates') ||
    p.includes('find outliers') || p.includes('anomaly scan') || p.includes('calculate statistics') ||
    p.includes('average of') || p.includes('mean of') || p.includes('pii scan') || p.includes('check gdpr') ||
    p.includes('provide fix') || p.includes('provide a fix') || p.includes('fix') || p.includes('remediate') ||
    p.includes('remediation') || p.includes('how to fix') || p.includes('what is wrong') || p.includes('show errors') ||
    p.includes('show issues') || p.includes('audit') || p.includes('clean') || p.includes('score') ||
    p.includes('missing') || p.includes('duplicate') || p.includes('outlier') || p.includes('quality');

  const isExplicitCSVOperation = hasActiveDataset && (
    mentionsActiveColumn ||
    hasExplicitAnalysisPhrase ||
    fineCategory === 'DATA_CLEANING' ||
    fineCategory === 'EXECUTIVE_BI_BRIEF' ||
    fineCategory === 'CSV_AUDITING' ||
    (fineCategory === 'COMPLIANCE' && (p.includes('file') || p.includes('data') || p.includes('scan') || p.includes('dataset'))) ||
    fineCategory === 'CSV_ANALYSIS'
  );

  if (isExplicitCSVOperation) {
    let category: AIIntentCategory = 'CSV_ANALYSIS';
    const suggestedTools: string[] = [];

    if (fineCategory === 'DATA_CLEANING' || p.includes('clean') || p.includes('fix') || p.includes('remediat') || p.includes('dedupe') || p.includes('duplicate') || p.includes('impute')) {
      category = 'DATA_CLEANING';
      suggestedTools.push('findDuplicates', 'findMissingValues', 'findInvalidCharacters', 'summarizeDataset');
    } else if (fineCategory === 'EXECUTIVE_BI_BRIEF' || p.includes('executive brief') || p.includes('bi report') || p.includes('board summary')) {
      category = 'EXECUTIVE_BI_BRIEF';
      suggestedTools.push('summarizeDataset', 'calculateStatistics', 'detectOutliers');
    } else if (fineCategory === 'COMPLIANCE' || p.includes('pii') || p.includes('formula') || p.includes('security scan')) {
      category = 'COMPLIANCE';
      suggestedTools.push('findInvalidCharacters', 'detectPII');
    } else {
      category = 'CSV_ANALYSIS';
      if (p.includes('duplicate') || p.includes('fix')) suggestedTools.push('findDuplicates');
      if (p.includes('outlier') || p.includes('anomaly') || p.includes('z-score')) suggestedTools.push('detectOutliers');
      if (p.includes('stat') || p.includes('mean') || p.includes('average') || p.includes('distribution')) suggestedTools.push('calculateStatistics');
      if (suggestedTools.length === 0) suggestedTools.push('summarizeDataset', 'findMissingValues', 'findDuplicates');
    }

    return {
      category,
      fineCategory: fineCategory === 'GENERAL_KNOWLEDGE' ? 'CSV_ANALYSIS' : fineCategory,
      executionPath: 'CSV_OPERATIONS',
      confidenceScore: 0.96,
      reasoning: `User explicitly requested CSV dataset operations (${category}) on active file. Executing deterministic CSV tools and synthesizing with Gemini.`,
      suggestedTools,
      requiresDatasetAnalysis: true,
      hasActiveDataset: true
    };
  }

  // 6. GENERAL KNOWLEDGE / GENERAL CODING / EXTERNAL AI (General AI Path)
  // Queries about Python, SQL, general math, statistics definitions, science, etc.
  return {
    category: 'GENERAL_KNOWLEDGE',
    fineCategory: 'GENERAL_KNOWLEDGE',
    executionPath: 'GENERAL_AI',
    confidenceScore: 0.92,
    reasoning: 'Query is general knowledge, programming, mathematics, or external subject matter. Routing directly to Gemini API without dataset tools.',
    suggestedTools: [],
    requiresDatasetAnalysis: false,
    hasActiveDataset
  };
}
