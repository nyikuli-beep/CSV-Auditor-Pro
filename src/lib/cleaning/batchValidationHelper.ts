import { CSVFile, AuditIssue, CustomValidationRule, Severity } from '../../types';
import { formatLocalTimestamp } from '../timeService';
import { runSecurityAndStructureScan, parseCSVContentRFC4180 } from '../csvSecurityValidator';
import { detectCSVFormats } from '../formatDetector';
import { createDefaultRetentionPolicy } from '../retentionService';

export function calculateScore(issueCount: number, cellCount: number): number {
  return Math.max(25, Math.min(100, Math.round(100 - (issueCount / (cellCount || 1)) * 300)));
}

export function generateFileIssues(
  headers: string[],
  rows: Record<string, string>[],
  detectedMetadata: any,
  rules: CustomValidationRule[],
  headerMappings?: Record<string, string>
): AuditIssue[] {
  const generatedIssues: AuditIssue[] = [];
  const seenRows = new Set<string>();
  const MAX_ISSUES_STORED = 500;

  // Pre-compile active custom regex rules once outside row loop
  const activeRulesWithRegex = (rules || [])
    .filter(rule => rule.isActive)
    .map(rule => {
      if (rule.type === 'regex' && rule.regexPattern) {
        try {
          return { ...rule, compiledRegex: new RegExp(rule.regexPattern) };
        } catch (e) {
          return { ...rule, compiledRegex: null };
        }
      }
      return { ...rule, compiledRegex: null };
    });

  const maxRowsToCheck = rows.length > 15000 ? 10000 : rows.length;

  for (let rowIndex = 0; rowIndex < maxRowsToCheck; rowIndex++) {
    const row = rows[rowIndex];
    const humanRowIndex = rowIndex + 2; // 1-indexed accounting for headers

    // 1. Check Duplicates with fast value joining
    const rowString = Object.values(row).slice(0, 15).join('│');
    if (seenRows.has(rowString)) {
      if (generatedIssues.length < MAX_ISSUES_STORED) {
        generatedIssues.push({
          id: `dynamic-issue-dup-${rowIndex}`,
          type: 'duplicate',
          column: headers[0] || 'Row',
          row: humanRowIndex,
          value: 'Duplicate Row content',
          severity: 'critical',
          description: `Entire row matches a previous record exactly.`,
          suggestion: 'Deduplicate row during clean phase.',
          status: 'open'
        });
      }
    } else {
      seenRows.add(rowString);
    }

    // 2. Check Missing Values & Formats
    headers.forEach(h => {
      const cellVal = row[h];
      const mappedCanonical = headerMappings?.[h] || 'None';

      if (cellVal === undefined || cellVal === '') {
        const isCrucial = h.toLowerCase().includes('id') || h.toLowerCase().includes('amount') || h.toLowerCase().includes('date') || h.toLowerCase().includes('email') ||
                          mappedCanonical === 'Transaction ID' || mappedCanonical === 'Amount' || mappedCanonical === 'Transaction Date' || mappedCanonical === 'Email / Contact';
        if (generatedIssues.length < MAX_ISSUES_STORED) {
          generatedIssues.push({
            id: `dynamic-issue-missing-${rowIndex}-${h}`,
            type: 'missing_value',
            column: h,
            row: humanRowIndex,
            value: '',
            severity: isCrucial ? 'critical' : 'warning',
            description: `Missing cell value found in column "${h}".`,
            suggestion: isCrucial ? 'Required data. Impute value or contact editor.' : 'Fill with standard category or text.',
            status: 'open'
          });
        }
      } else {
        // Check outliers on numerical columns
        if (h.toLowerCase().includes('amount') || h.toLowerCase().includes('pay') || h.toLowerCase().includes('price') || mappedCanonical === 'Amount') {
          const num = parseFloat(cellVal.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num) && num > 100000) {
            if (generatedIssues.length < MAX_ISSUES_STORED) {
              generatedIssues.push({
                id: `dynamic-issue-outlier-${rowIndex}-${h}`,
                type: 'outlier',
                column: h,
                row: humanRowIndex,
                value: cellVal,
                severity: 'warning',
                description: `High numerical outlier found: ${cellVal}.`,
                suggestion: 'Check if transaction matches correct ledger approvals.',
                status: 'open'
              });
            }
          }
        }
        // Check date format
        if (h.toLowerCase().includes('date') || mappedCanonical === 'Transaction Date' || (detectedMetadata && detectedMetadata.dateFormats && detectedMetadata.dateFormats[h])) {
          const expectedFormat = (detectedMetadata && detectedMetadata.dateFormats && detectedMetadata.dateFormats[h]) || 'YYYY-MM-DD';
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(cellVal)) {
            let description = `Date "${cellVal}" does not follow YYYY-MM-DD standard format.`;
            let suggestion = 'Convert to standard ISO-8601 formatting.';

            if (expectedFormat !== 'YYYY-MM-DD') {
              description = `Date "${cellVal}" is in "${expectedFormat}" format. System standard is YYYY-MM-DD.`;
              suggestion = `Auto-standardize this column from "${expectedFormat}" during cleaning.`;
            }

            if (generatedIssues.length < MAX_ISSUES_STORED) {
              generatedIssues.push({
                id: `dynamic-issue-date-${rowIndex}-${h}`,
                type: 'invalid_format',
                column: h,
                row: humanRowIndex,
                value: cellVal,
                severity: 'warning',
                description: description,
                suggestion: suggestion,
                status: 'open'
              });
            }
          }
        }
        // Check email format if mapped to Email / Contact
        if (mappedCanonical === 'Email / Contact' || h.toLowerCase().includes('email')) {
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(cellVal)) {
            if (generatedIssues.length < MAX_ISSUES_STORED) {
              generatedIssues.push({
                id: `dynamic-issue-email-${rowIndex}-${h}`,
                type: 'invalid_format',
                column: h,
                row: humanRowIndex,
                value: cellVal,
                severity: 'warning',
                description: `Value "${cellVal}" does not follow standard email formats.`,
                suggestion: 'Verify address syntax or fix empty placeholders.',
                status: 'open'
              });
            }
          }
        }
      }
    });

    // 3. Apply custom validation rules
    activeRulesWithRegex.forEach(rule => {
      const matchedHeader = headers.find(h => h.toLowerCase() === rule.columnName.toLowerCase());
      if (matchedHeader) {
        const cellVal = row[matchedHeader];
        if (cellVal !== undefined && cellVal !== '') {
          if (rule.type === 'regex' && rule.compiledRegex) {
            if (!rule.compiledRegex.test(cellVal)) {
              if (generatedIssues.length < MAX_ISSUES_STORED) {
                generatedIssues.push({
                  id: `custom-issue-regex-${rowIndex}-${matchedHeader}-${rule.id}`,
                  type: 'invalid_format',
                  column: matchedHeader,
                  row: humanRowIndex,
                  value: cellVal,
                  severity: rule.severity,
                  description: rule.description || `Value "${cellVal}" failed custom regex validation: /${rule.regexPattern}/.`,
                  suggestion: `Adjust column content to match required validation criteria.`,
                  status: 'open'
                });
              }
            }
          } else if (rule.type === 'range') {
            const cleanNumStr = cellVal.replace(/[^0-9.-]/g, '');
            const num = parseFloat(cleanNumStr);
            if (isNaN(num)) {
              if (generatedIssues.length < MAX_ISSUES_STORED) {
                generatedIssues.push({
                  id: `custom-issue-range-nan-${rowIndex}-${matchedHeader}-${rule.id}`,
                  type: 'invalid_format',
                  column: matchedHeader,
                  row: humanRowIndex,
                  value: cellVal,
                  severity: rule.severity,
                  description: `Value "${cellVal}" could not be parsed as a number for range validation.`,
                  suggestion: `Ensure value is a valid numeric format.`,
                  status: 'open'
                });
              }
            } else {
              let failed = false;
              let desc = '';
              if (rule.rangeMin !== undefined && num < rule.rangeMin) {
                failed = true;
                desc = `Value ${num} is below custom minimum threshold of ${rule.rangeMin}.`;
              }
              if (rule.rangeMax !== undefined && num > rule.rangeMax) {
                failed = true;
                desc = `Value ${num} is above custom maximum threshold of ${rule.rangeMax}.`;
              }
              if (failed) {
                if (generatedIssues.length < MAX_ISSUES_STORED) {
                  generatedIssues.push({
                    id: `custom-issue-range-limit-${rowIndex}-${matchedHeader}-${rule.id}`,
                    type: 'outlier',
                    column: matchedHeader,
                    row: humanRowIndex,
                    value: cellVal,
                    severity: rule.severity,
                    description: rule.description || desc,
                    suggestion: `Verify or update cell value to sit within allowed bounds.`,
                    status: 'open'
                  });
                }
              }
            }
          }
        }
      }
    });
  }

  return generatedIssues;
}

export function validateSingleCSVFile(file: CSVFile, customRules: CustomValidationRule[]): CSVFile {
  const headers = file.headers || [];
  const rows = file.rows || [];

  const scanResult = runSecurityAndStructureScan(headers, rows);
  const detectedMetadata = detectCSVFormats(headers, scanResult.sanitizedRows);
  const dataQualityIssues = generateFileIssues(headers, scanResult.sanitizedRows, detectedMetadata, customRules, file.headerMappings);
  const allIssues = [...scanResult.issues, ...dataQualityIssues];
  const newScore = calculateScore(allIssues.length, scanResult.sanitizedRows.length * (headers.length || 1));

  return {
    ...file,
    status: 'completed',
    score: newScore,
    rows: scanResult.sanitizedRows,
    issues: allIssues,
    totalRowsCount: scanResult.sanitizedRows.length,
    detectedMetadata: detectedMetadata,
    securityScanSummary: {
      formulasSanitized: scanResult.formulasSanitizedCount,
      maliciousThreatsDetected: scanResult.maliciousThreatsCount,
      securityWarnings: scanResult.issues.length,
      scanPassed: scanResult.isPassed,
      sanitizedAt: new Date().toISOString()
    }
  };
}

export function validateRawCSVContent(
  text: string,
  fileName: string,
  fileSize: number,
  customRules: CustomValidationRule[],
  delimiterOverride?: string
): CSVFile {
  const activeDelimiter = delimiterOverride || ',';
  const { headers, rows } = parseCSVContentRFC4180(text, activeDelimiter);

  if (headers.length === 0) {
    throw new Error(`File "${fileName}" has no readable headers or columns.`);
  }

  const scanResult = runSecurityAndStructureScan(headers, rows);
  const detectedMetadata = detectCSVFormats(headers, scanResult.sanitizedRows);
  const dataQualityIssues = generateFileIssues(headers, scanResult.sanitizedRows, detectedMetadata, customRules);
  const allIssues = [...scanResult.issues, ...dataQualityIssues];
  const score = calculateScore(allIssues.length, scanResult.sanitizedRows.length * headers.length);
  const isLargeFile = fileSize > 5 * 1024 * 1024;

  return {
    id: `uploaded-file-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name: fileName,
    size: fileSize,
    uploadedAt: formatLocalTimestamp(new Date(), { includeDate: true }),
    status: 'completed',
    score: score,
    headers: headers,
    rows: scanResult.sanitizedRows,
    issues: allIssues,
    totalRowsCount: scanResult.sanitizedRows.length,
    isLargeFile: isLargeFile,
    detectedMetadata: detectedMetadata,
    retentionPolicy: createDefaultRetentionPolicy('24h'),
    securityScanSummary: {
      formulasSanitized: scanResult.formulasSanitizedCount,
      maliciousThreatsDetected: scanResult.maliciousThreatsCount,
      securityWarnings: scanResult.issues.length,
      scanPassed: scanResult.isPassed,
      sanitizedAt: new Date().toISOString()
    }
  };
}
