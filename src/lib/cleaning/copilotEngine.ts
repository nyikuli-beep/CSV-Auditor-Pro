/**
 * AI Cleaning Copilot Natural Language Engine
 * CSV Auditor Pro
 */

export interface CopilotPlannedStep {
  id: string;
  actionType: string;
  title: string;
  explanation: string;
  confidence: number;
  params: Record<string, any>;
}

export interface CopilotPlan {
  userPrompt: string;
  understoodIntent: string;
  plannedSteps: CopilotPlannedStep[];
  estimatedTimeMs: number;
}

export function parseCopilotPrompt(
  prompt: string, 
  headers: string[]
): CopilotPlan {
  const lower = prompt.toLowerCase();
  const plannedSteps: CopilotPlannedStep[] = [];
  let intentSummary = 'Configured custom cleaning pipeline based on prompt.';

  // 1. Duplicate Removal
  if (lower.includes('duplicate') || lower.includes('dedup') || lower.includes('unique') || lower.includes('repeat')) {
    plannedSteps.push({
      id: 'step-dedup',
      actionType: 'remove_duplicates',
      title: 'Remove Duplicate Records',
      explanation: 'Scans the entire dataset for identical duplicate row entries and retains unique records.',
      confidence: 98,
      params: {}
    });
  }

  // 2. Phone Numbers
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel') || lower.includes('contact') || lower.includes('kenyan')) {
    plannedSteps.push({
      id: 'step-phone',
      actionType: 'normalize_contacts',
      title: 'Normalize Phone Numbers',
      explanation: 'Standardizes phone numbers to international E.164 formats (+254, +1, etc.).',
      confidence: 95,
      params: { target: 'phone' }
    });
  }

  // 3. Email Masking / PII
  if (lower.includes('mask') || lower.includes('pii') || lower.includes('hide email') || lower.includes('encrypt') || lower.includes('privacy')) {
    const emailCol = headers.find(h => h.toLowerCase().includes('email')) || headers[0] || 'Email';
    plannedSteps.push({
      id: 'step-pii',
      actionType: 'mask_pii',
      title: `Mask Sensitive PII in '${emailCol}'`,
      explanation: `Obfuscates user email addresses in '${emailCol}' for compliance and privacy protection.`,
      confidence: 96,
      params: { column: emailCol, mode: 'mask' }
    });
  }

  // 4. Dates
  if (lower.includes('date') || lower.includes('yyyy') || lower.includes('format date') || lower.includes('convert date') || lower.includes('iso')) {
    plannedSteps.push({
      id: 'step-dates',
      actionType: 'standardize_dates',
      title: 'Standardize Date Formats to ISO 8601',
      explanation: 'Converts heterogeneous date strings into uniform YYYY-MM-DD representations.',
      confidence: 94,
      params: {}
    });
  }

  // 5. Company / Names / Typos
  if (lower.includes('company') || lower.includes('organization') || lower.includes('standardize names') || lower.includes('typo') || lower.includes('correct')) {
    plannedSteps.push({
      id: 'step-ai-corr',
      actionType: 'ai_smart_correction',
      title: 'AI Smart Data Correction',
      explanation: 'Applies AI machine learning rules to fix company name typos and normalize casing.',
      confidence: 92,
      params: {}
    });
  }

  // 6. Invisible Characters / Whitespace
  if (lower.includes('whitespace') || lower.includes('invisible') || lower.includes('spaces') || lower.includes('control') || lower.includes('trim') || lower.includes('clean char')) {
    plannedSteps.push({
      id: 'step-invisible',
      actionType: 'clean_invisible_chars',
      title: 'Clean Invisible & Control Characters',
      explanation: 'Strips zero-width spaces, hidden tab stops, carriage returns, and leading/trailing whitespace.',
      confidence: 99,
      params: {}
    });
  }

  // 7. Formula Injection Shield
  if (lower.includes('formula') || lower.includes('injection') || lower.includes('shield') || lower.includes('escape') || lower.includes('excel')) {
    plannedSteps.push({
      id: 'step-formula',
      actionType: 'protect_formulas',
      title: 'Shield CSV Formula Injection',
      explanation: 'Escapes cells starting with =, +, -, or @ to prevent malicious Excel/CSV formula execution.',
      confidence: 99,
      params: {}
    });
  }

  // 8. Null / Missing Values
  if (lower.includes('null') || lower.includes('missing') || lower.includes('blank') || lower.includes('impute') || lower.includes('fill')) {
    plannedSteps.push({
      id: 'step-nulls',
      actionType: 'normalize_nulls',
      title: 'Normalize Missing & Null Values',
      explanation: 'Identifies heterogeneous null indicators (N/A, NULL, None, blank) and standardizes missing entries.',
      confidence: 95,
      params: {}
    });
  }

  // 9. Address Standardization
  if (lower.includes('address') || lower.includes('street') || lower.includes('location') || lower.includes('road') || lower.includes('avenue')) {
    plannedSteps.push({
      id: 'step-address',
      actionType: 'standardize_addresses',
      title: 'Standardize Street & Address Abbreviations',
      explanation: 'Expands common street abbreviations (St -> Street, Rd -> Road, Ave -> Avenue) for GIS consistency.',
      confidence: 93,
      params: {}
    });
  }

  // 10. HTML / Markdown Removal
  if (lower.includes('html') || lower.includes('markdown') || lower.includes('tag') || lower.includes('strip')) {
    plannedSteps.push({
      id: 'step-html',
      actionType: 'clean_html',
      title: 'Strip HTML & Markdown Tags',
      explanation: 'Removes embedded HTML elements and Markdown formatting from cell contents.',
      confidence: 97,
      params: {}
    });
  }

  // 11. Unicode Repair
  if (lower.includes('unicode') || lower.includes('encoding') || lower.includes('utf') || lower.includes('artifact')) {
    plannedSteps.push({
      id: 'step-unicode',
      actionType: 'repair_unicode',
      title: 'Repair UTF-8 & Encoding Artifacts',
      explanation: 'Fixes corrupted double-encoded UTF-8 characters and replacement symbols.',
      confidence: 96,
      params: {}
    });
  }

  // Fallback if no specific keywords matched
  if (plannedSteps.length === 0) {
    plannedSteps.push({
      id: 'step-general-hygiene',
      actionType: 'clean_invisible_chars',
      title: 'Clean Invisible Characters & Normalize Nulls',
      explanation: 'Performs baseline data hygiene by removing non-printable characters and standardizing missing values.',
      confidence: 85,
      params: {}
    });
    intentSummary = 'Applied general data hygiene and null normalization rules.';
  } else {
    intentSummary = `Prepared pipeline with ${plannedSteps.length} cleaning step(s).`;
  }

  return {
    userPrompt: prompt,
    understoodIntent: intentSummary,
    plannedSteps,
    estimatedTimeMs: plannedSteps.length * 150
  };
}
