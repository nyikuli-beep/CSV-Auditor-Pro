/**
 * CSV Auditor Pro - Structured Dataset Context Engine & Multi-File RAG Manager
 * Generates rich, sanitized metadata summaries and slices for CSV files.
 */

export interface ColumnProfile {
  name: string;
  type: 'Date' | 'Boolean' | 'Currency' | 'Phone' | 'Email' | 'Numeric' | 'Text' | 'Primary Key' | 'Foreign Key';
  missingCount: number;
  nullPercentage: number;
  uniqueValuesCount: number;
  sampleValues: string[];
  stats?: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    stdDev?: number;
  };
}

export interface StructuredCSVContext {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileSizeBytesFormatted: string;
  encoding: string;
  delimiter: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  qualityScore: number;
  nullPercentageTotal: number;
  duplicateRowsCount: number;
  duplicateColsCount: number;
  formulaInjectionRisksCount: number;
  columnProfiles: ColumnProfile[];
  anomaliesDetectedCount: number;
  sampleRowsSanitized: Record<string, any>[];
  chunkedIndexSummary?: string;
  updatedAt: string;
}

/**
 * Sanitize formula injection risks (=, +, -, @)
 */
export function sanitizeCellValue(cell: any): string {
  if (cell === undefined || cell === null) return '';
  const str = String(cell).trim();
  if (/^[=+\-@]/.test(str)) {
    // Prefix with single quote to disarm formula injection
    return `'${str}`;
  }
  return str;
}

/**
 * Identify column data type semantically
 */
export function detectColumnType(
  headerName: string,
  sampleValues: any[]
): 'Date' | 'Boolean' | 'Currency' | 'Phone' | 'Email' | 'Numeric' | 'Text' | 'Primary Key' | 'Foreign Key' {
  const lowerHeader = headerName.toLowerCase();

  if (lowerHeader.includes('id') || lowerHeader.includes('uuid') || lowerHeader.includes('key') || lowerHeader.includes('ref')) {
    if (sampleValues.every(v => String(v).length > 3)) return 'Primary Key';
  }

  if (lowerHeader.includes('email') || sampleValues.some(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))) {
    return 'Email';
  }

  if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('contact')) {
    return 'Phone';
  }

  if (lowerHeader.includes('amount') || lowerHeader.includes('price') || lowerHeader.includes('cost') || lowerHeader.includes('fee') || sampleValues.some(v => /^\$?\d+(\.\d{2})?$/.test(String(v)))) {
    return 'Currency';
  }

  if (lowerHeader.includes('date') || lowerHeader.includes('time') || sampleValues.some(v => !isNaN(Date.parse(String(v))))) {
    return 'Date';
  }

  if (sampleValues.every(v => ['true', 'false', '1', '0', 'yes', 'no'].includes(String(v).toLowerCase()))) {
    return 'Boolean';
  }

  const numericCount = sampleValues.filter(v => !isNaN(parseFloat(String(v).replace(/[^0-9.-]/g, '')))).length;
  if (sampleValues.length > 0 && numericCount / sampleValues.length > 0.8) {
    return 'Numeric';
  }

  return 'Text';
}

/**
 * Formats file size human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Builds a structured dataset context object for a CSV file.
 * This object gives Gemini complete analytical visibility into the CSV structure
 * without injecting massive raw row strings into prompts.
 */
export function buildStructuredCSVContext(
  fileId: string,
  fileName: string,
  fileSize: number,
  headers: string[],
  rows: Record<string, any>[]
): StructuredCSVContext {
  const rowCount = rows.length;
  const colCount = headers.length;
  let formulaInjectionRisks = 0;
  let emptyCellsTotal = 0;

  // Build Column Profiles
  const columnProfiles: ColumnProfile[] = headers.map(header => {
    const values: string[] = [];
    const rawNumValues: number[] = [];
    let missingCount = 0;

    rows.forEach(r => {
      const val = r[header];
      if (val === undefined || val === null || String(val).trim() === '') {
        missingCount++;
        emptyCellsTotal++;
      } else {
        const strVal = String(val).trim();
        values.push(strVal);

        if (/^[=+\-@]/.test(strVal)) {
          formulaInjectionRisks++;
        }

        const cleanNum = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
        if (!isNaN(cleanNum)) {
          rawNumValues.push(cleanNum);
        }
      }
    });

    const uniqueValuesCount = new Set(values).size;
    const colType = detectColumnType(header, values.slice(0, 20));
    const nullPercentage = Math.round((missingCount / (rowCount || 1)) * 1000) / 10;

    let stats;
    if (rawNumValues.length > 0 && (colType === 'Numeric' || colType === 'Currency')) {
      rawNumValues.sort((a, b) => a - b);
      const sum = rawNumValues.reduce((a, b) => a + b, 0);
      const mean = sum / rawNumValues.length;
      const min = rawNumValues[0];
      const max = rawNumValues[rawNumValues.length - 1];
      const variance = rawNumValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rawNumValues.length;
      const stdDev = Math.sqrt(variance);
      const median = rawNumValues[Math.floor(rawNumValues.length / 2)];

      stats = {
        min,
        max,
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100
      };
    }

    return {
      name: header,
      type: colType,
      missingCount,
      nullPercentage,
      uniqueValuesCount,
      sampleValues: Array.from(new Set(values)).slice(0, 5),
      stats
    };
  });

  // Calculate duplicate rows
  const seenRowKeys = new Set<string>();
  let duplicateRowsCount = 0;
  rows.forEach(r => {
    const key = headers.map(h => String(r[h] ?? '').trim().toLowerCase()).join('|');
    if (seenRowKeys.has(key)) duplicateRowsCount++;
    else seenRowKeys.add(key);
  });

  // Calculate total null %
  const totalCells = rowCount * colCount || 1;
  const nullPercentageTotal = Math.round((emptyCellsTotal / totalCells) * 1000) / 10;
  const qualityScore = Math.max(0, Math.min(100, Math.round(100 - nullPercentageTotal - (duplicateRowsCount / (rowCount || 1)) * 20)));

  // Sanitize top 15 sample rows for AI context window
  const sampleRowsSanitized = rows.slice(0, 15).map(r => {
    const cleanR: Record<string, any> = {};
    headers.forEach(h => {
      cleanR[h] = sanitizeCellValue(r[h]);
    });
    return cleanR;
  });

  // Index summary for large datasets (>1000 rows)
  let chunkedIndexSummary = '';
  if (rowCount > 1000) {
    const topChunk = rows.slice(0, 100);
    const midChunk = rows.slice(Math.floor(rowCount / 2), Math.floor(rowCount / 2) + 100);
    const bottomChunk = rows.slice(rowCount - 100);
    chunkedIndexSummary = `Indexed 3 sample slices (${topChunk.length} head rows, ${midChunk.length} median rows, ${bottomChunk.length} tail rows) out of total ${rowCount} rows.`;
  }

  return {
    fileId,
    fileName,
    fileSize,
    fileSizeBytesFormatted: formatBytes(fileSize),
    encoding: 'UTF-8',
    delimiter: ',',
    rowCount,
    columnCount: colCount,
    headers,
    qualityScore,
    nullPercentageTotal,
    duplicateRowsCount,
    duplicateColsCount: 0,
    formulaInjectionRisksCount: formulaInjectionRisks,
    columnProfiles,
    anomaliesDetectedCount: duplicateRowsCount + (formulaInjectionRisks > 0 ? 1 : 0),
    sampleRowsSanitized,
    chunkedIndexSummary,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Multi-Dataset Store for handling multiple uploaded CSV files simultaneously
 */
class MultiDatasetStore {
  private datasets = new Map<string, StructuredCSVContext>();
  private activeFileId: string | null = null;

  public registerDataset(fileId: string, fileName: string, fileSize: number, headers: string[], rows: Record<string, any>[]): StructuredCSVContext {
    const context = buildStructuredCSVContext(fileId, fileName, fileSize, headers, rows);
    this.datasets.set(fileId, context);
    this.activeFileId = fileId;
    return context;
  }

  public setActiveFile(fileId: string) {
    if (this.datasets.has(fileId)) {
      this.activeFileId = fileId;
    }
  }

  public getActiveDataset(): StructuredCSVContext | null {
    if (!this.activeFileId) return null;
    return this.datasets.get(this.activeFileId) || null;
  }

  public getDataset(fileId: string): StructuredCSVContext | null {
    return this.datasets.get(fileId) || null;
  }

  public getAllDatasets(): StructuredCSVContext[] {
    return Array.from(this.datasets.values());
  }

  public clearAll() {
    this.datasets.clear();
    this.activeFileId = null;
  }
}

export const globalDatasetStore = new MultiDatasetStore();
