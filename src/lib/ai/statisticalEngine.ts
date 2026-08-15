/**
 * CSV Auditor Pro - Statistical Analysis Engine (Phase 2)
 * Deterministic mathematical computation layer for aggregations, rankings,
 * comparisons, trends, correlations, and frequency distributions.
 */

import {
  AggregationGroup,
  AggregationOperation,
  AggregationResult,
  ComparisonResult,
  CorrelationResult,
  DateGranularity,
  RankingItem,
  RankingResult,
  TrendDataPoint,
  TrendResult
} from './types';

export class StatisticalAnalysisEngine {
  /**
   * 1. Deterministic Aggregation with optional Group-By (Category or Date)
   */
  public static computeAggregation(
    rows: Record<string, any>[],
    targetColumn: string,
    operation: AggregationOperation = 'sum',
    groupByColumn?: string,
    dateGranularity?: DateGranularity
  ): AggregationResult {
    const safeRows = Array.isArray(rows) ? rows : [];
    const sampleSize = safeRows.length;

    if (sampleSize === 0) {
      return {
        operation,
        targetColumn,
        groupByColumn,
        dateGranularity,
        groups: [],
        sampleSize: 0
      };
    }

    // If no group by column, calculate across all rows as a single group
    if (!groupByColumn) {
      const numericValues = this.extractNumericValues(safeRows, targetColumn);
      const val = this.calculateMetric(numericValues, operation, safeRows.length);

      return {
        operation,
        targetColumn,
        groups: [{ key: 'Total', value: val, count: safeRows.length }],
        overallTotal: operation === 'sum' ? val : this.calculateMetric(numericValues, 'sum', safeRows.length),
        overallMean: this.calculateMetric(numericValues, 'mean', safeRows.length),
        overallMedian: this.calculateMetric(numericValues, 'median', safeRows.length),
        topGroup: { key: 'Total', value: val },
        bottomGroup: { key: 'Total', value: val },
        sampleSize
      };
    }

    // Grouping by category or date
    const groupsMap = new Map<string, { numbers: number[]; count: number; distinctSet: Set<string> }>();

    for (let i = 0; i < safeRows.length; i++) {
      const row = safeRows[i];
      let rawGroupKey = row[groupByColumn];
      if (rawGroupKey === undefined || rawGroupKey === null || String(rawGroupKey).trim() === '') {
        rawGroupKey = '(Blank / Missing)';
      }

      let groupKey = String(rawGroupKey).trim();

      // Format group key if dateGranularity is specified
      if (dateGranularity && groupKey !== '(Blank / Missing)') {
        groupKey = this.formatDateGroupKey(groupKey, dateGranularity);
      }

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, { numbers: [], count: 0, distinctSet: new Set() });
      }

      const g = groupsMap.get(groupKey)!;
      g.count++;

      const targetVal = row[targetColumn];
      if (targetVal !== undefined && targetVal !== null && String(targetVal).trim() !== '') {
        g.distinctSet.add(String(targetVal));
        const num = this.parseNumeric(targetVal);
        if (num !== null) {
          g.numbers.push(num);
        }
      }
    }

    // Calculate aggregated value for each group
    const groups: AggregationGroup[] = [];
    let totalSum = 0;

    for (const [key, g] of groupsMap.entries()) {
      let val: number;
      if (operation === 'count') {
        val = g.count;
      } else if (operation === 'distinct_count') {
        val = g.distinctSet.size;
      } else {
        val = this.calculateMetric(g.numbers, operation, g.count);
      }

      groups.push({
        key,
        value: val,
        count: g.count
      });

      totalSum += (operation === 'sum' ? val : (g.numbers.reduce((a, b) => a + b, 0)));
    }

    // Sort descending by value by default
    groups.sort((a, b) => b.value - a.value);

    // Compute percentage contribution if operation is sum or count
    if (operation === 'sum' || operation === 'count') {
      const aggregateSum = groups.reduce((acc, g) => acc + g.value, 0);
      if (aggregateSum > 0) {
        groups.forEach(g => {
          g.percentage = Math.round((g.value / aggregateSum) * 10000) / 100;
        });
      }
    }

    const allNumbers = this.extractNumericValues(safeRows, targetColumn);
    const overallMean = this.calculateMetric(allNumbers, 'mean', safeRows.length);
    const overallMedian = this.calculateMetric(allNumbers, 'median', safeRows.length);

    return {
      operation,
      targetColumn,
      groupByColumn,
      dateGranularity,
      groups,
      overallTotal: Math.round(totalSum * 100) / 100,
      overallMean,
      overallMedian,
      topGroup: groups.length > 0 ? { key: groups[0].key, value: groups[0].value } : undefined,
      bottomGroup: groups.length > 0 ? { key: groups[groups.length - 1].key, value: groups[groups.length - 1].value } : undefined,
      sampleSize
    };
  }

  /**
   * 2. Deterministic Top N / Bottom N Ranking
   */
  public static computeRanking(
    rows: Record<string, any>[],
    targetColumn: string,
    metricColumn?: string,
    direction: 'desc' | 'asc' = 'desc',
    limit: number = 10
  ): RankingResult {
    const safeRows = Array.isArray(rows) ? rows : [];
    const effectiveMetric = metricColumn || targetColumn;

    // If target and metric are the same, group by target and sort by metric value or count
    const isDirectRowRanking = metricColumn && metricColumn !== targetColumn;

    let items: RankingItem[] = [];

    if (!isDirectRowRanking) {
      // Group by targetColumn and aggregate sum / count
      const agg = this.computeAggregation(safeRows, targetColumn, 'count', targetColumn);
      const sorted = direction === 'asc' ? [...agg.groups].reverse() : agg.groups;
      items = sorted.slice(0, limit).map((g, idx) => ({
        rank: idx + 1,
        key: g.key,
        value: g.value
      }));
      return {
        targetColumn,
        metricColumn: effectiveMetric,
        direction,
        limit,
        items,
        totalEntitiesCount: agg.groups.length
      };
    }

    // Group targetColumn by sum of metricColumn
    const agg = this.computeAggregation(safeRows, effectiveMetric, 'sum', targetColumn);
    const sorted = direction === 'asc' ? [...agg.groups].reverse() : agg.groups;
    items = sorted.slice(0, limit).map((g, idx) => ({
      rank: idx + 1,
      key: g.key,
      value: g.value
    }));

    return {
      targetColumn,
      metricColumn: effectiveMetric,
      direction,
      limit,
      items,
      totalEntitiesCount: agg.groups.length
    };
  }

  /**
   * 3. Deterministic Group Comparison
   */
  public static computeComparison(
    rows: Record<string, any>[],
    groupColumn: string,
    metricColumn: string,
    groupAValue: string,
    groupBValue: string
  ): ComparisonResult {
    const safeRows = Array.isArray(rows) ? rows : [];
    const valuesA: number[] = [];
    const valuesB: number[] = [];

    const lowerA = groupAValue.trim().toLowerCase();
    const lowerB = groupBValue.trim().toLowerCase();

    for (let i = 0; i < safeRows.length; i++) {
      const row = safeRows[i];
      const gVal = String(row[groupColumn] || '').trim().toLowerCase();
      const num = this.parseNumeric(row[metricColumn]);

      if (num !== null) {
        if (gVal === lowerA) {
          valuesA.push(num);
        } else if (gVal === lowerB) {
          valuesB.push(num);
        }
      }
    }

    const sumA = valuesA.reduce((a, b) => a + b, 0);
    const sumB = valuesB.reduce((a, b) => a + b, 0);
    const meanA = valuesA.length > 0 ? Math.round((sumA / valuesA.length) * 100) / 100 : 0;
    const meanB = valuesB.length > 0 ? Math.round((sumB / valuesB.length) * 100) / 100 : 0;

    const difference = Math.round((sumA - sumB) * 100) / 100;
    const base = sumB !== 0 ? Math.abs(sumB) : (sumA !== 0 ? Math.abs(sumA) : 1);
    const percentageDifference = Math.round(((sumA - sumB) / base) * 10000) / 100;
    const higherGroup = sumA >= sumB ? groupAValue : groupBValue;

    return {
      groupColumn,
      metricColumn,
      groupA: { name: groupAValue, value: Math.round(sumA * 100) / 100, count: valuesA.length, mean: meanA },
      groupB: { name: groupBValue, value: Math.round(sumB * 100) / 100, count: valuesB.length, mean: meanB },
      difference,
      percentageDifference,
      higherGroup
    };
  }

  /**
   * 4. Deterministic Time-Series Trend Analysis
   */
  public static computeTrend(
    rows: Record<string, any>[],
    dateColumn: string,
    valueColumn: string,
    granularity: DateGranularity = 'month'
  ): TrendResult {
    const agg = this.computeAggregation(rows, valueColumn, 'sum', dateColumn, granularity);

    // Sort periods chronologically
    const sortedGroups = [...agg.groups].sort((a, b) => a.key.localeCompare(b.key));

    const dataPoints: TrendDataPoint[] = [];
    let totalGrowthRates = 0;
    let growthRateCount = 0;

    for (let i = 0; i < sortedGroups.length; i++) {
      const curr = sortedGroups[i];
      let change: number | undefined;
      let percentageChange: number | undefined;

      if (i > 0) {
        const prev = sortedGroups[i - 1];
        change = Math.round((curr.value - prev.value) * 100) / 100;
        if (prev.value !== 0) {
          percentageChange = Math.round(((curr.value - prev.value) / Math.abs(prev.value)) * 10000) / 100;
          totalGrowthRates += percentageChange;
          growthRateCount++;
        }
      }

      dataPoints.push({
        period: curr.key,
        date: curr.key,
        value: curr.value,
        count: curr.count,
        change,
        percentageChange
      });
    }

    const averageGrowthRate = growthRateCount > 0 ? Math.round((totalGrowthRates / growthRateCount) * 100) / 100 : undefined;

    // Determine overall trend
    let overallTrend: 'increasing' | 'decreasing' | 'stable' | 'volatile' = 'stable';
    if (dataPoints.length >= 2) {
      const firstVal = dataPoints[0].value;
      const lastVal = dataPoints[dataPoints.length - 1].value;
      const totalDelta = lastVal - firstVal;

      if (averageGrowthRate !== undefined) {
        if (averageGrowthRate > 5) overallTrend = 'increasing';
        else if (averageGrowthRate < -5) overallTrend = 'decreasing';
        else overallTrend = 'stable';
      } else if (totalDelta > 0) {
        overallTrend = 'increasing';
      } else if (totalDelta < 0) {
        overallTrend = 'decreasing';
      }
    }

    const highestPoint = dataPoints.reduce((max, p) => p.value > max.value ? p : max, dataPoints[0] || { period: 'N/A', value: 0 });
    const lowestPoint = dataPoints.reduce((min, p) => p.value < min.value ? p : min, dataPoints[0] || { period: 'N/A', value: 0 });

    return {
      dateColumn,
      valueColumn,
      granularity,
      dataPoints,
      overallTrend,
      averageGrowthRate,
      highestPeriod: { period: highestPoint.period, value: highestPoint.value },
      lowestPeriod: { period: lowestPoint.period, value: lowestPoint.value },
      totalPeriods: dataPoints.length
    };
  }

  /**
   * 5. Deterministic Pearson Correlation Coefficient (r)
   */
  public static computeCorrelation(
    rows: Record<string, any>[],
    columnA: string,
    columnB: string
  ): CorrelationResult {
    const safeRows = Array.isArray(rows) ? rows : [];
    const pairs: Array<[number, number]> = [];

    for (let i = 0; i < safeRows.length; i++) {
      const numA = this.parseNumeric(safeRows[i][columnA]);
      const numB = this.parseNumeric(safeRows[i][columnB]);
      if (numA !== null && numB !== null) {
        pairs.push([numA, numB]);
      }
    }

    const n = pairs.length;
    if (n < 3) {
      return {
        columnA,
        columnB,
        pearsonCoefficient: 0,
        strength: 'none',
        direction: 'neutral',
        sampleSize: n
      };
    }

    let sumA = 0;
    let sumB = 0;
    let sumAB = 0;
    let sumA2 = 0;
    let sumB2 = 0;

    for (let i = 0; i < n; i++) {
      const [x, y] = pairs[i];
      sumA += x;
      sumB += y;
      sumAB += x * y;
      sumA2 += x * x;
      sumB2 += y * y;
    }

    const numerator = (n * sumAB) - (sumA * sumB);
    const denominator = Math.sqrt(((n * sumA2) - (sumA * sumA)) * ((n * sumB2) - (sumB * sumB)));

    const r = denominator === 0 ? 0 : Math.round((numerator / denominator) * 10000) / 10000;
    const absR = Math.abs(r);

    let strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'none' = 'none';
    if (absR >= 0.8) strength = 'very_strong';
    else if (absR >= 0.6) strength = 'strong';
    else if (absR >= 0.4) strength = 'moderate';
    else if (absR >= 0.2) strength = 'weak';

    const direction = r > 0.05 ? 'positive' : (r < -0.05 ? 'negative' : 'neutral');

    return {
      columnA,
      columnB,
      pearsonCoefficient: r,
      strength,
      direction,
      sampleSize: n
    };
  }

  // ==========================================
  // HELPER CALCULATION FUNCTIONS
  // ==========================================

  private static calculateMetric(numbers: number[], op: AggregationOperation, totalCount: number): number {
    if (numbers.length === 0) return 0;

    switch (op) {
      case 'sum':
        return Math.round(numbers.reduce((a, b) => a + b, 0) * 100) / 100;
      case 'mean':
        return Math.round((numbers.reduce((a, b) => a + b, 0) / numbers.length) * 100) / 100;
      case 'median': {
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const val = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        return Math.round(val * 100) / 100;
      }
      case 'min':
        return Math.min(...numbers);
      case 'max':
        return Math.max(...numbers);
      case 'count':
        return totalCount;
      case 'distinct_count':
        return new Set(numbers).size;
      default:
        return Math.round(numbers.reduce((a, b) => a + b, 0) * 100) / 100;
    }
  }

  public static parseNumeric(val: any): number | null {
    if (val === undefined || val === null) return null;
    const str = String(val).trim().replace(/[\$,]/g, '');
    if (str === '') return null;
    const num = Number(str);
    return isNaN(num) ? null : num;
  }

  private static extractNumericValues(rows: Record<string, any>[], column: string): number[] {
    const nums: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      const n = this.parseNumeric(rows[i][column]);
      if (n !== null) nums.push(n);
    }
    return nums;
  }

  private static formatDateGroupKey(dateStr: string, granularity: DateGranularity): string {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      return dateStr;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    switch (granularity) {
      case 'year':
        return `${year}`;
      case 'quarter': {
        const q = Math.floor(parsed.getMonth() / 3) + 1;
        return `${year}-Q${q}`;
      }
      case 'month':
        return `${year}-${month}`;
      case 'day':
      default:
        return `${year}-${month}-${day}`;
    }
  }
}
