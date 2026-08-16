/**
 * CSV Auditor Pro - Response Validation Middleware (Phase 2)
 * 
 * Validates whether the AI generated response faithfully answers the user's
 * detected intent and specific inquiry rather than regurgitating generic summaries.
 * 
 * If a generic dataset summary is detected for a specific intent (e.g. 'remediation',
 * 'missing_values', 'column_information'), triggers re-prompting with strict constraints
 * or deterministic fallback reasoning.
 */

import { StructuredGroundedContext, AnalysisIntent, RemediationEvidence } from './types';

export interface ResponseValidationResult {
  isValid: boolean;
  intent: AnalysisIntent;
  detectedMismatches: string[];
  isGenericSummary: boolean;
  targetColumn?: string;
  repromptInstruction?: string;
  fallbackContent?: string;
}

export class ResponseValidationMiddleware {
  /**
   * Evaluates if the AI output matches the detected intent and evidence.
   */
  public static validate(
    responseText: string,
    context: StructuredGroundedContext,
    originalPrompt: string
  ): ResponseValidationResult {
    const intent = context.routePlan.intent;
    const text = responseText.trim();
    const lowerText = text.toLowerCase();
    const mismatches: string[] = [];

    const targetColumn = context.routePlan.targetColumns[0] ||
      context.routePlan.referencedIssue?.column ||
      context.deterministicResults.remediationEvidence?.targetColumn;

    // Detect if the response is a generic dataset summary
    const isGenericSummary = this.checkIfGenericSummary(lowerText, targetColumn);

    // 1. Remediation Intent Validation
    if (intent === 'remediation') {
      const hasRemediationKeywords = (
        lowerText.includes('remediat') ||
        lowerText.includes('impute') ||
        lowerText.includes('imputation') ||
        lowerText.includes('replace') ||
        lowerText.includes('unknown') ||
        lowerText.includes('not reported') ||
        lowerText.includes('step') ||
        lowerText.includes('strategy') ||
        lowerText.includes('how to') ||
        lowerText.includes('python') ||
        lowerText.includes('sql') ||
        lowerText.includes('pandas') ||
        lowerText.includes('clean') ||
        lowerText.includes('fix')
      );

      const mentionsTargetColumn = targetColumn
        ? lowerText.includes(targetColumn.toLowerCase())
        : true;

      if (isGenericSummary && !hasRemediationKeywords) {
        mismatches.push(`Generic dataset summary returned when user requested remediation for "${targetColumn || 'specified issue'}".`);
      } else if (!hasRemediationKeywords && text.length < 150) {
        mismatches.push(`Response lacks actionable remediation steps or strategy guidance.`);
      }

      if (!mentionsTargetColumn && targetColumn && !isGenericSummary) {
        // Warning: column was not mentioned in remediation
        mismatches.push(`Response did not reference the target column "${targetColumn}".`);
      }
    }

    // 2. Missing Values Intent Validation
    if (intent === 'missing_values') {
      const hasMissingContext = (
        lowerText.includes('missing') ||
        lowerText.includes('null') ||
        lowerText.includes('empty') ||
        lowerText.includes('blank') ||
        lowerText.includes('zero') ||
        lowerText.includes('clean')
      );
      if (isGenericSummary && !hasMissingContext) {
        mismatches.push(`Generic summary returned when user specifically queried missing value distribution.`);
      }
    }

    // 3. Duplicate Analysis Intent Validation
    if (intent === 'duplicate_analysis') {
      const hasDuplicateContext = (
        lowerText.includes('duplicate') ||
        lowerText.includes('dedup') ||
        lowerText.includes('redundant') ||
        lowerText.includes('unique')
      );
      if (isGenericSummary && !hasDuplicateContext) {
        mismatches.push(`Generic summary returned when user specifically queried duplicate records.`);
      }
    }

    // 4. Column Information Intent Validation
    if (intent === 'column_information' || intent === 'column_lookup') {
      if (targetColumn && !lowerText.includes(targetColumn.toLowerCase()) && isGenericSummary) {
        mismatches.push(`Generic summary returned instead of specific metrics for column "${targetColumn}".`);
      }
    }

    const isValid = mismatches.length === 0;

    let repromptInstruction: string | undefined;
    let fallbackContent: string | undefined;

    if (!isValid) {
      repromptInstruction = this.buildStrictReprompt(context, originalPrompt, mismatches);
      fallbackContent = this.buildDeterministicFallback(context);
    }

    return {
      isValid,
      intent,
      detectedMismatches: mismatches,
      isGenericSummary,
      targetColumn,
      repromptInstruction,
      fallbackContent
    };
  }

  /**
   * Determines if text exhibits generic dataset overview patterns.
   */
  private static checkIfGenericSummary(lowerText: string, targetCol?: string): boolean {
    const summaryStarters = [
      'dataset contains',
      'the dataset contains',
      'dataset \'',
      'dataset "',
      'score 100/100',
      'score 9',
      'with 0 detected issues',
      'here is an overview',
      'here is a summary of the dataset',
      'rows, score',
      'contains 5,050 rows'
    ];

    const hasStarter = summaryStarters.some(starter => lowerText.startsWith(starter) || lowerText.includes(starter));

    // If it has summary starter phrases and is relatively short or doesn't mention the target column / steps
    if (hasStarter) {
      if (targetCol && !lowerText.includes(targetCol.toLowerCase())) {
        return true;
      }
      if (!lowerText.includes('remediat') && !lowerText.includes('step') && !lowerText.includes('implement') && !lowerText.includes('strategy')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Constructs strict re-prompt instructions with heightened constraints
   */
  public static buildStrictReprompt(
    context: StructuredGroundedContext,
    originalPrompt: string,
    mismatches: string[]
  ): string {
    const targetCol = context.routePlan.targetColumns[0] ||
      context.routePlan.referencedIssue?.column ||
      context.deterministicResults.remediationEvidence?.targetColumn ||
      'specified column';

    return `CRITICAL CORRECTION REQUIRED:
The previous response was flagged for: ${mismatches.join('; ')}

MANDATORY RESPONSE REQUIREMENTS:
1. You MUST answer the user's specific inquiry regarding "${targetCol}" directly.
2. DO NOT output ANY generic dataset summary (DO NOT say "Dataset contains X rows...").
3. Strictly format the response as follows:
   ### Direct Answer
   (Immediate, clear action to take for "${targetCol}")
   
   ### Why (Rationale & Domain Context)
   (Explain the forensic reasoning, including why mode imputation is risky vs explicit 'Unknown' categorization)
   
   ### Recommended Remediation Strategy
   (Step-by-step strategy for handling the issue)
   
   ### Implementation Steps
   (Provide Python/Pandas code snippet, SQL query, and in-app cleaning recipe)
   
   ### Validation
   (Verification query or check to confirm resolution)

Original User Query: "${originalPrompt}"`;
  }

  /**
   * Generates deterministic forensic remediation fallback if AI reprompting fails
   */
  public static buildDeterministicFallback(context: StructuredGroundedContext): string {
    const rem = context.deterministicResults.remediationEvidence;
    if (rem) {
      return this.formatRemediationFallback(rem);
    }

    const targetCol = context.routePlan.targetColumns[0] || 'Target Column';
    return `### Direct Remediation Plan for "${targetCol}"

**Direct Answer:**
Standardize and resolve missing/inconsistent values in column **"${targetCol}"** using explicit categorization or bounded imputation.

**Why (Rationale):**
Preserving missingness with an explicit category (e.g., \`"Unknown"\` or \`"Not Reported"\`) prevents data loss and avoids distorting analytical aggregations.

**Implementation Steps:**
1. **In CSV Auditor Pro:** Navigate to the **Clean** tab -> Select column **"${targetCol}"** -> Apply **Impute Missing** with value \`"Unknown"\`.
2. **Python / Pandas:**
\`\`\`python
import pandas as pd
df = pd.read_csv('dataset.csv')
df['${targetCol}'] = df['${targetCol}'].fillna('Unknown').replace(r'^\\s*$', 'Unknown', regex=True)
df.to_csv('dataset_cleaned.csv', index=False)
\`\`\`
3. **SQL:**
\`\`\`sql
UPDATE dataset
SET "${targetCol}" = COALESCE(NULLIF(TRIM("${targetCol}"), ''), 'Unknown')
WHERE "${targetCol}" IS NULL OR TRIM("${targetCol}") = '';
\`\`\`

**Validation:**
Run \`SELECT COUNT(*) FROM dataset WHERE "${targetCol}" IS NULL OR TRIM("${targetCol}") = '';\` to confirm zero residual nulls.`;
  }

  private static formatRemediationFallback(rem: RemediationEvidence): string {
    let output = `### Remediation Plan: ${rem.targetColumn}\n\n`;
    output += `**Direct Answer:**\n${rem.recommendedAction}\n\n`;
    output += `**Why (Forensic & Domain Context):**\n${rem.rationale}\n\n`;
    
    if (rem.referencedAffectedCount !== undefined) {
      output += `*Referenced Finding:* **${rem.referencedAffectedCount.toLocaleString()}** affected records identified in audit.\n`;
    }
    if (rem.isCleanedOrResolvedInActiveState) {
      output += `*Active Dataset State:* Currently 0 missing values in active workspace view (remediation appears to refer to original pre-cleaned audit).\n\n`;
    }

    output += `**Recommended Strategy:**\n`;
    output += `- Strategy: ${rem.implementationStrategies.explicitCategoryStrategy || 'Explicit categorization'}\n`;
    output += `- In-App Action: ${rem.implementationStrategies.inAppAction || 'Apply hygiene via Clean tab'}\n\n`;

    output += `**Implementation Recipes:**\n\n`;
    if (rem.implementationStrategies.pythonCodeSnippet) {
      output += `*Python / Pandas:*\n\`\`\`python\n${rem.implementationStrategies.pythonCodeSnippet}\n\`\`\`\n\n`;
    }
    if (rem.implementationStrategies.sqlQuerySnippet) {
      output += `*SQL:*\n\`\`\`sql\n${rem.implementationStrategies.sqlQuerySnippet}\n\`\`\`\n\n`;
    }

    output += `**Validation:**\n${rem.validationCheck}`;
    return output;
  }
}
