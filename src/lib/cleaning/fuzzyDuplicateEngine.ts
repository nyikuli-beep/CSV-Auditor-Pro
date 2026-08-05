/**
 * Intelligent Fuzzy Duplicate Detection & Merging Engine
 * CSV Auditor Pro
 */

export interface FuzzyDuplicatePair {
  id: string;
  rowIndexA: number;
  rowIndexB: number;
  rowA: Record<string, string>;
  rowB: Record<string, string>;
  similarityScore: number; // 0 - 100%
  matchedColumns: string[];
  suggestedAction: 'merge' | 'keep_newest' | 'keep_oldest' | 'keep_most_complete';
}

/**
 * Calculates Levenshtein Distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const lenA = a.length;
  const lenB = b.length;

  for (let i = 0; i <= lenA; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= lenB; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return matrix[lenA][lenB];
}

/**
 * Calculates String Similarity Score (0 to 100%)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();

  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(s1, s2);
  const similarity = ((maxLen - distance) / maxLen) * 100;

  return Math.round(similarity);
}

/**
 * Detects fuzzy duplicates across selected columns or all string columns
 */
export function findFuzzyDuplicates(
  headers: string[],
  rows: Record<string, string>[],
  targetColumns: string[] = [],
  thresholdPercentage = 85
): FuzzyDuplicatePair[] {
  const pairs: FuzzyDuplicatePair[] = [];
  const colsToCompare = targetColumns.length > 0 ? targetColumns : headers.slice(0, 5);

  const totalRows = Math.min(rows.length, 500); // Limit comparison window for performance

  for (let i = 0; i < totalRows; i++) {
    for (let j = i + 1; j < totalRows; j++) {
      const rowA = rows[i];
      const rowB = rows[j];

      let totalScore = 0;
      let countedCols = 0;
      const matchedCols: string[] = [];

      colsToCompare.forEach((col) => {
        const valA = String(rowA[col] ?? '');
        const valB = String(rowB[col] ?? '');

        if (!valA && !valB) return;

        const score = calculateStringSimilarity(valA, valB);
        if (score >= thresholdPercentage) {
          matchedCols.push(col);
        }
        totalScore += score;
        countedCols++;
      });

      if (countedCols > 0) {
        const avgScore = Math.round(totalScore / countedCols);
        if (avgScore >= thresholdPercentage) {
          // Determine completeness
          const filledA = Object.values(rowA).filter((v) => String(v).trim() !== '').length;
          const filledB = Object.values(rowB).filter((v) => String(v).trim() !== '').length;

          pairs.push({
            id: `fuzzy-${i}-${j}`,
            rowIndexA: i,
            rowIndexB: j,
            rowA,
            rowB,
            similarityScore: avgScore,
            matchedColumns: matchedCols,
            suggestedAction: filledA >= filledB ? 'keep_most_complete' : 'merge'
          });
        }
      }
    }
  }

  return pairs;
}

/**
 * Merges two rows by taking the non-empty fields from both
 */
export function mergeRowPair(
  headers: string[],
  rowA: Record<string, string>,
  rowB: Record<string, string>
): Record<string, string> {
  const merged: Record<string, string> = {};

  headers.forEach((h) => {
    const valA = String(rowA[h] ?? '').trim();
    const valB = String(rowB[h] ?? '').trim();

    if (valA) {
      merged[h] = valA;
    } else if (valB) {
      merged[h] = valB;
    } else {
      merged[h] = '';
    }
  });

  return merged;
}
