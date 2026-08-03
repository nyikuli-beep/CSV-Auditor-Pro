/**
 * CSV Auditor Pro - Intent Detection Engine
 * Accurately routes prompts into CSV_ANALYSIS, GENERAL_AI, MIXED_REQUEST, or UNKNOWN.
 */

export type AIIntentCategory = 'CSV_ANALYSIS' | 'GENERAL_AI' | 'MIXED_REQUEST' | 'UNKNOWN';

export interface IntentAnalysisResult {
  category: AIIntentCategory;
  confidenceScore: number;
  reasoning: string;
  suggestedTools: string[];
  hasActiveDataset: boolean;
}

const CSV_KEYWORDS = [
  'csv', 'dataset', 'file', 'data', 'column', 'columns', 'row', 'rows', 'header', 'headers',
  'duplicate', 'duplicates', 'outlier', 'outliers', 'anomaly', 'anomalies', 'null', 'missing',
  'clean', 'audit', 'validate', 'stats', 'statistics', 'mean', 'median', 'stddev', 'summary',
  'record', 'records', 'table', 'sheet', 'spreadsheet', 'excel', 'payout', 'email', 'phone',
  'pii', 'correlation', 'chart', 'trend', 'quality', 'score', 'schema', 'drift', 'dedupe',
  'autofix', 'trim', 'format', 'normalize', 'encoding'
];

const GENERAL_AI_KEYWORDS = [
  'what is', 'explain', 'how to', 'tell me about', 'python', 'sql', 'javascript', 'react',
  'capital of', 'definition', 'history', 'science', 'math', 'formula', 'write a', 'code for',
  'translate', 'essay', 'poem', 'recipe', 'game', 'news', 'weather', 'philosophy', 'quantum',
  'machine learning', 'database design', 'architect', 'postgre', 'cloud sql', 'firebase'
];

/**
 * Classifies prompt intent using rule-based heuristics + semantic pattern matching
 */
export function detectUserIntent(
  prompt: string,
  hasActiveDataset: boolean = false,
  activeHeaders: string[] = []
): IntentAnalysisResult {
  const p = prompt.trim().toLowerCase();

  if (!p || p.length < 2) {
    return {
      category: 'UNKNOWN',
      confidenceScore: 0.2,
      reasoning: 'Prompt is too short or ambiguous.',
      suggestedTools: [],
      hasActiveDataset
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

  if (csvScore > 0 && generalScore > 0 && hasActiveDataset) {
    category = 'MIXED_REQUEST';
    confidenceScore = 0.92;
    reasoning = `Detected a hybrid query that combines CSV dataset questions (${matchedCsvKeywords.join(', ')}) with general AI topics (${matchedGeneralKeywords.join(', ')}).`;
    
    if (p.includes('duplicate')) suggestedTools.push('findDuplicates');
    if (p.includes('stat') || p.includes('mean')) suggestedTools.push('calculateStatistics');
    if (p.includes('outlier') || p.includes('anomaly')) suggestedTools.push('detectOutliers');
  } else if ((csvScore > 1.5 || mentionsActiveColumn) && hasActiveDataset) {
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
    // User asking CSV data questions but hasn't uploaded a CSV
    category = 'MIXED_REQUEST';
    confidenceScore = 0.75;
    reasoning = `Query mentions CSV data concepts (${matchedCsvKeywords.join(', ')}), but no active CSV file is currently loaded in memory.`;
  } else {
    category = 'GENERAL_AI';
    confidenceScore = Math.min(0.95, 0.85 + generalScore * 0.03);
    reasoning = `Query is a general knowledge, coding, or informational prompt unrelated to specific dataset columns.`;
  }

  return {
    category,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    reasoning,
    suggestedTools,
    hasActiveDataset
  };
}
