/**
 * CSV Auditor Pro - CSV Profiling Engine (Phase 2)
 * Deterministic, un-fabricated profiling of tabular datasets.
 * Computes deep column metadata, inferred types, distributions, and summary statistics.
 */

import {
  ColumnDataType,
  ColumnProfile,
  ColumnProfileStats,
  DatasetProfile,
  DateRangeStats,
  FrequencyItem
} from './types';

// Fast ISO and common date formats tester
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/, // ISO 8601
  /^\d{1,2}\/\d{1,2}\/\d{2,4}(\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM|am|pm))?)?$/, // MM/DD/YYYY or D/M/YY
  /^\d{1,2}-\d{1,2}-\d{2,4}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/, // DD-MM-YYYY
  /^[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}$/, // Month DD, YYYY
];

const BOOLEAN_TRUE = new Set(['true', '1', 'yes', 'y', 't', 'active', 'enabled', 'on']);
const BOOLEAN_FALSE = new Set(['false', '0', 'no', 'n', 'f', 'inactive', 'disabled', 'off']);

const NULL_REPRESENTATIONS = new Set([
  '', 'null', 'nil', 'none', 'n/a', 'na', '#n/a', 'nan', 'undefined', '-', '--', '—', '?'
]);

export class CSVProfilingEngine {
  private static cache: Map<string, DatasetProfile> = new Map();

  /**
   * Profiles a full CSV dataset deterministically from raw rows and headers.
   */
  public static profileDataset(
    rows: Record<string, any>[],
    headers?: string[],
    fileId: string = 'current_file',
    fileName: string = 'dataset.csv'
  ): DatasetProfile {
    const safeRows = Array.isArray(rows) ? rows : [];
    const resolvedHeaders = (Array.isArray(headers) && headers.length > 0)
      ? headers
      : (safeRows.length > 0 ? Object.keys(safeRows[0]) : []);

    const rowCount = safeRows.length;
    const columnCount = resolvedHeaders.length;

    // Cache key based on fileId, rowCount, columnCount, and fileName
    const cacheKey = `${fileId}_${fileName}_${rowCount}_${columnCount}_${resolvedHeaders.join(',')}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 1. Compute exact duplicate rows
    const { duplicateRowCount, duplicateRowPercentage } = this.computeDuplicateRows(safeRows, resolvedHeaders);

    // 2. Profile each column
    const columnProfiles: Record<string, ColumnProfile> = {};
    const numericColumns: string[] = [];
    const categoricalColumns: string[] = [];
    const dateColumns: string[] = [];
    const booleanColumns: string[] = [];
    const textColumns: string[] = [];
    const identifierColumns: string[] = [];

    let totalMissingCells = 0;

    for (const header of resolvedHeaders) {
      const profile = this.profileColumn(safeRows, header);
      columnProfiles[header] = profile;
      totalMissingCells += profile.missingCount;

      switch (profile.inferredType) {
        case 'numeric':
          numericColumns.push(header);
          break;
        case 'categorical':
          categoricalColumns.push(header);
          break;
        case 'datetime':
          dateColumns.push(header);
          break;
        case 'boolean':
          booleanColumns.push(header);
          break;
        case 'identifier':
          identifierColumns.push(header);
          break;
        case 'text':
        default:
          textColumns.push(header);
          break;
      }
    }

    const totalCells = Math.max(1, rowCount * columnCount);
    const overallMissingPercentage = Math.round((totalMissingCells / totalCells) * 10000) / 100;

    // Data Quality Score formula: 100 - (missingCells/totalCells * 40) - (duplicateRowPercentage * 40) - invalid penalties
    let qualityScore = 100 - (overallMissingPercentage * 0.4) - (duplicateRowPercentage * 0.4);
    qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)));

    const result: DatasetProfile = {
      fileId,
      fileName,
      rowCount,
      columnCount,
      headers: resolvedHeaders,
      duplicateRowCount,
      duplicateRowPercentage,
      totalCells,
      totalMissingCells,
      overallMissingPercentage,
      qualityScore,
      columnProfiles,
      numericColumns,
      categoricalColumns,
      dateColumns,
      booleanColumns,
      textColumns,
      identifierColumns,
      sampleRows: safeRows.slice(0, 5),
      generatedAt: new Date().toISOString()
    };

    // Cache result
    if (this.cache.size > 20) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * Profiles a single column across all rows
   */
  public static profileColumn(rows: Record<string, any>[], column: string): ColumnProfile {
    const totalCount = rows.length;
    if (totalCount === 0) {
      return {
        name: column,
        inferredType: 'text',
        totalCount: 0,
        missingCount: 0,
        missingPercentage: 0,
        uniqueCount: 0,
        uniquePercentage: 0,
        duplicateCount: 0,
        sampleValues: []
      };
    }

    let missingCount = 0;
    let invalidValuesCount = 0;
    let suspiciousWhitespaceCount = 0;
    let emptyStringCount = 0;
    let formulaInjectionCount = 0;

    const rawValues: any[] = [];
    const nonNullStrings: string[] = [];
    const numericValues: number[] = [];
    const dateValues: Date[] = [];
    const booleanValues: boolean[] = [];
    const frequencyMap: Map<string, number> = new Map();

    for (let i = 0; i < totalCount; i++) {
      const val = rows[i][column];

      if (val === undefined || val === null) {
        missingCount++;
        continue;
      }

      const strVal = String(val);
      const trimmedVal = strVal.trim();
      const lowerVal = trimmedVal.toLowerCase();

      // Empty / Null representations
      if (trimmedVal === '' || NULL_REPRESENTATIONS.has(lowerVal)) {
        missingCount++;
        if (trimmedVal === '') emptyStringCount++;
        continue;
      }

      // Check formula injection
      if (/^[=+\-@]/.test(trimmedVal)) {
        formulaInjectionCount++;
      }

      // Check suspicious whitespace
      if (strVal !== trimmedVal || /\s{2,}/.test(strVal)) {
        suspiciousWhitespaceCount++;
      }

      rawValues.push(val);
      nonNullStrings.push(trimmedVal);

      // Frequency map for unique counting
      frequencyMap.set(trimmedVal, (frequencyMap.get(trimmedVal) || 0) + 1);

      // Numeric check
      const cleanedNumStr = trimmedVal.replace(/[\$,]/g, '');
      const parsedNum = Number(cleanedNumStr);
      if (!isNaN(parsedNum) && cleanedNumStr !== '') {
        numericValues.push(parsedNum);
      }

      // Boolean check
      if (BOOLEAN_TRUE.has(lowerVal) || BOOLEAN_FALSE.has(lowerVal)) {
        booleanValues.push(BOOLEAN_TRUE.has(lowerVal));
      }

      // Date check
      if (this.isValidDateString(trimmedVal)) {
        const parsedDate = new Date(trimmedVal);
        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < 2100) {
          dateValues.push(parsedDate);
        }
      }
    }

    const nonNullCount = nonNullStrings.length;
    const uniqueCount = frequencyMap.size;
    const uniquePercentage = nonNullCount > 0 ? Math.round((uniqueCount / nonNullCount) * 10000) / 100 : 0;
    const missingPercentage = Math.round((missingCount / totalCount) * 10000) / 100;
    const duplicateCount = Math.max(0, nonNullCount - uniqueCount);

    // 1. Infer Column Type
    const inferredType = this.inferType(
      column,
      nonNullCount,
      numericValues.length,
      dateValues.length,
      booleanValues.length,
      uniqueCount,
      nonNullStrings
    );

    // 2. Compute Statistics if Numeric
    let stats: ColumnProfileStats | undefined;
    if (inferredType === 'numeric' && numericValues.length > 0) {
      stats = this.computeNumericStats(numericValues);
      invalidValuesCount = nonNullCount - numericValues.length;
    }

    // 3. Compute Date Range if Datetime
    let dateRange: DateRangeStats | undefined;
    if (inferredType === 'datetime' && dateValues.length > 0) {
      dateRange = this.computeDateRange(dateValues);
      invalidValuesCount = nonNullCount - dateValues.length;
    }

    // 4. Compute Frequency Distribution for Categorical / Low-cardinality columns
    let frequencyDistribution: FrequencyItem[] | undefined;
    if (uniqueCount > 0 && (inferredType === 'categorical' || uniqueCount <= 25)) {
      frequencyDistribution = Array.from(frequencyMap.entries())
        .map(([value, count]) => ({
          value,
          count,
          percentage: nonNullCount > 0 ? Math.round((count / nonNullCount) * 10000) / 100 : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
    }

    return {
      name: column,
      inferredType,
      totalCount,
      missingCount,
      missingPercentage,
      uniqueCount,
      uniquePercentage,
      duplicateCount,
      sampleValues: nonNullStrings.slice(0, 5),
      stats,
      frequencyDistribution,
      dateRange,
      invalidValuesCount,
      suspiciousWhitespaceCount,
      emptyStringCount,
      formulaInjectionCount
    };
  }

  /**
   * Deterministic data type inference
   */
  private static inferType(
    headerName: string,
    nonNullCount: number,
    numCount: number,
    dateCount: number,
    boolCount: number,
    uniqueCount: number,
    sampleStrings: string[]
  ): ColumnDataType {
    if (nonNullCount === 0) return 'text';

    const lowerHeader = headerName.toLowerCase();

    // Check Boolean (≥90% boolean values)
    if (boolCount / nonNullCount >= 0.9) {
      return 'boolean';
    }

    // Check Numeric (≥85% numeric values)
    if (numCount / nonNullCount >= 0.85) {
      // Check if this numeric column is actually an ID (100% unique or ID in header name)
      if (uniqueCount === nonNullCount && (lowerHeader.endsWith('_id') || lowerHeader.startsWith('id_') || lowerHeader === 'id')) {
        return 'identifier';
      }
      return 'numeric';
    }

    // Check Date/Time (≥80% valid dates)
    if (dateCount / nonNullCount >= 0.80) {
      return 'datetime';
    }

    // Check Identifier / Key (High uniqueness + ID/UUID/code naming or length pattern)
    if (
      (uniqueCount / nonNullCount >= 0.95 && (lowerHeader.includes('id') || lowerHeader.includes('key') || lowerHeader.includes('uuid') || lowerHeader.includes('code') || lowerHeader.includes('ref'))) ||
      sampleStrings.every(s => /^[0-9a-fA-F-]{8,36}$/.test(s))
    ) {
      return 'identifier';
    }

    // Check Categorical (Low cardinality: unique count <= 50 or unique ratio < 0.25)
    if (uniqueCount <= 50 || (uniqueCount / nonNullCount <= 0.25 && nonNullCount >= 10)) {
      return 'categorical';
    }

    return 'text';
  }

  /**
   * Calculates precise descriptive statistics
   */
  public static computeNumericStats(values: number[]): ColumnProfileStats {
    const count = values.length;
    if (count === 0) {
      return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0, variance: 0, q1: 0, q3: 0, iqr: 0, sum: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[count - 1];
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;

    // Variance & Standard Deviation
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (count > 1 ? count - 1 : 1);
    const stdDev = Math.sqrt(variance);

    // Median
    const mid = Math.floor(count / 2);
    const median = count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    // Quartiles
    const q1 = sorted[Math.floor(count * 0.25)];
    const q3 = sorted[Math.floor(count * 0.75)];
    const iqr = Math.round((q3 - q1) * 10000) / 10000;

    return {
      min: Math.round(min * 10000) / 10000,
      max: Math.round(max * 10000) / 10000,
      mean: Math.round(mean * 10000) / 10000,
      median: Math.round(median * 10000) / 10000,
      stdDev: Math.round(stdDev * 10000) / 10000,
      variance: Math.round(variance * 10000) / 10000,
      q1: Math.round(q1 * 10000) / 10000,
      q3: Math.round(q3 * 10000) / 10000,
      iqr,
      sum: Math.round(sum * 10000) / 10000
    };
  }

  /**
   * Computes date span and boundaries
   */
  private static computeDateRange(dates: Date[]): DateRangeStats {
    let minTime = dates[0].getTime();
    let maxTime = dates[0].getTime();

    for (const d of dates) {
      const t = d.getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }

    const minDate = new Date(minTime).toISOString().split('T')[0];
    const maxDate = new Date(maxTime).toISOString().split('T')[0];
    const spanDays = Math.round((maxTime - minTime) / (1000 * 60 * 60 * 24));

    return {
      minDate,
      maxDate,
      spanDays
    };
  }

  /**
   * Fast duplicate row counter using concatenated string hashing
   */
  private static computeDuplicateRows(rows: Record<string, any>[], headers: string[]): { duplicateRowCount: number; duplicateRowPercentage: number } {
    const total = rows.length;
    if (total <= 1) return { duplicateRowCount: 0, duplicateRowPercentage: 0 };

    const seen = new Set<string>();
    let duplicates = 0;

    for (let i = 0; i < total; i++) {
      const row = rows[i];
      let rowKey = '';
      for (let j = 0; j < headers.length; j++) {
        const val = row[headers[j]];
        rowKey += (val !== undefined && val !== null ? String(val) : '') + '§|§';
      }

      if (seen.has(rowKey)) {
        duplicates++;
      } else {
        seen.add(rowKey);
      }
    }

    const duplicateRowPercentage = Math.round((duplicates / total) * 10000) / 100;
    return { duplicateRowCount: duplicates, duplicateRowPercentage };
  }

  private static isValidDateString(str: string): boolean {
    if (str.length < 4 || str.length > 35) return false;
    if (!isNaN(Number(str))) return false; // Pure number is not a date string
    return DATE_PATTERNS.some(pattern => pattern.test(str));
  }
}
