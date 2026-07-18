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
  Download,
  Check,
  Play,
  Loader2,
  Database,
  ArrowRight,
  Shield,
  SlidersHorizontal,
  AlertCircle
} from 'lucide-react';
import { CSVFile, AuditIssue } from '../types';
import RegexBuilder from './RegexBuilder';

interface CleaningCenterProps {
  activeFile: CSVFile | null;
  files?: CSVFile[];
  onUpdateFile: (updatedFile: CSVFile) => void;
  onUpdateFiles?: (updatedFiles: CSVFile[]) => void;
  onNavigate: (tab: string) => void;
  isDarkMode: boolean;
  accentClass: string;
  userRole: string; // To enforce viewer restriction
}

export default function CleaningCenter({ 
  activeFile, 
  files = [], 
  onUpdateFile, 
  onUpdateFiles, 
  onNavigate, 
  isDarkMode, 
  accentClass, 
  userRole 
}: CleaningCenterProps) {
  const isViewer = userRole === 'Viewer';
  
  // Batch processing state
  const [cleaningMode, setCleaningMode] = useState<'single' | 'batch'>(activeFile ? 'single' : 'batch');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedRoutines, setSelectedRoutines] = useState<string[]>(['dedup', 'standardizeDates', 'fillMissing']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [batchResult, setBatchResult] = useState<{
    success: boolean;
    filesReport: {
      id: string;
      name: string;
      originalScore: number;
      newScore: number;
      originalRows: number;
      newRows: number;
      issuesSolved: number;
    }[];
  } | null>(null);

  // Search/filter state inside batch / selection view
  const [batchSearch, setBatchSearch] = useState('');

  // History state for Undo/Redo
  const [history, setHistory] = useState<Record<string, string>[][]>(activeFile ? [activeFile.rows] : []);
  const [headersHistory, setHeadersHistory] = useState<string[][]>(activeFile ? [activeFile.headers] : []);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [appliedSteps, setAppliedSteps] = useState<string[]>([]);

  // Pagination State for Large Datasets
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

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

  // Pattern Recognition & Sanitization Engine State
  const [isPatternOpen, setIsPatternOpen] = useState(false);
  const [patternColumn, setPatternColumn] = useState('');
  const [patternPreset, setPatternPreset] = useState('email');
  const [customRegex, setCustomRegex] = useState('');
  const [showValidationRegexBuilder, setShowValidationRegexBuilder] = useState(false);
  const [showPatternRegexBuilder, setShowPatternRegexBuilder] = useState(false);
  const [patternAction, setPatternAction] = useState('remove'); // 'remove', 'extract', 'split'
  const [newColName, setNewColName] = useState('');

  // Print Modal Configuration State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTitle, setPrintTitle] = useState(activeFile ? `CSV Auditor Report: ${activeFile.name}` : 'CSV Auditor Report');
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [printRowsFilter, setPrintRowsFilter] = useState<'all' | 'modified'>('all');
  const [printTheme, setPrintTheme] = useState<'classic' | 'emerald' | 'minimalist'>('classic');
  const [selectedPrintColumns, setSelectedPrintColumns] = useState<string[]>(activeFile ? activeFile.headers : []);
  const [printLimit, setPrintLimit] = useState<number>(50);

  const currentRows = activeFile ? (history[historyIndex] || activeFile.rows) : [];
  const currentHeaders = activeFile ? (headersHistory[historyIndex] || activeFile.headers) : [];

  // Sync state and clean history upon activating a different file
  useEffect(() => {
    if (activeFile) {
      setHistory([activeFile.rows]);
      setHeadersHistory([activeFile.headers]);
      setHistoryIndex(0);
      setAppliedSteps([]);
      setSelectedPrintColumns(activeFile.headers);
      setPrintTitle(`CSV Auditor Report: ${activeFile.name}`);
      setCurrentPage(1);
      setCleaningMode('single');
    }
  }, [activeFile?.id]);

  const handleRunBatchClean = async () => {
    if (selectedFileIds.length === 0) return;
    if (selectedRoutines.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStep("Initializing batch processing engine...");
    setBatchResult(null);

    await new Promise(resolve => setTimeout(resolve, 800));

    const selectedFiles = files.filter(f => selectedFileIds.includes(f.id) && f.status === 'completed');
    const updatedFilesList: CSVFile[] = [];
    const reportList: any[] = [];
    const progressStepSize = 100 / selectedFiles.length;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setProcessingStep(`Acquiring read lock on "${file.name}"...`);
      await new Promise(resolve => setTimeout(resolve, 400));

      let currentRowsList = [...(file.cleanedRows || file.rows)];
      let issues = [...file.issues];

      if (selectedRoutines.includes('dedup')) {
        setProcessingStep(`Deduplicating rows inside "${file.name}"...`);
        await new Promise(resolve => setTimeout(resolve, 350));
        const seen = new Set<string>();
        const unique = currentRowsList.filter(row => {
          const key = row.Transaction_ID || JSON.stringify(row);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const removed = currentRowsList.length - unique.length;
        currentRowsList = unique;
        issues = issues.filter(issue => issue.type !== 'duplicate');
      }

      if (selectedRoutines.includes('standardizeDates')) {
        setProcessingStep(`Standardizing date formats inside "${file.name}"...`);
        await new Promise(resolve => setTimeout(resolve, 350));
        const dateFormats = file.detectedMetadata?.dateFormats || {};
        currentRowsList = currentRowsList.map(row => {
          const updated = { ...row };
          file.headers.forEach(col => {
            const fmt = dateFormats[col];
            if (fmt || col.toLowerCase().includes('date')) {
              const raw = (row[col] || '').trim();
              if (!raw) return;
              if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;

              let parts: string[] = [];
              if (raw.includes('/')) parts = raw.split('/');
              else if (raw.includes('-')) parts = raw.split('-');
              else if (raw.includes('.')) parts = raw.split('.');

              if (parts.length === 3) {
                let year = '';
                let month = '';
                let day = '';
                const formatStr = fmt || 'MM/DD/YYYY';
                const upperFmt = formatStr.toUpperCase();

                if (upperFmt.startsWith('YYYY')) {
                  year = parts[0]; month = parts[1]; day = parts[2];
                } else if (upperFmt.startsWith('DD')) {
                  day = parts[0]; month = parts[1]; year = parts[2];
                } else if (upperFmt.startsWith('MM')) {
                  month = parts[0]; day = parts[1]; year = parts[2];
                } else {
                  const p0 = parseInt(parts[0]);
                  const p1 = parseInt(parts[1]);
                  year = parts[2];
                  if (p0 > 12) {
                    day = parts[0]; month = parts[1];
                  } else if (p1 > 12) {
                    day = parts[1]; month = parts[0];
                  } else {
                    month = parts[0]; day = parts[1];
                  }
                }

                if (year.length === 2) {
                  const yrNum = parseInt(year);
                  year = yrNum > 50 ? `19${year}` : `20${year}`;
                }

                if (year && month && day) {
                  updated[col] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
              }
            }
          });
          return updated;
        });
        issues = issues.filter(issue => !(issue.type === 'invalid_format' && (issue.column.toLowerCase().includes('date') || dateFormats[issue.column])));
      }

      if (selectedRoutines.includes('fillMissing')) {
        setProcessingStep(`Imputing missing values inside "${file.name}"...`);
        await new Promise(resolve => setTimeout(resolve, 350));
        currentRowsList = currentRowsList.map(row => {
          const updated = { ...row };
          Object.keys(updated).forEach(key => {
            if (updated[key] === '' || updated[key] === undefined) {
              if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('price') || key.toLowerCase().includes('pay')) {
                updated[key] = '0.00';
              } else {
                updated[key] = 'Uncategorized';
              }
            }
          });
          return updated;
        });
        issues = issues.filter(issue => issue.type !== 'missing_value');
      }

      if (selectedRoutines.includes('correctCasing')) {
        setProcessingStep(`Standardizing capitalization inside "${file.name}"...`);
        await new Promise(resolve => setTimeout(resolve, 300));
        currentRowsList = currentRowsList.map(row => {
          const updated = { ...row };
          if (updated.Category) {
            updated.Category = updated.Category.charAt(0).toUpperCase() + updated.Category.slice(1).toLowerCase();
          }
          if (updated.Country && updated.Country.length === 2) {
            updated.Country = updated.Country.toUpperCase();
          }
          return updated;
        });
      }

      const originalIssuesCount = file.issues.length;
      const solvedIssuesCount = originalIssuesCount - issues.length;
      const originalScore = file.score;
      const newScore = Math.min(100, Math.max(0, originalScore + (solvedIssuesCount * 8) + (selectedRoutines.includes('correctCasing') ? 5 : 0)));

      const updatedFile: CSVFile = {
        ...file,
        cleanedRows: currentRowsList,
        issues: issues,
        score: newScore,
        status: 'completed'
      };

      updatedFilesList.push(updatedFile);
      reportList.push({
        id: file.id,
        name: file.name,
        originalScore,
        newScore,
        originalRows: file.rows.length,
        newRows: currentRowsList.length,
        issuesSolved: solvedIssuesCount
      });

      setProcessingProgress(Math.round((i + 1) * progressStepSize));
    }

    setProcessingStep("Persisting cleaned datasets to database core...");
    await new Promise(resolve => setTimeout(resolve, 500));

    if (onUpdateFiles) {
      await onUpdateFiles(updatedFilesList);
    }

    setBatchResult({
      success: true,
      filesReport: reportList
    });
    setIsProcessing(false);
  };

  const handleDownloadSingleBatchFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const headersList = file.headers;
    const rowsList = file.cleanedRows || file.rows;

    const headersRow = headersList.map(h => {
      const escaped = h.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');

    const rowsData = rowsList.map(row => {
      return headersList.map(header => {
        const value = row[header] !== undefined ? String(row[header]) : '';
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    });

    const csvContent = [headersRow, ...rowsData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const baseName = file.name.replace(/\.csv$/i, '');
    link.setAttribute('download', `${baseName}_cleaned_batch.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Switch modes check
  if (cleaningMode === 'batch') {
    const filteredFiles = files.filter(f => f.status === 'completed' && f.name.toLowerCase().includes(batchSearch.toLowerCase()));

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-blue-500" /> Hygiene Laboratory
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Batch Cleaning Engine</h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Select multiple uploaded files from the archive and run a cleaning routine across all of them simultaneously.
            </p>
          </div>

          <div className="flex rounded-xl p-1 bg-slate-950 border border-slate-800 w-fit">
            {activeFile && (
              <button
                onClick={() => setCleaningMode('single')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  cleaningMode === 'single'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Single File Hygiene
              </button>
            )}
            <button
              onClick={() => setCleaningMode('batch')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                cleaningMode === 'batch'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Batch Processing Engine
            </button>
          </div>
        </div>

        {/* Processing Loader Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className={`p-8 rounded-3xl border text-center max-w-md w-full space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                <span className="absolute text-xs font-bold font-mono text-slate-300">{processingProgress}%</span>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg">Processing Active Batch</h3>
                <p className="text-xs font-mono text-blue-400 animate-pulse">{processingStep}</p>
              </div>
              <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${processingProgress}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {/* main columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* File selector column */}
          <div className={`lg:col-span-7 p-6 rounded-3xl border space-y-6 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h3 className="font-bold text-base flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                Select Datasets to Clean ({selectedFileIds.length} chosen)
              </h3>

              <div className="flex gap-2 text-[10px] font-bold">
                <button
                  onClick={() => setSelectedFileIds(files.filter(f => f.status === 'completed').map(f => f.id))}
                  className="px-2.5 py-1 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-colors uppercase cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedFileIds([])}
                  className="px-2.5 py-1 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-colors uppercase cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search archived files..." 
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                className={`w-full pl-3 pr-4 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-950'}`}
              />
            </div>

            {/* list */}
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                <FileSpreadsheet className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No matching archived datasets found.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-2">
                {filteredFiles.map(file => {
                  const isChecked = selectedFileIds.includes(file.id);
                  return (
                    <div 
                      key={file.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedFileIds(prev => prev.filter(id => id !== file.id));
                        } else {
                          setSelectedFileIds(prev => [...prev, file.id]);
                        }
                      }}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all hover:scale-[1.01] ${
                        isChecked 
                          ? (isDarkMode ? 'bg-blue-500/10 border-blue-500/50' : 'bg-blue-50 border-blue-200')
                          : (isDarkMode ? 'bg-slate-950 border-slate-850 hover:bg-slate-900' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50')
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-700'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold truncate max-w-[220px]">{file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono font-bold">
                            <span>
                              {file.size > 1024 * 1024 
                                ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
                                : `${(file.size / 1024).toFixed(1)} KB`}
                            </span>
                            <span>•</span>
                            <span>{file.rows.length} rows</span>
                            <span>•</span>
                            <span>Rating: {file.score}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {file.issues.length > 0 ? (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase">
                            {file.issues.length} issues
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
                            Clean
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Configurations column */}
          <div className="lg:col-span-5 space-y-6">
            <div className={`p-6 rounded-3xl border space-y-6 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Configure Cleaning Protocols
              </h3>

              <div className="space-y-3">
                {[
                  { id: 'dedup', label: 'Deduplicate Records', desc: 'Identify and remove redundant transaction rows automatically.' },
                  { id: 'standardizeDates', label: 'Standardize Dates (ISO-8601)', desc: 'Standardize inconsistent dates to YYYY-MM-DD.' },
                  { id: 'fillMissing', label: 'Impute Missing Values', desc: 'Fill blank cells with zero for currency or "Uncategorized" text.' },
                  { id: 'correctCasing', label: 'Standardize Text Capitalization', desc: 'Auto-correct casing on Categories and Country Codes.' }
                ].map(routine => {
                  const isChecked = selectedRoutines.includes(routine.id);
                  return (
                    <div 
                      key={routine.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedRoutines(prev => prev.filter(id => id !== routine.id));
                        } else {
                          setSelectedRoutines(prev => [...prev, routine.id]);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                        isChecked 
                          ? (isDarkMode ? 'bg-slate-950 border-emerald-500/40' : 'bg-slate-50 border-emerald-200')
                          : (isDarkMode ? 'bg-slate-950/40 border-slate-850 hover:bg-slate-900' : 'bg-white border-slate-100 hover:bg-slate-50')
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                          isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{routine.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{routine.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isViewer && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex gap-2.5 text-xs text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="leading-tight">Viewer status detected. Batch execution protocol is write-protected for your role.</p>
                </div>
              )}

              <button
                onClick={handleRunBatchClean}
                disabled={isViewer || selectedFileIds.length === 0 || selectedRoutines.length === 0}
                className="w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-40 disabled:pointer-events-none hover:scale-[1.02] active:scale-[0.99] transition-all bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white"
              >
                <Play className="w-4 h-4 text-white fill-white" />
                Run Batch Clean Routine
              </button>
            </div>
          </div>
        </div>

        {/* Batch Report Results */}
        {batchResult && (
          <div className={`p-6 rounded-3xl border space-y-6 animate-fadeIn ${isDarkMode ? 'bg-slate-900/40 border-slate-800/80 shadow-2xl shadow-emerald-500/1' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Batch Job Execution Succeeded
                </span>
                <h3 className="text-lg font-extrabold mt-0.5">Executive Batch Processing Summary</h3>
              </div>
              <button 
                onClick={() => setBatchResult(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Files Cleaned</span>
                <p className="text-xl md:text-2xl font-black text-blue-500 mt-1">{batchResult.filesReport.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Rows Cleaned</span>
                <p className="text-xl md:text-2xl font-black text-blue-500 mt-1">
                  {batchResult.filesReport.reduce((sum, f) => sum + f.newRows, 0)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Issues Solved</span>
                <p className="text-xl md:text-2xl font-black text-emerald-400 mt-1">
                  {batchResult.filesReport.reduce((sum, f) => sum + f.issuesSolved, 0)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Average Score Boost</span>
                <p className="text-xl md:text-2xl font-black text-emerald-400 mt-1">
                  +{(batchResult.filesReport.reduce((sum, f) => sum + (f.newScore - f.originalScore), 0) / batchResult.filesReport.length).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Detailed per-file report list */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold font-mono text-[10px]">
                    <th className="p-4">File Name</th>
                    <th className="p-4 text-center">Rows Cleaned</th>
                    <th className="p-4 text-center">Audit Quality Improvement</th>
                    <th className="p-4 text-center">Resolved Issues</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {batchResult.filesReport.map(report => (
                    <tr key={report.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="p-4 font-bold flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>{report.name}</span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-300">
                        {report.originalRows === report.newRows ? (
                          <span>{report.originalRows} rows</span>
                        ) : (
                          <span className="flex items-center justify-center gap-1.5">
                            <span className="line-through text-slate-500">{report.originalRows}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>{report.newRows}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className="flex items-center justify-center gap-2">
                          <span className="text-slate-400 font-bold">{report.originalScore}%</span>
                          <ArrowRight className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-400 font-black font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {report.newScore}%
                          </span>
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {report.issuesSolved} resolved
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end items-center">
                          <button
                            onClick={() => {
                              const fileObj = files.find(f => f.id === report.id);
                              if (fileObj) {
                                onUpdateFile(fileObj); // Set active in App
                                setCleaningMode('single');
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold hover:scale-105 cursor-pointer transition-all ${
                              isDarkMode ? 'bg-slate-950 border-slate-850 text-blue-400 hover:bg-slate-900' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-100'
                            }`}
                          >
                            Single Mode
                          </button>
                          <button
                            onClick={() => handleDownloadSingleBatchFile(report.id)}
                            className={`p-1.5 rounded-lg border text-emerald-400 hover:scale-105 cursor-pointer transition-all ${
                              isDarkMode ? 'bg-slate-950 border-slate-850 hover:bg-slate-900' : 'bg-white border-slate-200 hover:bg-slate-100'
                            }`}
                            title="Download Cleaned CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active file check fallback
  if (!activeFile) {
    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-blue-500" /> Hygiene Laboratory
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Data Hygiene Lab</h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Select a single dataset to perform deep tactical sanitization, or launch the batch cleaning engine across multiple files simultaneously.
            </p>
          </div>

          <div className="flex rounded-xl p-1 bg-slate-950 border border-slate-800 w-fit">
            <button
              onClick={() => setCleaningMode('single')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                cleaningMode === 'single'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Single File Hygiene
            </button>
            <button
              onClick={() => setCleaningMode('batch')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                cleaningMode === 'batch'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Batch Processing Engine
            </button>
          </div>
        </div>

        {/* Empty selection layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Option A: Single File selection */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-6 ${isDarkMode ? 'bg-slate-900/30 border-slate-800/80' : 'bg-white border-slate-200'}`}>
            <div className="space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-blue-500" />
              <h3 className="font-extrabold text-base">Launch Single-File Hygiene</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Load a single spreadsheet from your workspace archives below or upload a new spreadsheet to unlock column splitting, custom regex extraction, and manual quality overrides.
              </p>
            </div>

            {files.filter(f => f.status === 'completed').length === 0 ? (
              <button 
                onClick={() => onNavigate('upload')}
                className={`w-full py-3 text-xs font-bold uppercase rounded-xl text-white tracking-wider shadow cursor-pointer text-center ${accentClass}`}
              >
                Upload Spreadsheet
              </button>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {files.filter(f => f.status === 'completed').map(file => (
                  <div 
                    key={file.id}
                    onClick={() => {
                      onUpdateFile(file);
                      setCleaningMode('single');
                    }}
                    className={`p-2.5 rounded-xl border border-slate-800/60 hover:border-blue-500/50 bg-slate-950/60 hover:bg-slate-900/50 flex items-center justify-between cursor-pointer transition-all`}
                  >
                    <span className="text-xs font-bold truncate max-w-[180px]">{file.name}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{file.score}% rating</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Option B: Batch processing */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-6 ${isDarkMode ? 'bg-slate-900/30 border-slate-800/80' : 'bg-white border-slate-200'}`}>
            <div className="space-y-2">
              <Database className="w-10 h-10 text-emerald-500" />
              <h3 className="font-extrabold text-base">Batch Cleaning Processor</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect and clean multiple datasets from the archive workspace simultaneously. Run critical deduplication, standardized dates, and field imputations inside a parallel batch stream.
              </p>
            </div>

            <button
              onClick={() => {
                setCleaningMode('batch');
                setSelectedFileIds(files.filter(f => f.status === 'completed').map(f => f.id));
              }}
              className="w-full py-3 text-xs font-bold uppercase rounded-xl tracking-wider text-white shadow cursor-pointer text-center bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500"
            >
              Configure Batch Routine
            </button>
          </div>
        </div>
      </div>
    );
  }

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
    const dateFormats = activeFile?.detectedMetadata?.dateFormats || {};
    
    const cleaned = currentRows.map(row => {
      const updated = { ...row };
      
      currentHeaders.forEach(col => {
        const fmt = dateFormats[col];
        // If it's explicitly detected as a date column or header name contains "date"
        if (fmt || col.toLowerCase().includes('date')) {
          const raw = (row[col] || '').trim();
          if (!raw) return;
          
          // Try to standardize according to detected format, or fallback standardizing
          // If it is already in YYYY-MM-DD format, skip
          if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;
          
          let parts: string[] = [];
          if (raw.includes('/')) {
            parts = raw.split('/');
          } else if (raw.includes('-')) {
            parts = raw.split('-');
          } else if (raw.includes('.')) {
            parts = raw.split('.');
          }
          
          if (parts.length === 3) {
            let year = '';
            let month = '';
            let day = '';
            
            // If we have a detected format, let's use it to guide parsing!
            const formatStr = fmt || 'MM/DD/YYYY';
            const upperFmt = formatStr.toUpperCase();
            
            if (upperFmt.startsWith('YYYY')) {
              year = parts[0];
              month = parts[1];
              day = parts[2];
            } else if (upperFmt.startsWith('DD')) {
              day = parts[0];
              month = parts[1];
              year = parts[2];
            } else if (upperFmt.startsWith('MM')) {
              month = parts[0];
              day = parts[1];
              year = parts[2];
            } else {
              // Fallback default logic if unknown format
              const p0 = parseInt(parts[0]);
              const p1 = parseInt(parts[1]);
              year = parts[2];
              if (p0 > 12) {
                day = parts[0];
                month = parts[1];
              } else if (p1 > 12) {
                day = parts[1];
                month = parts[0];
              } else {
                month = parts[0];
                day = parts[1];
              }
            }
            
            // Standardize length of year
            if (year.length === 2) {
              const yrNum = parseInt(year);
              year = yrNum > 50 ? `19${year}` : `20${year}`;
            }
            
            if (year && month && day) {
              const mm = month.padStart(2, '0');
              const dd = day.padStart(2, '0');
              updated[col] = `${year}-${mm}-${dd}`;
            }
          }
        }
      });
      return updated;
    });
    pushState(cleaned, "Standardized date formats to ISO YYYY-MM-DD using auto-detected metadata guidelines.");
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
      } else if (validationRule === 'regex') {
        try {
          const r = new RegExp(customRegex);
          isValid = r.test(val);
          failureMsg = `Value "${val}" does not match custom pattern /${customRegex}/`;
        } catch (err) {
          isValid = false;
          failureMsg = `Invalid regex pattern: /${customRegex}/`;
        }
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

  const runPatternSanitization = () => {
    if (!patternColumn) return;

    let regex: RegExp;
    let presetLabel = '';

    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phonePattern = /(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const digitPattern = /\d+/g;

    if (patternPreset === 'email') {
      regex = emailPattern;
      presetLabel = 'Email Addresses';
    } else if (patternPreset === 'phone') {
      regex = phonePattern;
      presetLabel = 'Phone Numbers';
    } else if (patternPreset === 'digits') {
      regex = digitPattern;
      presetLabel = 'Digits/Numbers';
    } else {
      try {
        regex = new RegExp(customRegex, 'g');
        presetLabel = `Custom Pattern (/${customRegex}/)`;
      } catch (err) {
        alert("Invalid custom regular expression pattern. Please check your syntax.");
        return;
      }
    }

    let modifiedCount = 0;
    const targetExtractCol = newColName.trim() || `${patternColumn}_extracted`;

    const cleaned = currentRows.map((row) => {
      const updated = { ...row };
      const val = (row[patternColumn] || '').trim();
      
      if (!val) {
        if (patternAction === 'split' || patternAction === 'extract') {
          updated[targetExtractCol] = '';
        }
        return updated;
      }

      const matches = val.match(regex);
      const matchedString = matches ? matches.join(', ') : '';

      if (patternAction === 'remove') {
        const remaining = val.replace(regex, '');
        const cleanedVal = remaining
          .replace(/\s+/g, ' ')
          .replace(/^\s*[,.;:/|-]\s*|\s*[,.;:/|-]\s*$/g, '')
          .replace(/\s*or\s*$/i, '')
          .replace(/\s*and\s*$/i, '')
          .trim();

        if (cleanedVal !== val) {
          modifiedCount++;
          updated[patternColumn] = cleanedVal;
        }
      } else if (patternAction === 'extract') {
        if (matchedString !== val) {
          modifiedCount++;
        }
        updated[patternColumn] = matchedString;
      } else if (patternAction === 'split') {
        const remaining = val.replace(regex, '');
        const cleanedVal = remaining
          .replace(/\s+/g, ' ')
          .replace(/^\s*[,.;:/|-]\s*|\s*[,.;:/|-]\s*$/g, '')
          .replace(/\s*or\s*$/i, '')
          .replace(/\s*and\s*$/i, '')
          .trim();

        if (matchedString || cleanedVal !== val) {
          modifiedCount++;
        }
        
        updated[patternColumn] = cleanedVal;
        updated[targetExtractCol] = matchedString;
      }

      return updated;
    });

    let updatedHeaders = [...currentHeaders];
    if (patternAction === 'split') {
      const colIndex = currentHeaders.indexOf(patternColumn);
      if (!currentHeaders.includes(targetExtractCol)) {
        if (colIndex !== -1) {
          updatedHeaders.splice(colIndex + 1, 0, targetExtractCol);
        } else {
          updatedHeaders.push(targetExtractCol);
        }
      }
    }

    let actionMsg = '';
    if (patternAction === 'remove') {
      actionMsg = `Removed recognized ${presetLabel} from column "${patternColumn}" (Sanitized ${modifiedCount} rows).`;
    } else if (patternAction === 'extract') {
      actionMsg = `Extracted/Isolated ${presetLabel} inside column "${patternColumn}" (Cleaned ${modifiedCount} rows).`;
    } else if (patternAction === 'split') {
      actionMsg = `Split & Sanitized "${patternColumn}": Removed ${presetLabel} and saved them to new column "${targetExtractCol}" (Processed ${modifiedCount} rows).`;
    }

    pushState(cleaned, actionMsg, updatedHeaders);

    if (patternAction === 'split') {
      setSelectedPrintColumns(prev => [...prev, targetExtractCol]);
    }

    setNewColName('');
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
      {/* Mode Toggle Tab */}
      <div className="flex rounded-xl p-1 bg-slate-950 border border-slate-800 w-fit">
        <button
          onClick={() => setCleaningMode('single')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            cleaningMode === 'single'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Single File Hygiene
        </button>
        <button
          onClick={() => setCleaningMode('batch')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            cleaningMode === 'batch'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Batch Processing Engine
        </button>
      </div>

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
                        <option value="regex">Custom Regex Pattern Match</option>
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

                    {validationRule === 'regex' && (
                      <div className="space-y-3 animate-slideDown">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Regex Match</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customRegex}
                              onChange={(e) => setCustomRegex(e.target.value)}
                              placeholder="e.g. [A-Z]{3}-\d{4}"
                              className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowValidationRegexBuilder(!showValidationRegexBuilder)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-1 shadow-sm`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                              {showValidationRegexBuilder ? 'Close Builder' : 'Build Visually'}
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-400">Specify regex body without slashes or flags (e.g., matching codes, IDs, formats).</p>
                        </div>

                        {showValidationRegexBuilder && (
                          <div className="pt-2">
                            <RegexBuilder
                              initialRegex={customRegex}
                              onSavePattern={(pattern) => {
                                setCustomRegex(pattern);
                                setShowValidationRegexBuilder(false);
                              }}
                              onClose={() => setShowValidationRegexBuilder(false)}
                              isDarkMode={isDarkMode}
                            />
                          </div>
                        )}
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
                      disabled={!validateColumn || (validationRule === 'regex' && !customRegex)}
                      className={`w-full py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md ${accentClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Execute Validation Audit
                    </button>
                  </div>
                )}
              </div>

              {/* Pattern Recognition & Sanitization Engine Accordion */}
              <div className={`rounded-xl border transition-all ${
                isPatternOpen 
                  ? 'border-indigo-500/40 bg-indigo-500/5 shadow-xs' 
                  : 'hover:bg-indigo-500/5 hover:border-indigo-500/30 border-slate-800/80 bg-slate-950/60'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsPatternOpen(!isPatternOpen);
                    setIsValidationOpen(false);
                    setIsSplitterOpen(false);
                  }}
                  disabled={isViewer}
                  className="w-full p-4 text-left flex gap-3.5 items-start cursor-pointer group disabled:opacity-50"
                >
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs">Pattern Sanitization Engine</h4>
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isPatternOpen ? 'rotate-90 text-indigo-400' : ''}`} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Recognize nested patterns (Emails, Phones, Custom Regex) and isolate or split them into clean streams.</p>
                  </div>
                </button>

                {isPatternOpen && (
                  <div className={`p-4 border-t px-5 space-y-4 text-xs ${isDarkMode ? 'border-slate-800/80 text-slate-200' : 'border-slate-150 text-slate-700'}`}>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Column</label>
                      <select
                        value={patternColumn}
                        onChange={(e) => setPatternColumn(e.target.value)}
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
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pattern to Recognize</label>
                      <select
                        value={patternPreset}
                        onChange={(e) => setPatternPreset(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                        }`}
                      >
                        <option value="email">Email Addresses (Regex)</option>
                        <option value="phone">Phone Numbers (Regex)</option>
                        <option value="digits">Numeric Digits (0-9 Only)</option>
                        <option value="custom">Custom Regex Pattern...</option>
                      </select>
                    </div>

                    {patternPreset === 'custom' && (
                      <div className="space-y-3 animate-slideDown">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 block">Custom Regular Expression</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customRegex}
                              onChange={(e) => setCustomRegex(e.target.value)}
                              placeholder="e.g. [A-Z]{3}-\d{4}"
                              className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPatternRegexBuilder(!showPatternRegexBuilder)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-1 shadow-sm`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                              {showPatternRegexBuilder ? 'Close Builder' : 'Build Visually'}
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-400">Specify regex body without slashes or flags (e.g., matching codes or IDs).</p>
                        </div>

                        {showPatternRegexBuilder && (
                          <div className="pt-2">
                            <RegexBuilder
                              initialRegex={customRegex}
                              onSavePattern={(pattern) => {
                                setCustomRegex(pattern);
                                setShowPatternRegexBuilder(false);
                              }}
                              onClose={() => setShowPatternRegexBuilder(false)}
                              isDarkMode={isDarkMode}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sanitization Action</label>
                      <select
                        value={patternAction}
                        onChange={(e) => setPatternAction(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                        }`}
                      >
                        <option value="remove">Remove matched pattern (Keep remainder)</option>
                        <option value="extract">Isolate matched pattern (Discard remainder)</option>
                        <option value="split">Split stream (Move matched pattern to new column)</option>
                      </select>
                    </div>

                    {patternAction === 'split' && (
                      <div className="space-y-1.5 animate-slideDown">
                        <label className="text-[10px] font-bold text-slate-400 block">New Extraction Column Name</label>
                        <input
                          type="text"
                          value={newColName}
                          onChange={(e) => setNewColName(e.target.value)}
                          placeholder={patternColumn ? `${patternColumn}_extracted` : 'e.g. Extracted_Email'}
                          className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                          }`}
                        />
                        <p className="text-[9px] text-slate-400">This column will capture the matched strings. The original column will keep the residual text.</p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={runPatternSanitization}
                      disabled={!patternColumn || (patternPreset === 'custom' && !customRegex)}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Execute Pattern Sanitize
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
                  {currentRows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((row, relativeIdx) => {
                    const rIdx = (currentPage - 1) * pageSize + relativeIdx;
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
                          const isFilledVal = isModified && (val === 'Uncategorized' || val === '0.00');

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

            {/* Pagination Controls */}
            {currentRows.length > pageSize && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-slate-800/30 pt-4">
                <span className="text-slate-400 font-medium">
                  Showing <span className="font-mono text-blue-500 font-bold">{Math.min(currentRows.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
                  <span className="font-mono text-blue-500 font-bold">{Math.min(currentRows.length, currentPage * pageSize)}</span> of{' '}
                  <span className="font-mono text-blue-500 font-bold">{currentRows.length}</span> records
                  {activeFile.totalRowsCount && activeFile.totalRowsCount > activeFile.rows.length && (
                    <span className="text-[10px] text-amber-500 block sm:inline sm:ml-2 font-mono">
                      (Loaded active chunk; total {activeFile.totalRowsCount} rows)
                    </span>
                  )}
                </span>
                
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
                  >
                    « First
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
                  >
                    ‹ Prev
                  </button>
                  <span className="px-2.5 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold font-mono text-[10px]">
                    {currentPage} / {Math.ceil(currentRows.length / pageSize)}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= Math.ceil(currentRows.length / pageSize)}
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(currentRows.length / pageSize), prev + 1))}
                    className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
                  >
                    Next ›
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= Math.ceil(currentRows.length / pageSize)}
                    onClick={() => setCurrentPage(Math.ceil(currentRows.length / pageSize))}
                    className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
                  >
                    Last »
                  </button>
                </div>
              </div>
            )}

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
