import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  Clock, 
  Calendar,
  Shield,
  CheckCircle2, 
  AlertCircle,
  Eye,
  SlidersHorizontal,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  Loader2,
  AlertTriangle,
  Archive
} from 'lucide-react';
import JSZip from 'jszip';
import { CSVFile } from '../types';
import { formatTimeRemaining, getRetentionOptionDetail } from '../lib/retentionService';

interface AuditHistoryProps {
  files: CSVFile[];
  onSelectFile: (file: CSVFile) => void;
  onDeleteFile?: (id: string, name: string) => void;
  onNavigate: (tab: string) => void;
  isDarkMode: boolean;
  accentClass: string;
}

export default function AuditHistory({ files, onSelectFile, onDeleteFile, onNavigate, isDarkMode, accentClass }: AuditHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmingBatchDelete, setIsConfirmingBatchDelete] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchActionToast, setBatchActionToast] = useState<string | null>(null);

  // Handle Search & Filter
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || file.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle Sort
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'name') {
      comp = a.name.localeCompare(b.name);
    } else if (sortBy === 'score') {
      comp = a.score - b.score;
    } else {
      // Date sort
      comp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
    }
    return sortOrder === 'desc' ? -comp : comp;
  });

  const toggleSort = (field: 'date' | 'name' | 'score') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Bulk Selection Handlers
  const isAllSelected = sortedFiles.length > 0 && sortedFiles.every(f => selectedIds.includes(f.id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedFiles.map(f => f.id));
    }
  };

  const handleToggleSelectFile = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const downloadHistoryReport = (file: CSVFile) => {
    const content = `Historical Audit Log for file: ${file.name}\nAudited On: ${file.uploadedAt}\nCompliance score: ${file.score}%\nColumns parsed: ${file.headers.join(', ')}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Audit_History_Report_${file.name.replace(/\.[^/.]+$/, "")}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch Operation 1: Batch Download Reports (ZIP)
  const handleBatchDownloadReports = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const zip = new JSZip();
      const selectedFilesList = files.filter(f => selectedIds.includes(f.id));

      selectedFilesList.forEach(file => {
        const reportContent = `==================================================\n` +
          `HISTORICAL COMPLIANCE AUDIT REPORT: ${file.name}\n` +
          `==================================================\n` +
          `File ID: ${file.id}\n` +
          `Audited On: ${file.uploadedAt}\n` +
          `Compliance Score: ${file.score}%\n` +
          `Audit Status: ${file.status.toUpperCase()}\n` +
          `File Size: ${file.size} bytes\n` +
          `Total Rows: ${(file.cleanedRows || file.rows).length}\n` +
          `Mapped Headers (${file.headers.length}): ${file.headers.join(', ')}\n\n` +
          `TRACKED ANOMALIES & ISSUES (${file.issues.length}):\n` +
          (file.issues.length === 0
            ? '  [CLEAR] No data quality issues or schema violations detected.\n'
            : file.issues.map(iss => `  - [${iss.severity.toUpperCase()}] ${iss.type.toUpperCase()} on column "${iss.column}": ${iss.description}`).join('\n')
          ) +
          `\n\n--------------------------------------------------\n` +
          `Generated by CSV Auditor Pro - Workspace Audit Archive\n`;

        const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
        zip.file(`Audit_Report_${cleanFileName}.txt`, reportContent);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Batch_Audit_Reports_${selectedFilesList.length}_Files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setBatchActionToast(`Successfully exported ${selectedFilesList.length} audit reports in ZIP archive.`);
      setTimeout(() => setBatchActionToast(null), 3000);
    } catch (err) {
      console.error('Error bundling batch reports ZIP:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch Operation 2: Batch Download Cleaned CSVs (ZIP)
  const handleBatchDownloadCSVs = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const zip = new JSZip();
      const selectedFilesList = files.filter(f => selectedIds.includes(f.id));

      selectedFilesList.forEach(file => {
        const rowsToExport = file.cleanedRows || file.rows;
        const headersRow = file.headers.join(',') + '\n';
        const dataRows = rowsToExport
          .map(row => file.headers.map(h => {
            const val = row[h] ?? '';
            const strVal = String(val);
            if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
              return `"${strVal.replace(/"/g, '""')}"`;
            }
            return strVal;
          }).join(','))
          .join('\n');

        const csvContent = headersRow + dataRows;
        const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
        zip.file(`Cleaned_${cleanFileName}.csv`, csvContent);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Batch_Cleaned_CSVs_${selectedFilesList.length}_Files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setBatchActionToast(`Successfully downloaded ${selectedFilesList.length} CSV datasets.`);
      setTimeout(() => setBatchActionToast(null), 3000);
    } catch (err) {
      console.error('Error bundling batch CSVs ZIP:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch Operation 3: Batch Delete
  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0 || !onDeleteFile) return;
    setIsBatchProcessing(true);
    const idsToDelete = [...selectedIds];
    const countToDelete = idsToDelete.length;

    try {
      for (const id of idsToDelete) {
        const file = files.find(f => f.id === id);
        if (file) {
          await onDeleteFile(file.id, file.name);
        }
      }
      setSelectedIds([]);
      setIsConfirmingBatchDelete(false);
      setBatchActionToast(`Permanently removed ${countToDelete} files from audit archive.`);
      setTimeout(() => setBatchActionToast(null), 3000);
    } catch (err) {
      console.error('Error batch deleting files:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Workspace Archives
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Audit Archive</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Search, filter, and inspect previous spreadsheet evaluation logs and compliance history profiles.
        </p>
      </div>

      {/* Action Toast Notification */}
      <AnimatePresence>
        {batchActionToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-lg flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{batchActionToast}</span>
            </div>
            <button onClick={() => setBatchActionToast(null)} className="text-white hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar controls */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-center justify-between ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder="Search files by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-600'}`}
          />
        </div>

        {/* Filters and Sort triggers */}
        <div className="flex gap-2 w-full md:w-auto text-xs">
          {/* Status filter */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className={`px-3 py-2 rounded-xl border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          {/* Sort Button */}
          <button 
            onClick={() => toggleSort('score')}
            className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" /> Sort Score
          </button>
          
          <button 
            onClick={() => toggleSort('date')}
            className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" /> Sort Date
          </button>
        </div>
      </div>

      {/* History log list table */}
      <div className={`p-6 rounded-3xl border overflow-hidden relative ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80 shadow-2xl shadow-blue-500/1' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <th className="p-4 w-10 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    disabled={sortedFiles.length === 0}
                    className="flex items-center justify-center p-1 rounded hover:bg-slate-800/20 text-slate-400 cursor-pointer disabled:opacity-30"
                    title={isAllSelected ? "Deselect All" : "Select All Visible"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : isSomeSelected ? (
                      <MinusSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="p-4 font-semibold">File Name</th>
                <th className="p-4 font-semibold">Audited Date</th>
                <th className="p-4 font-semibold">File Size</th>
                <th className="p-4 font-semibold">Compliance Rating</th>
                <th className="p-4 font-semibold">Retention Policy</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/50' : 'divide-slate-200'}`}>
              {sortedFiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Archive className="w-8 h-8 text-slate-500" />
                      <p className="font-bold text-sm">No spreadsheet records found</p>
                      <p className="text-xs text-slate-500">Try adjusting your search query or status filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedFiles.map((file) => {
                  const isSelected = selectedIds.includes(file.id);
                  return (
                    <tr 
                      key={file.id}
                      className={`transition-colors ${
                        isSelected 
                          ? isDarkMode ? 'bg-blue-950/40 border-l-2 border-l-blue-500' : 'bg-blue-50/70 border-l-2 border-l-blue-600'
                          : isDarkMode ? 'hover:bg-slate-800/10' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-4 w-10 text-center">
                        <button
                          onClick={() => handleToggleSelectFile(file.id)}
                          className="flex items-center justify-center p-1 rounded hover:bg-slate-800/20 text-slate-400 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-bold flex items-center gap-2.5 truncate max-w-[240px] text-slate-900 dark:text-slate-100">
                        <FileSpreadsheet className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-mono text-[10px]">{file.uploadedAt}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                        {file.size > 1024 * 1024 
                          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
                          : `${(file.size / 1024).toFixed(1)} KB`}
                      </td>
                      <td className="p-4">
                        {file.status === 'completed' ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${file.score > 80 ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400'}`}>
                              {file.score}%
                            </span>
                            <div className="w-16 bg-slate-200 dark:bg-slate-700/20 rounded-full h-1">
                              <div className={`h-full rounded-full ${file.score > 80 ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-amber-600 dark:bg-amber-500'}`} style={{ width: `${file.score}%` }}></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Not available</span>
                        )}
                      </td>
                      <td className="p-4">
                        {file.retentionPolicy ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 font-mono flex items-center gap-1">
                              {file.retentionPolicy.option === 'immediate' && <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />}
                              {file.retentionPolicy.option === '24h' && <Clock className="w-3 h-3 text-blue-700 dark:text-blue-400 shrink-0" />}
                              {(file.retentionPolicy.option === '3d' || file.retentionPolicy.option === '7d' || file.retentionPolicy.option === '14d' || file.retentionPolicy.option === '30d') && <Calendar className="w-3 h-3 text-indigo-700 dark:text-indigo-400 shrink-0" />}
                              {file.retentionPolicy.option === 'forever' && <Shield className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />}
                              <span>{getRetentionOptionDetail(file.retentionPolicy.option).badge}</span>
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                              {formatTimeRemaining(file.retentionPolicy.expiresAt, file.retentionPolicy.originalFileDeleted).label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400 shrink-0" /> 24 Hours (Default)</span>
                        )}
                      </td>
                      <td className="p-4">
                        {file.status === 'completed' ? (
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-800 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><AlertCircle className="w-3.5 h-3.5" /> Corrupted</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end items-center">
                          {deletingId === file.id ? (
                            <div className="flex items-center gap-1.5 animate-fadeIn">
                              <button
                                onClick={() => {
                                  if (onDeleteFile) onDeleteFile(file.id, file.name);
                                  setDeletingId(null);
                                }}
                                className="px-2 py-1.5 rounded bg-rose-100 dark:bg-red-500/20 text-rose-700 dark:text-red-400 hover:bg-rose-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-all font-bold text-[9px] uppercase cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className={`px-2 py-1.5 rounded transition-all font-bold text-[9px] uppercase cursor-pointer ${
                                  isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => {
                                  onSelectFile(file);
                                  onNavigate('results');
                                }}
                                className={`p-2 rounded-lg border hover:scale-105 transition-all text-blue-700 dark:text-blue-400 ${isDarkMode ? 'bg-slate-950 border-slate-800 hover:bg-slate-900' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
                                title="View Report"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => downloadHistoryReport(file)}
                                disabled={file.status !== 'completed'}
                                className={`p-2 rounded-lg border hover:scale-105 transition-all text-emerald-700 dark:text-emerald-400 disabled:opacity-30 disabled:pointer-events-none ${isDarkMode ? 'bg-slate-950 border-slate-800 hover:bg-slate-900' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
                                title="Download Report"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteFile && (
                                <button 
                                  onClick={() => setDeletingId(file.id)}
                                  className={`p-2 rounded-lg border hover:scale-105 transition-all text-rose-700 dark:text-rose-400 ${isDarkMode ? 'bg-slate-950 border-slate-800 hover:bg-slate-900 hover:bg-rose-500/10' : 'bg-white border-slate-200 hover:bg-slate-100 hover:bg-rose-50'}`}
                                  title="Delete Dataset"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Operations Toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[92%] sm:w-auto p-4 rounded-2xl border shadow-2xl flex flex-wrap items-center justify-between gap-4 bg-slate-900 border-slate-700 text-white"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-600 text-white font-mono font-bold text-xs">
                {selectedIds.length}
              </span>
              <div>
                <p className="text-xs font-bold text-white leading-tight">
                  {selectedIds.length === 1 ? '1 File Selected' : `${selectedIds.length} Files Selected`}
                </p>
                <p className="text-[10px] text-slate-400">Perform batch operations across archive</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleBatchDownloadReports}
                disabled={isBatchProcessing}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                title="Download Audit Reports for selected files in ZIP archive"
              >
                {isBatchProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Download className="w-3.5 h-3.5" />}
                <span>Download Reports</span>
              </button>

              <button
                onClick={handleBatchDownloadCSVs}
                disabled={isBatchProcessing}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Download Cleaned CSV Datasets in ZIP archive"
              >
                {isBatchProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
                <span>Batch CSVs</span>
              </button>

              <button
                onClick={() => setIsConfirmingBatchDelete(true)}
                disabled={isBatchProcessing}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>

              <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>

              <button
                onClick={() => setSelectedIds([])}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Delete Confirmation Modal */}
      <AnimatePresence>
        {isConfirmingBatchDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-6 rounded-2xl border max-w-md w-full shadow-2xl space-y-4 ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Confirm Batch Delete</h3>
                  <p className="text-xs text-slate-400">Permanently purge selected files</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete <strong>{selectedIds.length} selected spreadsheet record{selectedIds.length > 1 ? 's' : ''}</strong> from the Audit Archive?
                This operation will remove all associated compliance evaluation logs and storage drafts.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsConfirmingBatchDelete(false)}
                  disabled={isBatchProcessing}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBatchDelete}
                  disabled={isBatchProcessing}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isBatchProcessing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Trash2 className="w-4 h-4" />}
                  <span>Delete {selectedIds.length} Files</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
