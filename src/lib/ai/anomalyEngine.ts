/**
 * CSV Auditor Pro - Anomaly Foundation Engine (Phase 2)
 * Deterministic statistical anomaly and outlier detection.
 * Identifies mathematical outliers and distribution anomalies without hallucinations.
 */

import {
  AnomalyFinding,
  AnomalyReport,
  DatasetProfile
} from './types';
import { CSVProfilingEngine } from './profiler';
import { StatisticalAnalysisEngine } from './statisticalEngine';

export class AnomalyDetectionEngine {
  /**
   * Runs comprehensive anomaly checks across all numeric and categorical columns
   */
  public static detectAnomalies(
    rows: Record<string, any>[],
    headers?: string[],
    datasetProfile?: DatasetProfile,
    options: { zScoreThreshold?: number; iqrMultiplier?: number; maxFindingsPerColumn?: number } = {}
  ): AnomalyReport {
    const safeRows = Array.isArray(rows) ? rows : [];
    const profile = datasetProfile || CSVProfilingEngine.profileDataset(safeRows, headers);
    const zScoreThreshold = options.zScoreThreshold || 3.0;
    const iqrMultiplier = options.iqrMultiplier || 1.5;
    const maxPerCol = options.maxFindingsPerColumn || 15;

    const findings: AnomalyFinding[] = [];
    const findingsByColumn: Record<string, AnomalyFinding[]> = {};

    if (safeRows.length < 4) {
      return {
        totalAnomaliesCount: 0,
        findings: [],
        findingsByColumn: {},
        generatedAt: new Date().toISOString()
      };
    }

    // 1. Numeric Anomaly Detection (IQR & Z-Score)
    for (const numCol of profile.numericColumns) {
      const colProfile = profile.columnProfiles[numCol];
      if (!colProfile || !colProfile.stats || colProfile.stats.stdDev === 0) continue;

      const { q1, q3, iqr, mean, stdDev } = colProfile.stats;
      const lowerIQRBound = q1 - (iqrMultiplier * iqr);
      const upperIQRBound = q3 + (iqrMultiplier * iqr);

      const colFindings: AnomalyFinding[] = [];

      for (let i = 0; i < safeRows.length; i++) {
        const rawVal = safeRows[i][numCol];
        const numVal = StatisticalAnalysisEngine.parseNumeric(rawVal);
        if (numVal === null) continue;

        // Z-Score test
        const zScore = Math.abs((numVal - mean) / stdDev);

        // IQR test
        const isIQROutlier = numVal < lowerIQRBound || numVal > upperIQRBound;
        const isZScoreOutlier = zScore >= zScoreThreshold;

        if (isIQROutlier || isZScoreOutlier) {
          const type = isZScoreOutlier ? 'zscore_outlier' : 'iqr_outlier';
          const reason = isZScoreOutlier
            ? `Value ${numVal} deviates by ${Math.round(zScore * 100) / 100} standard deviations from mean (${mean}).`
            : `Value ${numVal} lies outside the standard IQR boundary [${Math.round(lowerIQRBound * 100) / 100}, ${Math.round(upperIQRBound * 100) / 100}].`;

          const finding: AnomalyFinding = {
            id: `anomaly_${numCol}_${i}`,
            type,
            column: numCol,
            value: numVal,
            rowIndex: i + 1,
            score: Math.round(zScore * 100) / 100,
            threshold: isZScoreOutlier ? zScoreThreshold : iqrMultiplier,
            reason,
            isPotentialAnomaly: true,
            rowData: safeRows[i]
          };

          colFindings.push(finding);
          if (colFindings.length >= maxPerCol) break;
        }
      }

      if (colFindings.length > 0) {
        findingsByColumn[numCol] = colFindings;
        findings.push(...colFindings);
      }
    }

    // 2. Categorical Frequency-Based Anomalies (Rare categories < 0.5% in high cardinality)
    for (const catCol of profile.categoricalColumns) {
      const colProfile = profile.columnProfiles[catCol];
      if (!colProfile || !colProfile.frequencyDistribution || colProfile.uniqueCount < 5 || safeRows.length < 50) continue;

      const nonNullCount = safeRows.length - colProfile.missingCount;
      const rareItems = colProfile.frequencyDistribution.filter(f => f.count === 1 && (f.count / nonNullCount) < 0.01);

      if (rareItems.length > 0 && rareItems.length <= 5) {
        const colFindings: AnomalyFinding[] = [];

        for (let i = 0; i < safeRows.length; i++) {
          const val = String(safeRows[i][catCol] || '').trim();
          const isRare = rareItems.some(r => r.value === val);

          if (isRare) {
            const finding: AnomalyFinding = {
              id: `anomaly_rare_${catCol}_${i}`,
              type: 'rare_category',
              column: catCol,
              value: val,
              rowIndex: i + 1,
              reason: `Category "${val}" appears only 1 time (<1% frequency) across ${nonNullCount} non-empty records.`,
              isPotentialAnomaly: true,
              rowData: safeRows[i]
            };

            colFindings.push(finding);
            if (colFindings.length >= maxPerCol) break;
          }
        }

        if (colFindings.length > 0) {
          findingsByColumn[catCol] = (findingsByColumn[catCol] || []).concat(colFindings);
          findings.push(...colFindings);
        }
      }
    }

    return {
      totalAnomaliesCount: findings.length,
      findings,
      findingsByColumn,
      generatedAt: new Date().toISOString()
    };
  }
}
