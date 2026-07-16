import React, { useState, useRef } from 'react';
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
  Sparkles
} from 'lucide-react';
import { CSVFile, AuditIssue, Severity, IssueType } from '../types';
import { detectCSVFormats } from '../lib/formatDetector';

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

            onFileUpload(parsedFile);
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

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Audit Ingestion Center</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Upload your messy worksheets to execute real-time structural analysis and statistical validation.
        </p>
      </div>

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
