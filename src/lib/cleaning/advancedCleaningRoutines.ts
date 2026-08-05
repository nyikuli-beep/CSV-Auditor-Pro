/**
 * Enterprise Advanced Cleaning, Validation & Security Routines
 * CSV Auditor Pro
 */

export interface CleaningResult {
  updatedRows: Record<string, string>[];
  updatedHeaders: string[];
  changesCount: number;
  summary: string;
}

// 11. Invisible Character Cleaner
export function cleanInvisibleCharacters(headers: string[], rows: Record<string, string>[]): CleaningResult {
  let changes = 0;
  const updatedRows = rows.map((row) => {
    const newRow: Record<string, string> = {};
    headers.forEach((h) => {
      let val = String(row[h] ?? '');
      // Remove zero-width spaces (\u200B, \uFEFF, \u200C, \u200D), carriage returns, control characters
      const cleaned = val
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero width
        .replace(/[\r\n\t]/g, ' ')            // Controls/tabs to space
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Non-printable ASCII
        .replace(/\s+/g, ' ')                 // Multiple spaces to single space
        .trim();                              // Trim leading/trailing

      if (cleaned !== val) {
        changes++;
      }
      newRow[h] = cleaned;
    });
    return newRow;
  });

  return {
    updatedRows,
    updatedHeaders: headers,
    changesCount: changes,
    summary: `Cleaned invisible characters, zero-width spaces, and control characters across ${changes} cells.`
  };
}

// 12. Unicode & Encoding Repair
export function repairUnicodeEncoding(headers: string[], rows: Record<string, string>[]): CleaningResult {
  let changes = 0;
  const updatedRows = rows.map((row) => {
    const newRow: Record<string, string> = {};
    headers.forEach((h) => {
      let val = String(row[h] ?? '');
      // Common encoding artifacts replacement
      let repaired = val
        .replace(/Ã©/g, 'é')
        .replace(/Ã/g, 'à')
        .replace(/Ã¶/g, 'ö')
        .replace(/Ã¼/g, 'ü')
        .replace(/â€™/g, "'")
        .replace(/â€“/g, '–')
        .replace(/â€œ/g, '"')
        .replace(/â€/g, '"')
        .replace(/ï¿½/g, '') // Unicode replacement char
        .replace(/\uFFFD/g, '');

      if (repaired !== val) {
        changes++;
      }
      newRow[h] = repaired;
    });
    return newRow;
  });

  return {
    updatedRows,
    updatedHeaders: headers,
    changesCount: changes,
    summary: `Repaired double-encoded UTF-8 and replacement characters across ${changes} cells.`
  };
}

// 13. HTML & Markdown Cleaner
export function cleanHtmlAndMarkdown(headers: string[], rows: Record<string, string>[]): CleaningResult {
  let changes = 0;
  const updatedRows = rows.map((row) => {
    const newRow: Record<string, string> = {};
    headers.forEach((h) => {
      let val = String(row[h] ?? '');
      // Strip HTML tags
      let cleaned = val.replace(/<[^>]*>?/gm, '');
      // Strip Markdown bold, italic, code blocks, links
      cleaned = cleaned
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
        .replace(/(\*|_)(.*?)\1/g, '$2')   // italic
        .replace(/`([^`]+)`/g, '$1')       // code
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1'); // markdown links [text](url)

      if (cleaned !== val) {
        changes++;
      }
      newRow[h] = cleaned.trim();
    });
    return newRow;
  });

  return {
    updatedRows,
    updatedHeaders: headers,
    changesCount: changes,
    summary: `Stripped HTML tags, CSS, and Markdown formatting from ${changes} cells.`
  };
}

// 15. Contact Information Normalizer
export function normalizeContactInformation(headers: string[], rows: Record<string, string>[]): CleaningResult {
  let changes = 0;
  const updatedRows = rows.map((row) => {
    const newRow: Record<string, string> = { ...row };
    headers.forEach((h) => {
      const lowerHeader = h.toLowerCase();
      let val = String(row[h] ?? '').trim();
      if (!val) return;

      // Email Normalization
      if (lowerHeader.includes('email')) {
        const cleanedEmail = val.toLowerCase().replace(/\s+/g, '');
        if (cleanedEmail !== val) {
          changes++;
          newRow[h] = cleanedEmail;
        }
      }

      // Phone Normalization (E.164 / International)
      else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('tel')) {
        let cleanedPhone = val.replace(/[^\d+]/g, '');
        if (cleanedPhone.length >= 10 && !cleanedPhone.startsWith('+')) {
          if (cleanedPhone.startsWith('0')) {
            cleanedPhone = '+254' + cleanedPhone.slice(1); // Kenyan standard fallback
          } else if (cleanedPhone.length === 10) {
            cleanedPhone = '+1' + cleanedPhone; // US standard fallback
          }
        }
        if (cleanedPhone !== val) {
          changes++;
          newRow[h] = cleanedPhone;
        }
      }

      // Website / URL Normalization
      else if (lowerHeader.includes('url') || lowerHeader.includes('website') || lowerHeader.includes('link')) {
        if (!val.startsWith('http://') && !val.startsWith('https://')) {
          newRow[h] = 'https://' + val;
          changes++;
        }
      }
    });
    return newRow;
  });

  return {
    updatedRows,
    updatedHeaders: headers,
    changesCount: changes,
    summary: `Normalized email addresses, phone numbers, and URLs in ${changes} cells.`
  };
}

// 16. Address Standardizer
export function standardizeAddresses(headers: string[], rows: Record<string, string>[]): CleaningResult {
  let changes = 0;
  const addrMap: Record<string, string> = {
    '\\bst\\b': 'Street',
    '\\bst\\.\\b': 'Street',
    '\\brd\\b': 'Road',
    '\\brd\\.\\b': 'Road',
    '\\bave\\b': 'Avenue',
    '\\bave\\.\\b': 'Avenue',
    '\\bblvd\\b': 'Boulevard',
    '\\bblvd\\.\\b': 'Boulevard',
    '\\bste\\b': 'Suite',
    '\\bste\\.\\b': 'Suite',
    '\\bapt\\b': 'Apartment',
    '\\bapt\\.\\b': 'Apartment'
  };

  const updatedRows = rows.map((row) => {
    const newRow: Record<string, string> = { ...row };
    headers.forEach((h) => {
      const lowerH = h.toLowerCase();
      if (lowerH.includes('address') || lowerH.includes('street') || lowerH.includes('location')) {
        let val = String(row[h] ?? '');
        let initialVal = val;

        Object.entries(addrMap).forEach(([regexStr, replacement]) => {
          const rx = new RegExp(regexStr, 'gi');
          val = val.replace(rx, replacement);
        });

        if (val !== initialVal) {
          changes++;
          newRow[h] = val;
        }
      }
    });
    return newRow;
  });

  return {
    updatedRows,
    updatedHeaders: headers,
    changesCount: changes,
    summary: `Standardized address street abbreviations (St -> Street, Rd -> Road) in ${changes} cells.`
  };
}

// 18. Automatic Null Normalization
export function normalizeNulls(
  headers: string[], 
  rows: Record<string, string>[], 
  targetNullValue: string = ''
): CleaningResult {
  let changes = 0;
  const nullTokens = ['null', 'NULL', 'None', 'N/A', 'n/a', 'Unknown', 'unknown', '-', '--', 'blank', '[blank]', 'NA'];

  const updatedRows = rows.map((row) => {
    const newRow: Record<string, string> = {};
    headers.forEach((h) => {
      const val = String(row[h] ?? '').trim();
      if (nullTokens.includes(val)) {
        newRow[h] = targetNullValue;
        changes++;
      } else {
        newRow[h] = val;
      }
    });
    return newRow;
  });

  return {
    updatedRows,
    updatedHeaders: headers,
    changesCount: changes,
    summary: `Normalized heterogeneous null representations (NULL, N/A, None) to '${targetNullValue || 'Blank'}' across ${changes} cells.`
  };
}

// 19. AI Header Standardization
export function standardizeHeaders(
  headers: string[], 
  rows: Record<string, string>[], 
  casingStyle: 'snake_case' | 'camelCase' | 'PascalCase' | 'database'
): CleaningResult {
  const aliasMap: Record<string, string> = {
    'usr_email': 'email',
    'user_email': 'email',
    'custname': 'customer_name',
    'cust_name': 'customer_name',
    'emp_id': 'employee_id',
    'dob': 'date_of_birth',
    'ph_num': 'phone_number'
  };

  const newHeaders = headers.map((h) => {
    let clean = h.trim();
    if (aliasMap[clean.toLowerCase()]) {
      clean = aliasMap[clean.toLowerCase()];
    }

    if (casingStyle === 'snake_case' || casingStyle === 'database') {
      return clean.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s\W]+/g, '_').toLowerCase();
    } else if (casingStyle === 'camelCase') {
      const words = clean.replace(/[\W_]+/g, ' ').split(' ');
      return words.map((w, idx) => idx === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    } else if (casingStyle === 'PascalCase') {
      const words = clean.replace(/[\W_]+/g, ' ').split(' ');
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    }
    return clean;
  });

  const updatedRows = rows.map((row) => {
    const newRow: Record<string, string> = {};
    headers.forEach((oldH, idx) => {
      newRow[newHeaders[idx]] = row[oldH] ?? '';
    });
    return newRow;
  });

  return {
    updatedRows,
    updatedHeaders: newHeaders,
    changesCount: headers.length,
    summary: `Standardized dataset column headers to '${casingStyle}' convention.`
  };
}

// 20. Formula & CSV Injection Protection
export function protectFormulaInjection(headers: string[], rows: Record<string, string>[]): CleaningResult {
  let changes = 0;
  const updatedRows = rows.map((row) => {
    const newRow: Record<string, string> = {};
    headers.forEach((h) => {
      let val = String(row[h] ?? '');
      // Check if starts with =, +, -, @, \t, \r
      if (/^[=+\-@\t\r]/.test(val)) {
        val = "'" + val; // Escape with leading apostrophe
        changes++;
      }
      newRow[h] = val;
    });
    return newRow;
  });

  return {
    updatedRows,
    updatedHeaders: headers,
    changesCount: changes,
    summary: `Escaped ${changes} cells starting with formula injection characters (=, +, -, @).`
  };
}

// 5. Outlier Detection & Handling
export function detectAndHandleOutliers(
  headers: string[], 
  rows: Record<string, string>[], 
  columnName: string, 
  action: 'flag' | 'delete_row' | 'cap_bounds'
): CleaningResult {
  let changes = 0;
  const values = rows
    .map(r => parseFloat(String(r[columnName] || '').replace(/[\$,]/g, '')))
    .filter(n => !isNaN(n));

  if (values.length < 4) {
    return { updatedRows: rows, updatedHeaders: headers, changesCount: 0, summary: 'Insufficient numerical data for outlier detection.' };
  }

  // Calculate IQR
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const updatedRows: Record<string, string>[] = [];

  rows.forEach((row) => {
    const valStr = String(row[columnName] ?? '').replace(/[\$,]/g, '');
    const num = parseFloat(valStr);

    if (!isNaN(num) && (num < lowerBound || num > upperBound)) {
      changes++;
      if (action === 'delete_row') {
        return; // drop row
      } else if (action === 'cap_bounds') {
        const capped = num > upperBound ? upperBound : lowerBound;
        updatedRows.push({ ...row, [columnName]: capped.toFixed(2) });
      } else {
        // flag
        updatedRows.push({ ...row, [columnName]: `${row[columnName]} [OUTLIER]` });
      }
    } else {
      updatedRows.push(row);
    }
  });

  return {
    updatedRows,
    updatedHeaders: headers,
    changesCount: changes,
    summary: `Detected ${changes} numerical outliers in '${columnName}' (IQR Bounds: ${lowerBound.toFixed(1)} to ${upperBound.toFixed(1)}). Action: ${action}.`
  };
}

// 6. PII Detection & Protection
export function maskPiiData(
  headers: string[], 
  rows: Record<string, string>[], 
  columnName: string, 
  protectionType: 'mask' | 'encrypt' | 'remove'
): CleaningResult {
  let changes = 0;

  const updatedRows = rows.map((row) => {
    const newRow = { ...row };
    const val = String(row[columnName] ?? '').trim();
    if (!val) return newRow;

    changes++;
    if (protectionType === 'mask') {
      if (val.includes('@')) {
        // Email mask
        const [user, domain] = val.split('@');
        newRow[columnName] = `${user.charAt(0)}***@${domain}`;
      } else if (val.length >= 8) {
        // Phone or ID mask
        newRow[columnName] = `****${val.slice(-4)}`;
      } else {
        newRow[columnName] = '***';
      }
    } else if (protectionType === 'encrypt') {
      // Hash string pseudo representation
      let hash = 0;
      for (let i = 0; i < val.length; i++) {
        hash = (hash << 5) - hash + val.charCodeAt(i);
        hash |= 0;
      }
      newRow[columnName] = `ENC_${Math.abs(hash).toString(16)}`;
    } else if (protectionType === 'remove') {
      newRow[columnName] = '[REDACTED]';
    }

    return newRow;
  });

  return {
    updatedRows,
    updatedHeaders: headers,
    changesCount: changes,
    summary: `Applied ${protectionType} PII protection on column '${columnName}' across ${changes} rows.`
  };
}
