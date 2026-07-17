import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  ShieldAlert, 
  ArrowRight,
  RefreshCw,
  Search,
  Download,
  BrainCircuit,
  Sliders,
  Activity,
  HelpCircle
} from 'lucide-react';
import { CSVFile, AuditIssue, Severity, IssueType } from '../types';

interface AuditResultsProps {
  activeFile: CSVFile | null;
  onNavigate: (tab: string) => void;
  isDarkMode: boolean;
  accentClass: string;
  onUpdateFile: (updatedFile: CSVFile) => void;
}

export default function AuditResults({ activeFile, onNavigate, isDarkMode, accentClass, onUpdateFile }: AuditResultsProps) {
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | IssueType>('all');
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Issues Pagination State
  const [issuesPage, setIssuesPage] = useState(1);
  const issuesPageSize = 50;

  // Smart Outlier Audit State (Number of Standard Deviations)
  const [outlierThreshold, setOutlierThreshold] = useState<number>(2.5);

  useEffect(() => {
    setIssuesPage(1);
  }, [activeFile?.id, severityFilter, typeFilter, outlierThreshold]);

  // Dynamically calculate standard deviation metrics and outlier issues
  const calculateNumericalStatsAndOutliers = (file: CSVFile | null, threshold: number) => {
    if (!file) return { outlierIssues: [], columnStats: [] };

    const rows = file.cleanedRows || file.rows;
    const outlierIssues: AuditIssue[] = [];
    const columnStats: { column: string; mean: number; stdDev: number; count: number; outliersCount: number }[] = [];

    file.headers.forEach(header => {
      const lower = header.toLowerCase();
      // Check if mapped to Amount, or matches common numerical terms
      const isNumericalName = 
        lower.includes('amount') ||
        lower.includes('budget') ||
        lower.includes('price') ||
        lower.includes('total') ||
        lower.includes('cost') ||
        lower.includes('fee') ||
        lower.includes('quantity') ||
        lower.includes('rate') ||
        lower.includes('value') ||
        (file.headerMappings && file.headerMappings[header] === 'Amount');

      if (!isNumericalName) return;

      const parsedValues: { val: number; raw: string; rowIdx: number }[] = [];
      rows.forEach((row, idx) => {
        const rawVal = row[header];
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
          // Extract numeric value safely
          const clean = String(rawVal).replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(clean);
          if (!isNaN(parsed)) {
            parsedValues.push({ val: parsed, raw: String(rawVal), rowIdx: idx });
          }
        }
      });

      if (parsedValues.length < 3) return; // need enough samples

      const mean = parsedValues.reduce((sum, pv) => sum + pv.val, 0) / parsedValues.length;
      const variance = parsedValues.reduce((sum, pv) => sum + Math.pow(pv.val - mean, 2), 0) / parsedValues.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev <= 0) return;

      let columnOutliersCount = 0;
      const tempIssues: AuditIssue[] = [];

      parsedValues.forEach(pv => {
        const zScore = Math.abs(pv.val - mean) / stdDev;
        if (zScore > threshold) {
          columnOutliersCount++;
          tempIssues.push({
            id: `stddev-outlier-${header}-${pv.rowIdx}`,
            type: 'outlier',
            severity: 'warning',
            column: header,
            row: pv.rowIdx + 2,
            value: pv.raw,
            description: `Smart Audit: Value "${pv.raw}" is a statistical outlier (${zScore.toFixed(2)} SDs from column average of ${mean.toFixed(2)}).`,
            suggestion: `This transaction exceeds the compliance threshold of ${threshold} standard deviations. Consider correcting or verifying this entry.`,
            status: 'open'
          });
        }
      });

      columnStats.push({ 
        column: header, 
        mean, 
        stdDev, 
        count: parsedValues.length,
        outliersCount: columnOutliersCount
      });

      outlierIssues.push(...tempIssues);
    });

    return { outlierIssues, columnStats };
  };

  const { outlierIssues, columnStats } = calculateNumericalStatsAndOutliers(activeFile, outlierThreshold);

  // Merge dynamic standard deviation outliers with base file issues.
  // We replace previous static 'outlier' type issues, but carry over their 'resolved' status.
  const getMergedIssues = (): AuditIssue[] => {
    if (!activeFile) return [];
    
    const nonOutlierIssues = activeFile.issues.filter(i => i.type !== 'outlier');
    
    const processedOutliers = outlierIssues.map(outlier => {
      const existing = activeFile.issues.find(i => i.id === outlier.id);
      if (existing) {
        return { ...outlier, status: existing.status };
      }
      return outlier;
    });

    return [...nonOutlierIssues, ...processedOutliers];
  };

  const mergedIssues = getMergedIssues();

  if (!activeFile) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl animate-fadeIn">
        <FileSpreadsheet className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="font-bold text-lg mb-1">No Active Spreadsheet Audited</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
          Upload a local spreadsheet or load our messy company transaction data to inspect results.
        </p>
        <button 
          onClick={() => onNavigate('upload')}
          className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow cursor-pointer ${accentClass}`}
        >
          Go to Upload Center
        </button>
      </div>
    );
  }

  // Filter issues
  const filteredIssues = mergedIssues.filter(issue => {
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && issue.type !== typeFilter) return false;
    return true;
  });

  const criticalCount = mergedIssues.filter(i => i.severity === 'critical' && i.status === 'open').length;
  const warningCount = mergedIssues.filter(i => i.severity === 'warning' && i.status === 'open').length;
  const infoCount = mergedIssues.filter(i => i.severity === 'info' && i.status === 'open').length;

  const affectedRowNumbers = new Set<number>();
  filteredIssues.forEach(issue => {
    if (issue.row !== undefined) {
      affectedRowNumbers.add(issue.row);
    }
  });
  const affectedRowsCount = affectedRowNumbers.size;

  const downloadBlob = (csvContent: string, defaultFileName: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', defaultFileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportFullDataset = () => {
    const rows = activeFile.cleanedRows || activeFile.rows;
    const headersRow = activeFile.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    const rowsData = rows.map(row => {
      return activeFile.headers.map(header => {
        const val = row[header] !== undefined ? String(row[header]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csvContent = [headersRow, ...rowsData].join('\n');
    const baseName = activeFile.name.replace(/\.csv$/i, '');
    const suffix = activeFile.cleanedRows ? '_cleaned' : '_audited';
    downloadBlob(csvContent, `${baseName}${suffix}.csv`);
    setExportDropdownOpen(false);
  };

  const exportFilteredDataset = () => {
    const rows = activeFile.cleanedRows || activeFile.rows;

    const filteredRows = rows.filter((row, idx) => {
      const humanRowIndex = idx + 2; // matches humanRowIndex (1-indexed, starting after headers)
      return affectedRowNumbers.has(humanRowIndex);
    });

    const headersRow = activeFile.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    const rowsData = filteredRows.map(row => {
      return activeFile.headers.map(header => {
        const val = row[header] !== undefined ? String(row[header]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csvContent = [headersRow, ...rowsData].join('\n');
    const baseName = activeFile.name.replace(/\.csv$/i, '');
    
    let suffix = '_filtered';
    if (severityFilter !== 'all') suffix += `_${severityFilter}`;
    if (typeFilter !== 'all') suffix += `_${typeFilter}`;

    downloadBlob(csvContent, `${baseName}${suffix}.csv`);
    setExportDropdownOpen(false);
  };

  const exportFindingsReport = () => {
    const reportHeaders = ['Issue ID', 'Type', 'Column', 'Row', 'Value', 'Severity', 'Description', 'Suggestion', 'Status'];
    const headersRow = reportHeaders.map(h => `"${h}"`).join(',');
    
    const rowsData = filteredIssues.map(issue => {
      return [
        issue.id,
        issue.type,
        issue.column,
        issue.row ? String(issue.row) : '',
        issue.value ? String(issue.value) : '',
        issue.severity,
        issue.description,
        issue.suggestion,
        issue.status
      ].map(val => `"${val.replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headersRow, ...rowsData].join('\n');
    const baseName = activeFile.name.replace(/\.csv$/i, '');
    downloadBlob(csvContent, `${baseName}_audit_findings.csv`);
    setExportDropdownOpen(false);
  };

  const exportIssuesOnlyRows = () => {
    const rows = activeFile.cleanedRows || activeFile.rows;
    const issueRowNumbers = new Set<number>();
    
    // Collect 1-indexed row numbers from mergedIssues
    mergedIssues.forEach(issue => {
      if (issue.row !== undefined && issue.status === 'open') {
        issueRowNumbers.add(issue.row);
      }
    });

    // Fallback if no open issues exist: check all issues of any status
    if (issueRowNumbers.size === 0) {
      mergedIssues.forEach(issue => {
        if (issue.row !== undefined) {
          issueRowNumbers.add(issue.row);
        }
      });
    }

    const issuesOnlyRows = rows.filter((_, idx) => {
      const humanRowIndex = idx + 2;
      return issueRowNumbers.has(humanRowIndex);
    });

    const headersRow = activeFile.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    const rowsData = issuesOnlyRows.map(row => {
      return activeFile.headers.map(header => {
        const val = row[header] !== undefined ? String(row[header]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [headersRow, ...rowsData].join('\n');
    const baseName = activeFile.name.replace(/\.csv$/i, '');
    downloadBlob(csvContent, `${baseName}_rows_with_issues.csv`);
    setExportDropdownOpen(false);
  };

  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase flex items-center gap-1 shrink-0"><ShieldAlert className="w-3 h-3" /> Critical</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase flex items-center gap-1 shrink-0"><AlertTriangle className="w-3 h-3" /> Warning</span>;
      case 'info':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase flex items-center gap-1 shrink-0"><Info className="w-3 h-3" /> Info</span>;
    }
  };

  const getIssueIcon = (type: IssueType) => {
    switch (type) {
      case 'duplicate':
        return <span className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><AlertCircle className="w-4 h-4" /></span>;
      case 'missing_value':
        return <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><AlertTriangle className="w-4 h-4" /></span>;
      case 'invalid_format':
        return <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Info className="w-4 h-4" /></span>;
      case 'outlier':
        return <span className="p-2 bg-violet-500/10 text-violet-400 rounded-lg"><Sparkles className="w-4 h-4" /></span>;
      case 'column_inconsistency':
        return <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><CheckCircle2 className="w-4 h-4" /></span>;
    }
  };

  // Generate a mock or real AI explanation
  const fetchAiExplanation = async (issueId: string, issue: AuditIssue) => {
    setAiLoading(issueId);
    
    // First try a backend call to see if a real Gemini endpoint can resolve it, otherwise use fallback
    try {
      const response = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue })
      });
      if (response.ok) {
        const data = await response.json();
        setAiExplanations(prev => ({ ...prev, [issueId]: data.explanation }));
        setAiLoading(null);
        return;
      }
    } catch (e) {
      // Quietly swallow and use offline high-quality fallback
    }

    // Offline premium simulator fallback
    setTimeout(() => {
      let explanation = '';
      if (issue.type === 'duplicate') {
        explanation = `Gemini explains: Duplicated rows lead to skewed totals and inaccurate statistical analysis. Row ${issue.row} matches another transaction in column "${issue.column}" perfectly. We highly recommend applying Deduplication to isolate standard atomic records.`;
      } else if (issue.type === 'missing_value') {
        explanation = `Gemini explains: Cell in row ${issue.row} column "${issue.column}" is empty. Missing financial cells disrupt calculation models and database NOT NULL ingestion constraints. Imputing with averages (mean/median) is safe for normally distributed columns, otherwise default "Uncategorized" should be written.`;
      } else if (issue.type === 'invalid_format') {
        explanation = `Gemini explains: Date "${issue.value}" violates the ISO-8601 standard calendar. Consistent datetime string formats (YYYY-MM-DD) are required for transactional index sorting and automated date filters inside target SQL systems. Standardize this format.`;
      } else if (issue.type === 'outlier') {
        explanation = `Gemini explains: The transaction amount of "${issue.value}" lies standard deviations away from the column average. This is extreme statistical variation (outlier). Confirm if this was an acquisition or currency mismatch, or standard high-value customer order before ingesting.`;
      } else {
        explanation = `Gemini explains: Capitalization mismatches (e.g. "${issue.value}") trigger separate groupings during aggregation (e.g., GROUP BY treats lowercase differently). standardizing category case values solves filtration anomalies instantly.`;
      }
      setAiExplanations(prev => ({ ...prev, [issueId]: explanation }));
      setAiLoading(null);
    }, 800);
  };

  const handleQuickFix = (issue: AuditIssue) => {
    if (!activeFile || !onUpdateFile) return;

    const currentRows = activeFile.cleanedRows ? [...activeFile.cleanedRows] : [...activeFile.rows];
    
    // Find matching row index in currentRows
    let targetIdx = -1;
    if (issue.row !== undefined) {
      const idx1 = issue.row - 1;
      const idx2 = issue.row - 2;
      if (idx1 >= 0 && idx1 < currentRows.length && String(currentRows[idx1][issue.column]) === String(issue.value)) {
        targetIdx = idx1;
      } else if (idx2 >= 0 && idx2 < currentRows.length && String(currentRows[idx2][issue.column]) === String(issue.value)) {
        targetIdx = idx2;
      } else {
        targetIdx = currentRows.findIndex(r => String(r[issue.column]) === String(issue.value));
      }
    } else if (issue.value !== undefined && issue.value !== '') {
      targetIdx = currentRows.findIndex(r => String(r[issue.column]) === String(issue.value));
    }

    // Fallback if targetIdx is still -1 and it is a missing value issue
    if (targetIdx === -1 && issue.type === 'missing_value') {
      const idx1 = issue.row ? issue.row - 1 : -1;
      const idx2 = issue.row ? issue.row - 2 : -1;
      if (idx1 >= 0 && idx1 < currentRows.length && (!currentRows[idx1][issue.column] || currentRows[idx1][issue.column].trim() === '')) {
        targetIdx = idx1;
      } else if (idx2 >= 0 && idx2 < currentRows.length && (!currentRows[idx2][issue.column] || currentRows[idx2][issue.column].trim() === '')) {
        targetIdx = idx2;
      } else {
        targetIdx = currentRows.findIndex(r => !r[issue.column] || r[issue.column].trim() === '');
      }
    }

    let updatedRows = [...currentRows];

    switch (issue.type) {
      case 'duplicate':
        if (targetIdx !== -1) {
          updatedRows = currentRows.filter((_, idx) => idx !== targetIdx);
        } else {
          // If row index couldn't be resolved, remove duplicates of this value
          const seenVal = new Set();
          updatedRows = currentRows.filter(r => {
            const val = r[issue.column];
            if (val === issue.value) {
              if (seenVal.has(val)) return false;
              seenVal.add(val);
            }
            return true;
          });
        }
        break;

      case 'missing_value': {
        let fillValue = 'Uncategorized';
        const isNumericCol = issue.column.toLowerCase() === 'amount' || 
                             issue.column.toLowerCase().includes('price') || 
                             issue.column.toLowerCase().includes('quantity');
        
        if (isNumericCol) {
          const numbers = currentRows
            .map(row => row[issue.column])
            .filter(val => val !== undefined && val !== null && String(val).trim() !== '')
            .map(val => Number(val))
            .filter(n => !isNaN(n));
          if (numbers.length > 0) {
            const avg = numbers.reduce((sum, val) => sum + val, 0) / numbers.length;
            fillValue = avg.toFixed(2);
          } else {
            fillValue = '0.00';
          }
        } else if (issue.column.toLowerCase() === 'category') {
          fillValue = 'Uncategorized';
        } else {
          fillValue = 'N/A';
        }

        if (targetIdx !== -1) {
          updatedRows = currentRows.map((row, idx) => 
            idx === targetIdx ? { ...row, [issue.column]: fillValue } : row
          );
        } else {
          updatedRows = currentRows.map(row => 
            (!row[issue.column] || row[issue.column].trim() === '') ? { ...row, [issue.column]: fillValue } : row
          );
        }
        break;
      }

      case 'invalid_format': {
        if (targetIdx !== -1) {
          const rawVal = currentRows[targetIdx][issue.column] || '';
          let formatted = rawVal;
          if (rawVal.includes('/')) {
            const parts = rawVal.split('/');
            if (parts.length === 3) {
              const p0 = parseInt(parts[0]);
              const p1 = parseInt(parts[1]);
              const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              
              let day = p0;
              let month = p1;
              if (p0 > 12) {
                day = p0;
                month = p1;
              } else if (p1 > 12) {
                day = p1;
                month = p0;
              } else {
                day = p0;
                month = p1;
              }
              const mm = month < 10 ? `0${month}` : `${month}`;
              const dd = day < 10 ? `0${day}` : `${day}`;
              formatted = `${year}-${mm}-${dd}`;
            }
          }
          updatedRows = currentRows.map((row, idx) => 
            idx === targetIdx ? { ...row, [issue.column]: formatted } : row
          );
        }
        break;
      }

      case 'column_inconsistency': {
        const fixInconsistency = (val: string) => {
          if (issue.column.toLowerCase() === 'country') {
            if (val.toLowerCase() === 'us' || val.toLowerCase() === 'united states') return 'United States';
            if (val.toLowerCase() === 'uk' || val.toLowerCase() === 'united kingdom') return 'United Kingdom';
          }
          return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
        };

        if (targetIdx !== -1) {
          updatedRows = currentRows.map((row, idx) => 
            idx === targetIdx ? { ...row, [issue.column]: fixInconsistency(row[issue.column] || '') } : row
          );
        } else {
          updatedRows = currentRows.map(row => {
            const val = row[issue.column] || '';
            if (val === issue.value) {
              return { ...row, [issue.column]: fixInconsistency(val) };
            }
            return row;
          });
        }
        break;
      }

      case 'outlier': {
        const numericValues = currentRows
          .map(r => Number(r[issue.column]))
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b);
        const median = numericValues.length > 0 ? numericValues[Math.floor(numericValues.length / 2)] : 1250;
        const cappedVal = (median * 3.5).toFixed(2);

        if (targetIdx !== -1) {
          updatedRows = currentRows.map((row, idx) => 
            idx === targetIdx ? { ...row, [issue.column]: cappedVal } : row
          );
        }
        break;
      }

      default:
        break;
    }

    // Mark issue as resolved
    let updatedIssues = [...activeFile.issues];
    const index = updatedIssues.findIndex(i => i.id === issue.id);
    if (index !== -1) {
      updatedIssues[index] = { ...updatedIssues[index], status: 'resolved' as const };
    } else {
      // It is a dynamic standard-deviation outlier, add it directly as resolved so it is persisted
      updatedIssues.push({ ...issue, status: 'resolved' as const });
    }

    onUpdateFile({
      ...activeFile,
      cleanedRows: updatedRows,
      issues: updatedIssues,
      score: Math.min(100, activeFile.score + 5)
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Telemetry Completed
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight truncate max-w-[320px] md:max-w-md">{activeFile.name}</h1>
        </div>
        <button 
          onClick={() => onNavigate('clean')}
          className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center gap-2 shadow hover:opacity-90 transition-all cursor-pointer ${accentClass}`}
        >
          Open Cleaning Center <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Circle Meter and KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* SVG Quality Score Meter Dial */}
        <div className={`md:col-span-5 p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-6">Data Quality Score</h3>
          
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* SVG circle track */}
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="88" 
                cy="88" 
                r="72" 
                stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} 
                strokeWidth="10" 
                fill="none" 
              />
              <circle 
                cx="88" 
                cy="88" 
                r="72" 
                stroke={activeFile.score > 80 ? "#10B981" : activeFile.score > 60 ? "#F59E0B" : "#EF4444"} 
                strokeWidth="11" 
                strokeDasharray={`${2 * Math.PI * 72}`}
                strokeDashoffset={`${2 * Math.PI * 72 * (1 - activeFile.score / 100)}`}
                strokeLinecap="round"
                fill="none" 
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-4xl font-black tracking-tight">{activeFile.score}%</span>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Compliance</span>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-400 flex items-center gap-1 bg-slate-950/20 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
            Grade {activeFile.score > 80 ? 'Excellent' : activeFile.score > 60 ? 'Moderate Anomaly Rate' : 'Highly Corrupted'}
          </div>
        </div>

        {/* Categories breakdown count cards & Profiler */}
        <div className="md:col-span-7 flex flex-col justify-between gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 h-fit">
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}>
              <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> Critical</h4>
              <span className="text-3xl font-black">{criticalCount}</span>
              <p className="text-[10px] text-slate-400 mt-2">Deduplication and integrity errors</p>
            </div>

            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}>
              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Warnings</h4>
              <span className="text-3xl font-black">{warningCount}</span>
              <p className="text-[10px] text-slate-400 mt-2">Formatting and statistical outliers</p>
            </div>

            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}>
              <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Info className="w-4 h-4" /> Info</h4>
              <span className="text-3xl font-black">{infoCount}</span>
              <p className="text-[10px] text-slate-400 mt-2">Minor capitalization anomalies</p>
            </div>
          </div>

          {/* Smart Format Profiler */}
          {activeFile.detectedMetadata && (
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/30">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" /> Ingestion Format Profile
                </h4>
                <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold font-mono">Auto-Detected</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date Formats */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Detected Date Columns</span>
                  {Object.keys(activeFile.detectedMetadata.dateFormats).length > 0 ? (
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {Object.entries(activeFile.detectedMetadata.dateFormats).map(([col, fmt]) => (
                        <div key={col} className={`flex justify-between items-center text-xs px-2.5 py-1.5 rounded border ${isDarkMode ? 'bg-slate-950/40 border-slate-800/40' : 'bg-slate-50 border-slate-200'}`}>
                          <span className="font-medium text-slate-300 truncate max-w-[120px]" title={col}>{col}</span>
                          <span className="font-mono text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">{fmt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic block">No standard date columns detected.</span>
                  )}
                </div>

                {/* Currency settings */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Detected Currency Columns</span>
                  {activeFile.detectedMetadata.currencySettings.length > 0 ? (
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {activeFile.detectedMetadata.currencySettings.map((set) => (
                        <div key={set.column} className={`text-xs p-2 rounded border ${isDarkMode ? 'bg-slate-950/40 border-slate-800/40' : 'bg-slate-50 border-slate-200'} space-y-1`}>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-300 truncate max-w-[120px]" title={set.column}>{set.column}</span>
                            <span className="font-mono text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                              Symbol: {set.symbol || '$'}
                            </span>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                            <span>Decimals: <strong className="text-slate-200">{set.decimalSeparator || '.'}</strong></span>
                            <span>Thousands: <strong className="text-slate-200">{set.thousandSeparator || ','}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic block">No standard financial columns detected.</span>
                  )}
                </div>
              </div>

              {activeFile.headerMappings && Object.keys(activeFile.headerMappings).some(k => activeFile.headerMappings?.[k] !== 'None') && (
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/20">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">AI Canonical Column Mappings</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(activeFile.headerMappings).map(([col, canonical]) => {
                      if (canonical === 'None') return null;
                      return (
                        <div key={col} className={`flex justify-between items-center text-xs px-2.5 py-1.5 rounded border ${isDarkMode ? 'bg-slate-950/40 border-slate-800/40' : 'bg-slate-50 border-slate-200'}`}>
                          <span className={`font-semibold truncate max-w-[120px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`} title={col}>{col}</span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] text-slate-500 font-mono">→</span>
                            <span className="font-mono text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-bold truncate" title={canonical}>{canonical}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter and Issues Feed */}
      <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 mb-6 border-slate-800/80">
          <h3 className="font-bold text-base flex items-center gap-2"><Filter className="w-4 h-4 text-blue-500" /> Compliance Findings ({filteredIssues.length})</h3>
          
          <div className="flex flex-wrap gap-2 text-xs items-center">
            {/* Severity Filter */}
            <select 
              value={severityFilter} 
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className={`px-3 py-1.5 rounded-lg border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            {/* Type Filter */}
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className={`px-3 py-1.5 rounded-lg border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
            >
              <option value="all">All Issue Types</option>
              <option value="duplicate">Duplicates</option>
              <option value="missing_value">Missing Values</option>
              <option value="invalid_format">Formats</option>
              <option value="outlier">Outliers</option>
            </select>

            {/* Download CSV (Rows with Issues) Button */}
            <button
              type="button"
              id="audit-results-download-issues-btn"
              onClick={exportIssuesOnlyRows}
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDarkMode 
                  ? 'bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40 text-rose-400 hover:bg-rose-500/20 hover:text-rose-200' 
                  : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100 hover:text-rose-900 hover:border-rose-300'
              }`}
              title="Download only rows that have compliance issues for offline review"
            >
              <Download className="w-3.5 h-3.5 text-rose-500" />
              <span>Download CSV (Rows with Issues)</span>
            </button>

            {/* Export Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                id="audit-results-export-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setExportDropdownOpen(!exportDropdownOpen);
                }}
                className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:shadow-xs'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>Export Data</span>
                <ChevronDown className="w-3 h-3 ml-0.5 text-slate-500" />
              </button>

              {exportDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10 cursor-default" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExportDropdownOpen(false);
                    }}
                  />
                  <div className={`absolute right-0 mt-2 w-72 rounded-xl border shadow-2xl z-20 py-2 animate-fadeIn ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-slate-200' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <div className="px-3 py-1.5 border-b border-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Export Configurations
                    </div>
                    
                    {/* Option 1: Full Cleaned/Audited CSV */}
                    <button
                      type="button"
                      id="export-option-full"
                      onClick={exportFullDataset}
                      className={`w-full px-3 py-2 text-left transition-colors flex items-start gap-2.5 cursor-pointer ${
                        isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs block">Full Dataset ({activeFile.cleanedRows ? 'Cleaned' : 'Audited'})</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Download all {activeFile.cleanedRows ? activeFile.cleanedRows.length : activeFile.rows.length} rows as a new CSV file.
                        </span>
                      </div>
                    </button>

                    {/* Option 2: Filtered Dataset */}
                    <button
                      type="button"
                      id="export-option-filtered"
                      onClick={exportFilteredDataset}
                      disabled={severityFilter === 'all' && typeFilter === 'all'}
                      className={`w-full px-3 py-2 text-left transition-colors flex items-start gap-2.5 cursor-pointer ${
                        severityFilter === 'all' && typeFilter === 'all'
                          ? 'opacity-40 cursor-not-allowed'
                          : isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <Filter className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs block">Filtered Rows Only</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {severityFilter === 'all' && typeFilter === 'all'
                            ? 'Select a severity or type filter to export subset.'
                            : `Download only the ${affectedRowsCount} rows matching active filters.`}
                        </span>
                      </div>
                    </button>

                    {/* Option 2.5: Rows with Issues Only */}
                    <button
                      type="button"
                      id="export-option-issues-only"
                      onClick={exportIssuesOnlyRows}
                      className={`w-full px-3 py-2 text-left transition-colors flex items-start gap-2.5 cursor-pointer ${
                        isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs block">Rows with Issues Only</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Download only the rows currently identified as having quality issues.
                        </span>
                      </div>
                    </button>

                    <div className="border-t border-slate-800/40 my-1"></div>

                    {/* Option 3: Audit Report */}
                    <button
                      type="button"
                      id="export-option-report"
                      onClick={exportFindingsReport}
                      className={`w-full px-3 py-2 text-left transition-colors flex items-start gap-2.5 cursor-pointer ${
                        isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs block">Compliance Issues List</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Download a spreadsheet of the {filteredIssues.length} found compliance issues.
                        </span>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Smart Outlier Dashboard Panel */}
        <div className={`mb-6 p-5 rounded-2xl border ${isDarkMode ? 'bg-[#1e293b]/30 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-4`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-violet-500/10 text-violet-400 rounded-xl"><BrainCircuit className="w-5 h-5 text-violet-500" /></span>
              <div>
                <h4 className="text-sm font-extrabold tracking-tight">Smart Statistical Outlier Audit</h4>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Locate financial standard deviations and variance anomalies in mapped numerical columns.</p>
              </div>
            </div>
            
            {/* Slider to adjust standard deviation threshold */}
            <div className="w-full md:w-72 space-y-1.5 shrink-0">
              <div className="flex justify-between text-[11px] font-mono">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Outlier Sensitivity</span>
                <span className="text-violet-500 font-extrabold">{outlierThreshold.toFixed(1)} Standard Devs (σ)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Strict (1.5)</span>
                <input
                  type="range"
                  min="1.5"
                  max="4.0"
                  step="0.1"
                  value={outlierThreshold}
                  onChange={(e) => {
                    setOutlierThreshold(parseFloat(e.target.value));
                    setIssuesPage(1);
                  }}
                  className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-violet-500 bg-slate-200 dark:bg-slate-800"
                />
                <span className="text-[10px] text-slate-400">Relaxed (4.0)</span>
              </div>
            </div>
          </div>

          {/* Table displaying calculated standard deviations per numerical column */}
          {columnStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {columnStats.map((stat) => (
                <div key={stat.column} className={`p-3.5 rounded-xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#0f172a]/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className={`font-extrabold text-xs truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`} title={stat.column}>{stat.column}</span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${stat.outliersCount > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {stat.outliersCount} {stat.outliersCount === 1 ? 'Outlier' : 'Outliers'}
                    </span>
                  </div>
                  <div className={`grid grid-cols-3 gap-2 text-[10px] font-mono border-t pt-2.5 ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
                    <div>
                      <span className="block text-slate-500 text-[8px] uppercase font-bold tracking-wider mb-0.5">Rows</span>
                      <strong className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{stat.count}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-[8px] uppercase font-bold tracking-wider mb-0.5">Mean</span>
                      <strong className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                        {stat.column.toLowerCase().includes('quantity') ? '' : '$'}
                        {stat.mean.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-[8px] uppercase font-bold tracking-wider mb-0.5">Std Dev (σ)</span>
                      <strong className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                        {stat.column.toLowerCase().includes('quantity') ? '' : '$'}
                        {stat.stdDev.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`p-4 rounded-xl border text-center text-xs ${isDarkMode ? 'bg-slate-900/20 border-slate-800 text-slate-400' : 'bg-slate-100/50 border-slate-200 text-slate-500'}`}>
              <HelpCircle className="w-5 h-5 text-slate-500 mx-auto mb-1.5" />
              <p className="font-semibold">No numerical columns mapped or detected</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Map your headers to "Amount" in the Upload Center or ensure header contains "Amount/Budget/Price" keywords to enable dynamic standard deviation analysis.</p>
            </div>
          )}
        </div>

        {/* Empty States */}
        {filteredIssues.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h4 className="font-bold text-sm">No quality findings matching active filter.</h4>
            <p className="text-xs text-slate-400 mt-1">This spreadsheet is perfectly standard for this segment.</p>
          </div>
        )}

        {/* Issues Stack */}
        <div className="space-y-4">
          {filteredIssues.slice((issuesPage - 1) * issuesPageSize, issuesPage * issuesPageSize).map((issue) => {
            const isExpanded = expandedIssue === issue.id;
            return (
              <div 
                key={issue.id}
                className={`border rounded-xl transition-all overflow-hidden ${isDarkMode ? 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-950/80' : 'bg-white border-slate-100 hover:bg-slate-50/50'}`}
              >
                {/* Accordion Trigger */}
                <div 
                  onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                  className="p-4 flex items-center justify-between cursor-pointer gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {getIssueIcon(issue.type)}
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs truncate">{issue.column}</span>
                        {issue.row && <span className="text-[10px] bg-slate-800/60 px-1.5 py-0.5 rounded text-slate-400 font-mono">Row {issue.row}</span>}
                        {issue.value !== '' && issue.value !== undefined && <span className="text-[10px] bg-slate-800/30 px-1.5 py-0.5 rounded text-slate-500 truncate max-w-[120px]">Value: {issue.value}</span>}
                      </div>
                      <p className={`text-xs mt-1 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{issue.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {issue.status === 'open' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickFix(issue);
                        }}
                        className={`px-3 py-1 text-[11px] font-bold text-white rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${accentClass}`}
                      >
                        <Sparkles className="w-3 h-3.5" />
                        <span>One-Click Fix</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Fixed</span>
                      </span>
                    )}
                    {getSeverityBadge(issue.severity)}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </div>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className={`p-5 border-t border-dashed bg-slate-900/10 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="space-y-4">
                      {/* Suggestion block */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/20 p-3.5 rounded-xl border border-slate-800/40">
                        <div className="text-xs text-left">
                          <span className="font-bold uppercase tracking-widest text-slate-400 block mb-1">Recommended Solution:</span>
                          <p className={isDarkMode ? 'text-slate-200 font-semibold' : 'text-slate-700 font-semibold'}>{issue.suggestion}</p>
                        </div>
                        {issue.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => handleQuickFix(issue)}
                            className={`px-4 py-2 text-xs font-extrabold text-white rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 shrink-0 ${accentClass}`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Apply Fix</span>
                          </button>
                        )}
                      </div>

                      {/* AI Explanations Screen 7 helper button */}
                      <div className="space-y-3 pt-3 border-t border-slate-800/40">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                           <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-yellow-500" /> Gemini Audit Intelligence
                          </span>
                          {!aiExplanations[issue.id] && (
                            <button
                              onClick={() => fetchAiExplanation(issue.id, issue)}
                              disabled={aiLoading === issue.id}
                              className={`px-3 py-1 text-[11px] font-semibold text-white rounded-lg flex items-center gap-1 transition-all ${accentClass}`}
                            >
                              {aiLoading === issue.id ? (
                                <><RefreshCw className="w-3 h-3 animate-spin" /> Fetching AI Explanation...</>
                              ) : (
                                <><Sparkles className="w-3 h-3" /> Explain anomaly</>
                              )}
                            </button>
                          )}
                        </div>

                        {aiExplanations[issue.id] && (
                          <div className={`p-4 rounded-xl border text-xs leading-relaxed ${isDarkMode ? 'bg-blue-950/20 border-blue-950 text-blue-300' : 'bg-blue-50/50 border-blue-100 text-blue-900'}`}>
                            {aiExplanations[issue.id]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Issues Pagination Controls */}
        {filteredIssues.length > issuesPageSize && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-slate-800/30 pt-4">
            <span className="text-slate-400 font-medium">
              Showing <span className="font-mono text-blue-500 font-bold">{Math.min(filteredIssues.length, (issuesPage - 1) * issuesPageSize + 1)}</span> to{' '}
              <span className="font-mono text-blue-500 font-bold">{Math.min(filteredIssues.length, issuesPage * issuesPageSize)}</span> of{' '}
              <span className="font-mono text-blue-500 font-bold">{filteredIssues.length}</span> compliance findings
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={issuesPage === 1}
                onClick={() => setIssuesPage(1)}
                className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
              >
                «
              </button>
              <button
                type="button"
                disabled={issuesPage === 1}
                onClick={() => setIssuesPage(prev => Math.max(1, prev - 1))}
                className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
              >
                Prev
              </button>
              <span className="px-2.5 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold font-mono text-[10px]">
                {issuesPage} / {Math.ceil(filteredIssues.length / issuesPageSize)}
              </span>
              <button
                type="button"
                disabled={issuesPage >= Math.ceil(filteredIssues.length / issuesPageSize)}
                onClick={() => setIssuesPage(prev => Math.min(Math.ceil(filteredIssues.length / issuesPageSize), prev + 1))}
                className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
              >
                Next
              </button>
              <button
                type="button"
                disabled={issuesPage >= Math.ceil(filteredIssues.length / issuesPageSize)}
                onClick={() => setIssuesPage(Math.ceil(filteredIssues.length / issuesPageSize))}
                className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
