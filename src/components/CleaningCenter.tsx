import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileSpreadsheet, 
  Trash2, 
  Calendar, 
  PenTool, 
  HelpCircle, 
  RotateCcw, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  ChevronRight,
  Filter,
  Sparkles,
  Printer,
  X,
  Columns,
  Download
} from 'lucide-react';
import { CSVFile, AuditIssue } from '../types';

interface CleaningCenterProps {
  activeFile: CSVFile | null;
  onUpdateFile: (updatedFile: CSVFile) => void;
  onNavigate: (tab: string) => void;
  isDarkMode: boolean;
  accentClass: string;
  userRole: string; // To enforce viewer restriction
}

export default function CleaningCenter({ activeFile, onUpdateFile, onNavigate, isDarkMode, accentClass, userRole }: CleaningCenterProps) {
  const isViewer = userRole === 'Viewer';
  
  // History state for Undo/Redo
  const [history, setHistory] = useState<Record<string, string>[][]>(activeFile ? [activeFile.rows] : []);
  const [headersHistory, setHeadersHistory] = useState<string[][]>(activeFile ? [activeFile.headers] : []);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [appliedSteps, setAppliedSteps] = useState<string[]>([]);

  // Conditional Column Splitter State
  const [isSplitterOpen, setIsSplitterOpen] = useState(false);
  const [splitColumn, setSplitColumn] = useState('');
  const [splitDelimiter, setSplitDelimiter] = useState('space');
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [splitCondition, setSplitCondition] = useState('always');
  const [splitColNames, setSplitColNames] = useState('');

  // Smart Validation Engine State
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [validateColumn, setValidateColumn] = useState('');
  const [validationRule, setValidationRule] = useState('email');
  const [minVal, setMinVal] = useState('');
  const [maxVal, setMaxVal] = useState('');
  const [minLen, setMinLen] = useState('');
  const [maxLen, setMaxLen] = useState('');
  const [customSubstring, setCustomSubstring] = useState('');
  const [validationFailAction, setValidationFailAction] = useState('flag');
  const [validationFallback, setValidationFallback] = useState('');

  // Print Modal Configuration State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTitle, setPrintTitle] = useState(activeFile ? `CSV Auditor Report: ${activeFile.name}` : 'CSV Auditor Report');
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [printRowsFilter, setPrintRowsFilter] = useState<'all' | 'modified'>('all');
  const [printTheme, setPrintTheme] = useState<'classic' | 'emerald' | 'minimalist'>('classic');
  const [selectedPrintColumns, setSelectedPrintColumns] = useState<string[]>(activeFile ? activeFile.headers : []);
  const [printLimit, setPrintLimit] = useState<number>(50);

  // Sync state and clean history upon activating a different file
  useEffect(() => {
    if (activeFile) {
      setHistory([activeFile.rows]);
      setHeadersHistory([activeFile.headers]);
      setHistoryIndex(0);
      setAppliedSteps([]);
      setSelectedPrintColumns(activeFile.headers);
      setPrintTitle(`CSV Auditor Report: ${activeFile.name}`);
    }
  }, [activeFile?.id]);

  if (!activeFile) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl animate-fadeIn">
        <FileSpreadsheet className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="font-bold text-lg mb-1">No Dataset Loaded for Cleaning</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
          Upload a file first or load our messy company transactions CSV to test the cleaning workspace.
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

  const currentRows = history[historyIndex] || activeFile.rows;
  const currentHeaders = headersHistory[historyIndex] || activeFile.headers;

  const pushState = (newRows: Record<string, string>[], stepLabel: string, newHeaders?: string[]) => {
    const nextHeaders = newHeaders || currentHeaders;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newRows);
    setHistory(newHistory);

    const newHeadersHistory = headersHistory.slice(0, historyIndex + 1);
    newHeadersHistory.push(nextHeaders);
    setHeadersHistory(newHeadersHistory);

    setHistoryIndex(newHistory.length - 1);
    setAppliedSteps(prev => [...prev.slice(0, historyIndex), stepLabel]);

    // Propagate up to central App file
    onUpdateFile({
      ...activeFile,
      cleanedRows: newRows,
      headers: nextHeaders,
      score: Math.min(100, activeFile.score + 5) // Boost score upon cleaning
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevRows = history[historyIndex - 1];
      const prevHeaders = headersHistory[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      onUpdateFile({
        ...activeFile,
        cleanedRows: prevRows,
        headers: prevHeaders
      });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextRows = history[historyIndex + 1];
      const nextHeaders = headersHistory[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      onUpdateFile({
        ...activeFile,
        cleanedRows: nextRows,
        headers: nextHeaders
      });
    }
  };

  // Cleaning operations
  const removeDuplicates = () => {
    const seen = new Set<string>();
    const uniqueRows = currentRows.filter(row => {
      // Create a unique key using all values (or a primary key like Transaction_ID)
      const key = row.Transaction_ID || JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const removedCount = currentRows.length - uniqueRows.length;
    pushState(uniqueRows, `Deduplicated rows: Removed ${removedCount} matching duplicate record(s).`);
  };

  const standardizeDates = () => {
    const cleaned = currentRows.map(row => {
      const updated = { ...row };
      if (row.Date) {
        // Standardize slashes like 04/06/2026 to 2026-06-04 or standard ISO
        const raw = row.Date;
        if (raw.includes('/')) {
          const parts = raw.split('/');
          if (parts.length === 3) {
            // Check DD/MM/YYYY vs MM/DD/YYYY
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            updated.Date = `${year}-${month}-${day}`;
          }
        }
      }
      return updated;
    });
    pushState(cleaned, "Standardized date formats to ISO YYYY-MM-DD.");
  };

  const fillMissingValues = () => {
    const cleaned = currentRows.map(row => {
      const updated = { ...row };
      Object.keys(updated).forEach(key => {
        if (updated[key] === '' || updated[key] === undefined) {
          if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('price') || key.toLowerCase().includes('pay')) {
            updated[key] = '0.00'; // Fallback for decimals
          } else {
            updated[key] = 'Uncategorized'; // Default for category text
          }
        }
      });
      return updated;
    });
    pushState(cleaned, "Imputed blank values with default fallbacks.");
  };

  const correctCasing = () => {
    const cleaned = currentRows.map(row => {
      const updated = { ...row };
      // Standardize casing on categories and country codes
      if (updated.Category) {
        updated.Category = updated.Category.charAt(0).toUpperCase() + updated.Category.slice(1).toLowerCase();
      }
      if (updated.Country && updated.Country.length === 2) {
        updated.Country = updated.Country.toUpperCase();
      }
      return updated;
    });
    pushState(cleaned, "Standardized capitalization on columns (Sentence/Upper Case).");
  };

  const runColumnSplitter = () => {
    if (!splitColumn) return;
    
    // Determine delimiter character
    let delim = ' ';
    if (splitDelimiter === 'comma') delim = ',';
    else if (splitDelimiter === 'dash') delim = '-';
    else if (splitDelimiter === 'slash') delim = '/';
    else if (splitDelimiter === 'semicolon') delim = ';';
    else if (splitDelimiter === 'custom') delim = customDelimiter || ' ';

    // Generate new column headers.
    // Let's inspect the data to find the maximum number of parts split.
    let maxParts = 2;
    currentRows.forEach(row => {
      const val = row[splitColumn] || '';
      const parts = val.split(delim);
      if (parts.length > maxParts) {
        maxParts = parts.length;
      }
    });

    // Custom column names
    let newHeadersList: string[] = [];
    if (splitColNames.trim()) {
      newHeadersList = splitColNames.split(',').map(s => s.trim()).filter(Boolean);
    }
    
    // Ensure we have names for all parts up to maxParts
    const finalNewHeaders: string[] = [];
    for (let i = 0; i < maxParts; i++) {
      if (newHeadersList[i]) {
        finalNewHeaders.push(newHeadersList[i]);
      } else {
        finalNewHeaders.push(`${splitColumn}_part${i + 1}`);
      }
    }

    // Now split the rows
    const cleaned = currentRows.map(row => {
      const updated = { ...row };
      const val = row[splitColumn] || '';
      
      // Check condition
      let shouldSplit = true;
      if (splitCondition === 'contains') {
        shouldSplit = val.includes(delim);
      }

      if (shouldSplit) {
        const parts = val.split(delim);
        finalNewHeaders.forEach((newCol, index) => {
          updated[newCol] = parts[index] !== undefined ? parts[index].trim() : '';
        });
      } else {
        // If condition not met, populate the first part with original, others empty
        finalNewHeaders.forEach((newCol, index) => {
          updated[newCol] = index === 0 ? val : '';
        });
      }
      return updated;
    });

    // Add new headers to headers array, right after the original splitColumn, or at the end
    const colIndex = currentHeaders.indexOf(splitColumn);
    const updatedHeaders = [...currentHeaders];
    if (colIndex !== -1) {
      updatedHeaders.splice(colIndex + 1, 0, ...finalNewHeaders);
    } else {
      updatedHeaders.push(...finalNewHeaders);
    }

    pushState(
      cleaned,
      `Split column "${splitColumn}" by "${splitDelimiter === 'custom' ? customDelimiter : splitDelimiter}" into: ${finalNewHeaders.join(', ')}.`,
      updatedHeaders
    );

    // Auto-select new split columns in print modal
    setSelectedPrintColumns(prev => [...prev, ...finalNewHeaders]);

    // Reset fields
    setSplitColNames('');
  };

  const runValidationRule = () => {
    if (!validateColumn) return;

    let flagCount = 0;
    let coerceCount = 0;
    const newIssues: AuditIssue[] = [...activeFile.issues];

    const cleaned = currentRows.map((row, index) => {
      const updated = { ...row };
      const val = (row[validateColumn] || '').trim();
      let isValid = true;
      let failureMsg = '';

      if (validationRule === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(val);
        failureMsg = `Invalid email formatting: "${val}"`;
      } else if (validationRule === 'numeric') {
        const num = Number(val);
        const isNum = !isNaN(num) && val !== '';
        let minCheck = true;
        let maxCheck = true;
        if (minVal !== '') {
          minCheck = isNum && num >= Number(minVal);
        }
        if (maxVal !== '') {
          maxCheck = isNum && num <= Number(maxVal);
        }
        isValid = isNum && minCheck && maxCheck;
        failureMsg = `Value "${val}" is not in numeric range [${minVal || '-∞'}, ${maxVal || '+∞'}]`;
      } else if (validationRule === 'length') {
        const len = val.length;
        let minCheck = true;
        let maxCheck = true;
        if (minLen !== '') {
          minCheck = len >= Number(minLen);
        }
        if (maxLen !== '') {
          maxCheck = len <= Number(maxLen);
        }
        isValid = minCheck && maxCheck;
        failureMsg = `Value length (${len}) violates bounds [${minLen || '0'}, ${maxLen || '∞'}]`;
      } else if (validationRule === 'required') {
        isValid = val !== '';
        failureMsg = `Required field is empty`;
      } else if (validationRule === 'substring') {
        isValid = val.toLowerCase().includes(customSubstring.toLowerCase());
        failureMsg = `Value "${val}" does not contain substring "${customSubstring}"`;
      }

      if (!isValid) {
        if (validationFailAction === 'flag') {
          flagCount++;
          // Add a new issue to the file's issue logs
          const issueId = `validation-${validateColumn}-${index}-${Date.now()}`;
          const issue: AuditIssue = {
            id: issueId,
            type: 'invalid_format',
            column: validateColumn,
            row: index + 2,
            value: val,
            severity: 'warning',
            description: `${failureMsg} on row ${index + 2}.`,
            suggestion: `Double check entry or apply automated coercion fallbacks.`,
            status: 'open'
          };
          newIssues.push(issue);
        } else if (validationFailAction === 'nullify') {
          coerceCount++;
          updated[validateColumn] = '';
        } else if (validationFailAction === 'fallback') {
          coerceCount++;
          updated[validateColumn] = validationFallback;
        }
      }

      return updated;
    });

    let message = '';
    if (validationFailAction === 'flag') {
      message = `Validated column "${validateColumn}": Flagged ${flagCount} record(s) violating the "${validationRule}" rule.`;
    } else {
      message = `Validated column "${validateColumn}": Cleansed ${coerceCount} record(s) violating the "${validationRule}" rule (Action: ${validationFailAction}).`;
    }

    // Update both history (rows) and activeFile issues
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cleaned);
    setHistory(newHistory);

    const newHeadersHistory = headersHistory.slice(0, historyIndex + 1);
    newHeadersHistory.push(currentHeaders);
    setHeadersHistory(newHeadersHistory);

    setHistoryIndex(newHistory.length - 1);
    setAppliedSteps(prev => [...prev.slice(0, historyIndex), message]);

    onUpdateFile({
      ...activeFile,
      cleanedRows: cleaned,
      issues: newIssues,
      score: Math.max(0, Math.min(100, activeFile.score + (coerceCount > 0 ? 8 : -2))) // Adjust score
    });
  };

  // Helper to check if a row value differs from original raw row (to highlight changes in preview)
  const isValueModified = (rowIndex: number, column: string, val: string) => {
    const originalRow = activeFile.rows[rowIndex];
    if (!originalRow) return false;
    return originalRow[column] !== val;
  };

  const handleDownloadCSV = () => {
    if (!activeFile) return;

    // Convert headers to CSV row
    const headersRow = currentHeaders.map(h => {
      const escaped = h.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');

    // Convert each row in currentRows to a CSV row
    const rowsData = currentRows.map(row => {
      return currentHeaders.map(header => {
        const value = row[header] !== undefined ? String(row[header]) : '';
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    });

    const csvContent = [headersRow, ...rowsData].join('\n');

    // Create a Blob and download it programmatically
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const baseName = activeFile.name.replace(/\.csv$/i, '');
    link.setAttribute('download', `${baseName}_cleaned.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCompiledPrint = () => {
    // Create transient hidden iframe to trigger a perfect clean print context
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    // Resolve Theme-Specific styles
    let primaryHeaderBg = '#f1f5f9';
    let primaryHeaderColor = '#334155';
    let primaryBorderColor = '#cbd5e1';
    let primaryTitleColor = '#0f172a';
    let brandAccentColor = '#10b981';
    let pageBgColor = '#ffffff';
    let textPrimaryColor = '#1e293b';

    if (printTheme === 'emerald') {
      primaryHeaderBg = '#ecfdf5';
      primaryHeaderColor = '#047857';
      primaryBorderColor = '#a7f3d0';
      primaryTitleColor = '#064e3b';
      brandAccentColor = '#10b981';
    } else if (printTheme === 'minimalist') {
      primaryHeaderBg = '#1e293b';
      primaryHeaderColor = '#cbd5e1';
      primaryBorderColor = '#334155';
      primaryTitleColor = '#f8fafc';
      brandAccentColor = '#3b82f6';
      pageBgColor = '#0b0f19';
      textPrimaryColor = '#f1f5f9';
    }

    // Render table headers and cells with matching visual updates
    const tableHeaders = selectedPrintColumns.map(h => `
      <th style="padding: 10px 8px; border: 1px solid ${primaryBorderColor}; background-color: ${primaryHeaderBg}; font-weight: 700; text-align: left; font-size: 11px; color: ${primaryHeaderColor}; font-family: monospace;">
        ${h}
      </th>
    `).join('');

    const printableRows = currentRows.filter((_, rIdx) => {
      if (printRowsFilter === 'modified') {
        return selectedPrintColumns.some(col => isValueModified(rIdx, col, currentRows[rIdx][col]));
      }
      return true;
    }).slice(0, printLimit);

    const tableRows = printableRows.map((row, rIdx) => {
      const cells = selectedPrintColumns.map(col => {
        const val = row[col] || '';
        const isModified = isValueModified(rIdx, col, val);
        const isFilledVal = isModified && (val === 'Uncategorized' || val === '0.00');
        
        let cellBg = pageBgColor;
        let cellColor = textPrimaryColor;
        let cellFontWeight = 'normal';

        if (isFilledVal) {
          cellBg = printTheme === 'minimalist' ? '#065f46' : '#ecfdf5';
          cellColor = printTheme === 'minimalist' ? '#34d399' : '#047857';
          cellFontWeight = 'bold';
        } else if (isModified) {
          cellBg = printTheme === 'minimalist' ? '#78350f' : '#fffbeb';
          cellColor = printTheme === 'minimalist' ? '#fbbf24' : '#b45309';
          cellFontWeight = 'bold';
        }

        return `
          <td style="padding: 8px; border: 1px solid ${primaryBorderColor}; font-size: 10px; font-family: monospace; background-color: ${cellBg}; color: ${cellColor}; font-weight: ${cellFontWeight};">
            ${val === '' ? '<span style="color: #ef4444; font-style: italic; opacity: 0.6;">empty</span>' : val}
          </td>
        `;
      }).join('');

      return `
        <tr>
          <td style="padding: 8px; border: 1px solid ${primaryBorderColor}; font-size: 10px; font-family: monospace; font-weight: bold; background-color: ${primaryHeaderBg}; color: ${primaryHeaderColor}; text-align: center;">
            ${rIdx + 2}
          </td>
          ${cells}
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${printTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              color: ${textPrimaryColor};
              padding: 30px;
              margin: 0;
              background-color: ${pageBgColor};
            }
            .header-container {
              border-bottom: 3px solid ${brandAccentColor};
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .title {
              font-size: 22px;
              font-weight: 800;
              color: ${primaryTitleColor};
              margin: 0 0 6px 0;
              letter-spacing: -0.025em;
            }
            .subtitle {
              font-size: 12px;
              color: #64748b;
              margin: 0;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              background-color: ${printTheme === 'minimalist' ? '#1e293b' : '#f8fafc'};
              border: 1px solid ${primaryBorderColor};
              border-radius: 8px;
              padding: 12px 16px;
              margin-top: 16px;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
            }
            .meta-label {
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
              color: #94a3b8;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .meta-value {
              font-size: 12px;
              font-weight: 600;
              color: ${printTheme === 'minimalist' ? '#f1f5f9' : '#334155'};
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .legend {
              display: flex;
              gap: 16px;
              margin-top: 24px;
              font-size: 10px;
              color: #64748b;
              font-weight: 500;
            }
            .legend-item {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .legend-color {
              width: 12px;
              height: 12px;
              border-radius: 3px;
              border: 1px solid ${primaryBorderColor};
            }
            @media print {
              body {
                padding: 0;
                background-color: #ffffff !important;
                color: #000000 !important;
              }
              .no-print {
                display: none;
              }
              @page {
                size: ${printOrientation};
                margin: 12mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <h1 class="title">${printTitle}</h1>
            <p class="subtitle">Cleaned & Restructured Transformed Dataset Report</p>
            
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Dataset Filename</span>
                <span class="meta-value">${activeFile.name}</span>
              </div>
              <div class="meta-item">
                <span class="meta-value" style="color: ${brandAccentColor}; font-weight: 800;">${activeFile.score}% Compliance</span>
                <span class="meta-label">Data Quality Index</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Record Count</span>
                <span class="meta-value">${printableRows.length} Rows</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Date Audited & Printed</span>
                <span class="meta-value">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="padding: 10px 8px; border: 1px solid ${primaryBorderColor}; background-color: ${primaryHeaderBg}; font-weight: 700; font-size: 11px; text-align: center; color: ${primaryHeaderColor}; width: 45px;">Row</th>
                ${tableHeaders}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="legend">
            <div class="legend-item">
              <div class="legend-color" style="background-color: ${printTheme === 'minimalist' ? '#78350f' : '#fffbeb'}; border-color: ${primaryBorderColor};"></div>
              <span>Modified Cells (capitalization / date formatting / custom rule transformations)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: ${printTheme === 'minimalist' ? '#065f46' : '#ecfdf5'}; border-color: ${primaryBorderColor};"></div>
              <span>Imputed / Filled Values (empty fields fixed with custom placeholders)</span>
            </div>
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Give iframe short delay to load fonts and styles, then fire print dialog
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Safely garbage-collect the temporary print iframe
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }, 500);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Workspace Core
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Data Cleaning Center</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Run immediate data transformation routines, preview adjustments, and track change histories.
          </p>
        </div>

        {/* Undo Redo controls */}
        <div className="flex gap-2">
          <button 
            onClick={handleUndo}
            disabled={historyIndex === 0 || isViewer}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800/40 transition-all ${historyIndex === 0 ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
          >
            <RotateCcw className="w-4 h-4" /> Undo
          </button>
          <button 
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1 || isViewer}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800/40 transition-all ${historyIndex === history.length - 1 ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
          >
            <RotateCw className="w-4 h-4" /> Redo
          </button>
        </div>
      </div>

      {isViewer && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4" />
          <span>You are logged in as a <strong>Viewer</strong>. Active modifications are locked under write permissions. Sign up or log in as an Admin/Editor to run operations.</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Actions panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-5">Automated Actions</h3>
            
            <div className="space-y-4">
              {/* Duplicate removal */}
              <button
                onClick={removeDuplicates}
                disabled={isViewer}
                className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01] flex gap-3.5 items-start cursor-pointer hover:bg-rose-500/5 hover:border-rose-500/30 group disabled:opacity-50 disabled:pointer-events-none ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-100'}`}
              >
                <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg group-hover:bg-rose-500/20"><Trash2 className="w-4 h-4" /></div>
                <div>
                  <h4 className="font-bold text-xs">Remove Duplicate Records</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Isolate unique rows by purging identical records in primary column sets.</p>
                </div>
              </button>

              {/* Standardize Dates */}
              <button
                onClick={standardizeDates}
                disabled={isViewer}
                className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01] flex gap-3.5 items-start cursor-pointer hover:bg-blue-500/5 hover:border-blue-500/30 group disabled:opacity-50 disabled:pointer-events-none ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-100'}`}
              >
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg group-hover:bg-blue-500/20"><Calendar className="w-4 h-4" /></div>
                <div>
                  <h4 className="font-bold text-xs">Standardize Date Formats</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Normalize messy dates (e.g. slashes/raw keys) into standard YYYY-MM-DD.</p>
                </div>
              </button>

              {/* Impute blanks */}
              <button
                onClick={fillMissingValues}
                disabled={isViewer}
                className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01] flex gap-3.5 items-start cursor-pointer hover:bg-amber-500/5 hover:border-amber-500/30 group disabled:opacity-50 disabled:pointer-events-none ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-100'}`}
              >
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg group-hover:bg-amber-500/20"><PenTool className="w-4 h-4" /></div>
                <div>
                  <h4 className="font-bold text-xs">Fill Missing Blank Cells</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Impute empty metrics and categories with default placeholders securely.</p>
                </div>
              </button>

              {/* Casing checks */}
              <button
                onClick={correctCasing}
                disabled={isViewer}
                className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01] flex gap-3.5 items-start cursor-pointer hover:bg-emerald-500/5 hover:border-emerald-500/30 group disabled:opacity-50 disabled:pointer-events-none ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-100'}`}
              >
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg group-hover:bg-emerald-500/20"><CheckCircle2 className="w-4 h-4" /></div>
                <div>
                  <h4 className="font-bold text-xs">Standardize Text Case</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Enforce uniform casing matching Sentence Case or uppercase country codes.</p>
                </div>
              </button>

              {/* Conditional Column Splitter Accordion */}
              <div className={`rounded-xl border transition-all ${
                isSplitterOpen 
                  ? 'border-blue-500/40 bg-blue-500/5 shadow-xs' 
                  : 'hover:bg-blue-500/5 hover:border-blue-500/30 border-slate-800/80 bg-slate-950/60'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsSplitterOpen(!isSplitterOpen);
                    setIsValidationOpen(false);
                  }}
                  disabled={isViewer}
                  className="w-full p-4 text-left flex gap-3.5 items-start cursor-pointer group disabled:opacity-50"
                >
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg group-hover:bg-blue-500/20">
                    <Columns className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs">Conditional Column Splitter</h4>
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isSplitterOpen ? 'rotate-90 text-blue-400' : ''}`} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Divide a column into multiple sub-columns using delimiter rules conditionally.</p>
                  </div>
                </button>

                {isSplitterOpen && (
                  <div className={`p-4 border-t px-5 space-y-4 text-xs ${isDarkMode ? 'border-slate-800/80 text-slate-200' : 'border-slate-150 text-slate-700'}`}>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Column</label>
                      <select
                        value={splitColumn}
                        onChange={(e) => setSplitColumn(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                        }`}
                      >
                        <option value="">-- Select Column --</option>
                        {currentHeaders.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Split Delimiter</label>
                        <select
                          value={splitDelimiter}
                          onChange={(e) => setSplitDelimiter(e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                          }`}
                        >
                          <option value="space">Space (" ")</option>
                          <option value="comma">Comma (",")</option>
                          <option value="dash">Dash ("-")</option>
                          <option value="slash">Slash ("/")</option>
                          <option value="semicolon">Semicolon (";")</option>
                          <option value="custom">Custom Text...</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Condition</label>
                        <select
                          value={splitCondition}
                          onChange={(e) => setSplitCondition(e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                          }`}
                        >
                          <option value="always">Always Split</option>
                          <option value="contains">If Delimiter Exists</option>
                        </select>
                      </div>
                    </div>

                    {splitDelimiter === 'custom' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Delimiter Character(s)</label>
                        <input
                          type="text"
                          value={customDelimiter}
                          onChange={(e) => setCustomDelimiter(e.target.value)}
                          placeholder="e.g. @@ or |"
                          className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                          }`}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Column Names (Comma separated)</label>
                      <input
                        type="text"
                        value={splitColNames}
                        onChange={(e) => setSplitColNames(e.target.value)}
                        placeholder="e.g. First Name, Last Name (Optional)"
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                        }`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={runColumnSplitter}
                      disabled={!splitColumn}
                      className={`w-full py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md ${accentClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Execute Column Split
                    </button>
                  </div>
                )}
              </div>

              {/* Column Validation Engine Accordion */}
              <div className={`rounded-xl border transition-all ${
                isValidationOpen 
                  ? 'border-emerald-500/40 bg-emerald-500/5 shadow-xs' 
                  : 'hover:bg-emerald-500/5 hover:border-emerald-500/30 border-slate-800/80 bg-slate-950/60'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsValidationOpen(!isValidationOpen);
                    setIsSplitterOpen(false);
                  }}
                  disabled={isViewer}
                  className="w-full p-4 text-left flex gap-3.5 items-start cursor-pointer group disabled:opacity-50"
                >
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg group-hover:bg-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs">Smart Validation Engine</h4>
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isValidationOpen ? 'rotate-90 text-emerald-400' : ''}`} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Establish field assertions, flag formatting violations, or auto-coerce raw anomalies.</p>
                  </div>
                </button>

                {isValidationOpen && (
                  <div className={`p-4 border-t px-5 space-y-4 text-xs ${isDarkMode ? 'border-slate-800/80 text-slate-200' : 'border-slate-150 text-slate-700'}`}>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Column</label>
                      <select
                        value={validateColumn}
                        onChange={(e) => setValidateColumn(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                        }`}
                      >
                        <option value="">-- Select Column --</option>
                        {currentHeaders.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Validation Rule Assertion</label>
                      <select
                        value={validationRule}
                        onChange={(e) => setValidationRule(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                        }`}
                      >
                        <option value="email">Valid Email Format</option>
                        <option value="numeric">Numeric Range Constraint</option>
                        <option value="length">Text Length Boundaries</option>
                        <option value="required">Non-Empty (Required Field)</option>
                        <option value="substring">Must Contain Substring</option>
                      </select>
                    </div>

                    {validationRule === 'numeric' && (
                      <div className="grid grid-cols-2 gap-3 animate-slideDown">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 block">Min Value</label>
                          <input
                            type="number"
                            value={minVal}
                            onChange={(e) => setMinVal(e.target.value)}
                            placeholder="-Infinity"
                            className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                            }`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 block">Max Value</label>
                          <input
                            type="number"
                            value={maxVal}
                            onChange={(e) => setMaxVal(e.target.value)}
                            placeholder="Infinity"
                            className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {validationRule === 'length' && (
                      <div className="grid grid-cols-2 gap-3 animate-slideDown">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 block">Min Characters</label>
                          <input
                            type="number"
                            value={minLen}
                            onChange={(e) => setMinLen(e.target.value)}
                            placeholder="0"
                            className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                            }`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 block">Max Characters</label>
                          <input
                            type="number"
                            value={maxLen}
                            onChange={(e) => setMaxLen(e.target.value)}
                            placeholder="Infinity"
                            className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {validationRule === 'substring' && (
                      <div className="space-y-1.5 animate-slideDown">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Substring Search Value</label>
                        <input
                          type="text"
                          value={customSubstring}
                          onChange={(e) => setCustomSubstring(e.target.value)}
                          placeholder="e.g. USD, invoice, @company.com"
                          className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                          }`}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">If Assertion Fails</label>
                        <select
                          value={validationFailAction}
                          onChange={(e) => setValidationFailAction(e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                          }`}
                        >
                          <option value="flag">Flag Issue & Report</option>
                          <option value="nullify">Nullify/Clear Value</option>
                          <option value="fallback">Replace with Fallback</option>
                        </select>
                      </div>

                      {validationFailAction === 'fallback' ? (
                        <div className="space-y-1.5 animate-slideDown">
                          <label className="text-[10px] font-bold text-slate-400 block">Fallback Value</label>
                          <input
                            type="text"
                            value={validationFallback}
                            onChange={(e) => setValidationFallback(e.target.value)}
                            placeholder="e.g. N/A or 0.00"
                            className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                            }`}
                          />
                        </div>
                      ) : (
                        <div className="flex items-end justify-center pb-1">
                          <span className="text-[10px] text-slate-400 leading-relaxed font-mono italic">
                            {validationFailAction === 'flag' ? 'Raises audit logs' : 'Clears messy cell'}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={runValidationRule}
                      disabled={!validateColumn}
                      className={`w-full py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md ${accentClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Execute Validation Audit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Change log stack */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">Applied Change Log</h3>
            {appliedSteps.length === 0 ? (
              <p className="text-[10px] text-slate-400 leading-relaxed italic text-center py-4">No cleanup routines have been applied to this worksheet yet.</p>
            ) : (
              <div className="space-y-3 font-mono text-[10px]">
                {appliedSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-2 items-start text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Before vs After Comparison table */}
        <div className="lg:col-span-8 space-y-6">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <div>
                <h3 className="font-bold text-base">Live Dataset Preview</h3>
                <p className="text-xs text-slate-400 mt-0.5">Rows updated with active rules are highlighted in yellow/green.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  id="btn-download-csv"
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:shadow-xs'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  id="btn-print-cleaned-csv"
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:shadow-xs'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5 text-blue-500" />
                  Print Cleaned Sheet
                </button>
                <span className={`text-[10px] px-2.5 py-2 rounded font-bold uppercase tracking-wider ${isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                  {currentRows.length} Rows remaining
                </span>
              </div>
            </div>

            {/* Responsive Comparison Table Container */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[420px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    <th className="p-3.5 font-bold font-mono">Row</th>
                    {currentHeaders.map((header) => (
                      <th key={header} className="p-3.5 font-bold">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {currentRows.map((row, rIdx) => {
                    // Check if entire row was deduplicated/matches a duplicate row
                    const isDup = activeFile.issues.some(i => i.type === 'duplicate' && i.row === rIdx + 2);
                    
                    return (
                      <tr 
                        key={rIdx} 
                        className={`transition-colors hover:bg-slate-800/10 ${isDup ? 'opacity-70 border-l-2 border-rose-500 bg-rose-500/5' : ''}`}
                      >
                        <td className="p-3 text-slate-500">{rIdx + 2}</td>
                        {currentHeaders.map((col) => {
                          const val = row[col] || '';
                          const isModified = isValueModified(rIdx, col, val);
                          const isFilledVal = isModified && val === 'Uncategorized' || val === '0.00';

                          return (
                            <td 
                              key={col} 
                              className={`p-3 truncate max-w-[150px] ${isFilledVal ? 'text-emerald-400 font-bold bg-emerald-500/5' : isModified ? 'text-amber-400 font-bold bg-amber-500/5' : ''}`}
                            >
                              {val === '' ? <span className="text-rose-500/40 italic">empty</span> : val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action guide */}
            <div className="mt-4 flex justify-between items-center text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> Highlighting is relative to initial ingestion.</span>
              <button onClick={() => onNavigate('results')} className="text-blue-500 font-bold hover:underline">
                Return to Audit results
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print & Compliance Export Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">Print & Compliance Export Workbench</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customize layouts, select target columns, and compile audit records.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Two-column layout (Settings & Live Preview) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
              
              {/* Left Panel: Settings Options */}
              <div className={`w-full md:w-[380px] p-5 overflow-y-auto border-r flex flex-col gap-5 ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                
                {/* Setting: Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Report Document Title</label>
                  <input
                    type="text"
                    value={printTitle}
                    onChange={(e) => setPrintTitle(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 border text-slate-200' : 'bg-slate-50 border-slate-200 border text-slate-800'
                    }`}
                    placeholder="Enter report title..."
                  />
                </div>

                {/* Setting: Orientation & Theme in a row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Page Orientation</label>
                    <select
                      value={printOrientation}
                      onChange={(e: any) => setPrintOrientation(e.target.value)}
                      className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 border text-slate-200' : 'bg-slate-50 border-slate-200 border text-slate-800'
                      }`}
                    >
                      <option value="landscape">Landscape ↔</option>
                      <option value="portrait">Portrait ↕</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Visual Theme</label>
                    <select
                      value={printTheme}
                      onChange={(e: any) => setPrintTheme(e.target.value)}
                      className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 border text-slate-200' : 'bg-slate-50 border-slate-200 border text-slate-800'
                      }`}
                    >
                      <option value="classic">Classic Clean</option>
                      <option value="emerald">Emerald Ledger</option>
                      <option value="minimalist">Minimalist Dark</option>
                    </select>
                  </div>
                </div>

                {/* Setting: Row Filters & Limits */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Filter Row Scope</label>
                    <select
                      value={printRowsFilter}
                      onChange={(e: any) => setPrintRowsFilter(e.target.value)}
                      className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 border text-slate-200' : 'bg-slate-50 border-slate-200 border text-slate-800'
                      }`}
                    >
                      <option value="all">All Rows</option>
                      <option value="modified">Only Modified</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Rows Count Limit</label>
                    <select
                      value={printLimit}
                      onChange={(e) => setPrintLimit(Number(e.target.value))}
                      className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 border text-slate-200' : 'bg-slate-50 border-slate-200 border text-slate-800'
                      }`}
                    >
                      <option value={10}>Top 10 rows</option>
                      <option value={25}>Top 25 rows</option>
                      <option value={50}>Top 50 rows</option>
                      <option value={100}>Top 100 rows</option>
                      <option value={1000}>All rows</option>
                    </select>
                  </div>
                </div>

                {/* Column Selector checkboxes */}
                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <Columns className="w-3.5 h-3.5" /> Target Columns ({selectedPrintColumns.length})
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPrintColumns(currentHeaders)}
                        className="text-[9px] font-extrabold text-blue-500 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-[9px] text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPrintColumns([currentHeaders[0] || ''])}
                        className="text-[9px] font-extrabold text-rose-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  
                  <div className={`flex-1 overflow-y-auto p-2 rounded-xl border text-[11px] font-medium space-y-1.5 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {currentHeaders.map(header => {
                      const isChecked = selectedPrintColumns.includes(header);
                      return (
                        <label
                          key={header}
                          className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                            isChecked 
                              ? isDarkMode ? 'bg-slate-800/40 text-slate-200' : 'bg-white text-slate-800 shadow-xs'
                              : 'text-slate-400 hover:bg-slate-800/20'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedPrintColumns(prev => prev.filter(h => h !== header));
                              } else {
                                setSelectedPrintColumns(prev => [...prev, header]);
                              }
                            }}
                            className="rounded text-blue-500 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-mono truncate">{header}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right Panel: Live Sheet Preview */}
              <div className={`flex-1 p-6 overflow-y-auto flex flex-col gap-4 ${
                isDarkMode ? 'bg-slate-950/40' : 'bg-slate-100/60'
              }`}>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Print Preview Sheet View</span>
                
                <div className={`p-6 rounded-2xl shadow-md border overflow-x-auto ${
                  printTheme === 'minimalist' 
                    ? 'bg-slate-950 border-slate-800 text-slate-300' 
                    : printTheme === 'emerald'
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-200'
                      : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                }`}>
                  
                  {/* Document Title header block */}
                  <div className={`border-b pb-4 mb-5 ${
                    printTheme === 'emerald' ? 'border-emerald-500/30' : printTheme === 'minimalist' ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <h4 className={`text-base font-extrabold ${printTheme === 'minimalist' ? 'text-white' : 'text-slate-950 dark:text-slate-100'}`}>{printTitle}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Cleaned & Transformed Dataset Report</p>
                    
                    {/* Micro Metadata block */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-[9px]">
                      <div>
                        <span className="text-slate-400 block font-bold uppercase tracking-wider">FILE</span>
                        <span className="font-bold truncate max-w-full block text-slate-600 dark:text-slate-300">{activeFile.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold uppercase tracking-wider">QUALITY INDEX</span>
                        <span className="font-bold text-emerald-500">{activeFile.score}% Compliance</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold uppercase tracking-wider">RECORDS</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">{Math.min(printLimit, currentRows.length)} Row(s)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold uppercase tracking-wider">ORIENTATION</span>
                        <span className="font-bold capitalize text-slate-600 dark:text-slate-300">{printOrientation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Table Preview */}
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800/80">
                    <table className="w-full text-[10px] text-left border-collapse">
                      <thead>
                        <tr className={`border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40`}>
                          <th className="p-2 font-bold text-slate-400 text-center w-10">Row</th>
                          {selectedPrintColumns.map(h => (
                            <th key={h} className="p-2 font-bold text-slate-500 dark:text-slate-400 font-mono">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                        {currentRows
                          .filter((_, rIdx) => {
                            if (printRowsFilter === 'modified') {
                              return selectedPrintColumns.some(col => isValueModified(rIdx, col, currentRows[rIdx][col]));
                            }
                            return true;
                          })
                          .slice(0, Math.min(10, printLimit)) // Limit preview to top 10 for render speed
                          .map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td className="p-2 text-center text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/20">{rIdx + 2}</td>
                              {selectedPrintColumns.map(col => {
                                const val = row[col] || '';
                                const isModified = isValueModified(rIdx, col, val);
                                const isImputed = isModified && (val === 'Uncategorized' || val === '0.00');
                                
                                let cellBg = '';
                                if (isImputed) {
                                  cellBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold';
                                } else if (isModified) {
                                  cellBg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold';
                                }

                                return (
                                  <td key={col} className={`p-2 font-mono whitespace-nowrap ${cellBg}`}>
                                    {val === '' ? <span className="text-rose-500 italic opacity-60">empty</span> : val}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        {currentRows.length > 10 && printLimit > 10 && (
                          <tr>
                            <td colSpan={selectedPrintColumns.length + 1} className="p-2 text-center text-[9px] text-slate-400 italic bg-slate-50/20">
                              ... and {Math.min(printLimit, currentRows.length) - 10} more rows compiled for document output
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend Block */}
                  <div className="flex gap-4 mt-4 text-[9px] text-slate-400 font-semibold justify-end">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-amber-500/10 border border-amber-500/30"></span>
                      <span>Modified Cell</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500/10 border border-emerald-500/30"></span>
                      <span>Imputed / Restructured Cell</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Footer actions */}
            <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-[10px] text-slate-400 text-center sm:text-left">
                <span>💡 <strong>Sandbox Tip:</strong> If print blocks inside AI Studio preview, open the app in a new tab to download/print.</span>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompiledPrint}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer ${accentClass}`}
                >
                  <Printer className="w-4 h-4" />
                  Compile & Print Report
                </button>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </div>
  );
}
