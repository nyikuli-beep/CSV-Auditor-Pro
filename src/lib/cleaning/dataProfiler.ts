/**
 * Enterprise Data Profiler & Quality Score Engine
 * CSV Auditor Pro
 */

export interface ColumnProfile {
  columnName: string;
  dataType: 'Text' | 'Number' | 'Date' | 'Email' | 'Phone' | 'Boolean' | 'Mixed';
  totalCount: number;
  missingCount: number;
  missingPercentage: number;
  distinctCount: number;
  uniqueCount: number; // values that appear exactly once
  duplicatePercentage: number;
  avgLength: number;
  maxLength: number;
  minValue?: string | number;
  maxValue?: string | number;
  frequentValues: { value: string; count: number; percentage: number }[];
  distribution: { range: string; count: number }[];
}

export interface DataQualityMetrics {
  completeness: number;  // 0-100
  consistency: number;   // 0-100
  accuracy: number;      // 0-100
  validity: number;      // 0-100
  uniqueness: number;    // 0-100
  integrity: number;     // 0-100
  timeliness: number;    // 0-100
  overallScore: number;  // 0-100
}

export interface SmartRecommendation {
  id: string;
  category: 'AI' | 'Validation' | 'Standardization' | 'Security' | 'Formatting';
  title: string;
  description: string;
  affectedCount: number;
  impactScore: 'High' | 'Medium' | 'Low';
  actionType: string; // e.g. 'ai_smart_correction', 'predict_missing', 'fuzzy_dedup', 'pii_mask', 'fix_dates'
  actionPayload?: any;
}

export interface FullDatasetProfile {
  totalRows: number;
  totalColumns: number;
  columns: Record<string, ColumnProfile>;
  qualityMetrics: DataQualityMetrics;
  recommendations: SmartRecommendation[];
}

// Helper: infer simple type of string value
function inferValueType(val: string): 'Number' | 'Date' | 'Email' | 'Phone' | 'Boolean' | 'Text' {
  const trimmed = val.trim();
  if (!trimmed) return 'Text';

  if (/^(true|false|yes|no|y|n|0|1)$/i.test(trimmed)) return 'Boolean';
  if (/^-?\d+(\.\d+)?$/.test(trimmed.replace(/[\$,]/g, ''))) return 'Number';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Email';
  if (/^(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/.test(trimmed)) return 'Phone';
  if (!isNaN(Date.parse(trimmed)) && (trimmed.includes('/') || trimmed.includes('-') || trimmed.includes('.'))) return 'Date';

  return 'Text';
}

export function profileDataset(headers: string[], rows: Record<string, string>[]): FullDatasetProfile {
  const totalRows = rows.length;
  const totalColumns = headers.length;

  const columnProfiles: Record<string, ColumnProfile> = {};
  let totalMissingCells = 0;
  let totalCells = totalRows * totalColumns;
  let typeInconsistencies = 0;
  let invalidEmailsPhones = 0;
  let duplicateRowMatches = 0;

  // Track unique row signatures to check row uniqueness
  const rowSignatures = new Set<string>();
  rows.forEach(r => {
    const sig = headers.map(h => String(r[h] || '').trim().toLowerCase()).join('||');
    if (rowSignatures.has(sig)) duplicateRowMatches++;
    else rowSignatures.add(sig);
  });

  const recommendations: SmartRecommendation[] = [];

  headers.forEach((header) => {
    const values = rows.map((r) => String(r[header] ?? '').trim());
    const nonMissing = values.filter((v) => v !== '' && v !== 'NULL' && v !== 'null' && v !== 'N/A' && v !== 'None');
    const missingCount = totalRows - nonMissing.length;
    totalMissingCells += missingCount;

    // Type inference frequency
    const typeCounts: Record<string, number> = {};
    let totalLen = 0;
    let maxLen = 0;
    const valueFreqMap: Record<string, number> = {};

    let numMin: number | null = null;
    let numMax: number | null = null;

    nonMissing.forEach((val) => {
      const len = val.length;
      totalLen += len;
      if (len > maxLen) maxLen = len;

      valueFreqMap[val] = (valueFreqMap[val] || 0) + 1;

      const inferred = inferValueType(val);
      typeCounts[inferred] = (typeCounts[inferred] || 0) + 1;

      if (inferred === 'Number') {
        const num = parseFloat(val.replace(/[\$,]/g, ''));
        if (!isNaN(num)) {
          if (numMin === null || num < numMin) numMin = num;
          if (numMax === null || num > numMax) numMax = num;
        }
      }
    });

    // Majority type
    let dominantType: 'Text' | 'Number' | 'Date' | 'Email' | 'Phone' | 'Boolean' | 'Mixed' = 'Text';
    let maxTypeCount = 0;
    Object.entries(typeCounts).forEach(([t, cnt]) => {
      if (cnt > maxTypeCount) {
        maxTypeCount = cnt;
        dominantType = t as any;
      }
    });

    if (nonMissing.length > 0 && maxTypeCount / nonMissing.length < 0.7) {
      dominantType = 'Mixed';
      typeInconsistencies += Math.floor(nonMissing.length * 0.3);
    }

    const distinctCount = Object.keys(valueFreqMap).length;
    let uniqueCount = 0;
    Object.values(valueFreqMap).forEach((cnt) => {
      if (cnt === 1) uniqueCount++;
    });

    const duplicatePercentage = nonMissing.length > 0 ? ((nonMissing.length - distinctCount) / nonMissing.length) * 100 : 0;
    const avgLength = nonMissing.length > 0 ? Math.round(totalLen / nonMissing.length) : 0;

    // Top frequent values
    const sortedFreq = Object.entries(valueFreqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([val, cnt]) => ({
        value: val,
        count: cnt,
        percentage: totalRows > 0 ? Math.round((cnt / totalRows) * 100) : 0
      }));

    // Distribution
    const distribution: { range: string; count: number }[] = [];
    if ((dominantType as string) === 'Number' && numMin !== null && numMax !== null && numMin !== numMax) {
      const step = (numMax - numMin) / 5;
      for (let i = 0; i < 5; i++) {
        const start = (numMin + step * i).toFixed(1);
        const end = (numMin + step * (i + 1)).toFixed(1);
        const count = nonMissing.filter((v) => {
          const n = parseFloat(v.replace(/[\$,]/g, ''));
          return !isNaN(n) && n >= (numMin! + step * i) && (i === 4 ? n <= numMax! : n < (numMin! + step * (i + 1)));
        }).length;
        distribution.push({ range: `${start}-${end}`, count });
      }
    } else {
      sortedFreq.forEach((item) => {
        distribution.push({ range: item.value.slice(0, 12) || '(Blank)', count: item.count });
      });
    }

    columnProfiles[header] = {
      columnName: header,
      dataType: dominantType,
      totalCount: totalRows,
      missingCount,
      missingPercentage: totalRows > 0 ? Math.round((missingCount / totalRows) * 100) : 0,
      distinctCount,
      uniqueCount,
      duplicatePercentage: Math.round(duplicatePercentage),
      avgLength,
      maxLength: maxLen,
      minValue: numMin !== null ? numMin : undefined,
      maxValue: numMax !== null ? numMax : undefined,
      frequentValues: sortedFreq,
      distribution
    };

    // Check for smart recommendations
    if (missingCount > 0) {
      recommendations.push({
        id: `rec-missing-${header}`,
        category: 'AI',
        title: `Predict Missing Values in '${header}'`,
        description: `Found ${missingCount} missing/blank cells in '${header}'. AI can contextually predict these values.`,
        affectedCount: missingCount,
        impactScore: missingCount > totalRows * 0.2 ? 'High' : 'Medium',
        actionType: 'predict_missing',
        actionPayload: { column: header }
      });
    }

    const lowerHeader = header.toLowerCase();
    if (lowerHeader.includes('email') || lowerHeader.includes('phone') || lowerHeader.includes('ssn') || lowerHeader.includes('tax') || lowerHeader.includes('card')) {
      recommendations.push({
        id: `rec-pii-${header}`,
        category: 'Security',
        title: `Protect PII Data in '${header}'`,
        description: `Column '${header}' contains sensitive personal information. Apply masking or hashing for compliance.`,
        affectedCount: totalRows - missingCount,
        impactScore: 'High',
        actionType: 'pii_mask',
        actionPayload: { column: header }
      });
    }

    if ((dominantType as string) === 'Date') {
      recommendations.push({
        id: `rec-date-${header}`,
        category: 'Standardization',
        title: `Standardize Date Format in '${header}'`,
        description: `Normalize all date strings in '${header}' to standard ISO YYYY-MM-DD.`,
        affectedCount: totalRows - missingCount,
        impactScore: 'Medium',
        actionType: 'fix_dates',
        actionPayload: { column: header }
      });
    }
  });

  // Check duplicate rows recommendation
  if (duplicateRowMatches > 0) {
    recommendations.unshift({
      id: 'rec-duplicate-rows',
      category: 'Validation',
      title: 'Remove Duplicate Records',
      description: `Detected ${duplicateRowMatches} identical row records. Clean duplicate rows to improve dataset uniqueness.`,
      affectedCount: duplicateRowMatches,
      impactScore: 'High',
      actionType: 'remove_duplicates',
      actionPayload: {}
    });
  }

  // Calculate Data Quality Metrics
  const completeness = totalCells > 0 ? Math.max(0, Math.round(100 - (totalMissingCells / totalCells) * 100)) : 100;
  const consistency = totalCells > 0 ? Math.max(0, Math.round(100 - (typeInconsistencies / totalCells) * 100)) : 100;
  const uniqueness = totalRows > 0 ? Math.max(0, Math.round(100 - (duplicateRowMatches / totalRows) * 100)) : 100;
  const validity = Math.max(0, Math.round(100 - (invalidEmailsPhones / (totalRows || 1)) * 100));
  const accuracy = Math.round((completeness * 0.4) + (consistency * 0.3) + (validity * 0.3));
  const integrity = Math.round((consistency * 0.5) + (uniqueness * 0.5));
  const timeliness = 95; // default benchmark

  const overallScore = Math.round(
    completeness * 0.25 +
    consistency * 0.20 +
    accuracy * 0.15 +
    validity * 0.15 +
    uniqueness * 0.15 +
    integrity * 0.10
  );

  return {
    totalRows,
    totalColumns,
    columns: columnProfiles,
    qualityMetrics: {
      completeness,
      consistency,
      accuracy,
      validity,
      uniqueness,
      integrity,
      timeliness,
      overallScore
    },
    recommendations
  };
}
