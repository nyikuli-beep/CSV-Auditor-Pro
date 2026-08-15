/**
 * CSV Auditor Pro - Data Quality Analysis Engine (Phase 2)
 * Deterministic audit of data cleanliness, consistency, security, and integrity.
 * Returns structured findings without natural language hallucinations.
 */

import {
  DataQualityCategory,
  DataQualityFinding,
  DataQualityReport,
  DatasetProfile,
  QualitySeverity
} from './types';
import { CSVProfilingEngine } from './profiler';

const NULL_STRINGS = new Set([
  'null', 'nil', 'none', 'n/a', 'na', '#n/a', 'nan', 'undefined', '-', '--', '—', '?'
]);

export class DataQualityEngine {
  /**
   * Analyzes an entire CSV dataset and produces a structured DataQualityReport
   */
  public static analyze(
    rows: Record<string, any>[],
    headers?: string[],
    datasetProfile?: DatasetProfile
  ): DataQualityReport {
    const safeRows = Array.isArray(rows) ? rows : [];
    const resolvedProfile = datasetProfile || CSVProfilingEngine.profileDataset(safeRows, headers);
    const resolvedHeaders = resolvedProfile.headers;
    const rowCount = safeRows.length;

    const findings: DataQualityFinding[] = [];

    if (rowCount === 0) {
      return {
        totalIssuesCount: 0,
        qualityScore: 100,
        findings: [],
        issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        issuesByCategory: {
          missing_values: 0,
          duplicate_rows: 0,
          duplicate_identifiers: 0,
          inconsistent_types: 0,
          malformed_dates: 0,
          invalid_numeric: 0,
          inconsistent_categorical: 0,
          suspicious_whitespace: 0,
          empty_strings: 0,
          unexpected_null_representations: 0,
          extreme_numeric: 0,
          formula_injection: 0,
          formatting_inconsistency: 0
        },
        generatedAt: new Date().toISOString()
      };
    }

    // 1. Exact Duplicate Rows
    if (resolvedProfile.duplicateRowCount > 0) {
      const isSevere = resolvedProfile.duplicateRowPercentage > 10;
      findings.push({
        id: 'finding_duplicate_rows',
        category: 'duplicate_rows',
        severity: isSevere ? 'high' : 'medium',
        count: resolvedProfile.duplicateRowCount,
        percentage: resolvedProfile.duplicateRowPercentage,
        description: `Found ${resolvedProfile.duplicateRowCount.toLocaleString()} exact duplicate rows (${resolvedProfile.duplicateRowPercentage}% of total dataset).`,
        evidence: { duplicateRowCount: resolvedProfile.duplicateRowCount, percentage: resolvedProfile.duplicateRowPercentage }
      });
    }

    // 2. Check Column-Level Quality
    for (const header of resolvedHeaders) {
      const colProfile = resolvedProfile.columnProfiles[header];
      if (!colProfile) continue;

      // 2a. Missing Values
      if (colProfile.missingCount > 0) {
        const severity: QualitySeverity = colProfile.missingPercentage > 30 ? 'high' : (colProfile.missingPercentage > 10 ? 'medium' : 'low');
        findings.push({
          id: `finding_missing_${header}`,
          category: 'missing_values',
          severity,
          column: header,
          count: colProfile.missingCount,
          percentage: colProfile.missingPercentage,
          description: `Column "${header}" has ${colProfile.missingCount.toLocaleString()} missing or empty values (${colProfile.missingPercentage}%).`,
          evidence: { column: header, missingCount: colProfile.missingCount, missingPercentage: colProfile.missingPercentage }
        });
      }

      // 2b. Unexpected Null Representations ("N/A", "null", "-", etc.)
      const nullRepCount = this.checkUnexpectedNullRepresentations(safeRows, header);
      if (nullRepCount > 0) {
        const pct = Math.round((nullRepCount / rowCount) * 10000) / 100;
        findings.push({
          id: `finding_null_rep_${header}`,
          category: 'unexpected_null_representations',
          severity: 'low',
          column: header,
          count: nullRepCount,
          percentage: pct,
          description: `Column "${header}" contains ${nullRepCount} text-based null placeholders (e.g. "N/A", "NULL", or "-").`,
          evidence: { column: header, count: nullRepCount, percentage: pct }
        });
      }

      // 2c. Formula Injection Security Risks
      if (colProfile.formulaInjectionCount && colProfile.formulaInjectionCount > 0) {
        const pct = Math.round((colProfile.formulaInjectionCount / rowCount) * 10000) / 100;
        findings.push({
          id: `finding_formula_inj_${header}`,
          category: 'formula_injection',
          severity: 'critical',
          column: header,
          count: colProfile.formulaInjectionCount,
          percentage: pct,
          description: `Security Risk: Column "${header}" contains ${colProfile.formulaInjectionCount} cells starting with formula trigger characters (=, +, -, @).`,
          evidence: { column: header, count: colProfile.formulaInjectionCount, triggerChars: ['=', '+', '-', '@'] }
        });
      }

      // 2d. Suspicious Whitespace
      if (colProfile.suspiciousWhitespaceCount && colProfile.suspiciousWhitespaceCount > 0) {
        const pct = Math.round((colProfile.suspiciousWhitespaceCount / rowCount) * 10000) / 100;
        findings.push({
          id: `finding_whitespace_${header}`,
          category: 'suspicious_whitespace',
          severity: 'low',
          column: header,
          count: colProfile.suspiciousWhitespaceCount,
          percentage: pct,
          description: `Column "${header}" has ${colProfile.suspiciousWhitespaceCount} values with leading/trailing or redundant internal spaces.`,
          evidence: { column: header, count: colProfile.suspiciousWhitespaceCount }
        });
      }

      // 2e. Duplicate Primary Keys / Identifiers
      if (colProfile.inferredType === 'identifier') {
        const nonNullCount = rowCount - colProfile.missingCount;
        if (colProfile.uniqueCount < nonNullCount) {
          const dupKeysCount = nonNullCount - colProfile.uniqueCount;
          const pct = Math.round((dupKeysCount / nonNullCount) * 10000) / 100;
          findings.push({
            id: `finding_duplicate_id_${header}`,
            category: 'duplicate_identifiers',
            severity: 'critical',
            column: header,
            count: dupKeysCount,
            percentage: pct,
            description: `Identifier Column "${header}" contains ${dupKeysCount} non-unique key values (${pct}% collision rate).`,
            evidence: { column: header, uniqueCount: colProfile.uniqueCount, totalCount: nonNullCount, collisions: dupKeysCount }
          });
        }
      }

      // 2f. Inconsistent Categorical Values (e.g. "CA" vs "ca" vs " California ")
      if (colProfile.inferredType === 'categorical' && colProfile.frequencyDistribution) {
        const inconsistentPairs = this.checkInconsistentCategoricalCasing(colProfile.frequencyDistribution);
        if (inconsistentPairs.length > 0) {
          findings.push({
            id: `finding_inconsistent_cat_${header}`,
            category: 'inconsistent_categorical',
            severity: 'medium',
            column: header,
            count: inconsistentPairs.length,
            percentage: 0,
            description: `Column "${header}" has inconsistent casing or spelling across categories: ${inconsistentPairs.map(p => `"${p[0]}" vs "${p[1]}"`).join(', ')}.`,
            evidence: { column: header, inconsistentPairs }
          });
        }
      }

      // 2g. Invalid Numeric / Type Inconsistencies
      if (colProfile.inferredType === 'numeric' && colProfile.invalidValuesCount && colProfile.invalidValuesCount > 0) {
        const pct = Math.round((colProfile.invalidValuesCount / rowCount) * 10000) / 100;
        findings.push({
          id: `finding_invalid_num_${header}`,
          category: 'invalid_numeric',
          severity: 'high',
          column: header,
          count: colProfile.invalidValuesCount,
          percentage: pct,
          description: `Column "${header}" is inferred as numeric but contains ${colProfile.invalidValuesCount} non-numeric/unparseable values.`,
          evidence: { column: header, invalidCount: colProfile.invalidValuesCount, percentage: pct }
        });
      }

      // 2h. Malformed Dates
      if (colProfile.inferredType === 'datetime' && colProfile.invalidValuesCount && colProfile.invalidValuesCount > 0) {
        const pct = Math.round((colProfile.invalidValuesCount / rowCount) * 10000) / 100;
        findings.push({
          id: `finding_malformed_date_${header}`,
          category: 'malformed_dates',
          severity: 'medium',
          column: header,
          count: colProfile.invalidValuesCount,
          percentage: pct,
          description: `Date column "${header}" contains ${colProfile.invalidValuesCount} malformed or unparseable date strings.`,
          evidence: { column: header, invalidCount: colProfile.invalidValuesCount, percentage: pct }
        });
      }

      // 2i. Extreme Numeric Values (outliers > 3 * IQR or > 4 std deviations)
      if (colProfile.inferredType === 'numeric' && colProfile.stats) {
        const { q1, q3, iqr } = colProfile.stats;
        if (iqr > 0) {
          const lowerExtreme = q1 - (3.0 * iqr);
          const upperExtreme = q3 + (3.0 * iqr);
          let extremeCount = 0;

          for (let i = 0; i < safeRows.length; i++) {
            const numVal = parseFloat(String(safeRows[i][header]).replace(/[\$,]/g, ''));
            if (!isNaN(numVal) && (numVal < lowerExtreme || numVal > upperExtreme)) {
              extremeCount++;
            }
          }

          if (extremeCount > 0) {
            const pct = Math.round((extremeCount / rowCount) * 10000) / 100;
            findings.push({
              id: `finding_extreme_num_${header}`,
              category: 'extreme_numeric',
              severity: 'medium',
              column: header,
              count: extremeCount,
              percentage: pct,
              description: `Column "${header}" has ${extremeCount} extreme numeric values outside the 3x IQR boundary [<${lowerExtreme}, >${upperExtreme}].`,
              evidence: { column: header, count: extremeCount, lowerExtreme, upperExtreme, iqr }
            });
          }
        }
      }
    }

    // Tally issues by severity and category
    const issuesBySeverity: Record<QualitySeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };

    const issuesByCategory: Record<DataQualityCategory, number> = {
      missing_values: 0,
      duplicate_rows: 0,
      duplicate_identifiers: 0,
      inconsistent_types: 0,
      malformed_dates: 0,
      invalid_numeric: 0,
      inconsistent_categorical: 0,
      suspicious_whitespace: 0,
      empty_strings: 0,
      unexpected_null_representations: 0,
      extreme_numeric: 0,
      formula_injection: 0,
      formatting_inconsistency: 0
    };

    findings.forEach(f => {
      issuesBySeverity[f.severity] = (issuesBySeverity[f.severity] || 0) + 1;
      issuesByCategory[f.category] = (issuesByCategory[f.category] || 0) + 1;
    });

    // Score deduction based on issue severities
    let qualityScore = 100;
    qualityScore -= (issuesBySeverity.critical * 25);
    qualityScore -= (issuesBySeverity.high * 10);
    qualityScore -= (issuesBySeverity.medium * 4);
    qualityScore -= (issuesBySeverity.low * 1);
    qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)));

    return {
      totalIssuesCount: findings.length,
      qualityScore,
      findings,
      issuesBySeverity,
      issuesByCategory,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Helper: check text-based null strings
   */
  private static checkUnexpectedNullRepresentations(rows: Record<string, any>[], column: string): number {
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      const val = rows[i][column];
      if (val !== undefined && val !== null) {
        const lower = String(val).trim().toLowerCase();
        if (NULL_STRINGS.has(lower)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Helper: detect casing and whitespace discrepancies among categories
   */
  private static checkInconsistentCategoricalCasing(frequencyItems: Array<{ value: string; count: number }>): Array<[string, string]> {
    const seenLower = new Map<string, string>();
    const pairs: Array<[string, string]> = [];

    for (const item of frequencyItems) {
      const lower = item.value.trim().toLowerCase();
      if (seenLower.has(lower)) {
        const existing = seenLower.get(lower)!;
        if (existing !== item.value) {
          pairs.push([existing, item.value]);
        }
      } else {
        seenLower.set(lower, item.value);
      }
    }

    return pairs;
  }
}
