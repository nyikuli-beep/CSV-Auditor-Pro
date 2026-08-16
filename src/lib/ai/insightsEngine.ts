/**
 * CSV Auditor Pro - AI Insights Engine (Phase 3)
 * 
 * Computes deterministic, traceable, evidence-backed insights across 6 core dimensions:
 * 1. Executive Summary
 * 2. Data Quality (missing values, duplicates, invalid values, suspicious whitespace, formula risks)
 * 3. Statistical Insights (distributions, sums, averages, medians, IQR fences, variances)
 * 4. Trends & Patterns (time-series, category shares, correlations)
 * 5. Potential Anomalies (labeled strictly as "Potential anomaly", "Unusual pattern", "Requires review")
 * 6. Actionable Recommendations (practical remediation with exact formulas/steps)
 * 
 * All metrics are mathematically derived from the actual dataset. Zero fabricated numbers.
 */

import {
  DatasetProfile,
  DataQualityReport,
  AnomalyReport,
  ColumnProfile,
  DataQualityFinding,
  AnomalyFinding
} from './types';
import { CSVProfilingEngine } from './profiler';
import { DataQualityEngine } from './dataQuality';
import { AnomalyDetectionEngine } from './anomalyEngine';
import { StatisticalEngine } from './statisticalEngine';

export interface InsightEvidence {
  column?: string;
  calculatedValue?: string | number;
  affectedRowCount?: number;
  percentage?: number;
  comparisonValue?: string | number;
  timePeriod?: string;
  category?: string;
  analyticalMethod?: string;
  threshold?: string | number;
}

export interface InsightCardItem {
  id: string;
  title: string;
  summary: string;
  badge: 'Data verified' | 'Data derived' | 'Interpretation' | 'Requires review' | 'High priority' | 'Compliant';
  badgeType: 'verified' | 'derived' | 'warning' | 'review' | 'success';
  evidence: InsightEvidence;
  impactScore?: number; // 0-100
  actionableStep?: string;
}

export interface ExecutiveSummaryInsight {
  headline: string;
  healthGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  overallScore: number;
  readinessStatus: 'Production Ready' | 'Remediation Required' | 'Critical Review Needed';
  totalRecords: number;
  totalColumns: number;
  totalIssues: number;
  duplicateRate: number;
  missingRate: number;
  narrative: string;
  keyStrengths: string[];
  primaryVulnerabilities: string[];
  evidenceCards: InsightCardItem[];
}

export interface DataQualityInsights {
  qualityScore: number;
  totalFindings: number;
  missingValuesSummary: {
    totalMissingCells: number;
    affectedColumnsCount: number;
    highestMissingColumn?: { name: string; count: number; percentage: number };
  };
  duplicatesSummary: {
    duplicateRows: number;
    percentage: number;
  };
  formattingSummary: {
    whitespaceIssues: number;
    formulaRisks: number;
    invalidTypeCells: number;
  };
  findings: InsightCardItem[];
}

export interface StatisticalInsights {
  numericColumnsCount: number;
  columnProfiles: Record<string, {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    sum: number;
    iqr: number;
    skewnessDirection?: 'right-skewed' | 'left-skewed' | 'symmetrical';
  }>;
  notableFindings: InsightCardItem[];
}

export interface TrendsPatternsInsights {
  temporalPatterns: InsightCardItem[];
  categoricalDistributions: {
    column: string;
    uniqueCount: number;
    dominantCategory?: { name: string; count: number; percentage: number };
    distributionEntropy: 'concentrated' | 'balanced' | 'highly_fragmented';
  }[];
  correlations: {
    columnA: string;
    columnB: string;
    coefficient: number;
    relationship: string;
  }[];
  patternFindings: InsightCardItem[];
}

export interface PotentialAnomaliesInsights {
  totalPotentialAnomalies: number;
  affectedColumnsCount: number;
  anomalyRate: number;
  items: InsightCardItem[];
  disclaimer: string;
}

export interface RecommendationsInsights {
  overallRemediationEffort: 'Low' | 'Medium' | 'High';
  priorityActions: {
    id: string;
    title: string;
    category: 'Hygiene' | 'Schema' | 'Security' | 'Validation';
    urgency: 'Immediate' | 'Scheduled' | 'Best Practice';
    description: string;
    evidence: InsightEvidence;
    sqlSnippet?: string;
    pythonSnippet?: string;
    estimatedQualityGain: number;
  }[];
}

export interface FullDatasetInsightsPayload {
  fileId: string;
  fileName: string;
  generatedAt: string;
  executiveSummary: ExecutiveSummaryInsight;
  dataQuality: DataQualityInsights;
  statisticalInsights: StatisticalInsights;
  trendsPatterns: TrendsPatternsInsights;
  potentialAnomalies: PotentialAnomaliesInsights;
  recommendations: RecommendationsInsights;
}

export class InsightsEngine {
  /**
   * Generates a complete, deterministic, evidence-backed insights package from raw data
   */
  public static generateInsights(
    rows: Record<string, any>[],
    headers: string[],
    fileName = 'dataset.csv',
    fileId = 'current_file'
  ): FullDatasetInsightsPayload {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeHeaders = Array.isArray(headers) && headers.length > 0
      ? headers
      : (safeRows.length > 0 ? Object.keys(safeRows[0]) : []);

    const profile = CSVProfilingEngine.profileDataset(safeRows, safeHeaders, fileId, fileName);
    const qualityReport = DataQualityEngine.analyze(safeRows, safeHeaders, profile);
    const anomalyReport = AnomalyDetectionEngine.detectAnomalies(safeRows, safeHeaders, profile);

    const executiveSummary = this.buildExecutiveSummary(profile, qualityReport, anomalyReport);
    const dataQuality = this.buildDataQualityInsights(profile, qualityReport);
    const statisticalInsights = this.buildStatisticalInsights(profile, safeRows);
    const trendsPatterns = this.buildTrendsPatternsInsights(profile, safeRows);
    const potentialAnomalies = this.buildPotentialAnomaliesInsights(profile, anomalyReport);
    const recommendations = this.buildRecommendationsInsights(profile, qualityReport, anomalyReport);

    return {
      fileId,
      fileName,
      generatedAt: new Date().toISOString(),
      executiveSummary,
      dataQuality,
      statisticalInsights,
      trendsPatterns,
      potentialAnomalies,
      recommendations
    };
  }

  // ==========================================
  // 1. EXECUTIVE SUMMARY
  // ==========================================
  private static buildExecutiveSummary(
    profile: DatasetProfile,
    quality: DataQualityReport,
    anomalies: AnomalyReport
  ): ExecutiveSummaryInsight {
    const score = quality.qualityScore;
    let healthGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    let readinessStatus: 'Production Ready' | 'Remediation Required' | 'Critical Review Needed' = 'Production Ready';

    if (score >= 95) {
      healthGrade = 'A+';
      readinessStatus = 'Production Ready';
    } else if (score >= 88) {
      healthGrade = 'A';
      readinessStatus = 'Production Ready';
    } else if (score >= 75) {
      healthGrade = 'B';
      readinessStatus = 'Remediation Required';
    } else if (score >= 60) {
      healthGrade = 'C';
      readinessStatus = 'Remediation Required';
    } else if (score >= 45) {
      healthGrade = 'D';
      readinessStatus = 'Critical Review Needed';
    } else {
      healthGrade = 'F';
      readinessStatus = 'Critical Review Needed';
    }

    const keyStrengths: string[] = [];
    const primaryVulnerabilities: string[] = [];

    if (profile.duplicateRowCount === 0) {
      keyStrengths.push('Zero duplicate rows detected across all records.');
    }
    if (profile.overallMissingPercentage < 1.0) {
      keyStrengths.push(`High cell completeness (${(100 - profile.overallMissingPercentage).toFixed(1)}% populated cells).`);
    }
    if (profile.numericColumns.length > 0) {
      keyStrengths.push(`${profile.numericColumns.length} structured numeric metric columns validated.`);
    }

    if (profile.duplicateRowCount > 0) {
      primaryVulnerabilities.push(`${profile.duplicateRowCount.toLocaleString()} duplicate records (${profile.duplicateRowPercentage.toFixed(1)}% of dataset).`);
    }
    if (profile.totalMissingCells > 0) {
      primaryVulnerabilities.push(`${profile.totalMissingCells.toLocaleString()} missing or empty cell values (${profile.overallMissingPercentage.toFixed(1)}% total missing).`);
    }
    if (anomalies.totalAnomaliesCount > 0) {
      primaryVulnerabilities.push(`${anomalies.totalAnomaliesCount.toLocaleString()} potential statistical anomalies require human review.`);
    }

    const narrative = `Dataset "${profile.fileName}" contains ${profile.rowCount.toLocaleString()} records across ${profile.columnCount} columns with an overall data quality score of ${score}/100 (Grade ${healthGrade}). ${
      readinessStatus === 'Production Ready'
        ? 'The data structure is clean and ready for downstream analytics and automated pipelines.'
        : readinessStatus === 'Remediation Required'
        ? 'Targeted remediation is recommended to resolve identified missing values and formatting inconsistencies.'
        : 'Immediate data hygiene intervention is required before ingestion into production databases.'
    }`;

    const evidenceCards: InsightCardItem[] = [
      {
        id: 'exec-card-1',
        title: 'Dataset Health Index',
        summary: `Computed score of ${score}/100 based on validation rules and integrity penalties.`,
        badge: 'Data verified',
        badgeType: score >= 85 ? 'verified' : score >= 65 ? 'warning' : 'review',
        evidence: {
          calculatedValue: `${score}/100`,
          affectedRowCount: profile.rowCount,
          analyticalMethod: 'Deterministic Weighted Penalty Matrix'
        }
      },
      {
        id: 'exec-card-2',
        title: 'Row Uniqueness & Redundancy',
        summary: profile.duplicateRowCount === 0
          ? 'All records are unique across row-hash signatures.'
          : `${profile.duplicateRowCount.toLocaleString()} duplicate rows detected (${profile.duplicateRowPercentage.toFixed(1)}%).`,
        badge: 'Data verified',
        badgeType: profile.duplicateRowCount === 0 ? 'success' : 'warning',
        evidence: {
          calculatedValue: `${profile.duplicateRowCount} rows`,
          percentage: profile.duplicateRowPercentage,
          affectedRowCount: profile.duplicateRowCount,
          analyticalMethod: 'SHA-256 Record Hash Matching'
        }
      },
      {
        id: 'exec-card-3',
        title: 'Cell Population Rate',
        summary: `${(100 - profile.overallMissingPercentage).toFixed(1)}% of matrix cells contain valid values.`,
        badge: 'Data verified',
        badgeType: profile.overallMissingPercentage < 5 ? 'verified' : 'warning',
        evidence: {
          calculatedValue: `${profile.totalMissingCells} missing cells`,
          percentage: profile.overallMissingPercentage,
          comparisonValue: `${profile.totalCells.toLocaleString()} total cells`,
          analyticalMethod: 'Null / Empty String Aggregation'
        }
      }
    ];

    return {
      headline: `Executive Summary: ${profile.fileName}`,
      healthGrade,
      overallScore: score,
      readinessStatus,
      totalRecords: profile.rowCount,
      totalColumns: profile.columnCount,
      totalIssues: quality.totalIssuesCount,
      duplicateRate: profile.duplicateRowPercentage,
      missingRate: profile.overallMissingPercentage,
      narrative,
      keyStrengths,
      primaryVulnerabilities,
      evidenceCards
    };
  }

  // ==========================================
  // 2. DATA QUALITY INSIGHTS
  // ==========================================
  private static buildDataQualityInsights(
    profile: DatasetProfile,
    quality: DataQualityReport
  ): DataQualityInsights {
    let highestMissing: { name: string; count: number; percentage: number } | undefined;
    let missingColsCount = 0;
    let totalWhitespace = 0;
    let totalFormulas = 0;
    let totalInvalidTypes = 0;

    Object.values(profile.columnProfiles).forEach(col => {
      if (col.missingCount > 0) {
        missingColsCount++;
        if (!highestMissing || col.missingCount > highestMissing.count) {
          highestMissing = {
            name: col.name,
            count: col.missingCount,
            percentage: col.missingPercentage
          };
        }
      }
      totalWhitespace += (col.suspiciousWhitespaceCount || 0);
      totalFormulas += (col.formulaInjectionCount || 0);
      totalInvalidTypes += (col.invalidValuesCount || 0);
    });

    const findings: InsightCardItem[] = quality.findings.map(f => {
      let badge: InsightCardItem['badge'] = 'Data verified';
      let badgeType: InsightCardItem['badgeType'] = 'verified';

      if (f.severity === 'critical') {
        badge = 'Requires review';
        badgeType = 'review';
      } else if (f.severity === 'high') {
        badge = 'High priority';
        badgeType = 'warning';
      }

      return {
        id: f.id,
        title: f.category.replace(/_/g, ' ').toUpperCase(),
        summary: f.description,
        badge,
        badgeType,
        evidence: {
          column: f.column,
          calculatedValue: f.count,
          affectedRowCount: f.count,
          percentage: f.percentage,
          category: f.category,
          analyticalMethod: 'Deterministic Rule Validation'
        },
        actionableStep: f.category === 'missing_values'
          ? `Apply imputation or default fallback to column "${f.column}".`
          : f.category === 'duplicate_rows'
          ? 'Use deduplication tool to keep first instance of matching rows.'
          : f.category === 'formula_injection'
          ? 'Sanitize prefix characters (=, +, -, @) to neutralize spreadsheet injection.'
          : undefined
      };
    });

    return {
      qualityScore: quality.qualityScore,
      totalFindings: quality.totalIssuesCount,
      missingValuesSummary: {
        totalMissingCells: profile.totalMissingCells,
        affectedColumnsCount: missingColsCount,
        highestMissingColumn: highestMissing
      },
      duplicatesSummary: {
        duplicateRows: profile.duplicateRowCount,
        percentage: profile.duplicateRowPercentage
      },
      formattingSummary: {
        whitespaceIssues: totalWhitespace,
        formulaRisks: totalFormulas,
        invalidTypeCells: totalInvalidTypes
      },
      findings
    };
  }

  // ==========================================
  // 3. STATISTICAL INSIGHTS
  // ==========================================
  private static buildStatisticalInsights(
    profile: DatasetProfile,
    rows: Record<string, any>[]
  ): StatisticalInsights {
    const columnProfilesRecord: StatisticalInsights['columnProfiles'] = {};
    const notableFindings: InsightCardItem[] = [];

    profile.numericColumns.forEach(colName => {
      const col = profile.columnProfiles[colName];
      if (col && col.stats) {
        const stats = col.stats;
        const meanMedianDiff = Math.abs(stats.mean - stats.median);
        const relativeDiff = stats.mean !== 0 ? (meanMedianDiff / Math.abs(stats.mean)) : 0;
        
        let skewnessDirection: 'right-skewed' | 'left-skewed' | 'symmetrical' = 'symmetrical';
        if (relativeDiff > 0.15) {
          skewnessDirection = stats.mean > stats.median ? 'right-skewed' : 'left-skewed';
        }

        columnProfilesRecord[colName] = {
          min: stats.min,
          max: stats.max,
          mean: stats.mean,
          median: stats.median,
          stdDev: stats.stdDev,
          sum: stats.sum,
          iqr: stats.iqr,
          skewnessDirection
        };

        // Generate notable finding
        notableFindings.push({
          id: `stat-finding-${colName}`,
          title: `Distribution Profile: ${colName}`,
          summary: `Calculated average of ${stats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })} with median ${stats.median.toLocaleString(undefined, { maximumFractionDigits: 2 })} (range: ${stats.min.toLocaleString()} to ${stats.max.toLocaleString()}). ${
            skewnessDirection !== 'symmetrical'
              ? `Distribution exhibits a ${skewnessDirection} tail.`
              : 'Values follow a balanced central distribution.'
          }`,
          badge: 'Data derived',
          badgeType: 'derived',
          evidence: {
            column: colName,
            calculatedValue: `Mean: ${stats.mean.toFixed(2)}, Median: ${stats.median.toFixed(2)}`,
            comparisonValue: `Min: ${stats.min}, Max: ${stats.max}`,
            analyticalMethod: 'Parametric Summary Statistics'
          }
        });
      }
    });

    return {
      numericColumnsCount: profile.numericColumns.length,
      columnProfiles: columnProfilesRecord,
      notableFindings
    };
  }

  // ==========================================
  // 4. TRENDS & PATTERNS
  // ==========================================
  private static buildTrendsPatternsInsights(
    profile: DatasetProfile,
    rows: Record<string, any>[]
  ): TrendsPatternsInsights {
    const temporalPatterns: InsightCardItem[] = [];
    const patternFindings: InsightCardItem[] = [];
    const categoricalDistributions: TrendsPatternsInsights['categoricalDistributions'] = [];
    const correlations: TrendsPatternsInsights['correlations'] = [];

    // Analyze categorical distributions
    profile.categoricalColumns.slice(0, 5).forEach(colName => {
      const col = profile.columnProfiles[colName];
      if (col && col.frequencyDistribution && col.frequencyDistribution.length > 0) {
        const dominant = col.frequencyDistribution[0];
        const uniqueCount = col.uniqueCount;
        const dominantShare = dominant.percentage;

        let distributionEntropy: 'concentrated' | 'balanced' | 'highly_fragmented' = 'balanced';
        if (dominantShare > 60) {
          distributionEntropy = 'concentrated';
        } else if (uniqueCount > 20 && dominantShare < 15) {
          distributionEntropy = 'highly_fragmented';
        }

        categoricalDistributions.push({
          column: colName,
          uniqueCount,
          dominantCategory: {
            name: dominant.value,
            count: dominant.count,
            percentage: dominant.percentage
          },
          distributionEntropy
        });

        patternFindings.push({
          id: `pattern-${colName}`,
          title: `Category Distribution: ${colName}`,
          summary: `Top segment "${dominant.value}" comprises ${dominant.count.toLocaleString()} rows (${dominant.percentage.toFixed(1)}% of total records) across ${uniqueCount} distinct values.`,
          badge: 'Data verified',
          badgeType: 'verified',
          evidence: {
            column: colName,
            calculatedValue: `${dominant.value} (${dominant.percentage.toFixed(1)}%)`,
            affectedRowCount: dominant.count,
            percentage: dominant.percentage,
            comparisonValue: `${uniqueCount} distinct classes`,
            analyticalMethod: 'Frequency Binning & Proportions'
          }
        });
      }
    });

    // Temporal Trends if date column present
    if (profile.dateColumns.length > 0 && profile.numericColumns.length > 0) {
      const dateCol = profile.dateColumns[0];
      const valCol = profile.numericColumns[0];
      const trend = StatisticalEngine.trend(rows, dateCol, valCol, 'month');

      if (trend.dataPoints.length > 1) {
        temporalPatterns.push({
          id: `trend-${dateCol}-${valCol}`,
          title: `Chronological Trajectory (${valCol} over ${dateCol})`,
          summary: `Overall trajectory identified as ${trend.overallTrend} across ${trend.totalPeriods} periods. Peak recorded in ${trend.highestPeriod.period} (${trend.highestPeriod.value.toLocaleString()}).`,
          badge: 'Data derived',
          badgeType: 'derived',
          evidence: {
            column: valCol,
            timePeriod: `${trend.lowestPeriod.period} to ${trend.highestPeriod.period}`,
            calculatedValue: `Peak: ${trend.highestPeriod.value.toLocaleString()}`,
            analyticalMethod: 'Time-Series Aggregation (Monthly)'
          }
        });
      }
    }

    // Correlations between numeric columns
    if (profile.numericColumns.length >= 2) {
      const c1 = profile.numericColumns[0];
      const c2 = profile.numericColumns[1];
      const corr = StatisticalEngine.correlation(rows, c1, c2);

      correlations.push({
        columnA: c1,
        columnB: c2,
        coefficient: corr.pearsonCoefficient,
        relationship: `${corr.direction} (${corr.strength.replace('_', ' ')})`
      });

      patternFindings.push({
        id: `corr-${c1}-${c2}`,
        title: `Correlation Analysis: ${c1} vs ${c2}`,
        summary: `Pearson correlation coefficient r = ${corr.pearsonCoefficient.toFixed(3)}, indicating a ${corr.strength.replace('_', ' ')} ${corr.direction} relationship.`,
        badge: 'Data derived',
        badgeType: 'derived',
        evidence: {
          column: `${c1} & ${c2}`,
          calculatedValue: `r = ${corr.pearsonCoefficient.toFixed(3)}`,
          analyticalMethod: 'Pearson Product-Moment Correlation'
        }
      });
    }

    return {
      temporalPatterns,
      categoricalDistributions,
      correlations,
      patternFindings
    };
  }

  // ==========================================
  // 5. POTENTIAL ANOMALIES
  // ==========================================
  private static buildPotentialAnomaliesInsights(
    profile: DatasetProfile,
    anomalies: AnomalyReport
  ): PotentialAnomaliesInsights {
    const items: InsightCardItem[] = anomalies.findings.map(a => ({
      id: a.id,
      title: `Potential Anomaly: Column "${a.column}"`,
      summary: a.reason,
      badge: 'Requires review',
      badgeType: 'review',
      evidence: {
        column: a.column,
        calculatedValue: typeof a.value === 'number' ? a.value.toLocaleString() : String(a.value),
        affectedRowCount: 1,
        threshold: a.threshold !== undefined ? a.threshold : undefined,
        analyticalMethod: a.type === 'iqr_outlier'
          ? 'Tukey IQR Multiplier Fence (1.5x)'
          : a.type === 'zscore_outlier'
          ? 'Z-Score Deviation (|z| > 3.0)'
          : 'Rare Category Distribution Frequency (<0.5%)'
      },
      actionableStep: `Verify whether row #${a.rowIndex + 1} value "${a.value}" represents a valid transaction outlier or a data entry mistake.`
    }));

    const affectedCols = Object.keys(anomalies.findingsByColumn).length;
    const anomalyRate = profile.rowCount > 0 ? (anomalies.totalAnomaliesCount / profile.rowCount) * 100 : 0;

    return {
      totalPotentialAnomalies: anomalies.totalAnomaliesCount,
      affectedColumnsCount: affectedCols,
      anomalyRate,
      items,
      disclaimer: 'Note: Potential anomalies are statistical outliers calculated via mathematical fences (IQR/Z-score) and do not imply fraudulent or malicious intent. Human review is recommended.'
    };
  }

  // ==========================================
  // 6. ACTIONABLE RECOMMENDATIONS
  // ==========================================
  private static buildRecommendationsInsights(
    profile: DatasetProfile,
    quality: DataQualityReport,
    anomalies: AnomalyReport
  ): RecommendationsInsights {
    const actions: RecommendationsInsights['priorityActions'] = [];

    // Recommendation 1: Duplicate Rows
    if (profile.duplicateRowCount > 0) {
      actions.push({
        id: 'rec-duplicates',
        title: `Remove ${profile.duplicateRowCount.toLocaleString()} Duplicate Records`,
        category: 'Hygiene',
        urgency: 'Immediate',
        description: `Eliminate identical duplicate rows to prevent distorted metric aggregations and double-counting in business reports.`,
        evidence: {
          calculatedValue: `${profile.duplicateRowCount} duplicate rows`,
          percentage: profile.duplicateRowPercentage,
          affectedRowCount: profile.duplicateRowCount,
          analyticalMethod: 'Hash Deduplication'
        },
        sqlSnippet: `-- Remove duplicate rows retaining earliest record\nDELETE FROM table_name\nWHERE id NOT IN (\n  SELECT MIN(id)\n  FROM table_name\n  GROUP BY ${profile.headers.slice(0, 3).join(', ')}\n);`,
        pythonSnippet: `# Pandas Deduplication\ndf = df.drop_duplicates(keep='first')`,
        estimatedQualityGain: Math.min(Math.round(profile.duplicateRowPercentage * 1.5), 20)
      });
    }

    // Recommendation 2: Missing Values in Key Columns
    Object.values(profile.columnProfiles).forEach(col => {
      if (col.missingCount > 0 && col.missingPercentage > 5) {
        const isNumeric = col.inferredType === 'numeric';
        actions.push({
          id: `rec-missing-${col.name}`,
          title: `Handle Missing Values in "${col.name}" (${col.missingCount} cells)`,
          category: 'Validation',
          urgency: col.missingPercentage > 20 ? 'Immediate' : 'Scheduled',
          description: `Column "${col.name}" contains ${col.missingCount.toLocaleString()} missing records (${col.missingPercentage.toFixed(1)}%). ${
            isNumeric ? 'Impute missing values using the median or flag as null.' : 'Populate with default fallback or verify upstream ETL extract.'
          }`,
          evidence: {
            column: col.name,
            calculatedValue: `${col.missingCount} missing (${col.missingPercentage.toFixed(1)}%)`,
            affectedRowCount: col.missingCount,
            percentage: col.missingPercentage,
            analyticalMethod: 'Missing Completeness Check'
          },
          sqlSnippet: isNumeric
            ? `UPDATE table_name SET "${col.name}" = COALESCE("${col.name}", 0) WHERE "${col.name}" IS NULL;`
            : `UPDATE table_name SET "${col.name}" = COALESCE("${col.name}", 'UNKNOWN') WHERE "${col.name}" IS NULL;`,
          pythonSnippet: isNumeric
            ? `df['${col.name}'] = df['${col.name}'].fillna(df['${col.name}'].median())`
            : `df['${col.name}'] = df['${col.name}'].fillna('UNKNOWN')`,
          estimatedQualityGain: Math.min(Math.round(col.missingPercentage * 0.8), 15)
        });
      }
    });

    // Recommendation 3: Formula Injection Protection
    let formulaThreatCount = 0;
    Object.values(profile.columnProfiles).forEach(c => {
      formulaThreatCount += (c.formulaInjectionCount || 0);
    });

    if (formulaThreatCount > 0) {
      actions.push({
        id: 'rec-formula-injection',
        title: `Sanitize ${formulaThreatCount} Formula Injection Characters`,
        category: 'Security',
        urgency: 'Immediate',
        description: `Detect and escape leading formula prefixes (=, +, -, @, \\t, \\r) in text cells to prevent CSV Injection (CWE-1236) upon export to Excel or Google Sheets.`,
        evidence: {
          calculatedValue: `${formulaThreatCount} risky cells`,
          affectedRowCount: formulaThreatCount,
          analyticalMethod: 'Formula Character Scan'
        },
        sqlSnippet: `-- Prefix formula-prone characters with single apostrophe\nUPDATE table_name\nSET text_col = '''' || text_col\nWHERE text_col ~ '^[=+\\-@]';`,
        pythonSnippet: `# Escape formula prefixes\ndf['col'] = df['col'].apply(lambda x: f"'{x}" if isinstance(x, str) and x.startswith(('=', '+', '-', '@')) else x)`,
        estimatedQualityGain: 10
      });
    }

    // Recommendation 4: Whitespace Trimming
    let whitespaceCount = 0;
    Object.values(profile.columnProfiles).forEach(c => {
      whitespaceCount += (c.suspiciousWhitespaceCount || 0);
    });

    if (whitespaceCount > 0) {
      actions.push({
        id: 'rec-whitespace',
        title: `Trim Leading/Trailing Whitespace (${whitespaceCount} occurrences)`,
        category: 'Hygiene',
        urgency: 'Best Practice',
        description: `Un-trimmed spaces cause failed equality comparisons, grouped split keys, and broken foreign key joins.`,
        evidence: {
          calculatedValue: `${whitespaceCount} whitespace errors`,
          affectedRowCount: whitespaceCount,
          analyticalMethod: 'Regex Whitespace Detection'
        },
        sqlSnippet: `UPDATE table_name SET col_name = TRIM(col_name);`,
        pythonSnippet: `df['col_name'] = df['col_name'].astype(str).str.strip()`,
        estimatedQualityGain: 5
      });
    }

    const effort: 'Low' | 'Medium' | 'High' = actions.length > 4 ? 'High' : actions.length > 2 ? 'Medium' : 'Low';

    return {
      overallRemediationEffort: effort,
      priorityActions: actions.slice(0, 6)
    };
  }
}
