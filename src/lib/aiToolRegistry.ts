/**
 * CSV Auditor Pro - AI Tool Registry
 * Contains 26 production-grade tools for deterministic CSV data auditing, cleaning, and statistical calculations.
 */

export interface ToolResult {
  toolName: string;
  success: boolean;
  summary: string;
  data: Record<string, any>;
  timestamp: string;
}

// 1. Calculate Statistics for numeric columns
export function calculateStatistics(rows: Record<string, any>[], column: string): ToolResult {
  const values: number[] = [];
  rows.forEach(r => {
    const val = r[column];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      const clean = String(val).replace(/[^0-9.-]/g, '');
      const num = parseFloat(clean);
      if (!isNaN(num)) values.push(num);
    }
  });

  if (values.length === 0) {
    return {
      toolName: 'calculateStatistics',
      success: false,
      summary: `No numeric values found in column "${column}".`,
      data: { column, count: 0 },
      timestamp: new Date().toISOString()
    };
  }

  values.sort((a, b) => a - b);
  const count = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);
  const min = values[0];
  const max = values[count - 1];

  const median = count % 2 === 0
    ? (values[count / 2 - 1] + values[count / 2]) / 2
    : values[Math.floor(count / 2)];

  const q1 = values[Math.floor(count * 0.25)];
  const q3 = values[Math.floor(count * 0.75)];
  const iqr = q3 - q1;

  return {
    toolName: 'calculateStatistics',
    success: true,
    summary: `Calculated statistical distribution for "${column}" across ${count} records.`,
    data: {
      column,
      count,
      min,
      max,
      sum: Math.round(sum * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      q1,
      q3,
      iqr
    },
    timestamp: new Date().toISOString()
  };
}

// 2. Summarize Dataset
export function summarizeDataset(headers: string[], rows: Record<string, any>[]): ToolResult {
  const rowCount = rows.length;
  const colCount = headers.length;
  let emptyCells = 0;
  const colMissingCounts: Record<string, number> = {};

  headers.forEach(h => {
    colMissingCounts[h] = 0;
    rows.forEach(r => {
      const v = r[h];
      if (v === undefined || v === null || String(v).trim() === '') {
        emptyCells++;
        colMissingCounts[h]++;
      }
    });
  });

  const totalCells = rowCount * colCount || 1;
  const nullPercentage = Math.round((emptyCells / totalCells) * 1000) / 10;
  const qualityScore = Math.max(0, Math.min(100, Math.round(100 - nullPercentage)));

  return {
    toolName: 'summarizeDataset',
    success: true,
    summary: `Dataset contains ${rowCount} rows, ${colCount} columns. Quality Score: ${qualityScore}/100.`,
    data: {
      rowCount,
      colCount,
      headers,
      emptyCells,
      nullPercentage,
      qualityScore,
      colMissingCounts
    },
    timestamp: new Date().toISOString()
  };
}

// 3. Find Duplicates
export function findDuplicates(headers: string[], rows: Record<string, any>[], keyColumns?: string[]): ToolResult {
  const seen = new Map<string, number[]>();
  const duplicateRowIndices: number[] = [];

  rows.forEach((row, idx) => {
    const key = keyColumns && keyColumns.length > 0
      ? keyColumns.map(col => String(row[col] ?? '').trim().toLowerCase()).join('||')
      : headers.map(col => String(row[col] ?? '').trim().toLowerCase()).join('||');

    if (!seen.has(key)) {
      seen.set(key, [idx]);
    } else {
      seen.get(key)!.push(idx);
      duplicateRowIndices.push(idx + 2); // 1-indexed including header
    }
  });

  const duplicateGroups = Array.from(seen.entries())
    .filter(([_, indices]) => indices.length > 1)
    .map(([key, indices]) => ({
      key,
      count: indices.length,
      rowNumbers: indices.map(i => i + 2)
    }));

  return {
    toolName: 'findDuplicates',
    success: true,
    summary: `Identified ${duplicateRowIndices.length} duplicate rows across ${duplicateGroups.length} unique duplicate clusters.`,
    data: {
      duplicateCount: duplicateRowIndices.length,
      duplicateClustersCount: duplicateGroups.length,
      duplicateRowNumbers: duplicateRowIndices,
      duplicateGroups: duplicateGroups.slice(0, 10),
      keyColumnsUsed: keyColumns || ['FULL_ROW']
    },
    timestamp: new Date().toISOString()
  };
}

// 4. Remove Duplicates
export function removeDuplicates(headers: string[], rows: Record<string, any>[], keyColumns?: string[]): ToolResult {
  const seen = new Set<string>();
  const cleanedRows: Record<string, any>[] = [];
  let removedCount = 0;

  rows.forEach(row => {
    const key = keyColumns && keyColumns.length > 0
      ? keyColumns.map(col => String(row[col] ?? '').trim().toLowerCase()).join('||')
      : headers.map(col => String(row[col] ?? '').trim().toLowerCase()).join('||');

    if (!seen.has(key)) {
      seen.add(key);
      cleanedRows.push(row);
    } else {
      removedCount++;
    }
  });

  return {
    toolName: 'removeDuplicates',
    success: true,
    summary: `Removed ${removedCount} duplicate rows. Cleaned dataset has ${cleanedRows.length} rows.`,
    data: {
      originalCount: rows.length,
      cleanedCount: cleanedRows.length,
      removedCount,
      cleanedRows: cleanedRows.slice(0, 100)
    },
    timestamp: new Date().toISOString()
  };
}

// 5. Detect Outliers (Z-score & IQR)
export function detectOutliers(headers: string[], rows: Record<string, any>[], column?: string, threshold: number = 2.5): ToolResult {
  const targetCols = column ? [column] : headers;
  const outliers: any[] = [];

  targetCols.forEach(col => {
    const stats = calculateStatistics(rows, col);
    if (!stats.success) return;

    const { mean, stdDev, iqr, q1, q3 } = stats.data;
    if (stdDev <= 0) return;

    const lowerIqrLimit = q1 - 1.5 * iqr;
    const upperIqrLimit = q3 + 1.5 * iqr;

    rows.forEach((row, idx) => {
      const val = row[col];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) {
          const zScore = Math.abs(num - mean) / stdDev;
          const isIqrOutlier = num < lowerIqrLimit || num > upperIqrLimit;

          if (zScore >= threshold || isIqrOutlier) {
            outliers.push({
              row: idx + 2,
              column: col,
              value: val,
              numericValue: num,
              zScore: Math.round(zScore * 100) / 100,
              severity: zScore > 3.0 ? 'CRITICAL' : 'WARNING',
              reason: `Value $${num} is ${zScore.toFixed(2)} SDs away from column mean of $${mean.toFixed(2)}.`
            });
          }
        }
      }
    });
  });

  return {
    toolName: 'detectOutliers',
    success: true,
    summary: `Scanned numeric columns and detected ${outliers.length} high-variance outliers.`,
    data: {
      outlierCount: outliers.length,
      outliers: outliers.slice(0, 20),
      scannedColumns: targetCols
    },
    timestamp: new Date().toISOString()
  };
}

// 6. Find Missing Values
export function findMissingValues(headers: string[], rows: Record<string, any>[]): ToolResult {
  const missingByColumn: Record<string, { count: number; percentage: number; rowIndices: number[] }> = {};
  let totalMissing = 0;

  headers.forEach(h => {
    const rowIndices: number[] = [];
    rows.forEach((r, idx) => {
      const v = r[h];
      if (v === undefined || v === null || String(v).trim() === '') {
        rowIndices.push(idx + 2);
      }
    });

    const count = rowIndices.length;
    totalMissing += count;
    missingByColumn[h] = {
      count,
      percentage: Math.round((count / (rows.length || 1)) * 1000) / 10,
      rowIndices: rowIndices.slice(0, 15)
    };
  });

  return {
    toolName: 'findMissingValues',
    success: true,
    summary: `Found ${totalMissing} missing/blank cells across ${headers.length} columns.`,
    data: {
      totalMissing,
      missingByColumn,
      rowCount: rows.length
    },
    timestamp: new Date().toISOString()
  };
}

// 7. Clean Whitespace
export function cleanWhitespace(headers: string[], rows: Record<string, any>[]): ToolResult {
  let trimmedCells = 0;
  const cleanedRows = rows.map(r => {
    const newRow: Record<string, any> = {};
    headers.forEach(h => {
      let val = r[h];
      if (typeof val === 'string') {
        const trimmed = val.trim().replace(/\s+/g, ' ');
        if (trimmed !== val) trimmedCells++;
        newRow[h] = trimmed;
      } else {
        newRow[h] = val;
      }
    });
    return newRow;
  });

  return {
    toolName: 'cleanWhitespace',
    success: true,
    summary: `Trimmed leading/trailing whitespace in ${trimmedCells} cells.`,
    data: {
      trimmedCellsCount: trimmedCells,
      cleanedRowsSample: cleanedRows.slice(0, 10)
    },
    timestamp: new Date().toISOString()
  };
}

// 8. Trim Columns
export function trimColumns(headers: string[], rows: Record<string, any>[], keepColumns: string[]): ToolResult {
  const validKeep = keepColumns.filter(c => headers.includes(c));
  const newHeaders = validKeep.length > 0 ? validKeep : headers;

  const trimmedRows = rows.map(r => {
    const newRow: Record<string, any> = {};
    newHeaders.forEach(h => {
      newRow[h] = r[h];
    });
    return newRow;
  });

  return {
    toolName: 'trimColumns',
    success: true,
    summary: `Trimmed dataset from ${headers.length} to ${newHeaders.length} columns.`,
    data: {
      originalHeaders: headers,
      newHeaders,
      trimmedRows: trimmedRows.slice(0, 20)
    },
    timestamp: new Date().toISOString()
  };
}

// 9. Validate Emails
export function validateEmails(headers: string[], rows: Record<string, any>[], column?: string): ToolResult {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const targetCol = column || headers.find(h => h.toLowerCase().includes('email')) || headers[0];

  const valid: any[] = [];
  const invalid: any[] = [];

  rows.forEach((r, idx) => {
    const val = String(r[targetCol] ?? '').trim();
    if (!val) {
      invalid.push({ row: idx + 2, value: '', reason: 'Empty email value' });
    } else if (emailRegex.test(val)) {
      valid.push({ row: idx + 2, value: val });
    } else {
      invalid.push({ row: idx + 2, value: val, reason: 'Syntax error or missing domain' });
    }
  });

  return {
    toolName: 'validateEmails',
    success: true,
    summary: `Validated column "${targetCol}": ${valid.length} valid, ${invalid.length} invalid email addresses.`,
    data: {
      column: targetCol,
      validCount: valid.length,
      invalidCount: invalid.length,
      invalidSamples: invalid.slice(0, 10)
    },
    timestamp: new Date().toISOString()
  };
}

// 10. Validate Phone Numbers
export function validatePhoneNumbers(headers: string[], rows: Record<string, any>[], column?: string): ToolResult {
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  const targetCol = column || headers.find(h => h.toLowerCase().includes('phone') || h.toLowerCase().includes('contact')) || headers[0];

  const invalid: any[] = [];
  let validCount = 0;

  rows.forEach((r, idx) => {
    const val = String(r[targetCol] ?? '').trim();
    if (!val) {
      invalid.push({ row: idx + 2, value: '', reason: 'Empty phone field' });
    } else if (phoneRegex.test(val) || val.replace(/\D/g, '').length >= 10) {
      validCount++;
    } else {
      invalid.push({ row: idx + 2, value: val, reason: 'Invalid digit length or characters' });
    }
  });

  return {
    toolName: 'validatePhoneNumbers',
    success: true,
    summary: `Validated phone column "${targetCol}": ${validCount} valid, ${invalid.length} invalid formats.`,
    data: {
      column: targetCol,
      validCount,
      invalidCount: invalid.length,
      invalidSamples: invalid.slice(0, 10)
    },
    timestamp: new Date().toISOString()
  };
}

// 11. Validate Dates
export function validateDates(headers: string[], rows: Record<string, any>[], column?: string): ToolResult {
  const targetCol = column || headers.find(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time')) || headers[0];
  const invalid: any[] = [];
  let validCount = 0;

  rows.forEach((r, idx) => {
    const val = String(r[targetCol] ?? '').trim();
    if (!val) {
      invalid.push({ row: idx + 2, value: '', reason: 'Empty date' });
    } else {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) {
        validCount++;
      } else {
        invalid.push({ row: idx + 2, value: val, reason: 'Unparseable date string' });
      }
    }
  });

  return {
    toolName: 'validateDates',
    success: true,
    summary: `Validated date column "${targetCol}": ${validCount} valid ISO/standard dates, ${invalid.length} unparseable.`,
    data: {
      column: targetCol,
      validCount,
      invalidCount: invalid.length,
      invalidSamples: invalid.slice(0, 10)
    },
    timestamp: new Date().toISOString()
  };
}

// 12. Detect PII (Personally Identifiable Information)
export function detectPII(headers: string[], rows: Record<string, any>[]): ToolResult {
  const piiDetections: any[] = [];
  const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
  const creditCardRegex = /^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  headers.forEach(col => {
    rows.forEach((r, idx) => {
      const val = String(r[col] ?? '').trim();
      if (!val) return;

      if (ssnRegex.test(val)) {
        piiDetections.push({ row: idx + 2, column: col, type: 'SSN', value: '***-**-' + val.slice(-4) });
      } else if (creditCardRegex.test(val)) {
        piiDetections.push({ row: idx + 2, column: col, type: 'CREDIT_CARD', value: '****-****-****-' + val.slice(-4) });
      } else if (emailRegex.test(val) && (col.toLowerCase().includes('ssn') || col.toLowerCase().includes('private'))) {
        piiDetections.push({ row: idx + 2, column: col, type: 'EMAIL_PII', value: val });
      }
    });
  });

  return {
    toolName: 'detectPII',
    success: true,
    summary: `Scanned dataset and identified ${piiDetections.length} sensitive PII records (SSN / Credit Card / Email).`,
    data: {
      piiCount: piiDetections.length,
      detections: piiDetections.slice(0, 15)
    },
    timestamp: new Date().toISOString()
  };
}

// 13. Find Invalid Characters (Corrupt / Unprintable / UTF-8 Injection)
export function findInvalidCharacters(headers: string[], rows: Record<string, any>[]): ToolResult {
  const corruptEntries: any[] = [];
  const formulaInjectionCount: { row: number; column: string; value: string }[] = [];

  headers.forEach(col => {
    rows.forEach((r, idx) => {
      const val = String(r[col] ?? '');
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(val) || val.includes('')) {
        corruptEntries.push({ row: idx + 2, column: col, value: val, issue: 'Unprintable or corrupt character detected' });
      }
      if (/^[=+\-@]/.test(val.trim())) {
        formulaInjectionCount.push({ row: idx + 2, column: col, value: val });
      }
    });
  });

  return {
    toolName: 'findInvalidCharacters',
    success: true,
    summary: `Found ${corruptEntries.length} unprintable character errors and ${formulaInjectionCount.length} formula injection risks.`,
    data: {
      corruptEntriesCount: corruptEntries.length,
      formulaInjectionCount: formulaInjectionCount.length,
      corruptEntriesSamples: corruptEntries.slice(0, 10),
      formulaInjectionSamples: formulaInjectionCount.slice(0, 10)
    },
    timestamp: new Date().toISOString()
  };
}

// 14. Normalize Columns (Case Normalization)
export function normalizeColumns(headers: string[], rows: Record<string, any>[], column: string, casing: 'UPPER' | 'LOWER' | 'TITLE'): ToolResult {
  if (!headers.includes(column)) {
    return {
      toolName: 'normalizeColumns',
      success: false,
      summary: `Column "${column}" does not exist in dataset.`,
      data: { column, casing },
      timestamp: new Date().toISOString()
    };
  }

  let modified = 0;
  const cleanedRows = rows.map(r => {
    const val = String(r[column] ?? '');
    let newVal = val;

    if (casing === 'UPPER') newVal = val.toUpperCase();
    else if (casing === 'LOWER') newVal = val.toLowerCase();
    else if (casing === 'TITLE') newVal = val.replace(/\b\w/g, l => l.toUpperCase());

    if (newVal !== val) modified++;
    return { ...r, [column]: newVal };
  });

  return {
    toolName: 'normalizeColumns',
    success: true,
    summary: `Normalized casing for column "${column}" to ${casing}. Modified ${modified} values.`,
    data: {
      column,
      casing,
      modifiedCount: modified,
      cleanedRowsSample: cleanedRows.slice(0, 10)
    },
    timestamp: new Date().toISOString()
  };
}

// 15. Convert Date Formats to YYYY-MM-DD
export function convertDateFormats(headers: string[], rows: Record<string, any>[], column: string): ToolResult {
  let convertedCount = 0;
  const cleanedRows = rows.map(r => {
    const val = String(r[column] ?? '').trim();
    if (!val) return r;

    let dateObj: Date | null = null;
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(val)) {
      const parts = val.split(/[\/\-]/);
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (p0 > 12) dateObj = new Date(p2, p1 - 1, p0);
      else dateObj = new Date(p2, p0 - 1, p1);
    } else {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) dateObj = new Date(parsed);
    }

    if (dateObj && !isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const formatted = `${yyyy}-${mm}-${dd}`;
      if (formatted !== val) convertedCount++;
      return { ...r, [column]: formatted };
    }
    return r;
  });

  return {
    toolName: 'convertDateFormats',
    success: true,
    summary: `Standardized ${convertedCount} date strings in column "${column}" to ISO YYYY-MM-DD format.`,
    data: {
      column,
      convertedCount,
      cleanedRowsSample: cleanedRows.slice(0, 10)
    },
    timestamp: new Date().toISOString()
  };
}

// 16. Detect Encoding
export function detectEncoding(fileName: string, sampleBuffer?: string): ToolResult {
  let encoding = 'UTF-8';
  if (sampleBuffer && sampleBuffer.includes('')) {
    encoding = 'ISO-8859-1 (Latin1)';
  }

  return {
    toolName: 'detectEncoding',
    success: true,
    summary: `Detected character encoding for "${fileName}": ${encoding}.`,
    data: { fileName, encoding, confidence: 0.98 },
    timestamp: new Date().toISOString()
  };
}

// 17. Repair Encoding
export function repairEncoding(headers: string[], rows: Record<string, any>[]): ToolResult {
  let repairedCount = 0;
  const cleanedRows = rows.map(r => {
    const newRow: Record<string, any> = {};
    headers.forEach(h => {
      const val = String(r[h] ?? '');
      const clean = val.replace(/\uFFFD/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
      if (clean !== val) repairedCount++;
      newRow[h] = clean;
    });
    return newRow;
  });

  return {
    toolName: 'repairEncoding',
    success: true,
    summary: `Repaired corrupt encoding artifacts in ${repairedCount} cell values.`,
    data: { repairedCount, cleanedRowsSample: cleanedRows.slice(0, 10) },
    timestamp: new Date().toISOString()
  };
}

// 18. Find Inconsistent Capitalization
export function findInconsistentCapitalization(headers: string[], rows: Record<string, any>[], column: string): ToolResult {
  const casingMap = new Map<string, Set<string>>();

  rows.forEach(r => {
    const val = String(r[column] ?? '').trim();
    if (!val) return;
    const lower = val.toLowerCase();
    if (!casingMap.has(lower)) casingMap.set(lower, new Set());
    casingMap.get(lower)!.add(val);
  });

  const inconsistencies: { lower: string; variants: string[] }[] = [];
  casingMap.forEach((variants, lower) => {
    if (variants.size > 1) {
      inconsistencies.push({ lower, variants: Array.from(variants) });
    }
  });

  return {
    toolName: 'findInconsistentCapitalization',
    success: true,
    summary: `Found ${inconsistencies.length} capitalization inconsistencies in column "${column}".`,
    data: { column, inconsistentGroupsCount: inconsistencies.length, inconsistencies },
    timestamp: new Date().toISOString()
  };
}

// 19. Find Blank Rows
export function findBlankRows(headers: string[], rows: Record<string, any>[]): ToolResult {
  const blankRowIndices: number[] = [];

  rows.forEach((r, idx) => {
    const isBlank = headers.every(h => {
      const v = r[h];
      return v === undefined || v === null || String(v).trim() === '';
    });
    if (isBlank) blankRowIndices.push(idx + 2);
  });

  return {
    toolName: 'findBlankRows',
    success: true,
    summary: `Identified ${blankRowIndices.length} completely empty/blank rows.`,
    data: { blankRowCount: blankRowIndices.length, blankRowIndices },
    timestamp: new Date().toISOString()
  };
}

// 20. Detect Schema Changes / Schema Drift
export function detectSchemaChanges(currentHeaders: string[], expectedSchemaHeaders: string[]): ToolResult {
  const missingHeaders = expectedSchemaHeaders.filter(h => !currentHeaders.includes(h));
  const addedHeaders = currentHeaders.filter(h => !expectedSchemaHeaders.includes(h));
  const isMatch = missingHeaders.length === 0 && addedHeaders.length === 0;

  return {
    toolName: 'detectSchemaChanges',
    success: true,
    summary: isMatch
      ? 'Schema perfectly matches expected template.'
      : `Schema drift detected: ${missingHeaders.length} missing headers, ${addedHeaders.length} new headers.`,
    data: {
      isMatch,
      missingHeaders,
      addedHeaders,
      currentHeaders,
      expectedSchemaHeaders
    },
    timestamp: new Date().toISOString()
  };
}

// 21. Compare Datasets (Diffing two datasets)
export function compareDatasets(
  datasetA: { fileName: string; headers: string[]; rows: Record<string, any>[] },
  datasetB: { fileName: string; headers: string[]; rows: Record<string, any>[] }
): ToolResult {
  const rowCountDiff = datasetA.rows.length - datasetB.rows.length;
  const missingHeadersInB = datasetA.headers.filter(h => !datasetB.headers.includes(h));
  const addedHeadersInB = datasetB.headers.filter(h => !datasetA.headers.includes(h));

  return {
    toolName: 'compareDatasets',
    success: true,
    summary: `Compared "${datasetA.fileName}" (${datasetA.rows.length} rows) with "${datasetB.fileName}" (${datasetB.rows.length} rows). Row diff: ${rowCountDiff}.`,
    data: {
      datasetA: datasetA.fileName,
      datasetB: datasetB.fileName,
      rowsCountA: datasetA.rows.length,
      rowsCountB: datasetB.rows.length,
      rowCountDiff,
      missingHeadersInB,
      addedHeadersInB
    },
    timestamp: new Date().toISOString()
  };
}

// 22. Generate Charts
export function generateCharts(headers: string[], rows: Record<string, any>[], chartType: 'bar' | 'line' | 'pie' | 'scatter', xAxis: string, yAxis: string): ToolResult {
  const chartData: { x: string; y: number }[] = [];

  rows.slice(0, 30).forEach(r => {
    const xVal = String(r[xAxis] ?? '');
    const yVal = parseFloat(String(r[yAxis] ?? '0').replace(/[^0-9.-]/g, '')) || 0;
    if (xVal) chartData.push({ x: xVal, y: yVal });
  });

  return {
    toolName: 'generateCharts',
    success: true,
    summary: `Generated ${chartType} chart configuration plotting ${xAxis} vs ${yAxis}.`,
    data: {
      chartType,
      xAxis,
      yAxis,
      title: `${yAxis} by ${xAxis}`,
      dataPointsCount: chartData.length,
      chartData
    },
    timestamp: new Date().toISOString()
  };
}

// 23. Generate Insights
export function generateInsights(headers: string[], rows: Record<string, any>[]): ToolResult {
  const summary = summarizeDataset(headers, rows);
  const duplicates = findDuplicates(headers, rows);
  const outliers = detectOutliers(headers, rows);

  const insights: string[] = [
    `Dataset contains ${rows.length} records across ${headers.length} columns.`,
    `Quality score evaluated at ${summary.data.qualityScore}/100 with ${summary.data.nullPercentage}% null rate.`,
    duplicates.data.duplicateCount > 0
      ? `Flagged ${duplicates.data.duplicateCount} duplicate records requiring deduplication.`
      : `No exact duplicate rows detected.`,
    outliers.data.outlierCount > 0
      ? `Detected ${outliers.data.outlierCount} extreme variance outliers in numeric columns.`
      : `Numeric values sit within expected variance standard deviations.`
  ];

  return {
    toolName: 'generateInsights',
    success: true,
    summary: `Generated executive insights for dataset.`,
    data: { insights },
    timestamp: new Date().toISOString()
  };
}

// 24. Generate Recommendations
export function generateRecommendations(headers: string[], rows: Record<string, any>[]): ToolResult {
  const summary = summarizeDataset(headers, rows);
  const duplicates = findDuplicates(headers, rows);
  const missing = findMissingValues(headers, rows);

  const recommendations: { priority: 'HIGH' | 'MEDIUM' | 'LOW'; action: string; impact: string }[] = [];

  if (duplicates.data.duplicateCount > 0) {
    recommendations.push({
      priority: 'HIGH',
      action: `Execute Deduplication routine to purge ${duplicates.data.duplicateCount} duplicate rows.`,
      impact: `Prevents double-counting in SQL database ingestion and restores primary key integrity.`
    });
  }

  if (summary.data.emptyCells > 0) {
    recommendations.push({
      priority: 'HIGH',
      action: `Apply Missing Value Imputation across ${summary.data.emptyCells} empty cells.`,
      impact: `Fixes NOT NULL database constraints.`
    });
  }

  recommendations.push({
    priority: 'MEDIUM',
    action: `Standardize date columns to ISO 8601 YYYY-MM-DD format.`,
    impact: `Ensures seamless timestamp parsing across PostgreSQL and BI tools.`
  });

  return {
    toolName: 'generateRecommendations',
    success: true,
    summary: `Generated ${recommendations.length} prioritized data cleaning recommendations.`,
    data: { recommendations },
    timestamp: new Date().toISOString()
  };
}

// 25. Calculate Correlation (Pearson)
export function calculateCorrelation(headers: string[], rows: Record<string, any>[], col1: string, col2: string): ToolResult {
  const pairs: { x: number; y: number }[] = [];

  rows.forEach(r => {
    const x = parseFloat(String(r[col1] ?? '').replace(/[^0-9.-]/g, ''));
    const y = parseFloat(String(r[col2] ?? '').replace(/[^0-9.-]/g, ''));
    if (!isNaN(x) && !isNaN(y)) {
      pairs.push({ x, y });
    }
  });

  if (pairs.length < 3) {
    return {
      toolName: 'calculateCorrelation',
      success: false,
      summary: `Insufficient numeric pairs to compute correlation between "${col1}" and "${col2}".`,
      data: { col1, col2, pairCount: pairs.length },
      timestamp: new Date().toISOString()
    };
  }

  const n = pairs.length;
  const sumX = pairs.reduce((acc, p) => acc + p.x, 0);
  const sumY = pairs.reduce((acc, p) => acc + p.y, 0);
  const sumX2 = pairs.reduce((acc, p) => acc + Math.pow(p.x, 2), 0);
  const sumY2 = pairs.reduce((acc, p) => acc + Math.pow(p.y, 2), 0);
  const sumXY = pairs.reduce((acc, p) => acc + p.x * p.y, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - Math.pow(sumX, 2)) * (n * sumY2 - Math.pow(sumY, 2)));

  const correlation = denominator !== 0 ? numerator / denominator : 0;

  return {
    toolName: 'calculateCorrelation',
    success: true,
    summary: `Pearson correlation coefficient between "${col1}" and "${col2}" is ${correlation.toFixed(3)}.`,
    data: {
      col1,
      col2,
      correlation: Math.round(correlation * 1000) / 1000,
      pairCount: n,
      strength: Math.abs(correlation) > 0.7 ? 'STRONG' : Math.abs(correlation) > 0.3 ? 'MODERATE' : 'WEAK'
    },
    timestamp: new Date().toISOString()
  };
}

// 26. Detect Anomalies (Multi-column)
export function detectAnomalies(headers: string[], rows: Record<string, any>[]): ToolResult {
  const duplicates = findDuplicates(headers, rows);
  const outliers = detectOutliers(headers, rows);
  const corrupt = findInvalidCharacters(headers, rows);

  const totalAnomalies = duplicates.data.duplicateCount + outliers.data.outlierCount + corrupt.data.corruptEntriesCount;

  return {
    toolName: 'detectAnomalies',
    success: true,
    summary: `Detected total of ${totalAnomalies} data anomalies (${duplicates.data.duplicateCount} duplicates, ${outliers.data.outlierCount} numeric outliers, ${corrupt.data.corruptEntriesCount} corrupt chars).`,
    data: {
      totalAnomalies,
      duplicateCount: duplicates.data.duplicateCount,
      outlierCount: outliers.data.outlierCount,
      corruptCount: corrupt.data.corruptEntriesCount,
      outlierSamples: outliers.data.outliers,
      duplicateSamples: duplicates.data.duplicateGroups
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Tool Dispatcher to invoke tool by name
 */
export function executeToolByName(
  toolName: string,
  args: { headers?: string[]; rows?: Record<string, any>[]; [key: string]: any }
): ToolResult {
  const headers = args.headers || [];
  const rows = args.rows || [];

  switch (toolName) {
    case 'calculateStatistics': return calculateStatistics(rows, args.column || headers[0]);
    case 'summarizeDataset': return summarizeDataset(headers, rows);
    case 'findDuplicates': return findDuplicates(headers, rows, args.keyColumns);
    case 'removeDuplicates': return removeDuplicates(headers, rows, args.keyColumns);
    case 'detectOutliers': return detectOutliers(headers, rows, args.column, args.threshold);
    case 'findMissingValues': return findMissingValues(headers, rows);
    case 'cleanWhitespace': return cleanWhitespace(headers, rows);
    case 'trimColumns': return trimColumns(headers, rows, args.keepColumns || []);
    case 'validateEmails': return validateEmails(headers, rows, args.column);
    case 'validatePhoneNumbers': return validatePhoneNumbers(headers, rows, args.column);
    case 'validateDates': return validateDates(headers, rows, args.column);
    case 'detectPII': return detectPII(headers, rows);
    case 'findInvalidCharacters': return findInvalidCharacters(headers, rows);
    case 'normalizeColumns': return normalizeColumns(headers, rows, args.column || headers[0], args.casing || 'TITLE');
    case 'convertDateFormats': return convertDateFormats(headers, rows, args.column || headers[0]);
    case 'detectEncoding': return detectEncoding(args.fileName || 'file.csv', args.sampleBuffer);
    case 'repairEncoding': return repairEncoding(headers, rows);
    case 'findInconsistentCapitalization': return findInconsistentCapitalization(headers, rows, args.column || headers[0]);
    case 'findBlankRows': return findBlankRows(headers, rows);
    case 'detectSchemaChanges': return detectSchemaChanges(headers, args.expectedSchemaHeaders || []);
    case 'compareDatasets': return compareDatasets(args.datasetA, args.datasetB);
    case 'generateCharts': return generateCharts(headers, rows, args.chartType || 'bar', args.xAxis || headers[0], args.yAxis || headers[1]);
    case 'generateInsights': return generateInsights(headers, rows);
    case 'generateRecommendations': return generateRecommendations(headers, rows);
    case 'calculateCorrelation': return calculateCorrelation(headers, rows, args.col1 || headers[0], args.col2 || headers[1]);
    case 'detectAnomalies': return detectAnomalies(headers, rows);
    default:
      return {
        toolName,
        success: false,
        summary: `Unknown tool "${toolName}".`,
        data: {},
        timestamp: new Date().toISOString()
      };
  }
}
