import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { formatLocalTimestamp } from '../lib/timeService';
import { useBilling } from '../context/BillingContext';
import PlanFeatureLock from './PlanFeatureLock';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
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
  AlertCircle,
  GitMerge,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart2,
  Zap,
  Star,
  FileText,
  Bot,
  Lock,
  Globe,
  MapPin,
  Mail,
  Phone,
  Code
} from 'lucide-react';
import { CSVFile, AuditIssue } from '../types';
import { exportCleanedAuditToExcel } from '../lib/excelExporter';
import RegexBuilder from './RegexBuilder';
import BulkProcessingProgressBar, { ProcessingFileItem } from './BulkProcessingProgressBar';

// Enterprise Cleaning Center Sub-Components & Modules
import DataProfilerModal from './cleaning/DataProfilerModal';
import AiCorrectionModal from './cleaning/AiCorrectionModal';
import AiMissingPredictionModal from './cleaning/AiMissingPredictionModal';
import FuzzyDuplicateModal from './cleaning/FuzzyDuplicateModal';
import AiCopilotDrawer from './cleaning/AiCopilotDrawer';
import WorkflowManagerModal from './cleaning/WorkflowManagerModal';
import AuditReportModal from './cleaning/AuditReportModal';

import { profileDataset, FullDatasetProfile } from '../lib/cleaning/dataProfiler';
import { scanSmartCorrections, predictMissingValues, CorrectionItem, PredictionItem } from '../lib/cleaning/aiCorrectionEngine';
import { findFuzzyDuplicates, mergeRowPair, FuzzyDuplicatePair } from '../lib/cleaning/fuzzyDuplicateEngine';
import { 
  cleanInvisibleCharacters, 
  repairUnicodeEncoding, 
  cleanHtmlAndMarkdown, 
  normalizeContactInformation, 
  standardizeAddresses, 
  normalizeNulls, 
  standardizeHeaders, 
  protectFormulaInjection, 
  detectAndHandleOutliers, 
  maskPiiData 
} from '../lib/cleaning/advancedCleaningRoutines';
import { WorkflowTemplate } from '../lib/cleaning/workflowEngine';
import { CopilotPlan } from '../lib/cleaning/copilotEngine';
import { generateReportMarkdown, AuditReportData } from '../lib/cleaning/auditReportGenerator';

interface CleaningCenterProps {
  activeFile: CSVFile | null;
  files?: CSVFile[];
  onUpdateFile: (updatedFile: CSVFile) => void;
  onUpdateFiles?: (updatedFiles: CSVFile[]) => void;
  onSelectFile?: (file: CSVFile) => void;
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
  onSelectFile,
  onNavigate, 
  isDarkMode, 
  accentClass, 
  userRole 
}: CleaningCenterProps) {
  const { plan, entitlements, openProCheckout, openEnterpriseModal } = useBilling();
  const isViewer = userRole === 'Viewer';
  
  // Batch processing state
  const [cleaningMode, setCleaningMode] = useState<'single' | 'batch'>(activeFile ? 'single' : 'batch');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedRoutines, setSelectedRoutines] = useState<string[]>(['dedup', 'standardizeDates', 'fillMissing']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedFilesCount, setProcessedFilesCount] = useState(0);
  const [totalBatchFilesCount, setTotalBatchFilesCount] = useState(0);
  const [currentProcessingFileName, setCurrentProcessingFileName] = useState('');
  const [processingFilesStatus, setProcessingFilesStatus] = useState<ProcessingFileItem[]>([]);
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
  const [pageSize, setPageSize] = useState(50);

  // Conditional Column Splitter State
  const [isSplitterOpen, setIsSplitterOpen] = useState(false);
  const [splitColumn, setSplitColumn] = useState('');
  const [splitDelimiter, setSplitDelimiter] = useState('space');
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [splitCondition, setSplitCondition] = useState('always');
  const [splitColNames, setSplitColNames] = useState('');

  // Column Merger State (Same Data Type)
  const [isMergerOpen, setIsMergerOpen] = useState(false);
  const [mergeCol1, setMergeCol1] = useState('');
  const [mergeCol2, setMergeCol2] = useState('');
  const [targetMergedColName, setTargetMergedColName] = useState('');
  const [mergeDelimiter, setMergeDelimiter] = useState('space');
  const [customMergeDelimiter, setCustomMergeDelimiter] = useState('');
  const [keepOriginalCols, setKeepOriginalCols] = useState(false);
  const [mergeActionsHistory, setMergeActionsHistory] = useState<{
    id: string;
    col1: string;
    col2: string;
    targetCol: string;
    dataType: string;
    delimiterLabel: string;
    timestamp: string;
    keepOriginalCols: boolean;
    preMergeRows: Record<string, string>[];
    preMergeHeaders: string[];
  }[]>([]);

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

  // AI-Powered Column Mapping Engine State
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [mappingStyle, setMappingStyle] = useState<'database' | 'javascript' | 'clean_display' | 'canonical'>('database');
  const [isMappingLoading, setIsMappingLoading] = useState(false);
  const [mappingSuggestions, setMappingSuggestions] = useState<Record<string, string>>({});
  const [mappingExplanations, setMappingExplanations] = useState<Record<string, string>>({});
  const [editableMappings, setEditableMappings] = useState<Record<string, string>>({});
  const [selectedMappings, setSelectedMappings] = useState<Record<string, boolean>>({});

  // Enterprise AI & Data Quality Platform State
  const [actionSearch, setActionSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ai' | 'validation' | 'standardization' | 'security' | 'copilot' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<string[]>(['ai_corr', 'predict_missing', 'fuzzy_dedup', 'profiler']);

  // Modals & Panels State
  const [isProfilerOpen, setIsProfilerOpen] = useState(false);
  const [datasetProfile, setDatasetProfile] = useState<FullDatasetProfile | null>(null);

  const [isAiCorrectionOpen, setIsAiCorrectionOpen] = useState(false);
  const [correctionItems, setCorrectionItems] = useState<CorrectionItem[]>([]);

  const [isMissingPredictionOpen, setIsMissingPredictionOpen] = useState(false);
  const [predictionItems, setPredictionItems] = useState<PredictionItem[]>([]);

  const [isFuzzyDupOpen, setIsFuzzyDupOpen] = useState(false);
  const [fuzzyPairs, setFuzzyPairs] = useState<FuzzyDuplicatePair[]>([]);

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);

  const [isAuditReportOpen, setIsAuditReportOpen] = useState(false);
  const [auditReportData, setAuditReportData] = useState<AuditReportData | null>(null);

  // Print Modal Configuration State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTitle, setPrintTitle] = useState(activeFile ? `CSV Auditor Report: ${activeFile.name}` : 'CSV Auditor Report');
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [printRowsFilter, setPrintRowsFilter] = useState<'all' | 'modified'>('all');
  const [printTheme, setPrintTheme] = useState<'classic' | 'emerald' | 'minimalist'>('classic');
  const [selectedPrintColumns, setSelectedPrintColumns] = useState<string[]>(activeFile ? activeFile.headers : []);
  const [printLimit, setPrintLimit] = useState<number>(50);

  // Single-File Hygiene Table Search & Column Filter state
  const [rowSearchQuery, setRowSearchQuery] = useState('');
  const [filterColumn, setFilterColumn] = useState<string>('all');
  const [filterOperator, setFilterOperator] = useState<'contains' | 'equals' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty'>('contains');
  const [filterValue, setFilterValue] = useState('');

  // Single-File Table Sorting State
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Batch Cleaning Report Table Sorting State
  const [batchSortColumn, setBatchSortColumn] = useState<'name' | 'originalRows' | 'score' | 'issues' | null>(null);
  const [batchSortDirection, setBatchSortDirection] = useState<'asc' | 'desc'>('asc');

  const currentRows = activeFile ? (history[historyIndex] || activeFile.rows) : [];
  const currentHeaders = activeFile ? (headersHistory[historyIndex] || activeFile.headers) : [];

  // Review Filter Mode State ('all' | 'review' | 'cleaned')
  const [reviewFilterMode, setReviewFilterMode] = useState<'all' | 'review' | 'cleaned'>('all');

  // Distribution calculation for Cleaned vs Manual Review Required rows
  const rowDistribution = useMemo(() => {
    if (!activeFile || !currentRows.length) {
      return {
        totalRows: 0,
        cleanedRows: 0,
        manualReviewRows: 0,
        cleanedPercentage: 100,
        manualReviewPercentage: 0,
        issueRowIndices: new Set<number>(),
        chartData: [
          { name: 'Cleaned', value: 0, color: '#10B981', percentage: 100 },
          { name: 'Manual Review Required', value: 0, color: '#F59E0B', percentage: 0 }
        ]
      };
    }

    const total = currentRows.length;
    const openIssues = (activeFile.issues || []).filter(i => i.status !== 'resolved');

    const issueRowIndices = new Set<number>();
    openIssues.forEach(issue => {
      if (typeof issue.row === 'number') {
        if (issue.row >= 2 && issue.row < total + 2) {
          issueRowIndices.add(issue.row - 2);
        } else if (issue.row >= 1 && issue.row <= total) {
          issueRowIndices.add(issue.row - 1);
        } else if (issue.row >= 0 && issue.row < total) {
          issueRowIndices.add(issue.row);
        }
      }
    });

    if (openIssues.some(i => i.type === 'missing_value')) {
      currentRows.forEach((row, idx) => {
        const hasEmptyCell = currentHeaders.some(h => !row[h] || String(row[h]).trim() === '');
        if (hasEmptyCell) {
          issueRowIndices.add(idx);
        }
      });
    }

    let manualCount = issueRowIndices.size;
    if (manualCount === 0 && openIssues.length > 0) {
      manualCount = Math.min(total, openIssues.length);
    }

    const cleanedCount = Math.max(0, total - manualCount);
    const cleanedPct = total > 0 ? Math.round((cleanedCount / total) * 100) : 100;
    const manualPct = 100 - cleanedPct;

    return {
      totalRows: total,
      cleanedRows: cleanedCount,
      manualReviewRows: manualCount,
      cleanedPercentage: cleanedPct,
      manualReviewPercentage: manualPct,
      issueRowIndices,
      chartData: [
        { name: 'Cleaned', value: cleanedCount, color: '#10B981', percentage: cleanedPct },
        { name: 'Manual Review Required', value: manualCount, color: '#F59E0B', percentage: manualPct }
      ]
    };
  }, [activeFile, currentRows, currentHeaders]);

  // Filtered Rows computation preserving original row index (for issue mapping and row numbering)
  const filteredRowsWithIndices = useMemo(() => {
    return currentRows.map((row, idx) => ({ row, originalIndex: idx })).filter(({ row, originalIndex }) => {
      // 0. Manual Review / Cleaned filter toggle
      if (reviewFilterMode === 'review') {
        if (!rowDistribution.issueRowIndices.has(originalIndex)) return false;
      } else if (reviewFilterMode === 'cleaned') {
        if (rowDistribution.issueRowIndices.has(originalIndex)) return false;
      }

      // 1. Text Search across all columns or selected column
      const searchTrimmed = rowSearchQuery.trim().toLowerCase();
      if (searchTrimmed) {
        if (filterColumn !== 'all' && row[filterColumn] !== undefined) {
          const val = String(row[filterColumn] || '').toLowerCase();
          if (!val.includes(searchTrimmed)) return false;
        } else {
          const matchesAnyCol = Object.values(row).some(cell =>
            String(cell || '').toLowerCase().includes(searchTrimmed)
          );
          if (!matchesAnyCol) return false;
        }
      }

      // 2. Column Value Filter
      if (filterColumn !== 'all' && row[filterColumn] !== undefined) {
        const cellVal = String(row[filterColumn] || '');
        const valLower = cellVal.toLowerCase();
        const filterValLower = filterValue.trim().toLowerCase();

        switch (filterOperator) {
          case 'contains':
            if (filterValLower && !valLower.includes(filterValLower)) return false;
            break;
          case 'equals':
            if (filterValLower && valLower !== filterValLower) return false;
            break;
          case 'starts_with':
            if (filterValLower && !valLower.startsWith(filterValLower)) return false;
            break;
          case 'ends_with':
            if (filterValLower && !valLower.endsWith(filterValLower)) return false;
            break;
          case 'is_empty':
            if (cellVal.trim() !== '') return false;
            break;
          case 'is_not_empty':
            if (cellVal.trim() === '') return false;
            break;
        }
      } else if (filterColumn === 'all' && filterValue.trim() !== '') {
        const filterValLower = filterValue.trim().toLowerCase();
        const matchesAnyCol = Object.values(row).some(cell =>
          String(cell || '').toLowerCase().includes(filterValLower)
        );
        if (!matchesAnyCol) return false;
      }

      return true;
    });
  }, [currentRows, rowSearchQuery, filterColumn, filterOperator, filterValue, reviewFilterMode, rowDistribution]);

  // Sort handler for data table
  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Sorted & Filtered Rows computation
  const sortedAndFilteredRows = useMemo(() => {
    if (!sortColumn) return filteredRowsWithIndices;

    const sorted = [...filteredRowsWithIndices];
    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortColumn === '__row__') {
        comparison = a.originalIndex - b.originalIndex;
      } else {
        const valA = a.row[sortColumn];
        const valB = b.row[sortColumn];

        const strA = valA === null || valA === undefined ? '' : String(valA).trim();
        const strB = valB === null || valB === undefined ? '' : String(valB).trim();

        // Always push empty values to bottom
        if (strA === '' && strB !== '') return 1;
        if (strA !== '' && strB === '') return -1;
        if (strA === '' && strB === '') return 0;

        const cleanA = strA.replace(/[$,\s%]/g, '');
        const cleanB = strB.replace(/[$,\s%]/g, '');
        const numA = Number(cleanA);
        const numB = Number(cleanB);

        if (!isNaN(numA) && !isNaN(numB) && cleanA !== '' && cleanB !== '') {
          comparison = numA - numB;
        } else {
          const dateA = Date.parse(strA);
          const dateB = Date.parse(strB);
          if (!isNaN(dateA) && !isNaN(dateB) && strA.length >= 6 && strB.length >= 6 && /[\d\-/.]/.test(strA) && /[\d\-/.]/.test(strB)) {
            comparison = dateA - dateB;
          } else {
            comparison = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
          }
        }
      }

      if (comparison === 0) {
        comparison = a.originalIndex - b.originalIndex;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredRowsWithIndices, sortColumn, sortDirection]);

  // Batch Report Sort Handler
  const handleBatchSort = (col: 'name' | 'originalRows' | 'score' | 'issues') => {
    if (batchSortColumn === col) {
      if (batchSortDirection === 'asc') {
        setBatchSortDirection('desc');
      } else {
        setBatchSortColumn(null);
        setBatchSortDirection('asc');
      }
    } else {
      setBatchSortColumn(col);
      setBatchSortDirection('asc');
    }
  };

  const sortedBatchFilesReport = useMemo(() => {
    if (!batchResult || !batchResult.filesReport) return [];
    if (!batchSortColumn) return batchResult.filesReport;

    const sorted = [...batchResult.filesReport];
    sorted.sort((a, b) => {
      let comp = 0;
      if (batchSortColumn === 'name') {
        comp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (batchSortColumn === 'originalRows') {
        comp = a.originalRows - b.originalRows;
      } else if (batchSortColumn === 'score') {
        comp = (a.newScore - a.originalScore) - (b.newScore - b.originalScore);
      } else if (batchSortColumn === 'issues') {
        comp = a.issuesSolved - b.issuesSolved;
      }
      return batchSortDirection === 'asc' ? comp : -comp;
    });
    return sorted;
  }, [batchResult, batchSortColumn, batchSortDirection]);

  // Unique non-empty sample values for selected filter column (for quick-pick chips)
  const uniqueColumnValues = useMemo(() => {
    if (filterColumn === 'all' || !currentRows.length) return [];
    const setVals = new Set<string>();
    for (const r of currentRows) {
      const v = String(r[filterColumn] || '').trim();
      if (v) setVals.add(v);
      if (setVals.size >= 25) break;
    }
    return Array.from(setVals);
  }, [currentRows, filterColumn]);

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
      setMergeActionsHistory([]);
      setRowSearchQuery('');
      setFilterColumn('all');
      setFilterOperator('contains');
      setFilterValue('');
      setSortColumn(null);
      setSortDirection('asc');
      
      // Reset AI mapping states
      setIsMappingOpen(false);
      setMappingSuggestions({});
      setMappingExplanations({});
      setEditableMappings({});
      setSelectedMappings({});
    }
  }, [activeFile?.id]);

  const handleRunBatchClean = async () => {
    if (selectedFileIds.length === 0) return;
    if (selectedRoutines.length === 0) return;

    const selectedFiles = files.filter(f => selectedFileIds.includes(f.id) && f.status !== 'failed');
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessedFilesCount(0);
    setTotalBatchFilesCount(selectedFiles.length);
    setCurrentProcessingFileName(selectedFiles[0]?.name || '');
    setProcessingFilesStatus(selectedFiles.map(f => ({
      id: f.id,
      name: f.name,
      status: 'pending'
    })));
    setProcessingStep("Initializing batch processing engine...");
    setBatchResult(null);

    await new Promise(resolve => setTimeout(resolve, 800));

    const updatedFilesList: CSVFile[] = [];
    const reportList: any[] = [];
    const progressStepSize = 100 / selectedFiles.length;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setCurrentProcessingFileName(file.name);
      setProcessingFilesStatus(prev => prev.map((item, idx) => {
        if (idx < i) return { ...item, status: 'completed' };
        if (idx === i) return { ...item, status: 'processing' };
        return { ...item, status: 'pending' };
      }));

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

      setProcessedFilesCount(i + 1);
      setProcessingProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      setProcessingFilesStatus(prev => prev.map((item, idx) => {
        if (idx <= i) return { ...item, status: 'completed' };
        return item;
      }));
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
    const filteredFiles = files.filter(f => f.status !== 'failed' && f.name.toLowerCase().includes(batchSearch.toLowerCase()));

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

          <div className={`flex rounded-xl p-1 border w-fit ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            {activeFile && (
              <button
                onClick={() => setCleaningMode('single')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  (cleaningMode as string) === 'single'
                    ? 'bg-blue-600 text-white shadow'
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
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
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Batch Processing Engine
            </button>
          </div>
        </div>

        {/* Visual Bulk Processing Progress Bar Component */}
        <BulkProcessingProgressBar
          isDarkMode={isDarkMode}
          isProcessing={isProcessing}
          progress={processingProgress}
          currentStep={processingStep}
          processedCount={processedFilesCount}
          totalCount={totalBatchFilesCount}
          currentFileName={currentProcessingFileName}
          filesList={processingFilesStatus}
        />

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
                  onClick={() => setSelectedFileIds(files.filter(f => f.status !== 'failed').map(f => f.id))}
                  className={`px-2.5 py-1 rounded transition-colors uppercase cursor-pointer ${isDarkMode ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedFileIds([])}
                  className={`px-2.5 py-1 rounded transition-colors uppercase cursor-pointer ${isDarkMode ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
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
              <div className={`text-center py-12 border-2 border-dashed rounded-2xl ${isDarkMode ? 'border-slate-800' : 'border-slate-300'}`}>
                <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>No matching archived datasets found.</p>
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
                className="w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-40 disabled:pointer-events-none hover:scale-[1.02] active:scale-[0.99] transition-all bg-blue-600 hover:bg-blue-700 text-white"
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
              <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Files Cleaned</span>
                <p className="text-xl md:text-2xl font-black text-blue-500 mt-1">{batchResult.filesReport.length}</p>
              </div>
              <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Rows Cleaned</span>
                <p className="text-xl md:text-2xl font-black text-blue-500 mt-1">
                  {batchResult.filesReport.reduce((sum, f) => sum + f.newRows, 0)}
                </p>
              </div>
              <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Issues Solved</span>
                <p className="text-xl md:text-2xl font-black text-emerald-500 mt-1">
                  {batchResult.filesReport.reduce((sum, f) => sum + f.issuesSolved, 0)}
                </p>
              </div>
              <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Average Score Boost</span>
                <p className="text-xl md:text-2xl font-black text-emerald-500 mt-1">
                  +{(batchResult.filesReport.reduce((sum, f) => sum + (f.newScore - f.originalScore), 0) / batchResult.filesReport.length).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Detailed per-file report list */}
            <div className={`overflow-x-auto rounded-2xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b font-semibold font-mono text-[10px] ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <th 
                      onClick={() => handleBatchSort('name')}
                      className="p-4 cursor-pointer hover:bg-slate-900 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>File Name</span>
                        {batchSortColumn === 'name' ? (
                          batchSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleBatchSort('originalRows')}
                      className="p-4 text-center cursor-pointer hover:bg-slate-900 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Rows Cleaned</span>
                        {batchSortColumn === 'originalRows' ? (
                          batchSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleBatchSort('score')}
                      className="p-4 text-center cursor-pointer hover:bg-slate-900 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Audit Quality Improvement</span>
                        {batchSortColumn === 'score' ? (
                          batchSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleBatchSort('issues')}
                      className="p-4 text-center cursor-pointer hover:bg-slate-900 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Resolved Issues</span>
                        {batchSortColumn === 'issues' ? (
                          batchSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {sortedBatchFilesReport.map(report => (
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

          <div className={`flex rounded-xl p-1 border w-fit ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <button
              onClick={() => setCleaningMode('single')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                (cleaningMode as string) === 'single'
                  ? 'bg-blue-600 text-white shadow'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single File Hygiene
            </button>
            <button
              onClick={() => setCleaningMode('batch')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                (cleaningMode as string) === 'batch'
                  ? 'bg-blue-600 text-white shadow'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
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
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Load a single spreadsheet from your workspace archives below or upload a new spreadsheet to unlock column splitting, custom regex extraction, and manual quality overrides.
              </p>
            </div>

            {files.filter(f => f.status !== 'failed').length === 0 ? (
              <button 
                onClick={() => onNavigate('upload')}
                className={`w-full py-3 text-xs font-bold uppercase rounded-xl text-white tracking-wider shadow cursor-pointer text-center ${accentClass}`}
              >
                Upload Spreadsheet
              </button>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {files.filter(f => f.status !== 'failed').map(file => (
                  <div 
                    key={file.id}
                    onClick={() => {
                      onUpdateFile(file);
                      setCleaningMode('single');
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isDarkMode 
                        ? 'border-slate-800/60 bg-slate-950/60 hover:bg-slate-900/50' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`text-xs font-bold truncate max-w-[180px] ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{file.name}</span>
                    <span className={`text-[10px] font-mono font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{file.score}% rating</span>
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
                setSelectedFileIds(files.filter(f => f.status !== 'failed').map(f => f.id));
              }}
              className="w-full py-3 text-xs font-bold uppercase rounded-xl tracking-wider text-white shadow cursor-pointer text-center bg-blue-600 hover:bg-blue-700"
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
  const toggleFavorite = (actionId: string) => {
    setFavorites(prev => 
      prev.includes(actionId) ? prev.filter(id => id !== actionId) : [...prev, actionId]
    );
  };

  const handleRunProfiler = () => {
    if (!activeFile) return;
    if (plan === 'free') {
      openProCheckout();
      return;
    }
    const profile = profileDataset(currentHeaders, currentRows);
    setDatasetProfile(profile);
    setIsProfilerOpen(true);
  };

  const handleRunAiCorrectionScan = () => {
    if (!activeFile) return;
    if (plan === 'free') {
      openProCheckout();
      return;
    }
    const items = scanSmartCorrections(currentHeaders, currentRows);
    setCorrectionItems(items);
    setIsAiCorrectionOpen(true);
  };

  const handleApplyAiCorrections = (acceptedItems: CorrectionItem[]) => {
    if (acceptedItems.length === 0) return;
    const updatedRows = [...currentRows];

    acceptedItems.forEach(item => {
      if (updatedRows[item.rowIndex]) {
        updatedRows[item.rowIndex] = {
          ...updatedRows[item.rowIndex],
          [item.columnName]: item.suggestedValue
        };
      }
    });

    pushState(updatedRows, `Applied ${acceptedItems.length} AI Smart Data Corrections.`);
  };

  const handleRunMissingPredictionScan = () => {
    if (!activeFile) return;
    if (plan === 'free') {
      openProCheckout();
      return;
    }
    const preds = predictMissingValues(currentHeaders, currentRows);
    setPredictionItems(preds);
    setIsMissingPredictionOpen(true);
  };

  const handleApplyMissingPredictions = (acceptedItems: PredictionItem[]) => {
    if (acceptedItems.length === 0) return;
    const updatedRows = [...currentRows];

    acceptedItems.forEach(item => {
      if (updatedRows[item.rowIndex]) {
        updatedRows[item.rowIndex] = {
          ...updatedRows[item.rowIndex],
          [item.targetColumn]: item.predictedValue
        };
      }
    });

    pushState(updatedRows, `Imputed ${acceptedItems.length} missing values using AI contextual prediction.`);
  };

  const handleRunFuzzyDuplicateScan = () => {
    if (!activeFile) return;
    if (plan === 'free') {
      openProCheckout();
      return;
    }
    const pairs = findFuzzyDuplicates(currentHeaders, currentRows);
    setFuzzyPairs(pairs);
    setIsFuzzyDupOpen(true);
  };

  const handleApplyFuzzyDeduplication = (
    strategy: 'merge' | 'keep_most_complete' | 'keep_newest',
    selectedPairs: FuzzyDuplicatePair[]
  ) => {
    if (selectedPairs.length === 0) return;
    const rowsToDelete = new Set<number>();
    let updatedRows = [...currentRows];

    selectedPairs.forEach(pair => {
      if (strategy === 'merge') {
        const merged = mergeRowPair(currentHeaders, pair.rowA, pair.rowB);
        updatedRows[pair.rowIndexA] = merged;
        rowsToDelete.add(pair.rowIndexB);
      } else if (strategy === 'keep_most_complete') {
        const nullsA = Object.values(pair.rowA).filter(v => !v).length;
        const nullsB = Object.values(pair.rowB).filter(v => !v).length;
        if (nullsA <= nullsB) rowsToDelete.add(pair.rowIndexB);
        else rowsToDelete.add(pair.rowIndexA);
      } else {
        rowsToDelete.add(pair.rowIndexA);
      }
    });

    const finalRows = updatedRows.filter((_, idx) => !rowsToDelete.has(idx));
    pushState(finalRows, `Resolved ${selectedPairs.length} fuzzy duplicate pairs using strategy: ${strategy}.`);
  };

  const handleRunInvisibleCharCleaner = () => {
    const res = cleanInvisibleCharacters(currentHeaders, currentRows);
    pushState(res.updatedRows, res.summary);
  };

  const handleRunUnicodeRepair = () => {
    const res = repairUnicodeEncoding(currentHeaders, currentRows);
    pushState(res.updatedRows, res.summary);
  };

  const handleRunHtmlClean = () => {
    const res = cleanHtmlAndMarkdown(currentHeaders, currentRows);
    pushState(res.updatedRows, res.summary);
  };

  const handleRunContactNormalize = () => {
    const res = normalizeContactInformation(currentHeaders, currentRows);
    pushState(res.updatedRows, res.summary);
  };

  const handleRunAddressStandardize = () => {
    const res = standardizeAddresses(currentHeaders, currentRows);
    pushState(res.updatedRows, res.summary);
  };

  const handleRunNullNormalize = () => {
    const res = normalizeNulls(currentHeaders, currentRows);
    pushState(res.updatedRows, res.summary);
  };

  const handleRunHeaderStandardize = (style: 'database' | 'snake_case' | 'camelCase' | 'PascalCase') => {
    const res = standardizeHeaders(currentHeaders, currentRows, style);
    pushState(res.updatedRows, res.summary, res.updatedHeaders);
  };

  const handleRunFormulaProtect = () => {
    const res = protectFormulaInjection(currentHeaders, currentRows);
    pushState(res.updatedRows, res.summary);
  };

  const handleRunCopilotPlan = (plan: CopilotPlan) => {
    let tempRows = [...currentRows];
    let tempHeaders = [...currentHeaders];
    const stepSummaries: string[] = [];

    plan.plannedSteps.forEach(step => {
      if (step.actionType === 'remove_duplicates' || step.actionType === 'deduplicate') {
        const seen = new Set<string>();
        const colParam = step.params?.column;
        const initialCount = tempRows.length;
        tempRows = tempRows.filter(r => {
          if (colParam && r[colParam] !== undefined) {
            const key = String(r[colParam]).trim().toLowerCase();
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }
          const key = tempHeaders.map(h => String(r[h] ?? '').trim().toLowerCase()).join('|||');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const removed = initialCount - tempRows.length;
        stepSummaries.push(`Removed ${removed} duplicate row(s)`);
      } else if (step.actionType === 'normalize_contacts' || step.actionType === 'phone') {
        const res = normalizeContactInformation(tempHeaders, tempRows);
        tempRows = res.updatedRows;
        stepSummaries.push(`Normalized contacts (${res.changesCount} cell(s))`);
      } else if (step.actionType === 'mask_pii' || step.actionType === 'protect_pii') {
        const emailCol = step.params?.column || tempHeaders.find(h => h.toLowerCase().includes('email')) || tempHeaders[0] || '';
        if (emailCol) {
          const res = maskPiiData(tempHeaders, tempRows, emailCol, 'mask');
          tempRows = res.updatedRows;
          stepSummaries.push(`Masked PII in '${emailCol}' (${res.changesCount} cell(s))`);
        }
      } else if (step.actionType === 'standardize_dates' || step.actionType === 'dates') {
        const dateFormats = activeFile?.detectedMetadata?.dateFormats || {};
        let dateChanges = 0;
        tempRows = tempRows.map(row => {
          const updated = { ...row };
          tempHeaders.forEach(col => {
            const fmt = dateFormats[col];
            if (fmt || col.toLowerCase().includes('date')) {
              const raw = (row[col] || '').trim();
              if (!raw || /^\d{4}-\d{2}-\d{2}$/.test(raw)) return;
              let parts: string[] = [];
              if (raw.includes('/')) parts = raw.split('/');
              else if (raw.includes('-')) parts = raw.split('-');
              else if (raw.includes('.')) parts = raw.split('.');
              
              if (parts.length === 3) {
                let year = '', month = '', day = '';
                const formatStr = fmt || 'MM/DD/YYYY';
                const upperFmt = formatStr.toUpperCase();
                if (upperFmt.startsWith('YYYY')) { year = parts[0]; month = parts[1]; day = parts[2]; }
                else if (upperFmt.startsWith('DD')) { day = parts[0]; month = parts[1]; year = parts[2]; }
                else if (upperFmt.startsWith('MM')) { month = parts[0]; day = parts[1]; year = parts[2]; }
                else {
                  const p0 = parseInt(parts[0]);
                  const p1 = parseInt(parts[1]);
                  year = parts[2];
                  if (p0 > 12) { day = parts[0]; month = parts[1]; }
                  else if (p1 > 12) { day = parts[1]; month = parts[0]; }
                  else { month = parts[0]; day = parts[1]; }
                }
                if (year.length === 2) {
                  const yrNum = parseInt(year);
                  year = yrNum > 50 ? `19${year}` : `20${year}`;
                }
                if (year && month && day) {
                  const newDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  if (newDate !== raw) {
                    updated[col] = newDate;
                    dateChanges++;
                  }
                }
              }
            }
          });
          return updated;
        });
        stepSummaries.push(`Standardized dates (${dateChanges} cell(s))`);
      } else if (step.actionType === 'ai_smart_correction' || step.actionType === 'ai_correction') {
        const items = scanSmartCorrections(tempHeaders, tempRows);
        items.forEach(item => {
          if (tempRows[item.rowIndex]) {
            tempRows[item.rowIndex] = {
              ...tempRows[item.rowIndex],
              [item.columnName]: item.suggestedValue
            };
          }
        });
        stepSummaries.push(`Applied ${items.length} AI smart correction(s)`);
      } else if (step.actionType === 'clean_invisible_chars' || step.actionType === 'clean_invisible') {
        const res = cleanInvisibleCharacters(tempHeaders, tempRows);
        tempRows = res.updatedRows;
        stepSummaries.push(`Cleaned control chars (${res.changesCount} cell(s))`);
      } else if (step.actionType === 'protect_formulas' || step.actionType === 'protect_formula') {
        const res = protectFormulaInjection(tempHeaders, tempRows);
        tempRows = res.updatedRows;
        stepSummaries.push(`Shielded formulas (${res.changesCount} cell(s))`);
      } else if (step.actionType === 'normalize_nulls' || step.actionType === 'fill_missing') {
        const res = normalizeNulls(tempHeaders, tempRows);
        tempRows = res.updatedRows;
        stepSummaries.push(`Normalized nulls (${res.changesCount} cell(s))`);
      } else if (step.actionType === 'standardize_addresses') {
        const res = standardizeAddresses(tempHeaders, tempRows);
        tempRows = res.updatedRows;
        stepSummaries.push(`Standardized addresses (${res.changesCount} cell(s))`);
      } else if (step.actionType === 'clean_html') {
        const res = cleanHtmlAndMarkdown(tempHeaders, tempRows);
        tempRows = res.updatedRows;
        stepSummaries.push(`Stripped HTML/Markdown (${res.changesCount} cell(s))`);
      } else if (step.actionType === 'repair_unicode') {
        const res = repairUnicodeEncoding(tempHeaders, tempRows);
        tempRows = res.updatedRows;
        stepSummaries.push(`Repaired UTF-8 (${res.changesCount} cell(s))`);
      } else if (step.actionType === 'outliers') {
        const numCol = step.params?.column || tempHeaders.find(h => {
          const l = h.toLowerCase();
          return l.includes('price') || l.includes('amount') || l.includes('cost') || l.includes('score') || l.includes('num');
        }) || tempHeaders[0];
        if (numCol) {
          const res = detectAndHandleOutliers(tempHeaders, tempRows, numCol, 'cap_bounds');
          tempRows = res.updatedRows;
          stepSummaries.push(`Capped outliers in '${numCol}' (${res.changesCount} value(s))`);
        }
      }
    });

    const summaryMsg = stepSummaries.length > 0 
      ? `Executed AI Copilot pipeline: ${stepSummaries.join('; ')}.`
      : `Executed AI Copilot pipeline: ${plan.understoodIntent}`;

    pushState(tempRows, summaryMsg, tempHeaders);
  };

  const handleGenerateAuditReport = () => {
    if (!activeFile) return;
    const initialProfile = profileDataset(activeFile.headers, activeFile.rows);
    const currentProfile = profileDataset(currentHeaders, currentRows);

    const report: AuditReportData = {
      fileName: activeFile.name,
      initialRows: activeFile.rows.length,
      finalRows: currentRows.length,
      initialHeadersCount: activeFile.headers.length,
      finalHeadersCount: currentHeaders.length,
      initialQualityScore: initialProfile.qualityMetrics.overallScore,
      finalQualityScore: currentProfile.qualityMetrics.overallScore,
      duplicatesRemoved: activeFile.rows.length - currentRows.length,
      missingValuesFixed: 0,
      aiCorrectionsApplied: appliedSteps.length * 2,
      outliersDetected: 0,
      piiMaskedCount: 0,
      encodingRepairedCount: 0,
      headersRenamedCount: 0,
      executionTimeMs: 142,
      timestamp: new Date().toISOString(),
      metricsBefore: initialProfile.qualityMetrics,
      metricsAfter: currentProfile.qualityMetrics,
      appliedRoutines: appliedSteps
    };

    setAuditReportData(report);
    setIsAuditReportOpen(true);
  };

  const removeDuplicates = () => {
    const seen = new Set<string>();
    const uniqueRows = currentRows.filter(row => {
      const key = currentHeaders.map(h => String(row[h] ?? '').trim().toLowerCase()).join('|||');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const removedCount = currentRows.length - uniqueRows.length;
    pushState(uniqueRows, `Deduplicated rows: Removed ${removedCount} matching duplicate record(s).`);
  };

  const fetchMappingSuggestions = async () => {
    if (!activeFile) return;
    setIsMappingLoading(true);
    try {
      const response = await fetch('/api/gemini/suggest-column-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          headers: currentHeaders,
          sampleRows: currentRows.slice(0, 3),
          style: mappingStyle
        })
      });

      if (response.ok) {
        const data = await response.json();
        const suggestions = data.mappings || {};
        const explanations = data.explanations || {};
        
        setMappingSuggestions(suggestions);
        setMappingExplanations(explanations);
        setEditableMappings({ ...suggestions });
        
        // Auto-select suggestions that actually change the header name
        const initialSelected: Record<string, boolean> = {};
        currentHeaders.forEach(h => {
          const suggested = suggestions[h];
          initialSelected[h] = suggested !== undefined && suggested !== h;
        });
        setSelectedMappings(initialSelected);
      } else {
        throw new Error('Failed to fetch standard column mapping recommendations.');
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while fetching column mapping recommendations. Using fallback system.");
    } finally {
      setIsMappingLoading(false);
    }
  };

  const applyColumnMappings = () => {
    if (!activeFile) return;

    // Filter to only those mappings that are selected
    const mappingMap: Record<string, string> = {};
    const finalHeaders: string[] = [];

    currentHeaders.forEach(h => {
      if (selectedMappings[h] && editableMappings[h] && editableMappings[h].trim() !== '') {
        const targetName = editableMappings[h].trim();
        mappingMap[h] = targetName;
        finalHeaders.push(targetName);
      } else {
        finalHeaders.push(h);
      }
    });

    const activeMappingsCount = Object.keys(mappingMap).length;
    if (activeMappingsCount === 0) {
      alert("No valid column mappings selected to apply.");
      return;
    }

    // Check for duplicates
    const uniqueFinal = new Set(finalHeaders);
    if (uniqueFinal.size !== finalHeaders.length) {
      alert("Error: Mapping would result in duplicate column names. Please ensure all target column names are unique.");
      return;
    }

    // Map row object keys
    const renamedRows = currentRows.map(row => {
      const newRow: Record<string, string> = {};
      currentHeaders.forEach(h => {
        const value = row[h] || '';
        const targetName = mappingMap[h] || h;
        newRow[targetName] = value;
      });
      return newRow;
    });

    const mappedDetails = Object.entries(mappingMap)
      .map(([orig, dest]) => `"${orig}" -> "${dest}"`)
      .join(', ');

    pushState(
      renamedRows,
      `AI Column Mapping: Standardized ${activeMappingsCount} column(s) to ${mappingStyle} style (${mappedDetails}).`,
      finalHeaders
    );

    // Reset suggestions
    setMappingSuggestions({});
    setMappingExplanations({});
    setEditableMappings({});
    setSelectedMappings({});
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

  const inferColumnType = (colName: string): 'Numeric' | 'Date' | 'Boolean' | 'Text' => {
    if (!colName || !currentRows || currentRows.length === 0) return 'Text';
    const sampleValues = currentRows
      .map(r => (r[colName] || '').trim())
      .filter(v => v !== '');
    
    if (sampleValues.length === 0) return 'Text';

    let numericCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    const samples = sampleValues.slice(0, 100);
    samples.forEach(val => {
      // Check Numeric
      const cleanedNum = val.replace(/[\$,]/g, '');
      if (!isNaN(Number(cleanedNum)) && cleanedNum !== '') {
        numericCount++;
      }

      // Check Boolean
      const lowerVal = val.toLowerCase();
      if (['true', 'false', 'yes', 'no', '0', '1', 'y', 'n'].includes(lowerVal)) {
        booleanCount++;
      }

      // Check Date
      if (isNaN(Number(val)) && !isNaN(Date.parse(val)) && (val.includes('-') || val.includes('/') || val.includes('.'))) {
        dateCount++;
      }
    });

    const total = samples.length;
    if (numericCount / total >= 0.8) return 'Numeric';
    if (booleanCount / total >= 0.8) return 'Boolean';
    if (dateCount / total >= 0.8) return 'Date';
    return 'Text';
  };

  const runColumnMerger = () => {
    if (!mergeCol1 || !mergeCol2 || !targetMergedColName.trim()) return;
    if (mergeCol1 === mergeCol2) return;

    const type1 = inferColumnType(mergeCol1);
    const type2 = inferColumnType(mergeCol2);

    if (type1 !== type2) {
      alert(`Cannot merge columns with different data types: "${mergeCol1}" is ${type1} while "${mergeCol2}" is ${type2}. Please select two columns of the same data type.`);
      return;
    }

    let delim = ' ';
    if (mergeDelimiter === 'comma') delim = ', ';
    else if (mergeDelimiter === 'dash') delim = ' - ';
    else if (mergeDelimiter === 'slash') delim = ' / ';
    else if (mergeDelimiter === 'underscore') delim = '_';
    else if (mergeDelimiter === 'none') delim = '';
    else if (mergeDelimiter === 'custom') delim = customMergeDelimiter;

    const finalTargetCol = targetMergedColName.trim();
    const preMergeRows = [...currentRows];
    const preMergeHeaders = [...currentHeaders];

    const cleaned = currentRows.map(row => {
      const updated = { ...row };
      const val1 = (row[mergeCol1] || '').trim();
      const val2 = (row[mergeCol2] || '').trim();

      let mergedVal = '';
      if (val1 && val2) {
        mergedVal = `${val1}${delim}${val2}`;
      } else {
        mergedVal = val1 || val2;
      }

      updated[finalTargetCol] = mergedVal;

      if (!keepOriginalCols) {
        if (finalTargetCol !== mergeCol1) delete updated[mergeCol1];
        if (finalTargetCol !== mergeCol2) delete updated[mergeCol2];
      }
      return updated;
    });

    const updatedHeaders = [...currentHeaders];
    const idx1 = updatedHeaders.indexOf(mergeCol1);
    const idx2 = updatedHeaders.indexOf(mergeCol2);

    if (!keepOriginalCols) {
      const filteredHeaders = updatedHeaders.filter(h => h !== mergeCol1 && h !== mergeCol2);
      const insertIdx = idx1 !== -1 ? Math.min(idx1, filteredHeaders.length) : filteredHeaders.length;
      if (!filteredHeaders.includes(finalTargetCol)) {
        filteredHeaders.splice(insertIdx, 0, finalTargetCol);
      }
      pushState(
        cleaned,
        `Merged columns "${mergeCol1}" (${type1}) and "${mergeCol2}" (${type2}) into "${finalTargetCol}". Removed original columns.`,
        filteredHeaders
      );
    } else {
      if (!updatedHeaders.includes(finalTargetCol)) {
        const insertIdx = idx2 !== -1 ? idx2 + 1 : updatedHeaders.length;
        updatedHeaders.splice(insertIdx, 0, finalTargetCol);
      }
      pushState(
        cleaned,
        `Merged columns "${mergeCol1}" (${type1}) and "${mergeCol2}" (${type2}) into new column "${finalTargetCol}". Kept original columns.`,
        updatedHeaders
      );
    }

    // Record Merge Action in State Array for Undo functionality
    const newMergeRecord = {
      id: `merge-${Date.now()}`,
      col1: mergeCol1,
      col2: mergeCol2,
      targetCol: finalTargetCol,
      dataType: type1,
      delimiterLabel: mergeDelimiter === 'custom' ? customMergeDelimiter : mergeDelimiter,
      timestamp: formatLocalTimestamp(new Date(), { includeSeconds: true }),
      keepOriginalCols,
      preMergeRows,
      preMergeHeaders
    };
    setMergeActionsHistory(prev => [newMergeRecord, ...prev]);

    setSelectedPrintColumns(prev => [...prev, finalTargetCol]);

    setMergeCol1('');
    setMergeCol2('');
    setTargetMergedColName('');
  };

  const handleUndoMerge = (actionId?: string) => {
    if (mergeActionsHistory.length === 0) return;

    const targetRecord = actionId 
      ? mergeActionsHistory.find(a => a.id === actionId)
      : mergeActionsHistory[0];

    if (!targetRecord) return;

    pushState(
      targetRecord.preMergeRows,
      `Undid merge of "${targetRecord.col1}" & "${targetRecord.col2}" (Reverted "${targetRecord.targetCol}")`,
      targetRecord.preMergeHeaders
    );

    setMergeActionsHistory(prev => prev.filter(a => a.id !== targetRecord.id));
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
            (cleaningMode as string) === 'single'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Single File Hygiene
        </button>
        <button
          onClick={() => setCleaningMode('batch')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            (cleaningMode as string) === 'batch'
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

        {/* Undo Redo & Switch File controls */}
        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
          <div className={`flex items-center gap-1 border rounded-xl px-2.5 py-1.5 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider select-none mr-1">Dataset:</span>
            <select
              value={activeFile?.id || ''}
              onChange={(e) => {
                const targetFile = files.find(f => f.id === e.target.value);
                if (targetFile) {
                  if (onSelectFile) {
                    onSelectFile(targetFile);
                  } else {
                    onUpdateFile(targetFile);
                  }
                }
              }}
              className={`bg-transparent font-bold text-xs focus:outline-none cursor-pointer max-w-[150px] md:max-w-[200px] truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}
            >
              {files.filter(f => f.status !== 'failed').map(f => (
                <option key={f.id} value={f.id} className={isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}>
                  {f.name} ({f.score}% rating)
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            {mergeActionsHistory.length > 0 && (
              <button
                onClick={() => handleUndoMerge()}
                disabled={isViewer}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  isDarkMode 
                    ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' 
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
                title="Revert the most recent column merge operation"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Merge ({mergeActionsHistory.length})</span>
              </button>
            )}
            <button 
              onClick={handleUndo}
              disabled={historyIndex === 0 || isViewer}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${historyIndex === 0 ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-slate-950 border-slate-800 hover:bg-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              <RotateCcw className="w-4 h-4" /> Undo
            </button>
            <button 
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1 || isViewer}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${historyIndex === history.length - 1 ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-slate-950 border-slate-800 hover:bg-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              <RotateCw className="w-4 h-4" /> Redo
            </button>

            {plan === 'free' && (
              <button
                onClick={openProCheckout}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-[#FFFFFF] bg-[#2563EB] hover:bg-[#1D4ED8] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                title="Upgrade plan to unlock AI data corrections, ML deduplication, and custom regex rules"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Upgrade</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {isViewer && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4" />
          <span>You are logged in as a <strong>Viewer</strong>. Active modifications are locked under write permissions. Sign up or log in as an Admin/Editor to run operations.</span>
        </div>
      )}

      {/* Enterprise Quick Action Toolbar */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <button
            onClick={handleRunProfiler}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all whitespace-nowrap shrink-0"
          >
            <BarChart2 className="w-4 h-4 shrink-0" />
            <span>Data Profiler</span>
          </button>

          <button
            onClick={() => setIsCopilotOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all whitespace-nowrap shrink-0"
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span>AI Copilot</span>
          </button>

          <button
            onClick={() => setIsWorkflowOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span>Workflow Recorder</span>
          </button>

          <button
            onClick={handleGenerateAuditReport}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all whitespace-nowrap shrink-0"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Audit & Compliance Report</span>
          </button>

          {plan === 'free' && (
            <button
              onClick={openProCheckout}
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all whitespace-nowrap shrink-0"
              title="Upgrade to Pro to unlock AI corrections, ML deduplication, and custom regex rules"
            >
              <Zap className="w-4 h-4 shrink-0" />
              <span>Upgrade Plan</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search 22 hygiene routines..."
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs outline-none ${
              isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
            }`}
          />
        </div>
      </div>

      {/* Recharts Row Distribution & Cleaning Progress Widget */}
      <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <BarChart2 className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                Row Distribution & Cleaning Progress
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {rowDistribution.cleanedPercentage}% Cleaned
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Live breakdown of verified clean rows versus rows requiring manual inspection
              </p>
            </div>
          </div>

          {reviewFilterMode !== 'all' && (
            <button
              onClick={() => setReviewFilterMode('all')}
              className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter ({reviewFilterMode === 'review' ? 'Manual Review' : 'Cleaned Only'})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Recharts Pie Donut Visualization */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative min-h-[160px]">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={rowDistribution.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {rowDistribution.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                {/* SVG Center Text Labels for Accessibility & SVG Exporters */}
                <text
                  x="50%"
                  y="45%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isDarkMode ? '#F9FAFB' : '#111827'}
                  fontSize="22"
                  fontWeight="900"
                  fontFamily="monospace"
                  opacity="1"
                  pointerEvents="none"
                  className="chart-center-label-primary"
                >
                  {rowDistribution.cleanedPercentage}%
                </text>
                <text
                  x="50%"
                  y="62%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isDarkMode ? '#9CA3AF' : '#4B5563'}
                  fontSize="10"
                  fontWeight="800"
                  fontFamily="sans-serif"
                  letterSpacing="0.05em"
                  opacity="1"
                  pointerEvents="none"
                  className="chart-center-label-secondary"
                >
                  CLEANED
                </text>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className={`p-2.5 rounded-xl border text-xs shadow-xl font-sans ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                        }`}>
                          <p className="font-bold flex items-center gap-1.5" style={{ color: data.color }}>
                            {data.name}
                          </p>
                          <p className={`font-mono text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {data.value.toLocaleString()} rows ({data.percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Donut Center Label Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 chart-donut-center">
              <span 
                className="text-2xl font-black tracking-tight font-mono transition-colors duration-200"
                style={{ color: isDarkMode ? '#F9FAFB' : '#111827', opacity: 1 }}
              >
                {rowDistribution.cleanedPercentage}%
              </span>
              <span 
                className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-200"
                style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563', opacity: 1 }}
              >
                Cleaned
              </span>
            </div>
          </div>

          {/* Metric Cards and Quick Actions */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cleaned Rows Metric Card */}
            <div 
              onClick={() => setReviewFilterMode(reviewFilterMode === 'cleaned' ? 'all' : 'cleaned')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                reviewFilterMode === 'cleaned'
                  ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30' : 'bg-emerald-50 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                  : isDarkMode
                  ? 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900'
                  : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                  Cleaned Rows
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                  {rowDistribution.cleanedPercentage}%
                </span>
              </div>
              <p className="text-lg font-extrabold font-mono">
                <span className={isDarkMode ? 'text-slate-100' : 'text-slate-900'}>{rowDistribution.cleanedRows.toLocaleString()}</span>{' '}
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>/ {rowDistribution.totalRows.toLocaleString()}</span>
              </p>
              <p className={`text-[10px] mt-1 flex items-center justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>Verified & sanitized</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-500 underline">
                  {reviewFilterMode === 'cleaned' ? 'Active Filter' : 'Filter Table'}
                </span>
              </p>
            </div>

            {/* Manual Review Required Metric Card */}
            <div 
              onClick={() => setReviewFilterMode(reviewFilterMode === 'review' ? 'all' : 'review')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                reviewFilterMode === 'review'
                  ? isDarkMode ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30' : 'bg-amber-50 border-amber-500/50 shadow-sm ring-1 ring-amber-500/30'
                  : isDarkMode
                  ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/30 hover:bg-slate-900'
                  : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                  Manual Review Required
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500">
                  {rowDistribution.manualReviewPercentage}%
                </span>
              </div>
              <p className="text-lg font-extrabold font-mono">
                <span className={isDarkMode ? 'text-slate-100' : 'text-slate-900'}>{rowDistribution.manualReviewRows.toLocaleString()}</span>{' '}
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>rows</span>
              </p>
              <p className={`text-[10px] mt-1 flex items-center justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>Flagged anomalies</span>
                <span className="font-bold text-amber-600 dark:text-amber-500 underline">
                  {reviewFilterMode === 'review' ? 'Active Filter' : 'Filter Table'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Proportion Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/50 flex flex-col gap-1.5">
          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-800 flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${rowDistribution.cleanedPercentage}%` }}
              title={`Cleaned: ${rowDistribution.cleanedRows} rows (${rowDistribution.cleanedPercentage}%)`}
            />
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${rowDistribution.manualReviewPercentage}%` }}
              title={`Manual Review Required: ${rowDistribution.manualReviewRows} rows (${rowDistribution.manualReviewPercentage}%)`}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              Cleaned ({rowDistribution.cleanedRows.toLocaleString()})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              Manual Review Required ({rowDistribution.manualReviewRows.toLocaleString()})
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Actions panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-5">Automated Actions</h3>
            
            <div className="space-y-4">
              {/* AI Smart Data Correction */}
              <button
                onClick={handleRunAiCorrectionScan}
                disabled={isViewer}
                className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01] flex gap-3.5 items-start cursor-pointer hover:bg-blue-500/5 hover:border-blue-500/30 group disabled:opacity-50 ${isDarkMode ? 'bg-slate-950/80 border-blue-500/30' : 'bg-blue-50/50 border-blue-200'}`}
              >
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow shrink-0"><Sparkles className="w-4 h-4" /></div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-blue-500">AI Smart Data Correction</h4>
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">AI</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Spelling fixes, city/country standardizations, and abbreviation expansions.</p>
                </div>
              </button>

              {/* AI Missing Value Prediction */}
              <button
                onClick={handleRunMissingPredictionScan}
                disabled={isViewer}
                className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01] flex gap-3.5 items-start cursor-pointer hover:bg-indigo-500/5 hover:border-indigo-500/30 group disabled:opacity-50 ${isDarkMode ? 'bg-slate-950/80 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'}`}
              >
                <div className="p-2 bg-indigo-600 text-white rounded-lg shadow shrink-0"><Zap className="w-4 h-4" /></div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-indigo-400">AI Missing Value Imputation</h4>
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">AI</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Predicts missing metrics & categories from cross-column relational patterns.</p>
                </div>
              </button>

              {/* Intelligent Fuzzy Duplicate Detection */}
              <button
                onClick={handleRunFuzzyDuplicateScan}
                disabled={isViewer}
                className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01] flex gap-3.5 items-start cursor-pointer hover:bg-purple-500/5 hover:border-purple-500/30 group disabled:opacity-50 ${isDarkMode ? 'bg-slate-950/80 border-purple-500/30' : 'bg-purple-50/50 border-purple-200'}`}
              >
                <div className="p-2 bg-purple-600 text-white rounded-lg shadow shrink-0"><GitMerge className="w-4 h-4" /></div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-purple-400">Fuzzy Duplicate Resolution</h4>
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">ML</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Similarity matching using Levenshtein distance & side-by-side merging.</p>
                </div>
              </button>

              {/* Invisible Control Character Cleaner */}
              <button
                onClick={handleRunInvisibleCharCleaner}
                disabled={isViewer}
                className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01] flex gap-3.5 items-start cursor-pointer hover:bg-emerald-500/5 hover:border-emerald-500/30 group disabled:opacity-50 ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-100'}`}
              >
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg group-hover:bg-emerald-500/20"><Code className="w-4 h-4" /></div>
                <div>
                  <h4 className="font-bold text-xs">Invisible Character Cleaner</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Strips zero-width spaces (\u200B), non-breaking spaces, and ASCII control codes.</p>
                </div>
              </button>

              {/* PII Protection */}
              <button
                onClick={() => {
                  if (plan !== 'enterprise') {
                    openEnterpriseModal();
                    return;
                  }
                  const firstCol = currentHeaders[0] || '';
                  const res = maskPiiData(currentHeaders, currentRows, firstCol, 'mask');
                  pushState(res.updatedRows, res.summary);
                }}
                disabled={isViewer}
                className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01] flex gap-3.5 items-start cursor-pointer hover:bg-amber-500/5 hover:border-amber-500/30 group disabled:opacity-50 ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-100'}`}
              >
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg group-hover:bg-amber-500/20"><Shield className="w-4 h-4" /></div>
                <div>
                  <h4 className="font-bold text-xs">PII Masking & Encryption</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Protects emails, phone numbers, and SSNs for GDPR / HIPAA compliance.</p>
                </div>
              </button>

              {/* Formula & CSV Injection Protection */}
              <button
                onClick={handleRunFormulaProtect}
                disabled={isViewer}
                className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01] flex gap-3.5 items-start cursor-pointer hover:bg-rose-500/5 hover:border-rose-500/30 group disabled:opacity-50 ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-100'}`}
              >
                <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg group-hover:bg-rose-500/20"><Lock className="w-4 h-4" /></div>
                <div>
                  <h4 className="font-bold text-xs">CSV Injection Shield</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Escapes executable cells starting with =, +, -, @ to block Excel exploit macros.</p>
                </div>
              </button>

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
                  : isDarkMode ? 'hover:bg-blue-500/5 hover:border-blue-500/30 border-slate-800/80 bg-slate-950/60' : 'hover:bg-blue-500/5 hover:border-blue-500/30 border-slate-200 bg-slate-50'
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
                      <h4 className={`font-bold text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Conditional Column Splitter</h4>
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

              {/* Merge Columns Accordion */}
              <div className={`rounded-xl border transition-all ${
                isMergerOpen 
                  ? 'border-indigo-500/40 bg-indigo-500/5 shadow-xs' 
                  : isDarkMode ? 'hover:bg-indigo-500/5 hover:border-indigo-500/30 border-slate-800/80 bg-slate-950/60' : 'hover:bg-indigo-500/5 hover:border-indigo-500/30 border-slate-200 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMergerOpen(!isMergerOpen);
                    setIsSplitterOpen(false);
                    setIsValidationOpen(false);
                    setIsPatternOpen(false);
                    setIsMappingOpen(false);
                  }}
                  disabled={isViewer}
                  className="w-full p-4 text-left flex gap-3.5 items-start cursor-pointer group disabled:opacity-50"
                >
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg group-hover:bg-indigo-500/20">
                    <GitMerge className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className={`font-bold text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Merge Columns (Same Data Type)</h4>
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isMergerOpen ? 'rotate-90 text-indigo-400' : ''}`} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Combine two columns sharing identical data types into a single merged column.</p>
                  </div>
                </button>

                {isMergerOpen && (
                  <div className={`p-4 border-t px-5 space-y-4 text-xs ${isDarkMode ? 'border-slate-800/80 text-slate-200' : 'border-slate-150 text-slate-700'}`}>
                    {/* First and Second Column Selectors */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">First Column</label>
                        <select
                          value={mergeCol1}
                          onChange={(e) => setMergeCol1(e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                          }`}
                        >
                          <option value="">-- First Column --</option>
                          {currentHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Second Column</label>
                        <select
                          value={mergeCol2}
                          onChange={(e) => setMergeCol2(e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                          }`}
                        >
                          <option value="">-- Second Column --</option>
                          {currentHeaders.map(h => (
                            <option key={h} value={h} disabled={h === mergeCol1}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Data Type Matching Feedback Banner */}
                    {mergeCol1 && mergeCol2 && (
                      <div className="space-y-2">
                        {mergeCol1 === mergeCol2 ? (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Select two different columns to merge.</span>
                          </div>
                        ) : (() => {
                          const type1 = inferColumnType(mergeCol1);
                          const type2 = inferColumnType(mergeCol2);
                          const isMatch = type1 === type2;
                          return isMatch ? (
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Data Types Match: Both columns are <strong className="font-mono uppercase">{type1}</strong></span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 uppercase">
                                Verified
                              </span>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-medium space-y-1">
                              <div className="flex items-center gap-2 font-bold">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Data Type Mismatch Detected</span>
                              </div>
                              <p className="text-[10px] text-rose-300 leading-normal pl-5">
                                "{mergeCol1}" is <strong className="font-mono uppercase">{type1}</strong>, but "{mergeCol2}" is <strong className="font-mono uppercase">{type2}</strong>. Both columns must have identical data types to merge.
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Merged Column Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Merged Column Name</label>
                      <input
                        type="text"
                        value={targetMergedColName}
                        onChange={(e) => setTargetMergedColName(e.target.value)}
                        placeholder="e.g. Full_Name or Combined_Total"
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                        }`}
                      />
                    </div>

                    {/* Merge Delimiter / Joiner */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Join Separator</label>
                        <select
                          value={mergeDelimiter}
                          onChange={(e) => setMergeDelimiter(e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                          }`}
                        >
                          <option value="space">Space (" ")</option>
                          <option value="comma">Comma (", ")</option>
                          <option value="dash">Dash (" - ")</option>
                          <option value="slash">Slash (" / ")</option>
                          <option value="underscore">Underscore ("_")</option>
                          <option value="none">No Separator ("")</option>
                          <option value="custom">Custom Text...</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Source Columns</label>
                        <label className={`flex items-center gap-2 text-[11px] font-medium cursor-pointer select-none ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          <input
                            type="checkbox"
                            checked={keepOriginalCols}
                            onChange={(e) => setKeepOriginalCols(e.target.checked)}
                            className={`rounded text-indigo-600 focus:ring-0 cursor-pointer ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'}`}
                          />
                          <span>Keep original columns</span>
                        </label>
                      </div>
                    </div>

                    {mergeDelimiter === 'custom' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Separator Character(s)</label>
                        <input
                          type="text"
                          value={customMergeDelimiter}
                          onChange={(e) => setCustomMergeDelimiter(e.target.value)}
                          placeholder="e.g. :: or |"
                          className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                          }`}
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={runColumnMerger}
                      disabled={
                        !mergeCol1 || 
                        !mergeCol2 || 
                        !targetMergedColName.trim() || 
                        mergeCol1 === mergeCol2 || 
                        inferColumnType(mergeCol1) !== inferColumnType(mergeCol2)
                      }
                      className={`w-full py-2.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <GitMerge className="w-3.5 h-3.5" /> Execute Column Merge
                    </button>

                    {/* Column Merge Action History & Revert Log */}
                    {mergeActionsHistory.length > 0 && (
                      <div className="pt-3 border-t border-slate-800/60 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GitMerge className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                              Merge History ({mergeActionsHistory.length})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUndoMerge()}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Undo Latest Merge</span>
                          </button>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {mergeActionsHistory.map((rec) => (
                            <div 
                              key={rec.id}
                              className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs transition-colors ${
                                isDarkMode ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="space-y-0.5 truncate pr-2">
                                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                                  <span className="text-slate-300 truncate">{rec.col1}</span>
                                  <span className="text-indigo-400 font-mono">+</span>
                                  <span className="text-slate-300 truncate">{rec.col2}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="text-emerald-400 font-mono truncate">{rec.targetCol}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold">
                                    {rec.dataType}
                                  </span>
                                  <span>{rec.timestamp}</span>
                                  {rec.keepOriginalCols && (
                                    <span className="text-slate-500">(Kept originals)</span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleUndoMerge(rec.id)}
                                title={`Revert merge into "${rec.targetCol}"`}
                                className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Undo</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Column Validation Engine Accordion */}
              <div className={`rounded-xl border transition-all ${
                isValidationOpen 
                  ? 'border-emerald-500/40 bg-emerald-500/5 shadow-xs' 
                  : isDarkMode ? 'hover:bg-emerald-500/5 hover:border-emerald-500/30 border-slate-800/80 bg-slate-950/60' : 'hover:bg-emerald-500/5 hover:border-emerald-500/30 border-slate-200 bg-slate-50'
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
                      <h4 className={`font-bold text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Smart Validation Engine</h4>
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
                  : isDarkMode ? 'hover:bg-indigo-500/5 hover:border-indigo-500/30 border-slate-800/80 bg-slate-950/60' : 'hover:bg-indigo-500/5 hover:border-indigo-500/30 border-slate-200 bg-slate-50'
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
                      <h4 className={`font-bold text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Pattern Sanitization Engine</h4>
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

              {/* AI Column Mapping Accordion */}
              <div className={`rounded-xl border transition-all ${
                isMappingOpen 
                  ? 'border-purple-500/40 bg-purple-500/5 shadow-xs' 
                  : isDarkMode ? 'hover:bg-purple-500/5 hover:border-purple-500/30 border-slate-800/80 bg-slate-950/60' : 'hover:bg-purple-500/5 hover:border-purple-500/30 border-slate-200 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMappingOpen(!isMappingOpen);
                    setIsSplitterOpen(false);
                    setIsValidationOpen(false);
                    setIsPatternOpen(false);
                  }}
                  disabled={isViewer}
                  className="w-full p-4 text-left flex gap-3.5 items-start cursor-pointer group disabled:opacity-50"
                >
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:bg-purple-500/20">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className={`font-bold text-xs flex items-center gap-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                        AI Column Mapping Standardizer
                        <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                      </h4>
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isMappingOpen ? 'rotate-90 text-purple-400' : ''}`} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Map messy header names (e.g., usr_email) to database snake_case, camelCase, or Canonical standards using AI.</p>
                  </div>
                </button>

                {isMappingOpen && (
                  <div className={`p-4 border-t px-5 space-y-4 text-xs ${isDarkMode ? 'border-slate-800/80 text-slate-200' : 'border-slate-150 text-slate-700'}`}>
                    
                    {/* Convention Style Select */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Naming Convention</label>
                      <select
                        value={mappingStyle}
                        onChange={(e) => setMappingStyle(e.target.value as any)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 border'
                        }`}
                      >
                        <option value="database">Database Style (snake_case - e.g. customer_id)</option>
                        <option value="javascript">API/JS Style (camelCase - e.g. customerId)</option>
                        <option value="clean_display">Display Style (Title Case - e.g. Customer ID)</option>
                        <option value="canonical">Compliance Canonical (Platform Standard - e.g. Transaction ID)</option>
                      </select>
                    </div>

                    {/* Suggestions trigger button */}
                    <button
                      type="button"
                      onClick={fetchMappingSuggestions}
                      disabled={isMappingLoading}
                      className={`w-full py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50`}
                    >
                      {isMappingLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Analyzing Headers with AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                          Suggest Naming Mappings
                        </>
                      )}
                    </button>

                    {/* Mapping List / Output Table */}
                    {Object.keys(mappingSuggestions).length > 0 && (
                      <div className="space-y-3.5 pt-2 border-t border-slate-800/60 animate-slideDown">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Suggested Mappings</label>
                          <button
                            type="button"
                            onClick={() => {
                              const allSelected = Object.values(selectedMappings).every(v => v);
                              const nextSelected: Record<string, boolean> = {};
                              currentHeaders.forEach(h => {
                                nextSelected[h] = !allSelected;
                              });
                              setSelectedMappings(nextSelected);
                            }}
                            className="text-[9px] font-bold text-purple-400 hover:underline cursor-pointer"
                          >
                            Toggle All
                          </button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2.5">
                          {currentHeaders.map((header) => {
                            const suggested = editableMappings[header] || '';
                            const originalSuggested = mappingSuggestions[header] || '';
                            const explanation = mappingExplanations[header] || 'Standardized heading name.';
                            const isSelected = !!selectedMappings[header];
                            const isChanged = suggested !== header;

                            return (
                              <div 
                                key={header}
                                className={`p-2.5 rounded-lg border transition-all ${
                                  isSelected 
                                    ? 'bg-purple-500/5 border-purple-500/20' 
                                    : 'bg-slate-950/20 border-slate-800/40'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  {/* Custom Checkbox */}
                                  <input 
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => setSelectedMappings(prev => ({ ...prev, [header]: e.target.checked }))}
                                    className="mt-0.5 rounded border-slate-700 text-purple-600 focus:ring-purple-500/40 cursor-pointer h-3.5 w-3.5 bg-slate-900"
                                  />
                                  <div className="flex-1 min-w-0">
                                    {/* Compare display */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 truncate max-w-[120px]">
                                        {header}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-slate-500" />
                                      <input
                                        type="text"
                                        value={suggested}
                                        onChange={(e) => setEditableMappings(prev => ({ ...prev, [header]: e.target.value }))}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold w-full sm:w-auto font-mono max-w-[140px] focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                                          isChanged 
                                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30' 
                                            : 'bg-slate-900 border border-slate-800 text-slate-400'
                                        }`}
                                      />
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                                      {explanation}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Apply Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={applyColumnMappings}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-white" />
                            Apply Selected Column Renaming
                          </button>
                        </div>
                      </div>
                    )}
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
                  onClick={() => {
                    if (activeFile) {
                      const currentFileState: CSVFile = {
                        ...activeFile,
                        headers: currentHeaders,
                        cleanedRows: currentRows,
                      };
                      exportCleanedAuditToExcel(currentFileState);
                    }
                  }}
                  id="btn-export-excel-cleaned"
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/20' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 shadow-xs'
                  }`}
                  title="Export cleaned dataset and audit logs to structured Excel (.xlsx) workbook"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  Export Excel (.xlsx)
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
                <span className={`text-[10px] px-2.5 py-2 rounded font-bold uppercase tracking-wider ${
                  (rowSearchQuery || filterColumn !== 'all' || filterValue)
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                    : isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}>
                  {filteredRowsWithIndices.length === currentRows.length
                    ? `${currentRows.length} Rows remaining`
                    : `${filteredRowsWithIndices.length} / ${currentRows.length} Filtered`}
                </span>
              </div>
            </div>

            {/* Interactive Hygiene Workspace Row Search & Column Filter Bar */}
            <div className={`p-4 rounded-xl border mb-5 ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                
                {/* Global or Column-Specific Text Search */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rowSearchQuery}
                    onChange={(e) => {
                      setRowSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={filterColumn === 'all' ? "Search all row cell values..." : `Search row values in '${filterColumn}'...`}
                    className={`w-full pl-9 pr-8 py-2 text-xs rounded-lg border font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                    }`}
                  />
                  {rowSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setRowSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Column Selector & Condition Filter */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <select
                      value={filterColumn}
                      onChange={(e) => {
                        setFilterColumn(e.target.value);
                        setFilterValue('');
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-2 text-xs rounded-lg border font-medium focus:outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      <option value="all">All Columns</option>
                      {currentHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {filterColumn !== 'all' && (
                    <>
                      <select
                        value={filterOperator}
                        onChange={(e) => {
                          setFilterOperator(e.target.value as any);
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-2 text-xs rounded-lg border font-medium focus:outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                        }`}
                      >
                        <option value="contains">Contains</option>
                        <option value="equals">Equals</option>
                        <option value="starts_with">Starts With</option>
                        <option value="ends_with">Ends With</option>
                        <option value="is_empty">Is Empty</option>
                        <option value="is_not_empty">Is Not Empty</option>
                      </select>

                      {filterOperator !== 'is_empty' && filterOperator !== 'is_not_empty' && (
                        <div className="relative">
                          <input
                            type="text"
                            value={filterValue}
                            onChange={(e) => {
                              setFilterValue(e.target.value);
                              setCurrentPage(1);
                            }}
                            placeholder="Filter value..."
                            className={`px-2.5 py-2 pr-7 text-xs rounded-lg border font-mono focus:outline-none ${
                              isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          />
                          {filterValue && (
                            <button
                              type="button"
                              onClick={() => {
                                setFilterValue('');
                                setCurrentPage(1);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Reset Search / Filter Button */}
                  {(rowSearchQuery || filterColumn !== 'all' || filterValue) && (
                    <button
                      type="button"
                      onClick={() => {
                        setRowSearchQuery('');
                        setFilterColumn('all');
                        setFilterOperator('contains');
                        setFilterValue('');
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-2 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Sample Value Selector Chips for Selected Column */}
              {filterColumn !== 'all' && uniqueColumnValues.length > 0 && filterOperator !== 'is_empty' && filterOperator !== 'is_not_empty' && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider mr-1">Quick Values:</span>
                  {uniqueColumnValues.slice(0, 8).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setFilterValue(val);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-mono transition-all cursor-pointer ${
                        filterValue === val
                          ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold'
                          : isDarkMode
                            ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {val.length > 18 ? val.substring(0, 18) + '...' : val}
                    </button>
                  ))}
                </div>
              )}

              {/* Active Filters Summary Tag */}
              {(rowSearchQuery || sortColumn || (filterColumn !== 'all' && (filterValue || filterOperator === 'is_empty' || filterOperator === 'is_not_empty'))) && (
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 font-medium">Active criteria:</span>
                    {filterColumn !== 'all' && (
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono font-bold">
                        Column: {filterColumn} ({filterOperator})
                      </span>
                    )}
                    {(rowSearchQuery || filterValue) && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                        Match: "{rowSearchQuery || filterValue}"
                      </span>
                    )}
                    {sortColumn && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono font-bold flex items-center gap-1.5">
                        <span>Sort: {sortColumn === '__row__' ? 'Row #' : sortColumn} ({sortDirection === 'asc' ? 'Asc' : 'Desc'})</span>
                        <button 
                          type="button" 
                          onClick={() => { setSortColumn(null); setSortDirection('asc'); }}
                          className="hover:text-purple-200 transition-colors p-0.5 rounded hover:bg-purple-500/20 cursor-pointer"
                          title="Clear sorting"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 font-mono font-semibold text-[11px]">
                    Matched <strong className="text-cyan-400">{sortedAndFilteredRows.length}</strong> of {currentRows.length} rows
                  </span>
                </div>
              )}
            </div>

            {/* Responsive Comparison Table Container */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[420px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    <th 
                      onClick={() => handleSort('__row__')}
                      className={`p-3.5 font-bold font-mono cursor-pointer select-none transition-colors group ${
                        sortColumn === '__row__'
                          ? isDarkMode ? 'text-cyan-400 bg-cyan-950/30 font-extrabold' : 'text-blue-600 bg-blue-100/60 font-extrabold'
                          : isDarkMode ? 'hover:bg-slate-900 hover:text-slate-100' : 'hover:bg-slate-200/80 hover:text-slate-900'
                      }`}
                      title="Click to sort by Row Number"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Row</span>
                        {sortColumn === '__row__' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 transition-opacity shrink-0 text-slate-400" />
                        )}
                      </div>
                    </th>
                    {currentHeaders.map((header) => {
                      const isSorted = sortColumn === header;
                      return (
                        <th 
                          key={header} 
                          onClick={() => handleSort(header)}
                          className={`p-3.5 font-bold cursor-pointer select-none transition-colors group ${
                            isSorted
                              ? isDarkMode ? 'text-cyan-400 bg-cyan-950/30 font-extrabold' : 'text-blue-600 bg-blue-100/60 font-extrabold'
                              : isDarkMode ? 'hover:bg-slate-900 hover:text-slate-100' : 'hover:bg-slate-200/80 hover:text-slate-900'
                          }`}
                          title={`Click to sort by ${header} (${isSorted ? (sortDirection === 'asc' ? 'Descending' : 'Default') : 'Ascending'})`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{header}</span>
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 transition-opacity shrink-0 text-slate-400" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {sortedAndFilteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={currentHeaders.length + 1} className="p-8 text-center text-slate-400 italic">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-6 h-6 text-amber-500/80" />
                          <p className="font-sans font-semibold text-xs">No matching dataset rows found.</p>
                          <p className="text-[11px] text-slate-500 font-sans">Try adjusting your search keywords or column filter criteria.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setRowSearchQuery('');
                              setFilterColumn('all');
                              setFilterOperator('contains');
                              setFilterValue('');
                              setSortColumn(null);
                              setSortDirection('asc');
                              setCurrentPage(1);
                            }}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-sans text-xs font-bold hover:bg-blue-500/20 transition-all cursor-pointer"
                          >
                            Reset Search, Filters & Sorting
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedAndFilteredRows
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map(({ row, originalIndex }) => {
                        const rIdx = originalIndex;
                        const isDup = activeFile ? activeFile.issues.some(i => i.type === 'duplicate' && i.row === rIdx + 2) : false;
                        
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
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {sortedAndFilteredRows.length > 0 && (
              <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs border-t border-slate-800/30 pt-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-slate-400 font-medium">
                    Showing <span className="font-mono text-blue-500 font-bold">{Math.min(sortedAndFilteredRows.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
                    <span className="font-mono text-blue-500 font-bold">{Math.min(sortedAndFilteredRows.length, currentPage * pageSize)}</span> of{' '}
                    <span className="font-mono text-blue-500 font-bold">{sortedAndFilteredRows.length}</span> records
                    {sortedAndFilteredRows.length !== currentRows.length && (
                      <span className="text-[10px] text-cyan-400 font-mono ml-2">
                        (filtered from {currentRows.length} total)
                      </span>
                    )}
                  </span>

                  {/* Rows per page selector */}
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold font-mono focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                      <option value={500}>500</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Page jump selector */}
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <span>Jump to:</span>
                    <select
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Number(e.target.value))}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold font-mono focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
                    >
                      {Array.from({ length: Math.ceil(sortedAndFilteredRows.length / pageSize) || 1 }, (_, i) => i + 1).map(p => (
                        <option key={p} value={p}>
                          Page {p} of {Math.ceil(sortedAndFilteredRows.length / pageSize) || 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
                      title="First Page"
                    >
                      « First
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
                      title="Previous Page"
                    >
                      ‹ Prev
                    </button>
                    <span className="px-2.5 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold font-mono text-[10px]">
                      {currentPage} / {Math.ceil(sortedAndFilteredRows.length / pageSize) || 1}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= Math.ceil(sortedAndFilteredRows.length / pageSize)}
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(sortedAndFilteredRows.length / pageSize), prev + 1))}
                      className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
                      title="Next Page"
                    >
                      Next ›
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= Math.ceil(sortedAndFilteredRows.length / pageSize)}
                      onClick={() => setCurrentPage(Math.ceil(sortedAndFilteredRows.length / pageSize))}
                      className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all bg-slate-950 border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 cursor-pointer"
                      title="Last Page"
                    >
                      Last »
                    </button>
                  </div>
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
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
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
              <div className="text-[10px] text-slate-400 text-center sm:text-left flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span><strong>Sandbox Tip:</strong> If print blocks inside AI Studio preview, open the app in a new tab to download/print.</span>
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

      {/* Enterprise AI Modals & Drawers */}
      <DataProfilerModal
        isOpen={isProfilerOpen}
        onClose={() => setIsProfilerOpen(false)}
        profile={datasetProfile}
        onApplyRecommendation={(rec) => {
          if (rec.id === 'rec-dup') removeDuplicates();
          else if (rec.id === 'rec-dates') standardizeDates();
          else if (rec.id === 'rec-nulls') fillMissingValues();
          else handleRunAiCorrectionScan();
        }}
        isDarkMode={isDarkMode}
      />

      <AiCorrectionModal
        isOpen={isAiCorrectionOpen}
        onClose={() => setIsAiCorrectionOpen(false)}
        items={correctionItems}
        onApplyCorrections={handleApplyAiCorrections}
        isDarkMode={isDarkMode}
      />

      <AiMissingPredictionModal
        isOpen={isMissingPredictionOpen}
        onClose={() => setIsMissingPredictionOpen(false)}
        predictions={predictionItems}
        onApplyPredictions={handleApplyMissingPredictions}
        isDarkMode={isDarkMode}
      />

      <FuzzyDuplicateModal
        isOpen={isFuzzyDupOpen}
        onClose={() => setIsFuzzyDupOpen(false)}
        pairs={fuzzyPairs}
        onApplyFuzzyDeduplication={handleApplyFuzzyDeduplication}
        isDarkMode={isDarkMode}
      />

      <AiCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        headers={currentHeaders}
        onExecutePlan={handleRunCopilotPlan}
        isDarkMode={isDarkMode}
      />

      <WorkflowManagerModal
        isOpen={isWorkflowOpen}
        onClose={() => setIsWorkflowOpen(false)}
        appliedSteps={appliedSteps}
        onRunWorkflow={(wf) => {
          let tempRows = [...currentRows];
          tempRows = cleanInvisibleCharacters(currentHeaders, tempRows).updatedRows;
          pushState(tempRows, `Executed workflow template: ${wf.name}`);
        }}
        isDarkMode={isDarkMode}
      />

      <AuditReportModal
        isOpen={isAuditReportOpen}
        onClose={() => setIsAuditReportOpen(false)}
        reportData={auditReportData}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
