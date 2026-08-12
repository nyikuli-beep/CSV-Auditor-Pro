import { AuditIssue, Severity } from '../types';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_ALLOWED_ROWS = 1000000;
export const MAX_ALLOWED_COLUMNS = 200;
export const MAX_CELL_CHARACTER_LIMIT = 10000;

export interface ValidationResult {
  valid: boolean;
  errorMessage?: string;
  fileSize?: number;
  detectedMimeType?: string;
  isBinaryOrCorrupted?: boolean;
}

export interface SecurityScanResult {
  isPassed: boolean;
  errorMessage?: string;
  issues: AuditIssue[];
  formulasSanitizedCount: number;
  maliciousThreatsCount: number;
  sanitizedRows: Record<string, string>[];
  headers: string[];
  totalRowsCount: number;
  totalColsCount: number;
}

// -------------------------------------------------------------
// RATE LIMITING STORE & FUNCTIONS
// -------------------------------------------------------------
interface RateLimitRecord {
  minuteTimestamps: number[];
  hourTimestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkUploadRateLimit(userId: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 360 * 10000;

  let record = rateLimitStore.get(userId);
  if (!record) {
    // Try reading persistent local record
    try {
      const stored = localStorage.getItem(`rate_limit_${userId}`);
      if (stored) {
        record = JSON.parse(stored);
      }
    } catch (e) {
      // ignore
    }
  }

  if (!record) {
    record = { minuteTimestamps: [], hourTimestamps: [] };
  }

  // Filter timestamps within windows
  record.minuteTimestamps = record.minuteTimestamps.filter(ts => ts > oneMinuteAgo);
  record.hourTimestamps = record.hourTimestamps.filter(ts => ts > oneHourAgo);

  if (record.minuteTimestamps.length >= 5 || record.hourTimestamps.length >= 50) {
    return {
      allowed: false,
      message: 'Upload limit reached. Please wait before uploading another file.'
    };
  }

  return { allowed: true };
}

export function recordUploadTimestamp(userId: string): void {
  const now = Date.now();
  let record = rateLimitStore.get(userId) || { minuteTimestamps: [], hourTimestamps: [] };
  record.minuteTimestamps.push(now);
  record.hourTimestamps.push(now);
  rateLimitStore.set(userId, record);

  try {
    localStorage.setItem(`rate_limit_${userId}`, JSON.stringify(record));
  } catch (e) {
    // ignore
  }
}

// -------------------------------------------------------------
// AUTHENTICATION & EMAIL VERIFICATION PERMISSION CHECK
// -------------------------------------------------------------
export function checkUserUploadPermission(currentUser: any): { allowed: boolean; message?: string } {
  if (!currentUser) {
    return {
      allowed: false,
      message: 'Please verify your email before uploading files.'
    };
  }

  // If user signed in anonymously or email is not verified when required
  if (currentUser.isAnonymous) {
    return {
      allowed: false,
      message: 'Please verify your email before uploading files.'
    };
  }

  // If user object has emailVerified property and it is explicitly false
  if (currentUser.emailVerified === false && currentUser.email) {
    return {
      allowed: false,
      message: 'Please verify your email before uploading files.'
    };
  }

  return { allowed: true };
}

export function getMaxFileSizeForPlan(plan: string = 'free'): { bytes: number; mb: number } {
  if (plan === 'enterprise') {
    return { bytes: 50 * 1024 * 1024, mb: 50 };
  }
  if (plan === 'pro') {
    return { bytes: 25 * 1024 * 1024, mb: 25 };
  }
  return { bytes: 5 * 1024 * 1024, mb: 5 };
}

// -------------------------------------------------------------
// FILE PRE-FLIGHT VALIDATION (SIZE, TYPE, MIME, BINARY CHECK)
// -------------------------------------------------------------
export function validateFilePreFlight(
  file: File, 
  plan: 'free' | 'pro' | 'enterprise' | string = 'free'
): ValidationResult {
  const { bytes: maxSizeBytes, mb: maxMB } = getMaxFileSizeForPlan(plan);

  // 1. Check Maximum File Size limit based on tier (5MB free, 25MB pro, 50MB enterprise)
  if (file.size > maxSizeBytes) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    let upgradeSuggestion = '';
    if (plan === 'free') {
      upgradeSuggestion = ' Upgrade to Pro (up to 25 MB) or Enterprise (up to 50 MB) to upload larger spreadsheets.';
    } else if (plan === 'pro') {
      upgradeSuggestion = ' Upgrade to Enterprise (up to 50 MB) to upload larger spreadsheets.';
    }

    return {
      valid: false,
      errorMessage: `File size limit exceeded: "${file.name}" is ${sizeInMB} MB, which exceeds the ${maxMB} MB limit for ${plan.toUpperCase()} tier users.${upgradeSuggestion}`,
      fileSize: file.size
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      errorMessage: 'The uploaded file is empty (0 bytes).',
      fileSize: 0
    };
  }

  // 2. Validate Extension
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.csv')) {
    return {
      valid: false,
      errorMessage: 'Invalid file format. CSV Auditor Pro exclusively accepts .csv spreadsheet files.'
    };
  }

  // 3. Validate MIME Type
  const validMimeTypes = [
    'text/csv',
    'application/csv',
    'text/x-csv',
    'application/x-csv',
    'text/comma-separated-values',
    'application/vnd.ms-excel',
    'text/plain',
    '' // Some browsers leave type empty for local .csv
  ];

  if (file.type && !validMimeTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      errorMessage: `Unsupported MIME type "${file.type}". Only legitimate CSV spreadsheets are allowed.`,
      detectedMimeType: file.type
    };
  }

  return {
    valid: true,
    fileSize: file.size,
    detectedMimeType: file.type
  };
}

// -------------------------------------------------------------
// SAFE RFC 4180 CSV PARSER
// -------------------------------------------------------------
export function parseCSVContentRFC4180(text: string, overrideDelimiter?: string): {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
  totalLines: number;
} {
  // Check for binary headers or null bytes
  if (text.includes('\0')) {
    throw new Error('File contains invalid binary data or null bytes.');
  }

  // Detect delimiter if not provided
  let delimiter = overrideDelimiter || ',';
  if (!overrideDelimiter) {
    const candidates = [',', ';', '\t', '|'];
    const sampleLines = text.split(/\r?\n/).slice(0, 10).filter(l => l.trim().length > 0);
    let maxScore = -1;
    candidates.forEach(cand => {
      const counts = sampleLines.map(line => line.split(cand).length - 1);
      const avg = counts.reduce((a, b) => a + b, 0) / (counts.length || 1);
      if (avg > 0) {
        const isUniform = counts.every(c => c === counts[0]);
        const score = avg + (isUniform ? 50 : 0);
        if (score > maxScore) {
          maxScore = score;
          delimiter = cand;
        }
      }
    });
  }

  // Full state-machine CSV parser handling quotes, escaped quotes (""), embedded newlines
  const rowsRaw: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (char === '"') {
      if (insideQuotes && i + 1 < len && text[i + 1] === '"') {
        // Escaped quote
        currentCell += '"';
        i += 2;
        continue;
      } else {
        // Toggle quotes
        insideQuotes = !insideQuotes;
        i++;
        continue;
      }
    }

    if (!insideQuotes && char === delimiter) {
      currentRow.push(currentCell.trim());
      currentCell = '';
      i++;
      continue;
    }

    if (!insideQuotes && (char === '\r' || char === '\n')) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c !== '')) {
        rowsRaw.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      if (char === '\r' && i + 1 < len && text[i + 1] === '\n') {
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    currentCell += char;
    i++;
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c !== '')) {
      rowsRaw.push(currentRow);
    }
  }

  if (rowsRaw.length === 0) {
    throw new Error('Spreadsheet contains no parsable data rows.');
  }

  const headers = rowsRaw[0].map((h, idx) => {
    const clean = h.replace(/^["']|["']$/g, '').trim();
    return clean || `Column_${idx + 1}`;
  });

  const dataRows: Record<string, string>[] = [];
  for (let r = 1; r < rowsRaw.length; r++) {
    const rawCols = rowsRaw[r];
    const rowObj: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      let val = rawCols[colIdx] !== undefined ? rawCols[colIdx] : '';
      // Strip surrounding quotes
      if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      rowObj[h] = val;
    });
    dataRows.push(rowObj);
  }

  return {
    headers,
    rows: dataRows,
    delimiter,
    totalLines: rowsRaw.length
  };
}

// -------------------------------------------------------------
// FORMULA INJECTION & MALICIOUS CONTENT SECURITY SCANNER
// -------------------------------------------------------------
export function runSecurityAndStructureScan(
  headers: string[],
  rows: Record<string, string>[]
): SecurityScanResult {
  const issues: AuditIssue[] = [];
  let formulasSanitizedCount = 0;
  let maliciousThreatsCount = 0;

  // 1. Column Limit Check (Max 200)
  if (headers.length > MAX_ALLOWED_COLUMNS) {
    return {
      isPassed: false,
      errorMessage: `File exceeds maximum allowed column count of ${MAX_ALLOWED_COLUMNS} columns (detected ${headers.length} columns).`,
      issues: [],
      formulasSanitizedCount: 0,
      maliciousThreatsCount: 0,
      sanitizedRows: rows,
      headers: headers,
      totalRowsCount: rows.length,
      totalColsCount: headers.length
    };
  }

  // 2. Row Limit Check (Max 1,000,000)
  if (rows.length > MAX_ALLOWED_ROWS) {
    return {
      isPassed: false,
      errorMessage: `File exceeds maximum allowed row count of ${MAX_ALLOWED_ROWS.toLocaleString()} rows (detected ${rows.length.toLocaleString()} rows).`,
      issues: [],
      formulasSanitizedCount: 0,
      maliciousThreatsCount: 0,
      sanitizedRows: rows,
      headers: headers,
      totalRowsCount: rows.length,
      totalColsCount: headers.length
    };
  }

  const sanitizedRows: Record<string, string>[] = [];

  // Patterns for Malicious Content
  const htmlTagRegex = /<\/?(script|iframe|object|embed|applet|style|form|svg|a|body|head|meta|link|base)[^>]*>/i;
  const scriptExecRegex = /(javascript:|vbscript:|data:text\/html|eval\(|alert\(|document\.cookie|window\.location|onload=|onerror=|onclick=|onmouseover=|onfocus=)/i;
  const sqlInjectionRegex = /(\b(UNION\s+SELECT|DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+\w+\s+SET|INSERT\s+INTO|EXEC\s*\(|ALTER\s+TABLE)\b|' OR '1'='1|1=1\s*--|;\s*DROP)/i;
  const suspiciousUnicodeRegex = /[\u200B-\u200D\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

  const MAX_ISSUES_LIMIT = 500;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const originalRow = rows[rowIndex];
    const sanitizedRow: Record<string, string> = { ...originalRow };
    const humanRowIndex = rowIndex + 2; // Accounting for header

    headers.forEach(header => {
      let cellValue = originalRow[header] || '';

      // Check Cell Character Limit (Max 10,000)
      if (cellValue.length > MAX_CELL_CHARACTER_LIMIT) {
        if (issues.length < MAX_ISSUES_LIMIT) {
          issues.push({
            id: `sec-cell-limit-${rowIndex}-${header}`,
            type: 'security_violation',
            column: header,
            row: humanRowIndex,
            value: `${cellValue.substring(0, 30)}... (${cellValue.length} chars)`,
            severity: 'critical',
            description: `Cell length (${cellValue.length} chars) exceeds security threshold of ${MAX_CELL_CHARACTER_LIMIT} characters.`,
            suggestion: 'Truncate or split oversized string content to prevent denial-of-service risks.',
            status: 'open'
          });
        }
        // Truncate cell value safely
        cellValue = cellValue.substring(0, MAX_CELL_CHARACTER_LIMIT);
      }

      // Check Formula Injection
      // Triggers if cell begins with =, +, -, @ after trimming
      const trimmedVal = cellValue.trim();
      const firstChar = trimmedVal.charAt(0);
      if (['=', '+', '-', '@'].includes(firstChar)) {
        // Exclude legitimate standalone numbers or simple negative numbers (e.g. -12.50)
        const isSimpleNegativeNumber = firstChar === '-' && !isNaN(Number(trimmedVal));
        const isSimplePositiveNumber = firstChar === '+' && !isNaN(Number(trimmedVal));

        if (!isSimpleNegativeNumber && !isSimplePositiveNumber) {
          formulasSanitizedCount++;
          // Sanitize formula by prefixing single quote
          cellValue = `'${cellValue}`;

          if (issues.length < MAX_ISSUES_LIMIT) {
            issues.push({
              id: `sec-formula-${rowIndex}-${header}`,
              type: 'formula_injection',
              column: header,
              row: humanRowIndex,
              value: originalRow[header],
              severity: 'warning',
              description: `Potential spreadsheet formula injection detected ("${originalRow[header]}").`,
              suggestion: 'Sanitized with single-quote prefix (\') to prevent execution in Excel/Google Sheets.',
              status: 'open'
            });
          }
        }
      }

      // Check Malicious Content (HTML, XSS, SQLi, Control Chars)
      let isThreatFound = false;
      let threatDescription = '';

      if (htmlTagRegex.test(cellValue) || scriptExecRegex.test(cellValue)) {
        isThreatFound = true;
        threatDescription = 'HTML/JavaScript XSS payload detected in cell content.';
      } else if (sqlInjectionRegex.test(cellValue)) {
        isThreatFound = true;
        threatDescription = 'SQL injection pattern detected in cell content.';
      } else if (suspiciousUnicodeRegex.test(cellValue)) {
        isThreatFound = true;
        threatDescription = 'Hidden control characters or suspicious zero-width Unicode detected.';
      }

      if (isThreatFound) {
        maliciousThreatsCount++;
        // Neutralize HTML tags
        cellValue = cellValue
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/[\u200B-\u200D\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

        if (issues.length < MAX_ISSUES_LIMIT) {
          issues.push({
            id: `sec-malicious-${rowIndex}-${header}`,
            type: 'malicious_content',
            column: header,
            row: humanRowIndex,
            value: originalRow[header],
            severity: 'critical',
            description: threatDescription,
            suggestion: 'Cell sanitized to neutralize potential script/SQL execution risks.',
            status: 'open'
          });
        }
      }

      sanitizedRow[header] = cellValue;
    });

    sanitizedRows.push(sanitizedRow);
  }

  // Reject file if extreme malicious threats found (> 100 severe injection points or executable binary/script payload)
  if (maliciousThreatsCount > 100) {
    return {
      isPassed: false,
      errorMessage: 'File rejected due to severe malicious content and high-volume script injection threats detected.',
      issues: issues,
      formulasSanitizedCount: formulasSanitizedCount,
      maliciousThreatsCount: maliciousThreatsCount,
      sanitizedRows: sanitizedRows,
      headers: headers,
      totalRowsCount: rows.length,
      totalColsCount: headers.length
    };
  }

  return {
    isPassed: true,
    issues: issues,
    formulasSanitizedCount: formulasSanitizedCount,
    maliciousThreatsCount: maliciousThreatsCount,
    sanitizedRows: sanitizedRows,
    headers: headers,
    totalRowsCount: rows.length,
    totalColsCount: headers.length
  };
}

// -------------------------------------------------------------
// SECURE AUDIT LOGGING (METADATA ONLY - NEVER LOGS CELL CONTENT)
// -------------------------------------------------------------
export async function logSecurityAuditTelemetry(eventData: {
  userId: string;
  userEmail?: string;
  fileName: string;
  fileSizeBytes: number;
  processingDurationMs: number;
  totalRows: number;
  totalCols: number;
  validationPassed: boolean;
  formulasSanitized: number;
  maliciousThreatsDetected: number;
  rejectionReason?: string;
}): Promise<void> {
  try {
    await fetch('/api/audit-logs/security', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...eventData,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn('Security audit log telemetry sent locally (safe fallback):', e);
  }
}
