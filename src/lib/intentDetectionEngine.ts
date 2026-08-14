/**
 * CSV Auditor Pro - Intent Detection Engine
 * Accurately routes prompts into CSV_ANALYSIS, GENERAL_AI, MIXED_REQUEST, APP_EXPLANATION, or UNKNOWN,
 * and classifies fine-grained knowledge categories for strict RAG retrieval.
 */

export type AIIntentCategory = 'CSV_ANALYSIS' | 'GENERAL_AI' | 'MIXED_REQUEST' | 'APP_EXPLANATION' | 'CONVERSATIONAL_GREETING' | 'UNKNOWN';

export type FineGrainedIntentCategory =
  | 'GREETING_SMALLTALK'
  | 'SECURITY_PRIVACY'
  | 'DATA_CLEANING'
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
  confidenceScore: number;
  reasoning: string;
  suggestedTools: string[];
  hasActiveDataset: boolean;
  isNonTechnical?: boolean;
  isGreeting?: boolean;
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
  /^what's up\b/i,
  /^who are you\b/i,
  /^what are you\b/i,
  /^nice to meet you\b/i,
  /^bye\b/i,
  /^goodbye\b/i,
  /^cheers\b/i
];

/**
 * Checks if prompt is a casual conversational greeting, pleasantry, or acknowledgment
 */
export function isConversationalGreeting(prompt: string): boolean {
  const p = prompt.trim().toLowerCase().replace(/[!.,?]+$/, '');
  if (!p) return false;

  // Single word checks
  const singleWordGreetings = ['hi', 'hello', 'hey', 'howdy', 'greetings', 'thanks', 'thankyou', 'thx', 'cheers', 'bye', 'goodbye', 'help'];
  if (singleWordGreetings.includes(p)) return true;

  // Exact phrase checks
  const shortPhrases = [
    'how are you', 'how are you doing', 'how is it going', 'hows it going',
    'good morning', 'good afternoon', 'good evening', 'good day',
    'thank you', 'thanks a lot', 'thanks so much', 'thank you very much',
    'who are you', 'what are you', 'what can you do', 'nice to meet you',
    'what is your name', 'tell me who you are'
  ];
  if (shortPhrases.includes(p)) return true;

  // Regex pattern check
  if (GREETING_PATTERNS.some(pat => pat.test(p)) && p.split(/\s+/).length <= 6) {
    // Ensure no technical CSV or feature request words are embedded
    const hasTechnicalKeywords = CSV_KEYWORDS.some(kw => p.includes(kw));
    return !hasTechnicalKeywords;
  }

  return false;
}

const CSV_KEYWORDS = [
  'csv', 'dataset', 'file', 'data', 'column', 'columns', 'row', 'rows', 'header', 'headers',
  'duplicate', 'duplicates', 'outlier', 'outliers', 'anomaly', 'anomalies', 'null', 'missing',
  'clean', 'audit', 'validate', 'stats', 'statistics', 'mean', 'median', 'stddev', 'summary',
  'record', 'records', 'table', 'sheet', 'spreadsheet', 'excel', 'payout', 'email', 'phone',
  'pii', 'correlation', 'chart', 'trend', 'quality', 'score', 'schema', 'drift', 'dedupe',
  'autofix', 'trim', 'format', 'normalize', 'encoding'
];

const APP_EXPLANATION_KEYWORDS = [
  'how the application works', 'how the app works', 'how does the application work',
  'how does the app work', 'explain how the application works', 'explain how the app works',
  'non technical', 'non-technical', 'non technical stuff', 'non technical staff',
  'explain to non-technical', 'explain to non technical', 'layman', 'simple terms',
  'what is csv auditor pro', 'tell me about csv auditor pro', 'overview of the app',
  'how do i use csv auditor pro', 'what does this app do', 'how does it work',
  'explain csv auditor pro', 'for beginners', 'simple words'
];

const GENERAL_AI_KEYWORDS = [
  'what is', 'explain', 'how to', 'tell me about', 'python', 'sql', 'javascript', 'react',
  'capital of', 'definition', 'history', 'science', 'math', 'formula', 'write a', 'code for',
  'translate', 'essay', 'poem', 'recipe', 'game', 'news', 'weather', 'philosophy', 'quantum',
  'machine learning', 'database design', 'architect', 'postgre', 'cloud sql', 'firebase'
];

/**
 * Classifies fine-grained knowledge category for strict retrieval logic
 */
export function classifyDetailedIntent(
  prompt: string,
  hintCategory?: string
): { fineCategory: FineGrainedIntentCategory; confidence: number; matchedKeywords: string[] } {
  const p = prompt.trim().toLowerCase();

  const validFineCategories: FineGrainedIntentCategory[] = [
    'GREETING_SMALLTALK', 'SECURITY_PRIVACY', 'DATA_CLEANING', 'CSV_AUDITING', 'SCHEMA_ANALYSIS',
    'AI_ANALYSIS', 'FILE_RETENTION', 'AUTHENTICATION', 'TEAM_COLLABORATION',
    'EMAIL', 'PAYMENTS', 'SUBSCRIPTIONS', 'ACCOUNT_SETTINGS',
    'GENERAL_PRODUCT_INFORMATION', 'GENERAL_AI', 'UNKNOWN'
  ];

  if (hintCategory && validFineCategories.includes(hintCategory as FineGrainedIntentCategory)) {
    return {
      fineCategory: hintCategory as FineGrainedIntentCategory,
      confidence: 1.0,
      matchedKeywords: ['provided_hint']
    };
  }

  // 0. GREETINGS & SMALL TALK GUARD (Highest Pre-Filter Priority)
  if (isConversationalGreeting(prompt)) {
    return { fineCategory: 'GREETING_SMALLTALK', confidence: 0.99, matchedKeywords: ['greeting_pleasantry'] };
  }

  // 1. SECURITY_PRIVACY
  const privacyKw = ['privacy', 'protect', 'data privacy', 'ai model training', 'training', 'third-party', 'third party', 'gdpr', 'soc2', 'hipaa', 'encrypt', 'encryption', 'tls', 'security', 'confidential', 'zero retention'];
  if (privacyKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'SECURITY_PRIVACY', confidence: 0.96, matchedKeywords: privacyKw.filter(kw => p.includes(kw)) };
  }

  // 2. FILE_RETENTION
  const retentionKw = ['retention', 'retained', 'how long', 'retain', 'delete file', 'purge', 'storage limit', 'browser memory', 'expire', 'file duration', 'lifespan'];
  if (retentionKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'FILE_RETENTION', confidence: 0.95, matchedKeywords: retentionKw.filter(kw => p.includes(kw)) };
  }

  // 3. AUTHENTICATION
  const authKw = ['login', 'sign in', 'sso', 'jwt', 'auth', 'password', 'oauth', 'google sign in', 'credentials', 'bearer token'];
  if (authKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'AUTHENTICATION', confidence: 0.93, matchedKeywords: authKw.filter(kw => p.includes(kw)) };
  }

  // 4. PAYMENTS & SUBSCRIPTIONS
  const subKw = ['pricing', 'subscription', 'plan', 'plans', 'cost', 'tier', 'tiers', 'free plan', 'pro plan', 'enterprise plan', 'upgrade', 'downgrade', 'per month'];
  if (subKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'SUBSCRIPTIONS', confidence: 0.95, matchedKeywords: subKw.filter(kw => p.includes(kw)) };
  }

  const payKw = ['payment', 'invoice', 'receipt', 'paddle', 'charge', 'refund', 'credit card', 'billing'];
  if (payKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'PAYMENTS', confidence: 0.95, matchedKeywords: payKw.filter(kw => p.includes(kw)) };
  }

  // 5. TEAM_COLLABORATION
  const teamKw = ['team', 'workspace', 'collaborate', 'collaboration', 'rbac', 'owner', 'admin', 'editor', 'viewer', 'member', 'invite', 'cell annotation', 'comment'];
  if (teamKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'TEAM_COLLABORATION', confidence: 0.92, matchedKeywords: teamKw.filter(kw => p.includes(kw)) };
  }

  // 6. EMAIL
  const emailKw = ['email', 'gmail', 'dispatch', 'send report', 'notification', 'smtp', 'mail report'];
  if (emailKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'EMAIL', confidence: 0.92, matchedKeywords: emailKw.filter(kw => p.includes(kw)) };
  }

  // 7. ACCOUNT_SETTINGS
  const accountKw = ['account settings', 'profile', 'change password', 'timezone', 'theme', 'user profile'];
  if (accountKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'ACCOUNT_SETTINGS', confidence: 0.90, matchedKeywords: accountKw.filter(kw => p.includes(kw)) };
  }

  // 8. DATA_CLEANING
  const cleaningKw = ['duplicate', 'deduplicate', 'dedupe', 'missing value', 'imputation', 'impute', 'blank cell', 'trim whitespace', 'casing', 'uppercase', 'lowercase', 'date format', 'iso date', 'autofix', 'normalize', 'clean data'];
  if (cleaningKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'DATA_CLEANING', confidence: 0.94, matchedKeywords: cleaningKw.filter(kw => p.includes(kw)) };
  }

  // 9. SCHEMA_ANALYSIS
  const schemaKw = ['schema', 'drift', 'schema drift', 'column type', 'ddl', 'create table', 'header alignment', 'type mismatch', 'structural anomaly'];
  if (schemaKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'SCHEMA_ANALYSIS', confidence: 0.94, matchedKeywords: schemaKw.filter(kw => p.includes(kw)) };
  }

  // 10. CSV_AUDITING
  const auditKw = ['quality score', 'audit score', 'audit engine', 'anomaly detection', 'outlier', '3 sd', 'standard deviation', 'data health', 'violations', 'audit file'];
  if (auditKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'CSV_AUDITING', confidence: 0.92, matchedKeywords: auditKw.filter(kw => p.includes(kw)) };
  }

  // 11. GENERAL_PRODUCT_INFORMATION
  const productKw = ['how the application works', 'how the app works', 'what is csv auditor pro', 'tell me about csv auditor pro', 'overview of the app', 'non-technical', 'simple terms', 'layman', 'guide'];
  if (productKw.some(kw => p.includes(kw))) {
    return { fineCategory: 'GENERAL_PRODUCT_INFORMATION', confidence: 0.95, matchedKeywords: productKw.filter(kw => p.includes(kw)) };
  }

  return { fineCategory: 'GENERAL_AI', confidence: 0.70, matchedKeywords: [] };
}

/**
 * Classifies prompt intent using rule-based heuristics + semantic pattern matching
 */
export function detectUserIntent(
  prompt: string,
  hasActiveDataset: boolean = false,
  activeHeaders: string[] = [],
  hintCategory?: string
): IntentAnalysisResult {
  const p = prompt.trim().toLowerCase();

  const { fineCategory } = classifyDetailedIntent(prompt, hintCategory);

  if (!p || p.length < 2) {
    return {
      category: 'UNKNOWN',
      fineCategory: 'UNKNOWN',
      confidenceScore: 0.2,
      reasoning: 'Prompt is too short or ambiguous.',
      suggestedTools: [],
      hasActiveDataset
    };
  }

  // 1. Check for Conversational Greeting / Pleasantry (Bypasses RAG and tool calls)
  if (isConversationalGreeting(prompt) || fineCategory === 'GREETING_SMALLTALK') {
    return {
      category: 'CONVERSATIONAL_GREETING',
      fineCategory: 'GREETING_SMALLTALK',
      confidenceScore: 0.99,
      reasoning: 'User initiated a conversational greeting or pleasantry. Responding naturally without triggering document retrieval or audit tools.',
      suggestedTools: [],
      hasActiveDataset,
      isGreeting: true
    };
  }

  // Check for App Explanation / Non-technical inquiry
  const isAppExplanation = APP_EXPLANATION_KEYWORDS.some(kw => p.includes(kw));
  const isNonTechnical = p.includes('non technical') || p.includes('non-technical') || p.includes('layman') || p.includes('simple terms') || p.includes('simple words');

  if (isAppExplanation || fineCategory === 'GENERAL_PRODUCT_INFORMATION') {
    return {
      category: 'APP_EXPLANATION',
      fineCategory: 'GENERAL_PRODUCT_INFORMATION',
      confidenceScore: 0.98,
      reasoning: 'User explicitly requested an overview or non-technical explanation of how CSV Auditor Pro operates.',
      suggestedTools: ['summarizeDataset'],
      hasActiveDataset,
      isNonTechnical
    };
  }

  // Check if prompt explicitly mentions column names from active dataset
  const mentionsActiveColumn = activeHeaders.some(h => p.includes(h.toLowerCase()));

  // Count CSV keyword hits
  let csvScore = 0;
  const matchedCsvKeywords: string[] = [];
  CSV_KEYWORDS.forEach(kw => {
    if (p.includes(kw)) {
      csvScore += 1.5;
      matchedCsvKeywords.push(kw);
    }
  });

  if (mentionsActiveColumn) {
    csvScore += 3.0;
  }

  // Count General AI keyword hits
  let generalScore = 0;
  const matchedGeneralKeywords: string[] = [];
  GENERAL_AI_KEYWORDS.forEach(kw => {
    if (p.includes(kw)) {
      generalScore += 1.5;
      matchedGeneralKeywords.push(kw);
    }
  });

  // Decide category
  let category: AIIntentCategory = 'GENERAL_AI';
  let confidenceScore = 0.85;
  let reasoning = '';
  const suggestedTools: string[] = [];

  if (fineCategory === 'SECURITY_PRIVACY' || fineCategory === 'FILE_RETENTION' || fineCategory === 'SUBSCRIPTIONS' || fineCategory === 'PAYMENTS' || fineCategory === 'AUTHENTICATION') {
    category = 'GENERAL_AI'; // Treat product policy questions cleanly without forcing CSV dataset tool execution
    confidenceScore = 0.96;
    reasoning = `Query matches specific product policy category [${fineCategory}].`;
  } else if (csvScore > 0 && generalScore > 0 && hasActiveDataset) {
    category = 'MIXED_REQUEST';
    confidenceScore = 0.92;
    reasoning = `Detected a hybrid query combining CSV dataset questions (${matchedCsvKeywords.join(', ')}) with general AI topics (${matchedGeneralKeywords.join(', ')}).`;
    
    if (p.includes('duplicate')) suggestedTools.push('findDuplicates');
    if (p.includes('stat') || p.includes('mean')) suggestedTools.push('calculateStatistics');
    if (p.includes('outlier') || p.includes('anomaly')) suggestedTools.push('detectOutliers');
  } else if ((csvScore > 1.5 || mentionsActiveColumn || p.includes('summarize') || p.includes('tell me about this file') || p.includes('dataset')) && hasActiveDataset) {
    category = 'CSV_ANALYSIS';
    confidenceScore = Math.min(0.98, 0.80 + csvScore * 0.05);
    reasoning = `Query directly requests analysis, auditing, or statistical operations on the uploaded CSV dataset. Matched terms: [${matchedCsvKeywords.join(', ')}].`;
    
    if (p.includes('duplicate')) suggestedTools.push('findDuplicates', 'removeDuplicates');
    if (p.includes('outlier') || p.includes('anomaly')) suggestedTools.push('detectOutliers', 'detectAnomalies');
    if (p.includes('missing') || p.includes('null')) suggestedTools.push('findMissingValues');
    if (p.includes('stat') || p.includes('mean') || p.includes('average')) suggestedTools.push('calculateStatistics');
    if (p.includes('summary') || p.includes('quality') || p.includes('audit')) suggestedTools.push('summarizeDataset', 'generateInsights');
    if (p.includes('pii') || p.includes('ssn') || p.includes('credit')) suggestedTools.push('detectPII');
    if (p.includes('chart') || p.includes('plot')) suggestedTools.push('generateCharts');
  } else if (csvScore > 2.0 && !hasActiveDataset) {
    category = 'MIXED_REQUEST';
    confidenceScore = 0.75;
    reasoning = `Query mentions CSV data concepts (${matchedCsvKeywords.join(', ')}), but no active CSV file is currently loaded in memory.`;
  } else {
    category = 'GENERAL_AI';
    confidenceScore = Math.min(0.95, 0.85 + generalScore * 0.03);
    reasoning = `Query is a general knowledge, coding, or product policy prompt unrelated to specific dataset columns.`;
  }

  return {
    category,
    fineCategory,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    reasoning,
    suggestedTools,
    hasActiveDataset,
    isNonTechnical
  };
}

