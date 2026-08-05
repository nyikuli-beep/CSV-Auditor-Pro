import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Sparkles, 
  Loader2, 
  Download, 
  RefreshCw, 
  Check, 
  Search, 
  FileText, 
  Layers, 
  ShieldAlert, 
  Info, 
  ArrowRight,
  Filter,
  Trash2
} from 'lucide-react';
import { CSVFile, CustomValidationRule, AuditIssue } from '../types';
import { 
  validateSingleCSVFile, 
  validateRawCSVContent, 
  calculateScore 
} from '../lib/cleaning/batchValidationHelper';
import { validateFilePreFlight, checkUserUploadPermission, checkUploadRateLimit } from '../lib/csvSecurityValidator';
import { auth } from '../firebase';

export interface BatchFileStatusItem {
  id: string;
  name: string;
  size: number;
  status: 'queued' | 'validating' | 'valid' | 'issues_detected' | 'failed';
  rowsCount: number;
  score: number;
  issuesCount: number;
  criticalIssuesCount: number;
  warningIssuesCount: number;
  securityPassed: boolean;
  resultFile?: CSVFile;
  errorMsg?: string;
}

interface BatchValidationPanelProps {
  files: CSVFile[];
  onFileUpload: (updatedFile: CSVFile) => void;
  customRules: CustomValidationRule[];
  isDarkMode: boolean;
  accentClass: string;
  userRole?: string;
}

export default function BatchValidationPanel({
  files = [],
  onFileUpload,
  customRules = [],
  isDarkMode,
  accentClass,
  userRole
}: BatchValidationPanelProps) {
  // Selection state for workspace files
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(() => files.map(f => f.id));
  const [searchFilter, setSearchFilter] = useState('');
  
  // Directly queued raw files from dropzone
  const [queuedRawFiles, setQueuedRawFiles] = useState<File[]>([]);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const [batchDragActive, setBatchDragActive] = useState(false);

  // Execution & Progress State
  const [isValidating, setIsValidating] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStepMessage, setCurrentStepMessage] = useState('');
  const [currentProcessingFileName, setCurrentProcessingFileName] = useState('');
  const [batchItemStatuses, setBatchItemStatuses] = useState<BatchFileStatusItem[]>([]);

  // Executive Report State
  const [batchReport, setBatchReport] = useState<{
    totalFiles: number;
    totalRows: number;
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    cleanFilesCount: number;
    globalQualityScore: number;
    securityThreatsCount: number;
    completedItems: BatchFileStatusItem[];
  } | null>(null);

  const [validationError, setValidationError] = useState('');

  // Filter workspace files
  const filteredWorkspaceFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleToggleSelectAll = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(files.map(f => f.id));
    }
  };

  const handleToggleFile = (id: string) => {
    setSelectedFileIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => 
        f.name.endsWith('.csv') || f.type.includes('csv') || f.type.includes('spreadsheet')
      );
      if (droppedFiles.length > 0) {
        setQueuedRawFiles(prev => [...prev, ...droppedFiles]);
      }
    }
  };

  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFilesList = Array.from(e.target.files).filter(f => 
        f.name.endsWith('.csv') || f.type.includes('csv') || f.type.includes('spreadsheet')
      );
      if (selectedFilesList.length > 0) {
        setQueuedRawFiles(prev => [...prev, ...selectedFilesList]);
      }
    }
  };

  const handleRemoveQueuedRawFile = (index: number) => {
    setQueuedRawFiles(prev => prev.filter((_, i) => i !== index));
  };

  const runBatchValidation = async () => {
    setValidationError('');
    
    // Auth & Rate Check
    const authCheck = checkUserUploadPermission(auth?.currentUser);
    if (!authCheck.allowed) {
      setValidationError(authCheck.message || 'Please verify your email before running batch validations.');
      return;
    }

    const userId = auth?.currentUser?.uid || 'anonymous';
    const rateCheck = checkUploadRateLimit(userId);
    if (!rateCheck.allowed) {
      setValidationError(rateCheck.message || 'Rate limit reached. Please wait a moment before trying again.');
      return;
    }

    const selectedWorkspaceFiles = files.filter(f => selectedFileIds.includes(f.id));
    const totalTargetsCount = selectedWorkspaceFiles.length + queuedRawFiles.length;

    if (totalTargetsCount === 0) {
      setValidationError('Please select at least one workspace CSV file or upload raw files to validate.');
      return;
    }

    setIsValidating(true);
    setOverallProgress(0);
    setBatchReport(null);

    // Initial status items build
    const initialStatuses: BatchFileStatusItem[] = [
      ...selectedWorkspaceFiles.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        status: 'queued' as const,
        rowsCount: f.rows?.length || f.totalRowsCount || 0,
        score: f.score || 100,
        issuesCount: f.issues?.length || 0,
        criticalIssuesCount: f.issues?.filter(i => i.severity === 'critical')?.length || 0,
        warningIssuesCount: f.issues?.filter(i => i.severity === 'warning')?.length || 0,
        securityPassed: f.securityScanSummary?.scanPassed ?? true,
        resultFile: f
      })),
      ...queuedRawFiles.map((rf, idx) => ({
        id: `raw-queued-${Date.now()}-${idx}`,
        name: rf.name,
        size: rf.size,
        status: 'queued' as const,
        rowsCount: 0,
        score: 0,
        issuesCount: 0,
        criticalIssuesCount: 0,
        warningIssuesCount: 0,
        securityPassed: true
      }))
    ];

    setBatchItemStatuses(initialStatuses);

    const completedResults: BatchFileStatusItem[] = [];

    let processedCount = 0;

    // Phase 1: Validate Workspace Files
    for (let i = 0; i < selectedWorkspaceFiles.length; i++) {
      const fileToValidate = selectedWorkspaceFiles[i];
      const targetId = fileToValidate.id;

      setCurrentProcessingFileName(fileToValidate.name);
      setCurrentStepMessage(`Scanning workspace file ${i + 1} of ${totalTargetsCount}: "${fileToValidate.name}"`);

      // Update status to validating
      setBatchItemStatuses(prev => prev.map(item => 
        item.id === targetId ? { ...item, status: 'validating' } : item
      ));

      // Brief pause to give fluid progress animation
      await new Promise(r => setTimeout(r, 200));

      try {
        const validatedFile = validateSingleCSVFile(fileToValidate, customRules);
        onFileUpload(validatedFile);

        const criticalCount = validatedFile.issues.filter(issue => issue.severity === 'critical').length;
        const warningCount = validatedFile.issues.filter(issue => issue.severity === 'warning').length;
        const totalIssuesCount = validatedFile.issues.length;

        const updatedItem: BatchFileStatusItem = {
          id: targetId,
          name: validatedFile.name,
          size: validatedFile.size,
          status: totalIssuesCount === 0 ? 'valid' : 'issues_detected',
          rowsCount: validatedFile.rows.length,
          score: validatedFile.score,
          issuesCount: totalIssuesCount,
          criticalIssuesCount: criticalCount,
          warningIssuesCount: warningCount,
          securityPassed: validatedFile.securityScanSummary?.scanPassed ?? true,
          resultFile: validatedFile
        };

        completedResults.push(updatedItem);

        setBatchItemStatuses(prev => prev.map(item => item.id === targetId ? updatedItem : item));
      } catch (err: any) {
        const failedItem: BatchFileStatusItem = {
          id: targetId,
          name: fileToValidate.name,
          size: fileToValidate.size,
          status: 'failed',
          rowsCount: fileToValidate.rows?.length || 0,
          score: 0,
          issuesCount: 0,
          criticalIssuesCount: 0,
          warningIssuesCount: 0,
          securityPassed: false,
          errorMsg: err.message || 'Validation error'
        };
        completedResults.push(failedItem);
        setBatchItemStatuses(prev => prev.map(item => item.id === targetId ? failedItem : item));
      }

      processedCount++;
      setOverallProgress(Math.round((processedCount / totalTargetsCount) * 100));
    }

    // Phase 2: Validate Raw Uploaded Files
    for (let j = 0; j < queuedRawFiles.length; j++) {
      const rawFile = queuedRawFiles[j];
      const targetId = initialStatuses[selectedWorkspaceFiles.length + j].id;

      setCurrentProcessingFileName(rawFile.name);
      setCurrentStepMessage(`Reading & auditing dropped CSV ${selectedWorkspaceFiles.length + j + 1} of ${totalTargetsCount}: "${rawFile.name}"`);

      setBatchItemStatuses(prev => prev.map(item => 
        item.id === targetId ? { ...item, status: 'validating' } : item
      ));

      await new Promise(r => setTimeout(r, 200));

      try {
        const preFlight = validateFilePreFlight(rawFile);
        if (!preFlight.valid) {
          throw new Error(preFlight.errorMessage || 'Invalid file format or size limit exceeded.');
        }

        const rawText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || '');
          reader.onerror = () => reject(new Error('Failed to read file from disk.'));
          reader.readAsText(rawFile);
        });

        const validatedFile = validateRawCSVContent(rawText, rawFile.name, rawFile.size, customRules);
        onFileUpload(validatedFile);

        const criticalCount = validatedFile.issues.filter(issue => issue.severity === 'critical').length;
        const warningCount = validatedFile.issues.filter(issue => issue.severity === 'warning').length;
        const totalIssuesCount = validatedFile.issues.length;

        const updatedItem: BatchFileStatusItem = {
          id: targetId,
          name: validatedFile.name,
          size: validatedFile.size,
          status: totalIssuesCount === 0 ? 'valid' : 'issues_detected',
          rowsCount: validatedFile.rows.length,
          score: validatedFile.score,
          issuesCount: totalIssuesCount,
          criticalIssuesCount: criticalCount,
          warningIssuesCount: warningCount,
          securityPassed: validatedFile.securityScanSummary?.scanPassed ?? true,
          resultFile: validatedFile
        };

        completedResults.push(updatedItem);
        setBatchItemStatuses(prev => prev.map(item => item.id === targetId ? updatedItem : item));
      } catch (err: any) {
        const failedItem: BatchFileStatusItem = {
          id: targetId,
          name: rawFile.name,
          size: rawFile.size,
          status: 'failed',
          rowsCount: 0,
          score: 0,
          issuesCount: 0,
          criticalIssuesCount: 0,
          warningIssuesCount: 0,
          securityPassed: false,
          errorMsg: err.message || 'Validation error'
        };
        completedResults.push(failedItem);
        setBatchItemStatuses(prev => prev.map(item => item.id === targetId ? failedItem : item));
      }

      processedCount++;
      setOverallProgress(Math.round((processedCount / totalTargetsCount) * 100));
    }

    // Phase 3: Compile Executive Summary
    const totalRowsSum = completedResults.reduce((acc, item) => acc + item.rowsCount, 0);
    const totalIssuesSum = completedResults.reduce((acc, item) => acc + item.issuesCount, 0);
    const criticalIssuesSum = completedResults.reduce((acc, item) => acc + item.criticalIssuesCount, 0);
    const warningIssuesSum = completedResults.reduce((acc, item) => acc + item.warningIssuesCount, 0);
    const cleanCount = completedResults.filter(item => item.status === 'valid').length;
    
    const validScores = completedResults.filter(item => item.status !== 'failed').map(i => i.score);
    const avgScore = validScores.length > 0 
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
      : 0;

    const threatCount = completedResults.reduce((acc, item) => {
      const summary = item.resultFile?.securityScanSummary;
      return acc + (summary?.maliciousThreatsDetected || 0);
    }, 0);

    setBatchReport({
      totalFiles: completedResults.length,
      totalRows: totalRowsSum,
      totalIssues: totalIssuesSum,
      criticalIssues: criticalIssuesSum,
      warningIssues: warningIssuesSum,
      cleanFilesCount: cleanCount,
      globalQualityScore: avgScore,
      securityThreatsCount: threatCount,
      completedItems: completedResults
    });

    setIsValidating(false);
    setQueuedRawFiles([]);
  };

  const handleExportReportJSON = () => {
    if (!batchReport) return;
    const jsonStr = JSON.stringify(batchReport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Batch_Integrity_Report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSelectedRowsEstimated = files
    .filter(f => selectedFileIds.includes(f.id))
    .reduce((sum, f) => sum + (f.rows?.length || f.totalRowsCount || 0), 0);

  return (
    <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-6 transition-all`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-500/10">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-500/30 text-blue-400 shrink-0">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg">Batch CSV Integrity Validation</h3>
              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Parallel Scan
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Select multiple CSV datasets or upload raw batches to execute simultaneous RFC4180 parsing, security threat scans, and custom integrity validations.
            </p>
          </div>
        </div>

        {customRules.filter(r => r.isActive).length > 0 && (
          <div className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 shrink-0 ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span><strong>{customRules.filter(r => r.isActive).length} Active Custom Rule(s)</strong> configured</span>
          </div>
        )}
      </div>

      {validationError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="font-medium">{validationError}</span>
        </div>
      )}

      {/* Main Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workspace Files Selection (Left Column) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Select Workspace CSV Files ({selectedFileIds.length} of {files.length} selected)
            </span>
            <button
              onClick={handleToggleSelectAll}
              className="text-xs text-blue-500 hover:text-blue-400 font-semibold cursor-pointer transition-colors"
            >
              {selectedFileIds.length === files.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Search Filter Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search workspace datasets..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800 border'
              }`}
            />
          </div>

          {/* List of Files */}
          {files.length === 0 ? (
            <div className={`p-6 text-center rounded-xl border border-dashed ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No workspace files uploaded yet.</p>
              <p className="text-[10px] text-slate-500 mt-1">Drop CSV files into the upload box on the right to start batch validation.</p>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
              {filteredWorkspaceFiles.map(file => {
                const isSelected = selectedFileIds.includes(file.id);
                return (
                  <div
                    key={file.id}
                    onClick={() => handleToggleFile(file.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? isDarkMode 
                          ? 'border-blue-500/50 bg-blue-500/10' 
                          : 'border-blue-500/40 bg-blue-50/80 shadow-sm'
                        : isDarkMode
                          ? 'border-slate-800 bg-[#0f172a] hover:bg-slate-900'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by row click
                        className="rounded text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer focus:ring-0"
                      />
                      <div className="min-w-0">
                        <span className={`text-xs font-bold block truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {file.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                          <span>{file.headers.length} headers</span>
                          <span>•</span>
                          <span>{(file.rows?.length || file.totalRowsCount || 0).toLocaleString()} rows</span>
                          <span>•</span>
                          <span className={`font-bold ${
                            file.score >= 90 ? 'text-emerald-400' : file.score >= 70 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {file.score}% Quality Score
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {file.size > 1024 * 1024 
                        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
                        : `${(file.size / 1024).toFixed(1)} KB`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drop raw CSV files zone (Right Column) */}
        <div className="lg:col-span-5 space-y-3">
          <span className={`text-xs font-bold uppercase tracking-wider block ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Drop Additional CSV Files
          </span>

          <div
            onDragEnter={(e) => { e.preventDefault(); setBatchDragActive(true); }}
            onDragOver={(e) => { e.preventDefault(); setBatchDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setBatchDragActive(false); }}
            onDrop={handleBatchFileDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer relative ${
              batchDragActive 
                ? 'border-blue-500 bg-blue-500/10' 
                : isDarkMode 
                ? 'border-slate-800 bg-[#0f172a] hover:border-slate-700' 
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
            onClick={() => batchFileInputRef.current?.click()}
          >
            <input
              ref={batchFileInputRef}
              type="file"
              accept=".csv"
              multiple
              onChange={handleBatchFileSelect}
              className="hidden"
            />
            <Upload className="w-5 h-5 text-blue-500 mx-auto mb-1.5 animate-bounce" />
            <p className="text-xs font-bold">Drag & drop files to queue</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Click to browse local .CSV spreadsheets</p>
          </div>

          {/* List of raw queued files */}
          {queuedRawFiles.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                Directly Queued Raw Files ({queuedRawFiles.length})
              </span>
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                {queuedRawFiles.map((rf, idx) => (
                  <div 
                    key={idx}
                    className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate font-semibold text-[11px]">{rf.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400">
                        {(rf.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveQueuedRawFile(idx); }}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Batch Trigger Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-500/10">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Queue total: <strong>{selectedFileIds.length + queuedRawFiles.length} file(s)</strong> • ~{totalSelectedRowsEstimated.toLocaleString()} total rows
          </span>
        </div>

        <button
          onClick={runBatchValidation}
          disabled={isValidating || (selectedFileIds.length === 0 && queuedRawFiles.length === 0)}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-2 cursor-pointer ${
            isValidating || (selectedFileIds.length === 0 && queuedRawFiles.length === 0)
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
              : accentClass + ' hover:scale-[1.02]'
          }`}
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running Batch Integrity Validation...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Run Batch Integrity Validation ({selectedFileIds.length + queuedRawFiles.length} Files)</span>
            </>
          )}
        </button>
      </div>

      {/* Global Integrity Progress Bar Overlay / Display */}
      <AnimatePresence>
        {isValidating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-6 rounded-2xl border shadow-xl space-y-5 ${
              isDarkMode ? 'bg-slate-900 border-blue-500/30' : 'bg-blue-50/60 border-blue-200'
            }`}
          >
            {/* Progress Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                    <span>Simultaneous Integrity Engine Active</span>
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  </h4>
                  <p className="text-xs text-blue-400 font-mono font-semibold truncate max-w-md">
                    {currentStepMessage || 'Initializing batch audit matrix...'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black font-mono text-blue-500">{overallProgress}%</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Global Progress</span>
              </div>
            </div>

            {/* Global Progress Bar Track */}
            <div className="space-y-1.5">
              <div className={`w-full h-3.5 rounded-full overflow-hidden p-0.5 border ${
                isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-inner'
              }`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300 relative overflow-hidden"
                  style={{ width: `${overallProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1 font-semibold">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Live Queue Matrix Breakdown */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Live Batch Audit Queue ({batchItemStatuses.length} files)
              </span>
              <div className={`max-h-48 overflow-y-auto rounded-xl border p-2 space-y-1.5 ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                {batchItemStatuses.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                      item.status === 'validating'
                        ? isDarkMode ? 'bg-blue-950/40 border-blue-500/50 text-blue-200' : 'bg-blue-50 border-blue-300 text-blue-800'
                        : item.status === 'valid'
                        ? isDarkMode ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : item.status === 'issues_detected'
                        ? isDarkMode ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
                        : item.status === 'failed'
                        ? isDarkMode ? 'bg-rose-950/20 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'
                        : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold block truncate text-xs">{item.name}</span>
                        {item.status !== 'queued' && item.status !== 'validating' && (
                          <span className="text-[10px] font-mono block opacity-80 mt-0.5">
                            {item.rowsCount.toLocaleString()} rows audited • {item.issuesCount} issue(s) detected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'queued' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-400">
                          Queued
                        </span>
                      )}
                      {item.status === 'validating' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" /> Scanning...
                        </span>
                      )}
                      {item.status === 'valid' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 100% Valid
                        </span>
                      )}
                      {item.status === 'issues_detected' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {item.issuesCount} Issue(s)
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Executive Batch Validation Report Summary */}
      {batchReport && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 rounded-2xl border space-y-6 ${
            isDarkMode ? 'bg-[#0f172a] border-emerald-500/30' : 'bg-emerald-50/30 border-emerald-200 shadow-md'
          }`}
        >
          {/* Executive Summary Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-500/10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h4 className="font-black text-base sm:text-lg">Executive Batch Integrity Report</h4>
                <p className="text-xs text-slate-400">Simultaneous compliance audit completed across {batchReport.totalFiles} CSV dataset(s).</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportReportJSON}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-blue-500" /> Export JSON
              </button>
              <button
                onClick={() => setBatchReport(null)}
                className="text-xs text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Key Executive Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className={`p-3.5 rounded-xl border text-center ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Global Score</span>
              <span className={`text-xl sm:text-2xl font-black mt-1 block ${
                batchReport.globalQualityScore >= 90 ? 'text-emerald-400' : batchReport.globalQualityScore >= 70 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {batchReport.globalQualityScore}%
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border text-center ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Files</span>
              <span className="text-xl sm:text-2xl font-black text-blue-400 mt-1 block">{batchReport.totalFiles}</span>
            </div>

            <div className={`p-3.5 rounded-xl border text-center ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rows Audited</span>
              <span className="text-xl sm:text-2xl font-black text-cyan-400 mt-1 block">{batchReport.totalRows.toLocaleString()}</span>
            </div>

            <div className={`p-3.5 rounded-xl border text-center ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Issues Found</span>
              <span className="text-xl sm:text-2xl font-black text-amber-400 mt-1 block">{batchReport.totalIssues}</span>
            </div>

            <div className={`p-3.5 rounded-xl border text-center col-span-2 sm:col-span-1 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clean Files</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 block">
                {batchReport.cleanFilesCount} / {batchReport.totalFiles}
              </span>
            </div>
          </div>

          {/* Detailed Batch Results Table */}
          <div className="space-y-2">
            <span className={`text-xs font-bold uppercase tracking-wider block ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Per-File Integrity Audit Summary
            </span>

            <div className="overflow-x-auto rounded-xl border border-slate-500/10">
              <table className="w-full text-left text-xs">
                <thead className={`text-[10px] font-bold uppercase tracking-wider border-b ${
                  isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-3">File Name</th>
                    <th className="p-3">Rows</th>
                    <th className="p-3">Quality Score</th>
                    <th className="p-3">Security Scan</th>
                    <th className="p-3">Issues Breakdown</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {batchReport.completedItems.map(item => (
                    <tr key={item.id} className={isDarkMode ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-bold flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{item.name}</span>
                      </td>

                      <td className="p-3 font-mono text-slate-400">
                        {item.rowsCount.toLocaleString()}
                      </td>

                      <td className="p-3">
                        <span className={`font-extrabold font-mono text-xs px-2 py-0.5 rounded-full ${
                          item.score >= 90 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          item.score >= 70 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {item.score}%
                        </span>
                      </td>

                      <td className="p-3 font-medium">
                        {item.securityPassed ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5" /> Passed Clean
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1 font-semibold text-[11px]">
                            <ShieldAlert className="w-3.5 h-3.5" /> Security Warning
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-mono text-[11px]">
                        {item.issuesCount === 0 ? (
                          <span className="text-emerald-400">0 issues</span>
                        ) : (
                          <span className="space-x-1.5">
                            {item.criticalIssuesCount > 0 && (
                              <span className="text-rose-400 font-bold">{item.criticalIssuesCount} critical</span>
                            )}
                            {item.warningIssuesCount > 0 && (
                              <span className="text-amber-400 font-semibold">{item.warningIssuesCount} warnings</span>
                            )}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        {item.status === 'valid' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
                            Compliant
                          </span>
                        )}
                        {item.status === 'issues_detected' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400">
                            Needs Cleaning
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400">
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
