/**
 * CSV Auditor Pro - Conversational Question Router (Phase 2)
 * Intelligently classifies user queries, resolves target dataset columns,
 * extracts specific referenced issues & remediation contexts,
 * and schedules deterministic computation plans before Gemini reasoning.
 */

import {
  AggregationOperation,
  AnalysisIntent,
  AnalysisRoutePlan,
  DatasetProfile,
  DateGranularity,
  ReferencedIssueInfo,
  RemediationEvidence
} from './types';
import { StatisticalAnalysisEngine } from './statisticalEngine';
import { DataQualityEngine } from './dataQuality';
import { AnomalyDetectionEngine } from './anomalyEngine';

export class AnalysisRouter {
  /**
   * Routes a user prompt into a structured execution plan and executes
   * the deterministic calculations against the actual dataset.
   */
  public static planAndExecute(
    prompt: string,
    rows: Record<string, any>[],
    headers: string[],
    datasetProfile?: DatasetProfile,
    previousPlan?: AnalysisRoutePlan
  ): {
    routePlan: AnalysisRoutePlan;
    results: {
      aggregation?: any;
      ranking?: any;
      comparison?: any;
      trend?: any;
      correlation?: any;
      qualityReport?: any;
      anomalyReport?: any;
      remediationEvidence?: RemediationEvidence;
    };
  } {
    const routePlan = this.plan(prompt, headers, datasetProfile, previousPlan);
    const safeRows = Array.isArray(rows) ? rows : [];

    const results: any = {};

    if (!routePlan.requiresExecution || safeRows.length === 0) {
      // Even if safeRows is empty or requiresExecution is false, if it is a remediation plan,
      // construct baseline remediation evidence from referenced issue and headers
      if (routePlan.intent === 'remediation' && routePlan.targetColumns.length > 0) {
        results.remediationEvidence = this.buildRemediationEvidence(
          routePlan.targetColumns[0],
          safeRows,
          routePlan.referencedIssue,
          datasetProfile
        );
      }
      return { routePlan, results };
    }

    try {
      switch (routePlan.intent) {
        case 'remediation': {
          const targetCol = routePlan.targetColumns[0] || headers[0];
          results.remediationEvidence = this.buildRemediationEvidence(
            targetCol,
            safeRows,
            routePlan.referencedIssue,
            datasetProfile
          );
          // Also provide data quality finding context if available
          results.qualityReport = DataQualityEngine.analyze(safeRows, headers, datasetProfile);
          break;
        }

        case 'aggregation': {
          const targetCol = routePlan.metricColumns[0] || routePlan.targetColumns[0] || headers[0];
          const groupCol = routePlan.groupColumns[0];
          const op = (routePlan.operation as AggregationOperation) || 'sum';
          results.aggregation = StatisticalAnalysisEngine.computeAggregation(
            safeRows,
            targetCol,
            op,
            groupCol,
            routePlan.granularity
          );
          break;
        }

        case 'ranking': {
          const targetCol = routePlan.groupColumns[0] || routePlan.targetColumns[0] || headers[0];
          const metricCol = routePlan.metricColumns[0] || targetCol;
          results.ranking = StatisticalAnalysisEngine.computeRanking(
            safeRows,
            targetCol,
            metricCol,
            routePlan.direction || 'desc',
            routePlan.limit || 5
          );
          break;
        }

        case 'trend_analysis': {
          const dateCol = routePlan.dateColumns[0] || datasetProfile?.dateColumns[0] || headers[0];
          const valueCol = routePlan.metricColumns[0] || datasetProfile?.numericColumns[0] || headers[1] || headers[0];
          results.trend = StatisticalAnalysisEngine.computeTrend(
            safeRows,
            dateCol,
            valueCol,
            routePlan.granularity || 'month'
          );
          break;
        }

        case 'correlation': {
          const colA = routePlan.metricColumns[0] || datasetProfile?.numericColumns[0] || headers[0];
          const colB = routePlan.metricColumns[1] || datasetProfile?.numericColumns[1] || headers[1] || headers[0];
          results.correlation = StatisticalAnalysisEngine.computeCorrelation(safeRows, colA, colB);
          break;
        }

        case 'missing_values': {
          const targetCol = routePlan.targetColumns[0];
          results.qualityReport = DataQualityEngine.analyze(safeRows, headers, datasetProfile);
          if (targetCol) {
            results.aggregation = StatisticalAnalysisEngine.computeAggregation(
              safeRows,
              targetCol,
              'count',
              targetCol
            );
          }
          break;
        }

        case 'duplicate_analysis': {
          results.qualityReport = DataQualityEngine.analyze(safeRows, headers, datasetProfile);
          break;
        }

        case 'data_quality': {
          results.qualityReport = DataQualityEngine.analyze(safeRows, headers, datasetProfile);
          break;
        }

        case 'anomaly_analysis': {
          results.anomalyReport = AnomalyDetectionEngine.detectAnomalies(safeRows, headers, datasetProfile);
          break;
        }

        case 'column_information':
        case 'column_lookup': {
          const targetCol = routePlan.targetColumns[0] || headers[0];
          results.aggregation = StatisticalAnalysisEngine.computeAggregation(
            safeRows,
            targetCol,
            'count',
            targetCol
          );
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.warn('[AnalysisRouter] Deterministic execution non-fatal error:', err);
    }

    return { routePlan, results };
  }

  /**
   * Deterministic intent classification and column entity recognition
   */
  public static plan(
    prompt: string,
    headers: string[],
    datasetProfile?: DatasetProfile,
    previousPlan?: AnalysisRoutePlan
  ): AnalysisRoutePlan {
    const text = prompt.toLowerCase().trim();

    // 1. Check for general conversation greetings
    if (this.isGeneralGreeting(text)) {
      return {
        intent: 'general_conversation',
        targetColumns: [],
        groupColumns: [],
        dateColumns: [],
        metricColumns: [],
        requiresExecution: false,
        confidence: 0.99,
        reasoning: 'User initiated general greeting or conversation.'
      };
    }

    // 2. Extract referenced structured issues if present in prompt
    const referencedIssue = this.extractReferencedIssue(prompt, headers);

    // 3. Identify candidate columns from headers & quoted strings
    let matchedColumns = this.extractMatchedColumns(prompt, headers);

    // If referenced issue found a column not yet in matchedColumns, include it
    if (referencedIssue?.column && !matchedColumns.includes(referencedIssue.column)) {
      matchedColumns.unshift(referencedIssue.column);
    }

    // If follow-up context is active and user didn't mention specific columns, inherit from previous turn
    if (matchedColumns.length === 0 && previousPlan && previousPlan.targetColumns.length > 0) {
      const isFollowUp = this.isFollowUpQuery(text);
      if (isFollowUp) {
        matchedColumns = [...previousPlan.targetColumns];
      }
    }

    const numericCols = datasetProfile?.numericColumns || [];
    const dateCols = datasetProfile?.dateColumns || [];
    const catCols = datasetProfile?.categoricalColumns || [];

    const metricColumns = matchedColumns.filter(c => numericCols.includes(c));
    const dateColumns = matchedColumns.filter(c => dateCols.includes(c));
    const groupColumns = matchedColumns.filter(c => catCols.includes(c) || (!numericCols.includes(c) && !dateCols.includes(c)));

    // Fallback if no specific column found but intent requires one
    if (metricColumns.length === 0 && numericCols.length > 0) {
      if (previousPlan?.metricColumns?.length) {
        metricColumns.push(...previousPlan.metricColumns.filter(c => numericCols.includes(c)));
      } else {
        metricColumns.push(numericCols[0]);
      }
    }
    if (dateColumns.length === 0 && dateCols.length > 0) {
      if (previousPlan?.dateColumns?.length) {
        dateColumns.push(...previousPlan.dateColumns.filter(c => dateCols.includes(c)));
      } else {
        dateColumns.push(dateCols[0]);
      }
    }

    // 4. Classify Intent with strict priority hierarchy

    // A. Remediation / Action Plan / Implementation Guide
    // e.g. "How should I implement the remediation plan for: 'Handle Missing Values in suspect_gender (293 cells)'?"
    // e.g. "How do I fix missing values in column X?"
    // e.g. "What is the best way to handle nulls in Y?"
    // e.g. "Show me the remediation steps for..."
    const isRemediationQuery = this.isRemediationRequest(text, referencedIssue, previousPlan);
    if (isRemediationQuery) {
      const targetCol = matchedColumns[0] || referencedIssue?.column || (previousPlan?.targetColumns[0]) || headers[0];
      return {
        intent: 'remediation',
        targetColumns: targetCol ? [targetCol] : matchedColumns,
        groupColumns,
        dateColumns,
        metricColumns,
        referencedIssue: referencedIssue || previousPlan?.referencedIssue,
        requiresExecution: true,
        confidence: 0.98,
        reasoning: `User requested actionable remediation implementation steps for issue in column "${targetCol || 'dataset'}".`
      };
    }

    // B. Anomaly / Outlier
    if (text.includes('anomaly') || text.includes('anomalies') || text.includes('outlier') || text.includes('z-score') || text.includes('iqr') || text.includes('unusual')) {
      return {
        intent: 'anomaly_analysis',
        targetColumns: matchedColumns,
        groupColumns,
        dateColumns,
        metricColumns,
        requiresExecution: true,
        confidence: 0.95,
        reasoning: 'User requested outlier or anomaly detection analysis.'
      };
    }

    // C. Missing Values Specific Lookup
    if ((text.includes('missing') || text.includes('null') || text.includes('empty cell') || text.includes('blank cell')) && !text.includes('summary') && !text.includes('overview')) {
      return {
        intent: 'missing_values',
        targetColumns: matchedColumns,
        groupColumns,
        dateColumns,
        metricColumns,
        requiresExecution: true,
        confidence: 0.94,
        reasoning: 'User asked specifically about missing values or null distributions.'
      };
    }

    // D. Duplicate Rows Specific Lookup
    if (text.includes('duplicate') || text.includes('dedupe') || text.includes('redundant row')) {
      return {
        intent: 'duplicate_analysis',
        targetColumns: matchedColumns,
        groupColumns,
        dateColumns,
        metricColumns,
        requiresExecution: true,
        confidence: 0.94,
        reasoning: 'User asked specifically about duplicate rows or entity deduplication.'
      };
    }

    // E. General Data Quality & Health Audit
    if (
      text.includes('quality') || text.includes('clean') || text.includes('error') ||
      text.includes('health') || text.includes('injection') || text.includes('audit this') ||
      text.includes('data hygiene') || text.includes('validation rule')
    ) {
      return {
        intent: 'data_quality',
        targetColumns: matchedColumns,
        groupColumns,
        dateColumns,
        metricColumns,
        requiresExecution: true,
        confidence: 0.95,
        reasoning: 'User asked about overall dataset quality score, errors, or hygiene audit.'
      };
    }

    // F. Trend / Over Time
    if (text.includes('trend') || text.includes('over time') || text.includes('by month') || text.includes('monthly') || text.includes('by year') || text.includes('growth') || text.includes('timeline')) {
      const granularity = this.extractDateGranularity(text);
      return {
        intent: 'trend_analysis',
        targetColumns: matchedColumns,
        groupColumns,
        dateColumns,
        metricColumns,
        granularity,
        requiresExecution: true,
        confidence: 0.90,
        reasoning: 'User asked for time-series trend or chronological distribution.'
      };
    }

    // G. Ranking (Top N, Bottom N, Highest, Lowest, Most, Least)
    if (
      text.includes('highest') || text.includes('lowest') || text.includes('top') ||
      text.includes('bottom') || text.includes('best') || text.includes('worst') ||
      text.includes('most') || text.includes('least') || text.includes('rank')
    ) {
      const direction = (text.includes('lowest') || text.includes('bottom') || text.includes('least') || text.includes('worst')) ? 'asc' : 'desc';
      const limit = this.extractLimitNumber(text) || 5;

      return {
        intent: 'ranking',
        targetColumns: matchedColumns,
        groupColumns: groupColumns.length > 0 ? groupColumns : (dateColumns.length > 0 ? dateColumns : [headers[0]]),
        dateColumns,
        metricColumns,
        direction,
        limit,
        requiresExecution: true,
        confidence: 0.92,
        reasoning: `User requested ranking (${direction === 'desc' ? 'top' : 'bottom'} ${limit}) across groups.`
      };
    }

    // H. Correlation
    if (text.includes('correlat') || text.includes('relationship between') || text.includes('vs')) {
      return {
        intent: 'correlation',
        targetColumns: matchedColumns,
        groupColumns,
        dateColumns,
        metricColumns: metricColumns.slice(0, 2),
        requiresExecution: true,
        confidence: 0.88,
        reasoning: 'User asked for statistical correlation analysis between numeric features.'
      };
    }

    // I. Aggregation (Sum, Average, Total, Count, Group By)
    if (
      text.includes('total') || text.includes('sum') || text.includes('average') ||
      text.includes('mean') || text.includes('median') || text.includes('count') ||
      text.includes('by ') || text.includes('per ') || text.includes('group')
    ) {
      const op = this.extractAggregationOp(text);
      const granularity = dateColumns.length > 0 ? this.extractDateGranularity(text) : undefined;

      return {
        intent: 'aggregation',
        targetColumns: matchedColumns,
        groupColumns: groupColumns.length > 0 ? groupColumns : (dateColumns.length > 0 ? dateColumns : []),
        dateColumns,
        metricColumns,
        operation: op,
        granularity,
        requiresExecution: true,
        confidence: 0.89,
        reasoning: `User requested ${op} aggregation grouped by ${groupColumns[0] || 'dataset'}.`
      };
    }

    // J. Specific Column Information / Distribution Lookup
    if (matchedColumns.length === 1 && !text.includes('summary') && !text.includes('overview') && !text.includes('describe')) {
      return {
        intent: 'column_information',
        targetColumns: matchedColumns,
        groupColumns: matchedColumns,
        dateColumns: [],
        metricColumns: [],
        requiresExecution: true,
        confidence: 0.88,
        reasoning: `User queried specific column distribution and characteristics for "${matchedColumns[0]}".`
      };
    }

    // K. Dataset Summary / High-Level Overview
    if (text.includes('summary') || text.includes('overview') || text.includes('describe') || text.includes('about this file') || text.includes('what is in this') || text.includes('dataset profile')) {
      return {
        intent: 'dataset_summary',
        targetColumns: [],
        groupColumns: [],
        dateColumns: [],
        metricColumns: [],
        requiresExecution: false,
        confidence: 0.92,
        reasoning: 'User asked for high-level dataset overview and structural profile.'
      };
    }

    // Default to column_information if columns were mentioned, otherwise general analytical query
    return {
      intent: matchedColumns.length > 0 ? 'column_information' : 'dataset_summary',
      targetColumns: matchedColumns,
      groupColumns,
      dateColumns,
      metricColumns,
      requiresExecution: matchedColumns.length > 0,
      confidence: 0.75,
      reasoning: matchedColumns.length > 0
        ? `Analytical question focusing on column "${matchedColumns[0]}".`
        : 'General analytical question evaluated against dataset context.'
    };
  }

  // ==========================================
  // HELPER PARSING FUNCTIONS
  // ==========================================

  /**
   * Checks if query is a follow-up referring to previous turn
   */
  private static isFollowUpQuery(text: string): boolean {
    return (
      text.includes('what about') || text.includes('how about') || text.includes('what should i replace') ||
      text.includes('would using') || text.includes('show me the') || text.includes('how to do that') ||
      text.includes('python code') || text.includes('sql query') || text.includes('the rest') ||
      text.includes('bottom') || text.includes('top') || text.includes('average') || text.includes('sum') ||
      text.includes('why not') || text.includes('is it safe') || text.includes('that column') ||
      text.includes('those values') || text.includes('that issue')
    );
  }

  /**
   * Checks if prompt requests a remediation plan or fix
   */
  private static isRemediationRequest(
    text: string,
    referencedIssue?: ReferencedIssueInfo | null,
    previousPlan?: AnalysisRoutePlan
  ): boolean {
    if (referencedIssue) {
      return true;
    }

    const remediationKeywords = [
      'remediation',
      'remediate',
      'how should i implement',
      'how to implement',
      'how do i implement',
      'how should i fix',
      'how to fix',
      'how do i fix',
      'how should i handle',
      'how to handle',
      'how do i resolve',
      'fix plan',
      'action plan',
      'remedy',
      'imputation strategy',
      'impute missing',
      'replace missing',
      'replace null',
      'handle missing',
      'handle null',
      'clean recipe',
      'how to clean'
    ];

    if (remediationKeywords.some(kw => text.includes(kw))) {
      return true;
    }

    // Check if this is a follow-up to a previous remediation turn
    if (previousPlan?.intent === 'remediation') {
      const followUpCues = [
        'what should i replace',
        'replace them with',
        'would using',
        'is mode imputation',
        'python code',
        'sql query',
        'how to implement',
        'how to do that',
        'why not',
        'is it safe'
      ];
      if (followUpCues.some(c => text.includes(c))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extracts structured issue details from prompt quotes or phrases
   * Example: "How should I implement the remediation plan for: 'Handle Missing Values in \"suspect_gender\" (293 cells)'?"
   */
  private static extractReferencedIssue(prompt: string, headers: string[]): ReferencedIssueInfo | null {
    // 1. Check for quoted string patterns like 'Handle Missing Values in "suspect_gender" (293 cells)'
    const singleQuoteMatch = prompt.match(/'([^']+)'/);
    const doubleQuoteMatch = prompt.match(/"([^"]{10,})"/); // long double quotes that represent a full recommendation title

    const rawTitle = singleQuoteMatch ? singleQuoteMatch[1] : (doubleQuoteMatch ? doubleQuoteMatch[1] : '');
    const searchTarget = rawTitle || prompt;

    // Check if searchTarget contains an issue description
    const lowerSearch = searchTarget.toLowerCase();
    const hasIssueMarker = (
      lowerSearch.includes('missing') ||
      lowerSearch.includes('duplicate') ||
      lowerSearch.includes('outlier') ||
      lowerSearch.includes('formula') ||
      lowerSearch.includes('sanitize') ||
      lowerSearch.includes('format') ||
      lowerSearch.includes('casing') ||
      lowerSearch.includes('remediation')
    );

    if (!hasIssueMarker && !rawTitle) {
      return null;
    }

    // Extract column name: look inside inner quotes first (e.g. "suspect_gender" or 'suspect_gender')
    let colName: string | undefined = undefined;
    const innerQuoteMatch = searchTarget.match(/["'`]([a-zA-Z0-9_\s-]+)["'`]/);
    if (innerQuoteMatch && innerQuoteMatch[1]) {
      const candidate = innerQuoteMatch[1].trim();
      const matchedHeader = headers.find(h => h.toLowerCase() === candidate.toLowerCase());
      colName = matchedHeader || candidate;
    }

    // If no inner quote, check headers in text
    if (!colName) {
      for (const h of headers) {
        if (searchTarget.toLowerCase().includes(h.toLowerCase())) {
          colName = h;
          break;
        }
      }
    }

    // Extract count (e.g. "293 cells", "(293 cells)", "293 rows", "293")
    let affectedCount: number | undefined = undefined;
    const countMatch = searchTarget.match(/(\d[\d,]*)\s*(?:cells?|rows?|occurrences?|records?|values?|instances?|items?)/i) ||
      searchTarget.match(/\((\d[\d,]*)(?:\s*cells?)?\)/i);
    if (countMatch && countMatch[1]) {
      affectedCount = parseInt(countMatch[1].replace(/,/g, ''), 10);
    }

    // Determine issue type
    let issueType: ReferencedIssueInfo['issueType'] = 'general';
    if (lowerSearch.includes('missing') || lowerSearch.includes('null') || lowerSearch.includes('blank') || lowerSearch.includes('empty')) {
      issueType = 'missing_values';
    } else if (lowerSearch.includes('duplicate') || lowerSearch.includes('dedup')) {
      issueType = 'duplicate_rows';
    } else if (lowerSearch.includes('outlier') || lowerSearch.includes('extreme') || lowerSearch.includes('z-score')) {
      issueType = 'outliers';
    } else if (lowerSearch.includes('formula') || lowerSearch.includes('injection') || lowerSearch.includes('sanitize')) {
      issueType = 'formula_injection';
    } else if (lowerSearch.includes('format') || lowerSearch.includes('date') || lowerSearch.includes('casing')) {
      issueType = 'invalid_format';
    }

    return {
      rawTitle: rawTitle || undefined,
      column: colName,
      issueType,
      affectedCount,
      description: searchTarget
    };
  }

  /**
   * Deterministically builds deep remediation evidence for a target column
   */
  private static buildRemediationEvidence(
    targetCol: string,
    rows: Record<string, any>[],
    referencedIssue?: ReferencedIssueInfo,
    datasetProfile?: DatasetProfile
  ): RemediationEvidence {
    const safeRows = Array.isArray(rows) ? rows : [];
    const totalRows = safeRows.length;

    // Inspect target column in current active rows
    let currentMissing = 0;
    const valueCounts: Record<string, number> = {};

    safeRows.forEach(row => {
      const val = row[targetCol];
      if (val === null || val === undefined || val === '' || String(val).trim() === '' || String(val).toLowerCase() === 'nan' || String(val).toLowerCase() === 'null') {
        currentMissing++;
      } else {
        const strVal = String(val).trim();
        valueCounts[strVal] = (valueCounts[strVal] || 0) + 1;
      }
    });

    const uniqueCount = Object.keys(valueCounts).length;
    const topCategories = Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([value, count]) => ({
        value,
        count,
        percentage: totalRows > 0 ? Math.round((count / totalRows) * 1000) / 10 : 0
      }));

    const isNumeric = datasetProfile?.numericColumns?.includes(targetCol) || false;
    const isDate = datasetProfile?.dateColumns?.includes(targetCol) || false;
    const colType = isNumeric ? 'numeric' : (isDate ? 'datetime' : 'categorical');

    const referencedCount = referencedIssue?.affectedCount || currentMissing;
    // Check if active file is in cleaned/resolved state
    const isCleanedOrResolvedInActiveState = totalRows > 0 && currentMissing === 0 && (referencedCount > 0);

    // Contextual domain advice
    const isDemographicOrSensitive = targetCol.toLowerCase().includes('gender') ||
      targetCol.toLowerCase().includes('race') ||
      targetCol.toLowerCase().includes('ethnicity') ||
      targetCol.toLowerCase().includes('suspect') ||
      targetCol.toLowerCase().includes('victim') ||
      targetCol.toLowerCase().includes('age') ||
      targetCol.toLowerCase().includes('identity');

    let recommendedAction = '';
    let rationale = '';

    if (colType === 'categorical') {
      if (isDemographicOrSensitive) {
        recommendedAction = `Explicit Categorical Encoding: Impute missing values with an explicit category such as "Unknown" or "Not Reported", or create a binary missingness indicator column.`;
        rationale = `Because "${targetCol}" represents sensitive demographic/forensic attributes, statistical mode imputation (filling with the most common value) is strictly inadvisable because it fabricates demographic characteristics and distorts crime incident statistics. Explicitly encoding missing cells as "Unknown" maintains record counts for aggregate analysis while transparently preserving true missingness.`;
      } else {
        recommendedAction = `Standard Category Imputation: Replace blank/null cells with a standardized "Unknown" placeholder or the verified default category.`;
        rationale = `Replacing null values with a standard fallback prevents null-pointer errors in downstream ETL pipelines and grouping queries while preserving the complete row cohort.`;
      }
    } else if (colType === 'numeric') {
      recommendedAction = `Median Imputation or Domain Boundary Filling: Fill missing numeric values with the column median (${datasetProfile?.columnProfiles[targetCol]?.stats?.median ?? 'computed median'}) or retain with an explicit missing flag.`;
      rationale = `For numeric distributions, median imputation minimizes distortion from extreme skew compared to mean imputation.`;
    } else {
      recommendedAction = `Standardized Formatting & Placeholder: Impute or format missing values in accordance with schema rules.`;
      rationale = `Standardizes structure across downstream analytics.`;
    }

    const pythonCode = colType === 'categorical'
      ? `# Pandas Categorical Imputation for "${targetCol}"\nimport pandas as pd\n\n# Load dataset\ndf = pd.read_csv('dataset.csv')\n\n# Standardize nulls and fill with 'Unknown'\ndf['${targetCol}'] = df['${targetCol}'].fillna('Unknown')\ndf['${targetCol}'] = df['${targetCol}'].replace(r'^\\s*$', 'Unknown', regex=True)\n\n# Save sanitized dataset\ndf.to_csv('dataset_remediated.csv', index=False)`
      : `# Pandas Numeric Imputation for "${targetCol}"\nimport pandas as pd\n\ndf = pd.read_csv('dataset.csv')\nmedian_val = df['${targetCol}'].median()\ndf['${targetCol}'] = df['${targetCol}'].fillna(median_val)\ndf.to_csv('dataset_remediated.csv', index=False)`;

    const sqlCode = colType === 'categorical'
      ? `-- SQL Remediation Query for "${targetCol}"\nUPDATE crime_incidents\nSET "${targetCol}" = COALESCE(NULLIF(TRIM("${targetCol}"), ''), 'Unknown')\nWHERE "${targetCol}" IS NULL OR TRIM("${targetCol}") = '';`
      : `-- SQL Remediation Query for "${targetCol}"\nUPDATE dataset\nSET "${targetCol}" = (SELECT MEDIAN("${targetCol}") FROM dataset)\nWHERE "${targetCol}" IS NULL;`;

    return {
      targetColumn: targetCol,
      issueType: referencedIssue?.issueType || 'missing_values',
      referencedAffectedCount: referencedCount,
      currentDatasetMissingCount: currentMissing,
      currentDatasetTotalRows: totalRows,
      currentDatasetUniqueCount: uniqueCount,
      topCategories,
      isCleanedOrResolvedInActiveState,
      recommendedAction,
      rationale,
      implementationStrategies: {
        categoryImputation: `Impute missing entries with explicit 'Unknown'`,
        explicitCategoryStrategy: `Replace missing cells with 'Unknown' or 'Not Reported'`,
        ruleBasedStrategy: `If secondary incident narrative or verified notes exist, backfill; otherwise preserve as 'Unknown'`,
        pythonCodeSnippet: pythonCode,
        sqlQuerySnippet: sqlCode,
        inAppAction: `In CSV Auditor Pro: Navigate to 'Clean' tab -> Select column "${targetCol}" -> Select 'Impute Missing' with replacement value "Unknown" -> Click 'Apply Hygiene'.`
      },
      validationCheck: `Verification: Run SELECT COUNT(*) FROM dataset WHERE "${targetCol}" IS NULL OR "${targetCol}" = ''; to ensure count equals 0, and verify category frequency distribution.`
    };
  }

  private static isGeneralGreeting(text: string): boolean {
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'how are you', 'help', 'who are you'];
    return greetings.includes(text) || (text.length <= 15 && greetings.some(g => text.startsWith(g)));
  }

  private static extractMatchedColumns(text: string, headers: string[]): string[] {
    const matched: string[] = [];
    const normalizedText = text.toLowerCase().replace(/[^a-z0-9_ ]/g, ' ');

    for (const h of headers) {
      const normH = h.toLowerCase().replace(/[^a-z0-9_ ]/g, ' ').trim();
      if (normH.length === 0) continue;

      // Exact phrase match or token match
      if (normalizedText.includes(normH)) {
        matched.push(h);
      } else {
        // Individual token matching for composite column names like "unit_price" -> "price"
        const tokens = normH.split(/[_\s]+/);
        const allTokensPresent = tokens.length > 1 && tokens.every(t => t.length > 2 && normalizedText.includes(t));
        if (allTokensPresent) {
          matched.push(h);
        }
      }
    }

    return matched;
  }

  private static extractAggregationOp(text: string): AggregationOperation {
    if (text.includes('average') || text.includes('mean') || text.includes('avg')) return 'mean';
    if (text.includes('median')) return 'median';
    if (text.includes('min') || text.includes('minimum') || text.includes('lowest')) return 'min';
    if (text.includes('max') || text.includes('maximum') || text.includes('highest')) return 'max';
    if (text.includes('count') || text.includes('how many') || text.includes('number of')) return 'count';
    return 'sum';
  }

  private static extractDateGranularity(text: string): DateGranularity {
    if (text.includes('year') || text.includes('annual')) return 'year';
    if (text.includes('quarter') || text.includes('q1') || text.includes('q2') || text.includes('q3') || text.includes('q4')) return 'quarter';
    if (text.includes('day') || text.includes('daily')) return 'day';
    return 'month';
  }

  private static extractLimitNumber(text: string): number | null {
    const match = text.match(/\b(top|bottom|first|last)\s+(\d{1,2})\b/);
    if (match && match[2]) {
      return parseInt(match[2], 10);
    }
    return null;
  }
}
