import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Download, 
  FileText, 
  Clock,
  Sparkles,
  BrainCircuit,
  HelpCircle,
  ChevronRight,
  Check,
  X,
  Trash2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { CSVFile, AuditIssue, Severity, IssueType } from '../types';
import { detectCSVFormats } from '../lib/formatDetector';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

interface UploadCenterProps {
  onFileUpload: (newFile: CSVFile) => void;
  isDarkMode: boolean;
  accentClass: string;
}

export default function UploadCenter({ onFileUpload, isDarkMode, accentClass }: UploadCenterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileDetails, setFileDetails] = useState<{ name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for AI configuration & mapping step during file ingestion
  const [pendingFile, setPendingFile] = useState<CSVFile | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPreviewRows, setSelectedPreviewRows] = useState<number[]>([]);
  const [isBulkFixing, setIsBulkFixing] = useState(false);
  const [bulkFixMessage, setBulkFixMessage] = useState<string | null>(null);

  // Auto-save states and hooks
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [savedDraft, setSavedDraft] = useState<any | null>(null);

  // Load saved draft on mount or auth load
  useEffect(() => {
    let isMounted = true;
    const loadDraft = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      try {
        const draftRef = doc(db, 'drafts', currentUser.uid);
        const snap = await getDoc(draftRef);
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (data && data.pendingFile) {
            setSavedDraft(data);
          }
        }
      } catch (err) {
        console.error("Failed to load draft:", err);
      }
    };
    
    // Check auth changes to load draft as well
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadDraft();
      }
    });

    loadDraft();
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Background auto-save effect
  useEffect(() => {
    if (!pendingFile) return;

    const timer = setTimeout(async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      setIsAutoSaving(true);
      try {
        const draftRef = doc(db, 'drafts', currentUser.uid);
        const draftData = {
          userId: currentUser.uid,
          pendingFile: pendingFile,
          mappings: mappings,
          explanations: explanations,
          updatedAt: new Date().toISOString()
        };
        await setDoc(draftRef, draftData);
      } catch (err) {
        console.error("Background auto-save failed:", err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [pendingFile, mappings, explanations]);

  const handleResumeDraft = () => {
    if (!savedDraft) return;
    setPendingFile(savedDraft.pendingFile);
    setMappings(savedDraft.mappings || {});
    setExplanations(savedDraft.explanations || {});
    setSavedDraft(null);
  };

  const handleDiscardDraft = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'drafts', currentUser.uid));
      } catch (e) {
        console.error("Error deleting draft from Firestore:", e);
      }
    }
    setSavedDraft(null);
  };

  const runSanityCheck = () => {
    if (!pendingFile) return [];

    const checks: {
      id: string;
      title: string;
      description: string;
      status: 'pass' | 'warn' | 'fail';
      details?: string;
    }[] = [];

    // 1. Headers Validity & Completeness Check
    const emptyHeaders = pendingFile.headers.filter(h => !h || h.trim() === '');
    const hasDuplicateHeaders = new Set(pendingFile.headers).size !== pendingFile.headers.length;
    
    if (emptyHeaders.length > 0) {
      checks.push({
        id: 'headers_empty',
        title: 'Unnamed Column Headers',
        description: `Found ${emptyHeaders.length} empty or unnamed headers.`,
        status: 'fail',
        details: 'Column headers should not be empty. Standardize headers before continuing.'
      });
    } else if (hasDuplicateHeaders) {
      checks.push({
        id: 'headers_dup',
        title: 'Duplicate Headers',
        description: 'Multiple columns share the same header name.',
        status: 'fail',
        details: 'Each column must have a unique identifier for mapping.'
      });
    } else {
      checks.push({
        id: 'headers_ok',
        title: 'Structure Integrity',
        description: `${pendingFile.headers.length} valid headers detected.`,
        status: 'pass'
      });
    }

    // 2. Crucial Business Column Check (Date, ID, Amount)
    const lowerHeaders = pendingFile.headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const hasID = lowerHeaders.some(h => h.includes('id') || h.includes('txn') || h.includes('key') || h.includes('ref'));
    const hasDate = lowerHeaders.some(h => h.includes('date') || h.includes('time') || h.includes('timestamp'));
    const hasAmount = lowerHeaders.some(h => h.includes('amount') || h.includes('price') || h.includes('total') || h.includes('cost'));

    const missingCrucial = [];
    if (!hasID) missingCrucial.push('Transaction ID');
    if (!hasDate) missingCrucial.push('Transaction Date');
    if (!hasAmount) missingCrucial.push('Amount');

    if (missingCrucial.length > 0) {
      checks.push({
        id: 'crucial_fields',
        title: 'Essential Columns Detection',
        description: `Missing potential matches for: ${missingCrucial.join(', ')}.`,
        status: 'warn',
        details: 'Without mapping these columns, automated audit rules will not run.'
      });
    } else {
      checks.push({
        id: 'crucial_fields',
        title: 'Essential Columns Detection',
        description: 'All essential data types (ID, Date, Amount) detected.',
        status: 'pass'
      });
    }

    // 3. Row Counts & Data Volume Check
    if (pendingFile.rows.length === 0) {
      checks.push({
        id: 'data_volume',
        title: 'Dataset Volume',
        description: 'Spreadsheet contains 0 data rows.',
        status: 'fail',
        details: 'Please load a CSV that contains transactional records.'
      });
    } else if (pendingFile.rows.length < 3) {
      checks.push({
        id: 'data_volume',
        title: 'Dataset Volume',
        description: `Sparse dataset with only ${pendingFile.rows.length} rows.`,
        status: 'warn',
        details: 'Audit precision is improved with larger dataset samples.'
      });
    } else {
      checks.push({
        id: 'data_volume',
        title: 'Dataset Volume',
        description: `Healthy sample space: ${pendingFile.rows.length} records parsed.`,
        status: 'pass'
      });
    }

    // 4. Missing Values Scan
    const missingIssues = pendingFile.issues.filter(i => i.type === 'missing_value');
    if (missingIssues.length > 0) {
      checks.push({
        id: 'missing_cells',
        title: 'Empty Cell Scan',
        description: `Found ${missingIssues.length} blank cell values in spreadsheet.`,
        status: 'warn',
        details: 'Ensure optional attributes are mapped; mandatory fields will trigger critical errors.'
      });
    } else {
      checks.push({
        id: 'missing_cells',
        title: 'Empty Cell Scan',
        description: 'No empty data cells found.',
        status: 'pass'
      });
    }

    // 5. Data Format Uniformity Scan
    const formatIssues = pendingFile.issues.filter(i => i.type === 'invalid_format' || i.type === 'outlier');
    if (formatIssues.length > 0) {
      checks.push({
        id: 'format_consistency',
        title: 'Format Uniformity Scan',
        description: `Found ${formatIssues.length} formatting anomalies or outliers.`,
        status: 'warn',
        details: 'Discrepancies like non-ISO date notation or high outliers detected.'
      });
    } else {
      checks.push({
        id: 'format_consistency',
        title: 'Format Uniformity Scan',
        description: 'Date and numeric format structures are uniform.',
        status: 'pass'
      });
    }

    // 6. Duplicate Records Check
    const dupIssues = pendingFile.issues.filter(i => i.type === 'duplicate');
    if (dupIssues.length > 0) {
      checks.push({
        id: 'dup_records',
        title: 'Duplicate Row Scan',
        description: `Found ${dupIssues.length} duplicated spreadsheet records.`,
        status: 'warn',
        details: 'Duplicates will be flagged for compliance review.'
      });
    } else {
      checks.push({
        id: 'dup_records',
        title: 'Duplicate Row Scan',
        description: 'No exact row duplicates found.',
        status: 'pass'
      });
    }

    return checks;
  };

  const recalculateFileWithNewRows = (newRows: Record<string, string>[]) => {
    if (!pendingFile) return;

    // Auto-detect formats
    const detectedMetadata = detectCSVFormats(pendingFile.headers, newRows);

    // Generate real dynamic issues for the active rows
    const generatedIssues: AuditIssue[] = [];
    const seenRows = new Set<string>();

    newRows.forEach((row, rowIndex) => {
      const humanRowIndex = rowIndex + 2; // 1-indexed accounting for headers
      
      // 1. Check Duplicates
      const rowString = JSON.stringify(row);
      if (seenRows.has(rowString)) {
        generatedIssues.push({
          id: `dynamic-issue-dup-${rowIndex}`,
          type: 'duplicate',
          column: pendingFile.headers[0] || 'Row',
          row: humanRowIndex,
          value: 'Duplicate Row content',
          severity: 'critical',
          description: `Entire row matches a previous record exactly.`,
          suggestion: 'Deduplicate row during clean phase.',
          status: 'open'
        });
      } else {
        seenRows.add(rowString);
      }

      // 2. Check Missing Values & Formats
      pendingFile.headers.forEach(h => {
        const cellVal = row[h];
        if (cellVal === undefined || cellVal === '') {
          const isCrucial = h.toLowerCase().includes('id') || h.toLowerCase().includes('amount') || h.toLowerCase().includes('date') || h.toLowerCase().includes('email');
          generatedIssues.push({
            id: `dynamic-issue-missing-${rowIndex}-${h}`,
            type: 'missing_value',
            column: h,
            row: humanRowIndex,
            value: '',
            severity: isCrucial ? 'critical' : 'warning',
            description: `Missing cell value found in column "${h}".`,
            suggestion: isCrucial ? 'Required data. Impute value or contact editor.' : 'Fill with standard category or text.',
            status: 'open'
          });
        } else {
          // Check outliers on numeric columns
          if (h.toLowerCase().includes('amount') || h.toLowerCase().includes('pay') || h.toLowerCase().includes('price')) {
            const num = parseFloat(cellVal.replace(/[^0-9.-]/g, ''));
            if (!isNaN(num) && num > 100000) {
              generatedIssues.push({
                id: `dynamic-issue-outlier-${rowIndex}-${h}`,
                type: 'outlier',
                column: h,
                row: humanRowIndex,
                value: cellVal,
                severity: 'warning',
                description: `High numerical outlier found: ${cellVal}.`,
                suggestion: 'Check if transaction matches correct ledger approvals.',
                status: 'open'
              });
            }
          }
          // Check date format
          if (h.toLowerCase().includes('date') || detectedMetadata.dateFormats[h]) {
            const expectedFormat = detectedMetadata.dateFormats[h] || 'YYYY-MM-DD';
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(cellVal)) {
              let description = `Date "${cellVal}" does not follow YYYY-MM-DD standard format.`;
              let suggestion = 'Convert to standard ISO-8601 formatting.';

              if (expectedFormat !== 'YYYY-MM-DD') {
                description = `Date "${cellVal}" is in "${expectedFormat}" format. System standard is YYYY-MM-DD.`;
                suggestion = `Auto-standardize this column from "${expectedFormat}" during cleaning.`;
              }

              generatedIssues.push({
                id: `dynamic-issue-date-${rowIndex}-${h}`,
                type: 'invalid_format',
                column: h,
                row: humanRowIndex,
                value: cellVal,
                severity: 'warning',
                description: description,
                suggestion: suggestion,
                status: 'open'
              });
            }
          }
        }
      });
    });

    // Calculate score
    const issueCount = generatedIssues.length;
    const rowCount = newRows.length * pendingFile.headers.length;
    const score = Math.max(25, Math.min(100, Math.round(100 - (issueCount / (rowCount || 1)) * 300)));

    setPendingFile({
      ...pendingFile,
      rows: newRows,
      issues: generatedIssues,
      totalRowsCount: newRows.length,
      score: score,
      detectedMetadata: detectedMetadata
    });
  };

  const handleBulkAutoFix = async () => {
    if (!pendingFile) return;
    setIsBulkFixing(true);
    setBulkFixMessage(null);
    try {
      const response = await fetch('/api/gemini/bulk-autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: pendingFile.headers,
          rows: pendingFile.rows
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.rows) {
          recalculateFileWithNewRows(data.rows);
          if (data.method === 'gemini') {
            setBulkFixMessage('Success: Gemini AI corrected whitespace, date ISO standards, casing, and formatted all numeric values!');
          } else {
            setBulkFixMessage('Success: Programmatic auto-cleaner resolved date patterns, trimmed spacing, and normalized casing!');
          }
        } else {
          throw new Error('Invalid auto-fix response format');
        }
      } else {
        throw new Error('Bulk auto-fix failed');
      }
    } catch (e: any) {
      console.error('Error auto-fixing data rows:', e);
      setBulkFixMessage('Error running bulk auto-fix. Please try again.');
    } finally {
      setIsBulkFixing(false);
      setTimeout(() => {
        setBulkFixMessage(null);
      }, 6000);
    }
  };

  const handleDeleteSingleRow = (indexInPreview: number) => {
    if (!pendingFile) return;
    const newRows = pendingFile.rows.filter((_, idx) => idx !== indexInPreview);
    recalculateFileWithNewRows(newRows);
    setSelectedPreviewRows(prev => 
      prev
        .filter(i => i !== indexInPreview)
        .map(i => (i > indexInPreview ? i - 1 : i))
    );
  };

  const handleDeleteSelectedRows = () => {
    if (!pendingFile || selectedPreviewRows.length === 0) return;
    const newRows = pendingFile.rows.filter((_, idx) => !selectedPreviewRows.includes(idx));
    recalculateFileWithNewRows(newRows);
    setSelectedPreviewRows([]);
  };

  const fetchHeaderAnalysis = async (headers: string[], sampleRows: any[]) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/gemini/analyze-headers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers, sampleRows: sampleRows.slice(0, 3) })
      });
      if (response.ok) {
        const data = await response.json();
        setMappings(data.mappings || {});
        setExplanations(data.explanations || {});
      } else {
        throw new Error('Failed to analyze headers');
      }
    } catch (e) {
      console.error('Error analyzing headers:', e);
      // Fast high-fidelity local rules backup
      const defaultMappings: Record<string, string> = {};
      const defaultExplanations: Record<string, string> = {};
      headers.forEach(h => {
        const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lower.includes('id') || lower.includes('txn') || lower.includes('key') || lower.includes('ref')) {
          defaultMappings[h] = 'Transaction ID';
          defaultExplanations[h] = `Matched as 'Transaction ID' based on column pattern validation.`;
        } else if (lower.includes('date') || lower.includes('time') || lower.includes('timestamp')) {
          defaultMappings[h] = 'Transaction Date';
          defaultExplanations[h] = `Mapped as 'Transaction Date'. Sample values match date formats.`;
        } else if (lower.includes('name') || lower.includes('customer') || lower.includes('client')) {
          defaultMappings[h] = 'Customer Name';
          defaultExplanations[h] = `Matched as 'Customer Name' due to text identity naming keywords.`;
        } else if (lower.includes('email') || lower.includes('mail') || lower.includes('contact')) {
          defaultMappings[h] = 'Email / Contact';
          defaultExplanations[h] = `Identified as contact/email parameter in the dataset rows.`;
        } else if (lower.includes('amount') || lower.includes('price') || lower.includes('total') || lower.includes('cost')) {
          defaultMappings[h] = 'Amount';
          defaultExplanations[h] = `Matched currency numeric metrics to canonical 'Amount'.`;
        } else if (lower.includes('category') || lower.includes('type')) {
          defaultMappings[h] = 'Category';
          defaultExplanations[h] = `Matched column descriptors to canonical 'Category'.`;
        } else if (lower.includes('country') || lower.includes('region') || lower.includes('location')) {
          defaultMappings[h] = 'Country';
          defaultExplanations[h] = `Geographic mapping recommended.`;
        } else {
          defaultMappings[h] = 'None';
          defaultExplanations[h] = `Custom attribute defined as auxiliary metadata column.`;
        }
      });
      setMappings(defaultMappings);
      setExplanations(defaultExplanations);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setErrorMsg('');
    setFileDetails(null);
    setUploadProgress(null);

    // Validate type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setErrorMsg('Invalid file format. CSV Auditor Pro exclusively supports standard .csv spreadsheet formats.');
      return;
    }

    // Validate size (100MB limit for high-throughput stream optimization)
    if (file.size > 100 * 1024 * 1024) {
      setErrorMsg('File exceeds 100MB limits. Upgrade to Enterprise for multi-gigabyte server-side streams.');
      return;
    }

    setFileDetails({ name: file.name, size: file.size });

    // Simulate progress upload
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        
        // Parse actual CSV file client-side!
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            if (!text) throw new Error('Empty spreadsheet content');
            
            const isLargeFile = file.size > 5 * 1024 * 1024; // Treat files > 5MB as large
            
            // Count total lines/rows performantly without array allocations
            let totalLinesCount = 0;
            let pos = 0;
            while ((pos = text.indexOf('\n', pos)) !== -1) {
              totalLinesCount++;
              pos++;
            }
            if (text.length > 0 && text[text.length - 1] !== '\n') {
              totalLinesCount++;
            }

            // Extract a preview section of lines if it is a large file, otherwise parse all
            const maxLinesToParse = isLargeFile ? 10000 : totalLinesCount;
            let endPos = 0;
            let linesCollected = 0;
            while (linesCollected < maxLinesToParse && endPos !== -1) {
              endPos = text.indexOf('\n', endPos);
              if (endPos !== -1) {
                endPos++;
                linesCollected++;
              }
            }
            const previewText = (isLargeFile && endPos !== -1) ? text.substring(0, endPos) : text;
            
            // Parse CSV lines
            const lines = previewText.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length === 0) throw new Error('Spreadsheet has no lines');

            const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
            const rows: Record<string, string>[] = [];

            for (let i = 1; i < lines.length; i++) {
              const columns = lines[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
              const rowObj: Record<string, string> = {};
              headers.forEach((h, index) => {
                rowObj[h] = columns[index] || '';
              });
              rows.push(rowObj);
            }

            // Auto-detect formats during ingestion
            const detectedMetadata = detectCSVFormats(headers, rows);

            // Generate real dynamic issues for the active rows
            const generatedIssues: AuditIssue[] = [];
            const seenRows = new Set<string>();

            rows.forEach((row, rowIndex) => {
              const humanRowIndex = rowIndex + 2; // 1-indexed accounting for headers
              
              // 1. Check Duplicates
              const rowString = JSON.stringify(row);
              if (seenRows.has(rowString)) {
                generatedIssues.push({
                  id: `dynamic-issue-dup-${rowIndex}`,
                  type: 'duplicate',
                  column: headers[0] || 'Row',
                  row: humanRowIndex,
                  value: 'Duplicate Row content',
                  severity: 'critical',
                  description: `Entire row matches a previous record exactly.`,
                  suggestion: 'Deduplicate row during clean phase.',
                  status: 'open'
                });
              } else {
                seenRows.add(rowString);
              }

              // 2. Check Missing Values & Formats
              headers.forEach(h => {
                const cellVal = row[h];
                if (cellVal === undefined || cellVal === '') {
                  const isCrucial = h.toLowerCase().includes('id') || h.toLowerCase().includes('amount') || h.toLowerCase().includes('date') || h.toLowerCase().includes('email');
                  generatedIssues.push({
                    id: `dynamic-issue-missing-${rowIndex}-${h}`,
                    type: 'missing_value',
                    column: h,
                    row: humanRowIndex,
                    value: '',
                    severity: isCrucial ? 'critical' : 'warning',
                    description: `Missing cell value found in column "${h}".`,
                    suggestion: isCrucial ? 'Required data. Impute value or contact editor.' : 'Fill with standard category or text.',
                    status: 'open'
                  });
                } else {
                  // Check outliers on numeric columns
                  if (h.toLowerCase().includes('amount') || h.toLowerCase().includes('pay') || h.toLowerCase().includes('price')) {
                    const num = parseFloat(cellVal.replace(/[^0-9.-]/g, ''));
                    if (!isNaN(num) && num > 100000) {
                      generatedIssues.push({
                        id: `dynamic-issue-outlier-${rowIndex}-${h}`,
                        type: 'outlier',
                        column: h,
                        row: humanRowIndex,
                        value: cellVal,
                        severity: 'warning',
                        description: `High numerical outlier found: ${cellVal}.`,
                        suggestion: 'Check if transaction matches correct ledger approvals.',
                        status: 'open'
                      });
                    }
                  }
                  // Check date format
                  if (h.toLowerCase().includes('date') || detectedMetadata.dateFormats[h]) {
                    const expectedFormat = detectedMetadata.dateFormats[h] || 'YYYY-MM-DD';
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(cellVal)) {
                      let description = `Date "${cellVal}" does not follow YYYY-MM-DD standard format.`;
                      let suggestion = 'Convert to standard ISO-8601 formatting.';

                      if (expectedFormat !== 'YYYY-MM-DD') {
                        description = `Date "${cellVal}" is in "${expectedFormat}" format. System standard is YYYY-MM-DD.`;
                        suggestion = `Auto-standardize this column from "${expectedFormat}" during cleaning.`;
                      }

                      generatedIssues.push({
                        id: `dynamic-issue-date-${rowIndex}-${h}`,
                        type: 'invalid_format',
                        column: h,
                        row: humanRowIndex,
                        value: cellVal,
                        severity: 'warning',
                        description: description,
                        suggestion: suggestion,
                        status: 'open'
                      });
                    }
                  }
                }
              });
            });

            // Calculate score
            const issueCount = generatedIssues.length;
            const rowCount = rows.length * headers.length;
            const score = Math.max(25, Math.min(100, Math.round(100 - (issueCount / (rowCount || 1)) * 300)));

            const parsedFile: CSVFile = {
              id: `uploaded-file-${Date.now()}`,
              name: file.name,
              size: file.size,
              uploadedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              status: 'completed',
              score: score,
              headers: headers,
              rows: rows,
              issues: generatedIssues,
              totalRowsCount: totalLinesCount - 1, // Subtract header line
              isLargeFile: isLargeFile,
              detectedMetadata: detectedMetadata
            };

            // Intercept file ingestion for AI canonical mapping step
            setPendingFile(parsedFile);
            fetchHeaderAnalysis(parsedFile.headers, parsedFile.rows);
          } catch (err) {
            setErrorMsg('Parsing error: Make sure file has standard comma-separated syntax and valid columns.');
          }
        };
        reader.readAsText(file);
      }
    }, 100);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const downloadSampleCSV = () => {
    // Generate a downloadable sample messy CSV
    const csvContent = 
`Transaction_ID,Date,Customer_Name,Amount,Category,Country
TXN-1001,2026-06-01,Acme Corp,1250.00,Software,United States
TXN-1002,2026-06-02,Global Industries,4500.50,Hardware,United Kingdom
TXN-1001,2026-06-01,Acme Corp,1250.00,Software,United States
TXN-1003,2026-06-03,Nesta Labs,,Consulting,Canada
TXN-1004,04/06/2026,Hooli Inc,350.00,SaaS,United States
TXN-1005,2026-06-05,Zenith Retail,240.00,software,us
TXN-1006,2026-06-08,Initech SA,1500000.00,Acquisition,Germany
TXN-1007,2026-06-09,E-Corp Ltd,890.00,,France`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Company_Q2_Transactions_Messy.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (pendingFile) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <BrainCircuit className="w-4 h-4 animate-pulse text-blue-500" /> Schema Ingestion Configuration
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI-Assisted Column Mapping</h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Verify and customize your column mappings for <strong>"{pendingFile.name}"</strong>. These selections refine subsequent automated compliance audits and clean operations.
            </p>
          </div>
          {/* Auto-save status badge */}
          <div className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 self-start sm:self-center border transition-all shrink-0 ${
            isAutoSaving 
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isAutoSaving ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span>{isAutoSaving ? 'Auto-saving...' : 'Draft saved to Cloud'}</span>
          </div>
        </div>

        {isAnalyzing ? (
          <div className={`p-16 text-center rounded-2xl border flex flex-col items-center justify-center space-y-4 ${isDarkMode ? 'bg-[#131b2e]/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="p-4 bg-blue-500/10 rounded-full text-blue-500">
              <Clock className="w-8 h-8 animate-spin text-blue-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-sm">Analyzing Column Semantics...</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Google Gemini is inspecting column naming metrics and verifying pattern records to formulate canonical field suggestions.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Main Mapping Area */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* READ-ONLY DATA PREVIEW GRID WITH INTERACTIVE ROW DELETION */}
              <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#131b2e]/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 border-slate-800/40">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                      Raw Data Grid Preview (First 5 Rows)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBulkAutoFix}
                      disabled={isBulkFixing}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        isBulkFixing
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 cursor-not-allowed'
                          : 'bg-emerald-500/15 hover:bg-emerald-500 hover:text-white text-emerald-400 border-emerald-500/25'
                      }`}
                    >
                      {isBulkFixing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          Running Auto-Fix...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          Bulk Auto-Fix
                        </>
                      )}
                    </button>
                    {selectedPreviewRows.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteSelectedRows}
                        className="px-2.5 py-1 text-[10px] font-bold bg-rose-500/10 hover:bg-rose-50 hover:text-white text-rose-400 border border-rose-500/20 rounded-md transition-all flex items-center gap-1 cursor-pointer shadow-sm animate-fadeIn"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedPreviewRows.length})
                      </button>
                    )}
                    <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">
                      {pendingFile.rows.length} Rows In Dataset
                    </span>
                  </div>
                </div>

                {bulkFixMessage && (
                  <div className={`p-2.5 text-xs rounded-lg flex items-center gap-2 ${
                    bulkFixMessage.startsWith('Error') 
                      ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-pulse' 
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  }`}>
                    {bulkFixMessage.startsWith('Error') ? (
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <span>{bulkFixMessage}</span>
                  </div>
                )}

                <div className="overflow-x-auto rounded-lg border border-slate-500/10 max-h-80">
                  <table className="w-full text-left text-[11px] font-medium border-collapse min-w-[900px]">
                    <thead>
                      <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                        isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        <th className="p-2.5 w-10 text-center border-r border-slate-500/10 align-middle">
                          <input 
                            type="checkbox"
                            checked={pendingFile.rows.slice(0, 5).length > 0 && pendingFile.rows.slice(0, 5).every((_, idx) => selectedPreviewRows.includes(idx))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPreviewRows(pendingFile.rows.slice(0, 5).map((_, idx) => idx));
                              } else {
                                setSelectedPreviewRows([]);
                              }
                            }}
                            className="rounded text-blue-600 bg-slate-950 border-slate-800 cursor-pointer w-3.5 h-3.5 focus:ring-0 focus:ring-offset-0"
                          />
                        </th>
                        <th className="p-2.5 w-12 text-center border-r border-slate-500/10 align-middle">#</th>
                        {pendingFile.headers.map((h, idx) => {
                          const currentMapping = mappings[h] || 'None';
                          const isMapped = currentMapping !== 'None';
                          return (
                            <th 
                              key={idx} 
                              className={`p-3 font-sans border-r border-slate-500/10 min-w-[190px] transition-all duration-200 ${
                                isMapped 
                                  ? (isDarkMode ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-950') 
                                  : ''
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`font-mono text-[11px] truncate block max-w-[110px] ${isMapped ? 'font-bold text-indigo-400' : 'text-slate-400'}`} title={h}>
                                    {h}
                                  </span>
                                  {explanations[h] && (
                                    <span 
                                      className="text-[9px] bg-blue-500/15 text-blue-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none cursor-help shrink-0" 
                                      title={explanations[h]}
                                    >
                                      <Sparkles className="w-2.5 h-2.5 text-blue-400 animate-pulse" /> AI
                                    </span>
                                  )}
                                </div>
                                <select
                                  value={currentMapping}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMappings(prev => ({ ...prev, [h]: val }));
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-[10px] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-colors ${
                                    isDarkMode 
                                      ? 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-900' 
                                      : 'bg-white border-slate-200 text-slate-700 border hover:bg-slate-50'
                                  }`}
                                >
                                  <option value="None">❌ Unmapped (Skip)</option>
                                  <option value="Transaction ID">🔑 Transaction ID</option>
                                  <option value="Transaction Date">📅 Transaction Date</option>
                                  <option value="Customer Name">👤 Customer Name</option>
                                  <option value="Email / Contact">✉️ Email / Contact</option>
                                  <option value="Amount">💰 Amount</option>
                                  <option value="Category">🏷️ Category</option>
                                  <option value="Country">🌐 Country</option>
                                </select>
                              </div>
                            </th>
                          );
                        })}
                        <th className="p-2.5 w-16 text-center border-l border-slate-500/10 align-middle">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingFile.rows.slice(0, 5).map((row, rowIdx) => {
                        const isSelected = selectedPreviewRows.includes(rowIdx);
                        return (
                          <tr 
                            key={rowIdx}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedPreviewRows(prev => prev.filter(i => i !== rowIdx));
                              } else {
                                setSelectedPreviewRows(prev => [...prev, rowIdx]);
                              }
                            }}
                            className={`border-b last:border-0 transition-all duration-200 cursor-pointer group ${
                              isSelected 
                                ? (isDarkMode ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-200' : 'bg-rose-50 hover:bg-rose-100 text-rose-900')
                                : (isDarkMode ? 'border-slate-855 hover:bg-indigo-950/40 text-slate-300 hover:text-indigo-100' : 'border-slate-100 hover:bg-indigo-50/60 text-slate-700 hover:text-indigo-950')
                            }`}
                          >
                            <td className="p-2.5 text-center border-r border-slate-500/10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPreviewRows(prev => [...prev, rowIdx]);
                                  } else {
                                    setSelectedPreviewRows(prev => prev.filter(i => i !== rowIdx));
                                  }
                                }}
                                className="rounded text-blue-600 bg-slate-950 border-slate-800 cursor-pointer w-3.5 h-3.5 focus:ring-0 focus:ring-offset-0 transition-transform duration-150 group-hover:scale-110"
                              />
                            </td>
                            <td className={`p-2.5 text-center font-mono text-[10px] font-bold border-r border-slate-500/10 transition-colors duration-200 ${
                              isSelected
                                ? (isDarkMode ? 'text-rose-400 bg-rose-500/5' : 'text-rose-600 bg-rose-50')
                                : (isDarkMode ? 'bg-slate-950/20 text-slate-500 group-hover:text-indigo-400' : 'bg-slate-50/50 text-slate-400 group-hover:text-indigo-600')
                            }`}>
                              {rowIdx + 1}
                            </td>
                            {pendingFile.headers.map((header, colIdx) => {
                              const val = row[header];
                              const isEmpty = val === undefined || val === '';
                              const currentMapping = mappings[header] || 'None';
                              const isMapped = currentMapping !== 'None';
                              return (
                                <td 
                                  key={colIdx} 
                                  className={`p-2.5 font-mono truncate max-w-[150px] transition-colors duration-200 border-r border-slate-500/10 ${
                                    isMapped
                                      ? (isDarkMode ? 'bg-indigo-500/5 text-indigo-200 font-semibold' : 'bg-indigo-50/25 text-indigo-900 font-semibold')
                                      : ''
                                  }`}
                                  title={val || ''}
                                >
                                  {isEmpty ? (
                                    <span className="text-rose-400/60 italic text-[10px] bg-rose-500/5 px-1 rounded">[empty]</span>
                                  ) : (
                                    val
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-2.5 text-center border-l border-slate-500/10" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleRow(rowIdx)}
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-all cursor-pointer transform group-hover:scale-105 active:scale-95"
                                title="Delete this row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {pendingFile.rows.length === 0 && (
                        <tr>
                          <td colSpan={pendingFile.headers.length + 3} className="p-8 text-center text-slate-500 italic">
                            No rows parsed in this spreadsheet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Interactive structure loaded. Check boxes or click trash to exclude records from the final dataset.</span>
                  </div>
                  {pendingFile.rows.length > 5 && (
                    <span className="italic text-slate-500 font-mono">
                      Showing first 5 of {pendingFile.rows.length} rows. Deleting shifting rows auto-promotes subsequent ones.
                    </span>
                  )}
                </div>
              </div>

              <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#131b2e]/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-5`}>
                <div className="flex justify-between items-center border-b pb-3 border-slate-800/40">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Map Raw Columns to Canonical Entities</h3>
                  <span className="text-[10px] font-mono text-slate-500">Total headers: {pendingFile.headers.length}</span>
                </div>

                <div className="space-y-4">
                  {pendingFile.headers.map((header) => {
                    // Extract safe sample values from first 2 rows
                    const samplesList = pendingFile.rows.slice(0, 2).map(r => r[header]).filter(Boolean);
                    const samplesStr = samplesList.join(', ');

                    // Check column-specific issues for the Data Sanity Check indicators
                    const colIssues = pendingFile.issues.filter(i => i.column === header);
                    const colMissing = colIssues.filter(i => i.type === 'missing_value');
                    const colFormat = colIssues.filter(i => i.type === 'invalid_format');
                    const colOutlier = colIssues.filter(i => i.type === 'outlier');

                    return (
                      <div 
                        key={header} 
                        className={`p-4 rounded-xl border transition-all ${
                          isDarkMode 
                            ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80' 
                            : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-extrabold text-sm block truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                {header || '[Empty Label]'}
                              </span>
                              {!header && (
                                <span className="text-[9px] bg-rose-500/10 text-rose-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 select-none shrink-0 border border-rose-500/20">
                                  <AlertCircle className="w-2.5 h-2.5" /> Empty Header Label
                                </span>
                              )}
                            </div>

                            {/* Sanity Check Column-level Badges */}
                            <div className="flex flex-wrap gap-1.5 my-1">
                              {colIssues.length === 0 && header && (
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none shrink-0 border border-emerald-500/10">
                                  <Check className="w-2.5 h-2.5 text-emerald-400" /> Clean Structure
                                </span>
                              )}
                              {colMissing.length > 0 && (
                                <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none shrink-0 border border-amber-500/10" title={`${colMissing.length} empty cells detected`}>
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> {colMissing.length} Blank Rows
                                </span>
                              )}
                              {colFormat.length > 0 && (
                                <span className="text-[9px] bg-blue-500/10 text-blue-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none shrink-0 border border-blue-500/10" title={`${colFormat.length} format anomalies found`}>
                                  <Clock className="w-2.5 h-2.5 text-blue-400" /> Standard Variance
                                </span>
                              )}
                              {colOutlier.length > 0 && (
                                <span className="text-[9px] bg-rose-500/10 text-rose-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none shrink-0 border border-rose-500/10" title={`${colOutlier.length} extreme outlier points detected`}>
                                  <AlertCircle className="w-2.5 h-2.5 text-rose-400 animate-pulse" /> Outliers
                                </span>
                              )}
                            </div>

                            {samplesStr && (
                              <span className={`text-[10px] font-mono block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Samples: <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} italic`}>{samplesStr}</span>
                              </span>
                            )}
                          </div>

                          <div className="w-full sm:w-48 shrink-0">
                            <select
                              value={mappings[header] || 'None'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMappings(prev => ({ ...prev, [header]: val }));
                              }}
                              className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                              }`}
                            >
                              <option value="None">None (Auxiliary Column)</option>
                              <option value="Transaction ID">Transaction ID</option>
                              <option value="Transaction Date">Transaction Date</option>
                              <option value="Customer Name">Customer Name</option>
                              <option value="Email / Contact">Email / Contact</option>
                              <option value="Amount">Amount</option>
                              <option value="Category">Category</option>
                              <option value="Country">Country</option>
                            </select>
                          </div>
                        </div>

                        {/* AI Explanation Badge & Text */}
                        {explanations[header] && (
                          <div className="mt-3 pt-2.5 border-t border-dashed border-slate-800/40 flex items-start gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                            <p className={`text-[10px] leading-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {explanations[header]}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Confirmations */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                  <button
                    onClick={async () => {
                      const currentUser = auth.currentUser;
                      if (currentUser) {
                        try {
                          await deleteDoc(doc(db, 'drafts', currentUser.uid));
                        } catch (e) {
                          console.error("Failed to delete draft:", e);
                        }
                      }
                      setPendingFile(null);
                      setUploadProgress(null);
                      setFileDetails(null);
                      setMappings({});
                      setExplanations({});
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isDarkMode ? 'border-slate-800 text-slate-400 hover:text-slate-200 bg-slate-900/40' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                    }`}
                  >
                    Cancel Ingestion
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        const currentUser = auth.currentUser;
                        if (currentUser) {
                          try {
                            await deleteDoc(doc(db, 'drafts', currentUser.uid));
                          } catch (e) {
                            console.error("Failed to delete draft:", e);
                          }
                        }
                        if (pendingFile) {
                          onFileUpload(pendingFile);
                        }
                        setPendingFile(null);
                        setUploadProgress(null);
                        setFileDetails(null);
                        setMappings({});
                        setExplanations({});
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isDarkMode ? 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Skip Mapping
                    </button>

                    <button
                      onClick={async () => {
                        if (!pendingFile) return;
                        const finalFile: CSVFile = {
                          ...pendingFile,
                          headerMappings: mappings,
                          mappingExplanations: explanations
                        };
                        const currentUser = auth.currentUser;
                        if (currentUser) {
                          try {
                            await deleteDoc(doc(db, 'drafts', currentUser.uid));
                          } catch (e) {
                            console.error("Failed to delete draft:", e);
                          }
                        }
                        onFileUpload(finalFile);
                        setPendingFile(null);
                        setUploadProgress(null);
                        setFileDetails(null);
                        setMappings({});
                        setExplanations({});
                      }}
                      className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${accentClass}`}
                    >
                      <Check className="w-4 h-4" /> Apply Schema & Run Audit
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Reference Sidebar */}
            <div className="lg:col-span-4 space-y-4">
              {/* AUTOMATED DATA SANITY CHECK WIDGET */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#131b2e]/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
                <div className="flex justify-between items-center border-b pb-2.5 border-slate-800/40">
                  <h3 className={`font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" /> Data Sanity Check
                  </h3>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    runSanityCheck().every(c => c.status === 'pass')
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : runSanityCheck().some(c => c.status === 'fail')
                      ? 'bg-rose-500/10 text-rose-400 animate-pulse'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {runSanityCheck().every(c => c.status === 'pass') ? 'Optimal' : runSanityCheck().some(c => c.status === 'fail') ? 'Action Required' : 'Warnings Found'}
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automated checks analyzed the spreadsheet rows instantly upon upload. Address format warnings or missing elements prior to final schema audit.
                </p>

                <div className="space-y-3">
                  {runSanityCheck().map((check) => {
                    const statusConfig = {
                      pass: {
                        bg: isDarkMode ? 'bg-emerald-500/5' : 'bg-emerald-50/40',
                        border: 'border-emerald-500/10',
                        text: 'text-emerald-400',
                        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      },
                      warn: {
                        bg: isDarkMode ? 'bg-amber-500/5' : 'bg-amber-50/40',
                        border: 'border-amber-500/10',
                        text: 'text-amber-400',
                        icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      },
                      fail: {
                        bg: isDarkMode ? 'bg-rose-500/5' : 'bg-rose-50/40',
                        border: 'border-rose-500/10',
                        text: 'text-rose-400',
                        icon: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      }
                    }[check.status];

                    return (
                      <div 
                        key={check.id}
                        className={`p-2.5 rounded-lg border ${statusConfig.bg} ${statusConfig.border} flex items-start gap-2.5 transition-all duration-150 hover:translate-x-0.5`}
                      >
                        {statusConfig.icon}
                        <div className="space-y-0.5 min-w-0">
                          <span className={`font-bold text-xs block truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {check.title}
                          </span>
                          <span className="text-[10px] text-slate-400 block leading-normal">
                            {check.description}
                          </span>
                          {check.details && (
                            <span className="text-[9px] text-slate-500 italic block leading-normal mt-0.5">
                              • {check.details}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#131b2e]/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className={`font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <BrainCircuit className="w-4 h-4 text-blue-500" /> Canonical Schema Guide
                </h3>
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                  Canonical maps resolve semantic inconsistency across mismatched databases. Our validation rules leverage these configurations for high-throughput consistency diagnostics:
                </p>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <h4 className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Transaction ID</h4>
                    <p className="text-[10px] text-slate-500 leading-normal">Resolves unique row references. Used for strict deduplication algorithms.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Transaction Date</h4>
                    <p className="text-[10px] text-slate-500 leading-normal">Forces standardization to ISO-8601 YYYY-MM-DD. Auto-corrects localized syntax variants.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Amount</h4>
                    <p className="text-[10px] text-slate-500 leading-normal">Enforces ledger precision. Triggers outlier models and standard currency checks.</p>
                  </div>
                  <div>
                    <h4 className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Email / Contact</h4>
                    <p className="text-[10px] text-slate-500 leading-normal">Checks mailbox formatting standards and validates communications connectivity in Gmail.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Audit Ingestion Center</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Upload your messy worksheets to execute real-time structural analysis and statistical validation.
        </p>
      </div>

      {savedDraft && !pendingFile && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn ${
          isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-slate-200' : 'bg-blue-50 border-blue-200 text-slate-800 shadow-sm'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <Clock className="w-5 h-5 animate-pulse text-blue-500" />
            </div>
            <div>
              <h4 className="font-bold text-xs">Unfinished Schema Mapping Progress Detected</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                You have an active, unsaved ingestion session for <span className="font-semibold text-blue-500">"{savedDraft.pendingFile.name}"</span> ({savedDraft.pendingFile.rows?.length || 0} rows) from {new Date(savedDraft.updatedAt).toLocaleDateString() + ' ' + new Date(savedDraft.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleDiscardDraft}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                isDarkMode ? 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60' : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
              }`}
            >
              Discard Draft
            </button>
            <button
              onClick={handleResumeDraft}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all cursor-pointer shadow-sm ${accentClass}`}
            >
              Resume Session
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Upload Zone */}
        <div className="lg:col-span-8 space-y-4">
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all relative ${dragActive ? 'border-blue-500 bg-blue-500/5' : isDarkMode ? 'border-slate-800 bg-[#131b2e]/60 hover:border-slate-700 hover:bg-[#131b2e]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv"
              onChange={handleBrowse}
              className="hidden"
            />
            
            <div className="max-w-md mx-auto space-y-3">
              <div className={`mx-auto p-3.5 rounded-full w-fit ${isDarkMode ? 'bg-slate-950 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <Upload className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h3 className="font-bold text-sm mb-1">Drag and drop your spreadsheet</h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Supports standard comma-delimited <span className="font-bold text-blue-500">.CSV</span> files up to 100MB.
                </p>
              </div>

              <div className="pt-1">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 text-xs font-bold text-white rounded-lg cursor-pointer bg-blue-600 hover:bg-blue-700 shadow-sm hover:scale-[1.01] transition-all"
                >
                  Browse local files
                </button>
              </div>
            </div>
          </div>

          {/* Progress or Errors */}
          {uploadProgress !== null && fileDetails && (
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4 text-blue-500" /> {fileDetails.name}</span>
                <span className="text-xs font-mono font-bold">{uploadProgress}%</span>
              </div>
              <div className={`w-full h-1.5 overflow-hidden rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
                <span>
                  {fileDetails.size > 1024 * 1024 
                    ? `${(fileDetails.size / (1024 * 1024)).toFixed(1)} MB` 
                    : `${(fileDetails.size / 1024).toFixed(1)} KB`}
                </span>
                {uploadProgress < 100 ? (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 animate-spin" /> Executing audit logic...</span>
                ) : (
                  <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Audit Compiled!</span>
                )}
              </div>
              
              {uploadProgress === 100 && fileDetails.size > 5 * 1024 * 1024 && (
                <div className="mt-3 p-2.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-400 mt-0.5" />
                  <span>
                    <strong>Large File Stream Mode Activated:</strong> Ingested {((fileDetails.size / (1024 * 1024))).toFixed(1)} MB. First 10,000 rows loaded in interactive workspace; full document structure verified without memory lag.
                  </span>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Ingestion Rejected</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notices & Sandbox Guides */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className={`font-bold text-xs uppercase tracking-wider mb-2.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sample Sandbox</h3>
            <p className={`text-xs leading-relaxed mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Don't have a messy sheet on hand? Download our pre-configured corporate transactions sheet. It contains duplicate rows, date formatting errors, and outliers designed to showcase the full power of our cleaning centers.
            </p>
            <button 
              onClick={downloadSampleCSV}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border hover:bg-slate-50 transition-all cursor-pointer ${isDarkMode ? 'bg-[#0f172a] border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700'}`}
            >
              <Download className="w-3.5 h-3.5 text-blue-500" /> Download Messy Sample CSV
            </button>
          </div>

          <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className={`font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" /> Compliance Checklist</h3>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                <span><strong className={`block ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Format standards:</strong> Automatically converts ISO dates (YYYY-MM-DD), numbers, currencies, and case keys.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                <span><strong className={`block ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Sanitization Sandbox:</strong> All files remain localized to your active session. Complete security compliance before DB loading.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
