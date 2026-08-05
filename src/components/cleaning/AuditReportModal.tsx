import { useState } from 'react';
import { X, Download, FileText, CheckCircle2, ShieldCheck, Printer, ArrowRight } from 'lucide-react';
import {
  AuditReportData,
  generateReportMarkdown,
  downloadReportAsFile
} from '../../lib/cleaning/auditReportGenerator';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: AuditReportData | null;
  isDarkMode: boolean;
}

export default function AuditReportModal({
  isOpen,
  onClose,
  reportData,
  isDarkMode
}: AuditReportModalProps) {
  const [exportFormat, setExportFormat] = useState<'markdown' | 'pdf' | 'json' | 'csv'>('markdown');

  if (!isOpen || !reportData) return null;

  const markdownContent = generateReportMarkdown(reportData);

  const handleExport = () => {
    const baseName = reportData.fileName.replace(/\.csv$/i, '');
    const exportFileName = `${baseName}_audit_report.${exportFormat === 'markdown' ? 'md' : exportFormat}`;

    if (exportFormat === 'json') {
      downloadReportAsFile(JSON.stringify(reportData, null, 2), exportFileName, 'json');
    } else if (exportFormat === 'csv') {
      const csvLines = [
        'Metric,Value',
        `File Name,${reportData.fileName}`,
        `Initial Quality Score,${reportData.initialQualityScore}`,
        `Final Quality Score,${reportData.finalQualityScore}`,
        `Original Rows,${reportData.initialRows}`,
        `Cleaned Rows,${reportData.finalRows}`,
        `Duplicates Removed,${reportData.duplicatesRemoved}`,
        `Missing Values Fixed,${reportData.missingValuesFixed}`,
        `AI Corrections Applied,${reportData.aiCorrectionsApplied}`,
        `PII Masked Count,${reportData.piiMaskedCount}`,
        `Execution Time (ms),${reportData.executionTimeMs}`
      ].join('\n');
      downloadReportAsFile(csvLines, exportFileName, 'csv');
    } else {
      downloadReportAsFile(markdownContent, exportFileName, exportFormat as any);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold truncate">
                  Comprehensive Audit & Data Quality Report
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 truncate max-w-[200px]">
                  {reportData.fileName}
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} truncate mt-0.5`}>
                Automated post-cleaning audit breakdown, quality deltas, and compliance record.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg cursor-pointer transition-colors shrink-0 ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Preview Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className={`p-3.5 sm:p-4 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Quality Score Delta</span>
              <div className="text-base sm:text-xl font-black text-emerald-500 flex items-center gap-1.5 flex-wrap">
                <span>{reportData.initialQualityScore}%</span>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{reportData.finalQualityScore}%</span>
              </div>
            </div>

            <div className={`p-3.5 sm:p-4 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Rows Processed</span>
              <p className="text-base sm:text-xl font-black">{reportData.finalRows.toLocaleString()}</p>
            </div>

            <div className={`p-3.5 sm:p-4 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Duplicates Removed</span>
              <p className="text-base sm:text-xl font-black text-blue-500">{reportData.duplicatesRemoved.toLocaleString()}</p>
            </div>

            <div className={`p-3.5 sm:p-4 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Execution Time</span>
              <p className="text-base sm:text-xl font-black font-mono">{reportData.executionTimeMs} ms</p>
            </div>
          </div>

          {/* Action Log Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Quantitative Action Breakdown
            </h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[11px] uppercase font-mono font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                  <tr>
                    <th className="p-3">Cleaning Dimension</th>
                    <th className="p-3">Count / Output</th>
                    <th className="p-3">Audit Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono ${isDarkMode ? 'divide-slate-800/50' : 'divide-slate-200'}`}>
                  <tr>
                    <td className="p-3 font-bold">Duplicates Removed</td>
                    <td className="p-3">{reportData.duplicatesRemoved} rows</td>
                    <td className="p-3 text-emerald-500 font-bold">Passed</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Missing Values Imputed</td>
                    <td className="p-3">{reportData.missingValuesFixed} cells</td>
                    <td className="p-3 text-emerald-500 font-bold">Passed</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">AI Smart Corrections</td>
                    <td className="p-3">{reportData.aiCorrectionsApplied} cells</td>
                    <td className="p-3 text-emerald-500 font-bold">Passed</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">PII Protection Applied</td>
                    <td className="p-3">{reportData.piiMaskedCount} cells</td>
                    <td className="p-3 text-emerald-500 font-bold">Protected</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Export Footer */}
        <div className={`p-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Export Format:</span>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold outline-none cursor-pointer ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <option value="markdown">Markdown (.md)</option>
              <option value="pdf">PDF Report (.pdf)</option>
              <option value="json">JSON Metadata (.json)</option>
              <option value="csv">CSV Summary (.csv)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Close
            </button>
            <button
              onClick={handleExport}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow flex items-center justify-center gap-2 cursor-pointer transition-all whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" /> Download Audit Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
