import { CSVFile, AuditIssue } from '../types';

export interface FixAllResult {
  updatedFile: CSVFile;
  fixedCount: number;
  breakdown: {
    duplicatesRemoved: number;
    missingValuesImputed: number;
    formatsStandardized: number;
    inconsistenciesFixed: number;
    outliersNormalized: number;
  };
  summaryMessage: string;
}

/**
 * Standardizes common date strings (MM/DD/YYYY, DD/MM/YYYY, YYYY/MM/DD, etc.) into ISO YYYY-MM-DD.
 */
export function standardizeDateValue(rawVal: string): string {
  if (!rawVal) return rawVal;
  const trimmed = String(rawVal).trim();
  if (!trimmed) return trimmed;

  // Already ISO-8601 (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle slashes, dashes, dots
  if (trimmed.includes('/') || trimmed.includes('-') || trimmed.includes('.')) {
    const sep = trimmed.includes('/') ? '/' : trimmed.includes('-') ? '-' : '.';
    const parts = trimmed.split(sep).map(p => p.trim());
    
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      let yearPart = parts[2];
      let year = parseInt(yearPart, 10);

      // Handle 2-digit years
      if (yearPart.length === 2) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }

      // Check if first part was year (YYYY/MM/DD or YYYY-MM-DD)
      if (parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const mm = String(Math.min(12, Math.max(1, m))).padStart(2, '0');
          const dd = String(Math.min(31, Math.max(1, d))).padStart(2, '0');
          return `${y}-${mm}-${dd}`;
        }
      }

      if (!isNaN(p0) && !isNaN(p1) && !isNaN(year)) {
        let day = p0;
        let month = p1;

        if (p0 > 12 && p1 <= 12) {
          // Definitely DD/MM/YYYY
          day = p0;
          month = p1;
        } else if (p1 > 12 && p0 <= 12) {
          // Definitely MM/DD/YYYY
          month = p0;
          day = p1;
        } else {
          // Default to MM/DD/YYYY unless p0 > 12
          month = p0;
          day = p1;
        }

        const mm = String(Math.min(12, Math.max(1, month))).padStart(2, '0');
        const dd = String(Math.min(31, Math.max(1, day))).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
      }
    }
  }

  // Attempt JavaScript Date parsing fallback
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    try {
      return parsed.toISOString().split('T')[0];
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

/**
 * Fixes capitalization and naming inconsistencies for standard columns.
 */
export function fixInconsistentValue(column: string, val: string): string {
  if (!val) return val;
  const trimmed = String(val).trim();
  const colLower = column.toLowerCase();

  // Country standardizations
  if (colLower.includes('country') || colLower === 'nation' || colLower === 'state_country') {
    const l = trimmed.toLowerCase();
    if (l === 'us' || l === 'usa' || l === 'u.s.' || l === 'u.s.a.' || l === 'united states' || l === 'united states of america') {
      return 'United States';
    }
    if (l === 'uk' || l === 'u.k.' || l === 'united kingdom' || l === 'great britain' || l === 'england') {
      return 'United Kingdom';
    }
    if (l === 'ca' || l === 'can' || l === 'canada') return 'Canada';
    if (l === 'de' || l === 'deu' || l === 'germany' || l === 'deutschland') return 'Germany';
    if (l === 'fr' || l === 'fra' || l === 'france') return 'France';
    if (l === 'jp' || l === 'jpn' || l === 'japan') return 'Japan';
    if (l === 'au' || l === 'aus' || l === 'australia') return 'Australia';
  }

  // Common acronyms
  const acronyms: Record<string, string> = {
    'saas': 'SaaS',
    'it': 'IT',
    'hr': 'HR',
    'ai': 'AI',
    'id': 'ID',
    'api': 'API',
    'erp': 'ERP',
    'crm': 'CRM',
    'seo': 'SEO',
    'roi': 'ROI',
    'b2b': 'B2B',
    'b2c': 'B2C'
  };

  if (acronyms[trimmed.toLowerCase()]) {
    return acronyms[trimmed.toLowerCase()];
  }

  // Title Case conversion: Capitalize first letter of each word
  return trimmed.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

/**
 * Calculates replacement / imputed value for missing fields based on column characteristics.
 */
export function calculateImputedValue(column: string, allRows: Record<string, string>[]): string {
  const colLower = column.toLowerCase();
  const isNumeric = 
    colLower.includes('amount') ||
    colLower.includes('price') ||
    colLower.includes('cost') ||
    colLower.includes('budget') ||
    colLower.includes('fee') ||
    colLower.includes('total') ||
    colLower.includes('quantity') ||
    colLower.includes('rate') ||
    colLower.includes('gross') ||
    colLower.includes('pay') ||
    colLower.includes('tax') ||
    colLower.includes('value');

  if (isNumeric) {
    const validNumbers = allRows
      .map(r => {
        const raw = r[column];
        if (!raw) return NaN;
        const clean = String(raw).replace(/[^0-9.-]/g, '');
        return parseFloat(clean);
      })
      .filter(n => !isNaN(n));

    if (validNumbers.length > 0) {
      const avg = validNumbers.reduce((sum, n) => sum + n, 0) / validNumbers.length;
      return avg.toFixed(2);
    }
    return '0.00';
  }

  if (colLower.includes('category') || colLower.includes('department') || colLower.includes('genre') || colLower.includes('sector')) {
    return 'Uncategorized';
  }

  if (colLower.includes('status')) {
    return 'Pending';
  }

  if (colLower.includes('country')) {
    return 'Unknown';
  }

  return 'N/A';
}

/**
 * Fixes a single specific issue in the given CSVFile and returns the updated CSVFile.
 */
export function applySingleAuditFix(file: CSVFile, issue: AuditIssue): CSVFile {
  const baseRows = file.cleanedRows ? [...file.cleanedRows] : [...file.rows];
  let updatedRows = [...baseRows];

  // Match target row index safely
  let targetIdx = -1;
  if (issue.row !== undefined) {
    const idx1 = issue.row - 1;
    const idx2 = issue.row - 2;
    if (idx1 >= 0 && idx1 < updatedRows.length && String(updatedRows[idx1][issue.column]) === String(issue.value)) {
      targetIdx = idx1;
    } else if (idx2 >= 0 && idx2 < updatedRows.length && String(updatedRows[idx2][issue.column]) === String(issue.value)) {
      targetIdx = idx2;
    } else {
      targetIdx = updatedRows.findIndex(r => String(r[issue.column]) === String(issue.value));
    }
  } else if (issue.value !== undefined && issue.value !== '') {
    targetIdx = updatedRows.findIndex(r => String(r[issue.column]) === String(issue.value));
  }

  // Fallback for missing value
  if (targetIdx === -1 && issue.type === 'missing_value') {
    const idx1 = issue.row ? issue.row - 1 : -1;
    const idx2 = issue.row ? issue.row - 2 : -1;
    if (idx1 >= 0 && idx1 < updatedRows.length && (!updatedRows[idx1][issue.column] || updatedRows[idx1][issue.column].trim() === '')) {
      targetIdx = idx1;
    } else if (idx2 >= 0 && idx2 < updatedRows.length && (!updatedRows[idx2][issue.column] || updatedRows[idx2][issue.column].trim() === '')) {
      targetIdx = idx2;
    } else {
      targetIdx = updatedRows.findIndex(r => !r[issue.column] || r[issue.column].trim() === '');
    }
  }

  switch (issue.type) {
    case 'duplicate': {
      if (targetIdx !== -1) {
        updatedRows = updatedRows.filter((_, idx) => idx !== targetIdx);
      } else {
        const seen = new Set<string>();
        updatedRows = updatedRows.filter(r => {
          const val = r[issue.column];
          if (val === issue.value) {
            if (seen.has(val)) return false;
            seen.add(val);
          }
          return true;
        });
      }
      break;
    }

    case 'missing_value': {
      const fillVal = calculateImputedValue(issue.column, updatedRows);
      if (targetIdx !== -1) {
        updatedRows = updatedRows.map((row, idx) => 
          idx === targetIdx ? { ...row, [issue.column]: fillVal } : row
        );
      } else {
        updatedRows = updatedRows.map(row => 
          (!row[issue.column] || row[issue.column].trim() === '') ? { ...row, [issue.column]: fillVal } : row
        );
      }
      break;
    }

    case 'invalid_format': {
      if (targetIdx !== -1) {
        const currentVal = updatedRows[targetIdx][issue.column] || '';
        const fixedVal = standardizeDateValue(currentVal);
        updatedRows = updatedRows.map((row, idx) => 
          idx === targetIdx ? { ...row, [issue.column]: fixedVal } : row
        );
      } else {
        updatedRows = updatedRows.map(row => {
          const v = row[issue.column] || '';
          if (v === issue.value) {
            return { ...row, [issue.column]: standardizeDateValue(v) };
          }
          return row;
        });
      }
      break;
    }

    case 'column_inconsistency': {
      if (targetIdx !== -1) {
        const currentVal = updatedRows[targetIdx][issue.column] || '';
        const fixedVal = fixInconsistentValue(issue.column, currentVal);
        updatedRows = updatedRows.map((row, idx) => 
          idx === targetIdx ? { ...row, [issue.column]: fixedVal } : row
        );
      } else {
        updatedRows = updatedRows.map(row => {
          const v = row[issue.column] || '';
          if (v === issue.value) {
            return { ...row, [issue.column]: fixInconsistentValue(issue.column, v) };
          }
          return row;
        });
      }
      break;
    }

    case 'outlier': {
      const numericValues = updatedRows
        .map(r => {
          const clean = String(r[issue.column] || '').replace(/[^0-9.-]/g, '');
          return parseFloat(clean);
        })
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
      
      const median = numericValues.length > 0 ? numericValues[Math.floor(numericValues.length / 2)] : 1000;
      const cappedVal = (median * 3.0).toFixed(2);

      if (targetIdx !== -1) {
        updatedRows = updatedRows.map((row, idx) => 
          idx === targetIdx ? { ...row, [issue.column]: cappedVal } : row
        );
      } else {
        updatedRows = updatedRows.map(row => {
          const v = row[issue.column];
          if (v === issue.value) {
            return { ...row, [issue.column]: cappedVal };
          }
          return row;
        });
      }
      break;
    }
  }

  // Mark issue as resolved
  const updatedIssues = file.issues.map(i => 
    i.id === issue.id ? { ...i, status: 'resolved' as const } : i
  );
  if (!updatedIssues.some(i => i.id === issue.id)) {
    updatedIssues.push({ ...issue, status: 'resolved' as const });
  }

  const openCount = updatedIssues.filter(i => i.status === 'open').length;
  const newScore = openCount === 0 ? 100 : Math.min(98, Math.max(file.score, Math.round(file.score + ((100 - file.score) / (openCount + 1)))));

  return {
    ...file,
    cleanedRows: updatedRows,
    issues: updatedIssues,
    score: newScore,
    status: openCount === 0 ? 'completed' : file.status
  };
}

/**
 * Batch repairs all open issues (or a provided subset of issues) in a CSV file.
 * Handles row deletion order and multi-column repairs reliably without index collisions.
 */
export function applyBatchFixAll(file: CSVFile, targetIssues?: AuditIssue[]): FixAllResult {
  const issuesToFix = (targetIssues && targetIssues.length > 0)
    ? targetIssues.filter(i => i.status === 'open')
    : file.issues.filter(i => i.status === 'open');

  if (issuesToFix.length === 0) {
    return {
      updatedFile: file,
      fixedCount: 0,
      breakdown: {
        duplicatesRemoved: 0,
        missingValuesImputed: 0,
        formatsStandardized: 0,
        inconsistenciesFixed: 0,
        outliersNormalized: 0
      },
      summaryMessage: 'No open compliance issues to repair.'
    };
  }

  let workingRows: Record<string, string>[] = file.cleanedRows 
    ? file.cleanedRows.map(r => ({ ...r }))
    : file.rows.map(r => ({ ...r }));

  let duplicatesRemoved = 0;
  let missingValuesImputed = 0;
  let formatsStandardized = 0;
  let inconsistenciesFixed = 0;
  let outliersNormalized = 0;

  // Separate non-deletion issues from duplicate deletion issues
  const nonDuplicateIssues = issuesToFix.filter(i => i.type !== 'duplicate');
  const duplicateIssues = issuesToFix.filter(i => i.type === 'duplicate');

  // STEP 1: Apply non-deletion transformations first so indices remain stable
  nonDuplicateIssues.forEach(issue => {
    // Find target row index
    let targetIdx = -1;
    if (issue.row !== undefined) {
      const idx1 = issue.row - 1;
      const idx2 = issue.row - 2;
      if (idx1 >= 0 && idx1 < workingRows.length && (issue.value === '' || String(workingRows[idx1][issue.column]) === String(issue.value))) {
        targetIdx = idx1;
      } else if (idx2 >= 0 && idx2 < workingRows.length && (issue.value === '' || String(workingRows[idx2][issue.column]) === String(issue.value))) {
        targetIdx = idx2;
      } else if (idx1 >= 0 && idx1 < workingRows.length) {
        targetIdx = idx1;
      }
    }

    if (issue.type === 'missing_value') {
      const fillVal = calculateImputedValue(issue.column, workingRows);
      if (targetIdx !== -1 && (!workingRows[targetIdx][issue.column] || workingRows[targetIdx][issue.column].trim() === '')) {
        workingRows[targetIdx][issue.column] = fillVal;
        missingValuesImputed++;
      } else {
        // Find empty cells in that column
        let fixedAny = false;
        workingRows.forEach(row => {
          if (!row[issue.column] || row[issue.column].trim() === '') {
            row[issue.column] = fillVal;
            fixedAny = true;
          }
        });
        if (fixedAny) missingValuesImputed++;
      }
    } else if (issue.type === 'invalid_format') {
      if (targetIdx !== -1) {
        const val = workingRows[targetIdx][issue.column] || '';
        workingRows[targetIdx][issue.column] = standardizeDateValue(val);
        formatsStandardized++;
      } else {
        let fixedAny = false;
        workingRows.forEach(row => {
          const val = row[issue.column] || '';
          if (val === issue.value) {
            row[issue.column] = standardizeDateValue(val);
            fixedAny = true;
          }
        });
        if (fixedAny) formatsStandardized++;
      }
    } else if (issue.type === 'column_inconsistency') {
      if (targetIdx !== -1) {
        const val = workingRows[targetIdx][issue.column] || '';
        workingRows[targetIdx][issue.column] = fixInconsistentValue(issue.column, val);
        inconsistenciesFixed++;
      } else {
        let fixedAny = false;
        workingRows.forEach(row => {
          const val = row[issue.column] || '';
          if (val === issue.value) {
            row[issue.column] = fixInconsistentValue(issue.column, val);
            fixedAny = true;
          }
        });
        if (fixedAny) inconsistenciesFixed++;
      }
    } else if (issue.type === 'outlier') {
      const numericValues = workingRows
        .map(r => {
          const clean = String(r[issue.column] || '').replace(/[^0-9.-]/g, '');
          return parseFloat(clean);
        })
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
      
      const median = numericValues.length > 0 ? numericValues[Math.floor(numericValues.length / 2)] : 1000;
      const cappedVal = (median * 3.0).toFixed(2);

      if (targetIdx !== -1) {
        workingRows[targetIdx][issue.column] = cappedVal;
        outliersNormalized++;
      } else {
        let fixedAny = false;
        workingRows.forEach(row => {
          const val = row[issue.column];
          if (val === issue.value) {
            row[issue.column] = cappedVal;
            fixedAny = true;
          }
        });
        if (fixedAny) outliersNormalized++;
      }
    }
  });

  // STEP 2: Handle duplicate removals safely using key column deduplication & row matching
  if (duplicateIssues.length > 0) {
    const indicesToDelete = new Set<number>();

    duplicateIssues.forEach(issue => {
      let targetIdx = -1;
      if (issue.row !== undefined) {
        const idx1 = issue.row - 1;
        const idx2 = issue.row - 2;
        if (idx1 >= 0 && idx1 < workingRows.length && String(workingRows[idx1][issue.column]) === String(issue.value)) {
          targetIdx = idx1;
        } else if (idx2 >= 0 && idx2 < workingRows.length && String(workingRows[idx2][issue.column]) === String(issue.value)) {
          targetIdx = idx2;
        }
      }

      if (targetIdx !== -1) {
        indicesToDelete.add(targetIdx);
      } else {
        // Find duplicate rows matching value beyond the first appearance
        let firstFound = false;
        workingRows.forEach((row, idx) => {
          if (row[issue.column] === issue.value) {
            if (!firstFound) {
              firstFound = true;
            } else {
              indicesToDelete.add(idx);
            }
          }
        });
      }
    });

    if (indicesToDelete.size > 0) {
      duplicatesRemoved = indicesToDelete.size;
      workingRows = workingRows.filter((_, idx) => !indicesToDelete.has(idx));
    }
  }

  // STEP 3: Mark targeted issues as resolved
  const fixedIssueIds = new Set(issuesToFix.map(i => i.id));
  const updatedIssues = file.issues.map(i => {
    if (fixedIssueIds.has(i.id)) {
      return { ...i, status: 'resolved' as const };
    }
    return i;
  });

  // Ensure dynamic outlier issues not already in file.issues are also captured
  issuesToFix.forEach(issue => {
    if (!updatedIssues.some(i => i.id === issue.id)) {
      updatedIssues.push({ ...issue, status: 'resolved' as const });
    }
  });

  const remainingOpenIssues = updatedIssues.filter(i => i.status === 'open');
  const allResolved = remainingOpenIssues.length === 0;

  const totalFixedCount = issuesToFix.length;
  const newScore = allResolved ? 100 : Math.min(99, Math.round(file.score + ((100 - file.score) * (totalFixedCount / (totalFixedCount + remainingOpenIssues.length)))));

  const parts: string[] = [];
  if (duplicatesRemoved > 0) parts.push(`${duplicatesRemoved} duplicate${duplicatesRemoved > 1 ? 's' : ''} removed`);
  if (missingValuesImputed > 0) parts.push(`${missingValuesImputed} missing value${missingValuesImputed > 1 ? 's' : ''} imputed`);
  if (formatsStandardized > 0) parts.push(`${formatsStandardized} date format${formatsStandardized > 1 ? 's' : ''} standardized`);
  if (inconsistenciesFixed > 0) parts.push(`${inconsistenciesFixed} case/name inconsistenc${inconsistenciesFixed > 1 ? 'ies' : 'y'} fixed`);
  if (outliersNormalized > 0) parts.push(`${outliersNormalized} outlier${outliersNormalized > 1 ? 's' : ''} normalized`);

  const summaryMessage = parts.length > 0 
    ? `Repaired ${totalFixedCount} findings: ${parts.join(', ')}.`
    : `Repaired all ${totalFixedCount} compliance findings.`;

  const updatedFile: CSVFile = {
    ...file,
    cleanedRows: workingRows,
    issues: updatedIssues,
    score: newScore,
    status: allResolved ? 'completed' : file.status
  };

  return {
    updatedFile,
    fixedCount: totalFixedCount,
    breakdown: {
      duplicatesRemoved,
      missingValuesImputed,
      formatsStandardized,
      inconsistenciesFixed,
      outliersNormalized
    },
    summaryMessage
  };
}
