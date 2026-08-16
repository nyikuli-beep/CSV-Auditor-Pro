/**
 * CSV Auditor Pro - Conversational Question Router (Phase 2)
 * Intelligently classifies user queries, resolves target dataset columns,
 * and schedules deterministic computation plans before Gemini reasoning.
 */

import {
  AggregationOperation,
  AnalysisIntent,
  AnalysisRoutePlan,
  DatasetProfile,
  DateGranularity
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
    };
  } {
    const routePlan = this.plan(prompt, headers, datasetProfile, previousPlan);
    const safeRows = Array.isArray(rows) ? rows : [];

    const results: any = {};

    if (!routePlan.requiresExecution || safeRows.length === 0) {
      return { routePlan, results };
    }

    try {
      switch (routePlan.intent) {
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

        case 'data_quality': {
          results.qualityReport = DataQualityEngine.analyze(safeRows, headers, datasetProfile);
          break;
        }

        case 'anomaly_analysis': {
          results.anomalyReport = AnomalyDetectionEngine.detectAnomalies(safeRows, headers, datasetProfile);
          break;
        }

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

    // 2. Identify candidate columns from headers
    let matchedColumns = this.extractMatchedColumns(text, headers);

    // If follow-up context is active and user didn't mention specific columns, inherit from previous turn
    if (matchedColumns.length === 0 && previousPlan && previousPlan.targetColumns.length > 0) {
      const isFollowUpKeywords = text.includes('what about') || text.includes('and ') || text.includes('how about') ||
        text.includes('the rest') || text.includes('bottom') || text.includes('top') || text.includes('average') ||
        text.includes('sum') || text.includes('median') || text.includes('percentage') || text.includes('breakdown');
      if (isFollowUpKeywords) {
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

    // 3. Classify Intent
    // A. Anomaly / Outlier
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

    // B. Data Quality / Duplicates / Missing Values / Health
    if (
      text.includes('quality') || text.includes('missing') || text.includes('duplicate') ||
      text.includes('clean') || text.includes('error') || text.includes('null') ||
      text.includes('health') || text.includes('injection') || text.includes('audit')
    ) {
      return {
        intent: 'data_quality',
        targetColumns: matchedColumns,
        groupColumns,
        dateColumns,
        metricColumns,
        requiresExecution: true,
        confidence: 0.95,
        reasoning: 'User asked about data hygiene, quality score, duplicates, or missing values.'
      };
    }

    // C. Trend / Over Time
    if (text.includes('trend') || text.includes('over time') || text.includes('by month') || text.includes('monthly') || text.includes('by year') || text.includes('growth')) {
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

    // D. Ranking (Top N, Bottom N, Highest, Lowest, Most, Least)
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

    // E. Correlation
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

    // F. Aggregation (Sum, Average, Total, Count, Group By)
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

    // G. Column Lookup / Distribution
    if (matchedColumns.length === 1) {
      return {
        intent: 'column_lookup',
        targetColumns: matchedColumns,
        groupColumns: matchedColumns,
        dateColumns: [],
        metricColumns: [],
        requiresExecution: true,
        confidence: 0.85,
        reasoning: `User queried specific column distribution for "${matchedColumns[0]}".`
      };
    }

    // H. Dataset Summary
    if (text.includes('summary') || text.includes('overview') || text.includes('describe') || text.includes('about this file') || text.includes('what is in this')) {
      return {
        intent: 'dataset_summary',
        targetColumns: [],
        groupColumns: [],
        dateColumns: [],
        metricColumns: [],
        requiresExecution: false,
        confidence: 0.90,
        reasoning: 'User asked for high-level dataset overview and structural profile.'
      };
    }

    // Default to general conversation or column lookup
    return {
      intent: matchedColumns.length > 0 ? 'column_lookup' : 'dataset_summary',
      targetColumns: matchedColumns,
      groupColumns,
      dateColumns,
      metricColumns,
      requiresExecution: matchedColumns.length > 0,
      confidence: 0.70,
      reasoning: 'Standard analytical question requiring contextual dataset profile.'
    };
  }

  // ==========================================
  // HELPER PARSING FUNCTIONS
  // ==========================================

  private static isGeneralGreeting(text: string): boolean {
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'how are you', 'help', 'who are you'];
    return greetings.includes(text) || (text.length <= 15 && greetings.some(g => text.startsWith(g)));
  }

  private static extractMatchedColumns(text: string, headers: string[]): string[] {
    const matched: string[] = [];
    const normalizedText = text.replace(/[^a-z0-9_ ]/g, ' ');

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
