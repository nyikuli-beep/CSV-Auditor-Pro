import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  RotateCcw, 
  Trash2, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Mail, 
  FileText, 
  ShieldCheck, 
  Zap, 
  Copy, 
  Check, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export interface DeliveryReportItem {
  id: string;
  to: string;
  subject: string;
  reportType?: string;
  timestamp: string;
  status: 'Pending' | 'Sent' | 'Failed';
  errorMessage?: string;
  retryCount?: number;
  fileRef?: string;
  latencyMs?: number;
}

interface EmailDeliveryStatusDashboardProps {
  reports: DeliveryReportItem[];
  isDarkMode: boolean;
  accentClass: string;
  onRetry: (report: DeliveryReportItem) => void;
  onClearLogs: () => void;
  onDeleteReport: (id: string) => void;
  onTestDispatch?: () => void;
  isLoadingGmail?: boolean;
  onRefresh?: () => void;
}

export default function EmailDeliveryStatusDashboard({
  reports,
  isDarkMode,
  accentClass,
  onRetry,
  onClearLogs,
  onDeleteReport,
  onTestDispatch,
  isLoadingGmail,
  onRefresh
}: EmailDeliveryStatusDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Sent' | 'Failed' | 'Pending'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute metrics
  const totalCount = reports.length;
  const sentCount = reports.filter(r => r.status === 'Sent').length;
  const failedCount = reports.filter(r => r.status === 'Failed').length;
  const pendingCount = reports.filter(r => r.status === 'Pending').length;
  const successRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100;

  // Filter & Search logic
  const filteredReports = reports.filter(item => {
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      item.to.toLowerCase().includes(searchLower) ||
      item.subject.toLowerCase().includes(searchLower) ||
      (item.reportType && item.reportType.toLowerCase().includes(searchLower)) ||
      (item.errorMessage && item.errorMessage.toLowerCase().includes(searchLower));
    
    return matchesStatus && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleCopyError = (errorMessage: string, id: string) => {
    navigator.clipboard.writeText(errorMessage);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportDeliveryLogsCsv = () => {
    if (reports.length === 0) return;

    const headers = ['Report ID', 'Recipient', 'Subject', 'Report Type', 'Status', 'Timestamp', 'Latency (ms)', 'Error Message'];
    const rows = reports.map(r => [
      r.id,
      `"${r.to.replace(/"/g, '""')}"`,
      `"${r.subject.replace(/"/g, '""')}"`,
      `"${r.reportType || 'Compliance Report'}"`,
      r.status,
      r.timestamp,
      r.latencyMs || '',
      `"${(r.errorMessage || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `email_delivery_status_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Metric Overview Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Dispatches */}
        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Dispatched</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{totalCount}</span>
            <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>100% Volume</span>
          </div>
        </div>

        {/* Successful Deliveries */}
        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Sent Success</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-400">{sentCount}</span>
            <span className="text-[10px] text-emerald-500 font-bold font-mono">{successRate}% Health</span>
          </div>
        </div>

        {/* Failed Dispatches */}
        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Failed Delivery</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono ${failedCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{failedCount}</span>
            {failedCount > 0 ? (
              <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">Action Req.</span>
            ) : (
              <span className="text-[10px] text-slate-500 font-mono">0 Errors</span>
            )}
          </div>
        </div>

        {/* Pending / In-Queue */}
        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">In Queue / Pending</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-amber-400">{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Dispatching
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Control Toolbar & Filters */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
        
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', 'Sent', 'Failed', 'Pending'] as const).map(status => {
            const count = status === 'All' ? totalCount : status === 'Sent' ? sentCount : status === 'Failed' ? failedCount : pendingCount;
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? isDarkMode ? 'bg-indigo-600 text-white shadow' : 'bg-indigo-600 text-white shadow'
                    : isDarkMode ? 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>{status}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${isActive ? 'bg-white/20 text-white' : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by email or subject..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs outline-none ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoadingGmail}
              title="Refresh Gmail Sent Status"
              className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGmail ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          )}

          <button
            onClick={exportDeliveryLogsCsv}
            disabled={reports.length === 0}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              disabled={reports.length === 0}
              className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-rose-400 disabled:opacity-30 ${
                isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-rose-500/10' : 'bg-white border-slate-200 hover:bg-rose-50'
              }`}
              title="Clear Delivery History"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Main Table / Delivery List */}
      <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'}`}>
        
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Mail className="w-10 h-10 text-slate-600 mx-auto opacity-40" />
            <h4 className="font-bold text-xs">No Delivery Status Records Found</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'All' 
                ? 'No reports match your current filter query. Try adjusting your search term or filter.'
                : 'No compliance reports have been dispatched yet. Draft and dispatch an email from the Compose tab!'}
            </p>
            {onTestDispatch && (
              <button
                onClick={onTestDispatch}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer mt-2 inline-flex items-center gap-2 ${accentClass}`}
              >
                <Zap className="w-3.5 h-3.5 text-yellow-300" /> Send Test Verification Report
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredReports.map((report) => {
              const isExpanded = expandedId === report.id;
              
              return (
                <div key={report.id} className="transition-all">
                  
                  {/* Summary Line */}
                  <div 
                    onClick={() => toggleExpand(report.id)}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-500/5 transition-all ${
                      report.status === 'Failed' && isDarkMode ? 'bg-rose-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      
                      {/* Status Icon */}
                      <div className="mt-0.5 shrink-0">
                        {report.status === 'Sent' && (
                          <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                        {report.status === 'Failed' && (
                          <div className="p-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                            <XCircle className="w-4 h-4" />
                          </div>
                        )}
                        {report.status === 'Pending' && (
                          <div className="p-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-4 h-4 animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Recipient & Subject */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-indigo-400 font-semibold truncate max-w-xs">
                            TO: {report.to}
                          </span>
                          {report.reportType && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {report.reportType}
                            </span>
                          )}
                          {report.fileRef && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-400 truncate max-w-[150px]">
                              {report.fileRef}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs truncate max-w-lg">{report.subject}</h4>

                        {/* Error Message Snippet */}
                        {report.status === 'Failed' && report.errorMessage && (
                          <p className="text-[10px] text-rose-400 font-mono truncate max-w-md flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{report.errorMessage}</span>
                          </p>
                        )}
                      </div>

                    </div>

                    {/* Right Meta & Actions */}
                    <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          report.status === 'Sent'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : report.status === 'Failed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {report.status}
                        </span>
                        <span className="text-[9px] text-slate-500 block font-mono mt-0.5">{report.timestamp}</span>
                      </div>

                      {/* Quick Retry Button */}
                      {(report.status === 'Failed' || report.status === 'Pending') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetry(report);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 transition-all shadow cursor-pointer"
                          title="Re-dispatch email report"
                        >
                          <RotateCcw className="w-3 h-3" /> Retry
                        </button>
                      )}

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(report.id);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-200"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                  </div>

                  {/* Expanded Detail Tray */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`p-4 border-t text-xs space-y-3 ${
                          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {/* Error Message Highlight Box */}
                        {report.status === 'Failed' && (
                          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-rose-400 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" /> Dispatch Exception Details
                              </span>
                              <button
                                onClick={() => handleCopyError(report.errorMessage || 'Unknown Error', report.id)}
                                className="text-[10px] text-rose-300 hover:text-rose-100 font-mono flex items-center gap-1 bg-rose-500/20 px-2 py-0.5 rounded cursor-pointer"
                              >
                                {copiedId === report.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedId === report.id ? 'Copied' : 'Copy Trace'}
                              </button>
                            </div>
                            <p className="font-mono text-[11px] text-rose-300 leading-relaxed bg-black/30 p-2.5 rounded-lg border border-rose-500/20 break-all">
                              {report.errorMessage || 'No detailed trace provided by mail transport.'}
                            </p>
                            <div className="text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-rose-500/20">
                              <span>Troubleshooting Tip: Verify recipient email syntax, check if Google OAuth scope includes `gmail.send`, or click Retry to dispatch via the integrated Compliance Gateway.</span>
                              <button
                                type="button"
                                onClick={() => onRetry(report)}
                                className="px-2.5 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" /> Retry Dispatch Now
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">Report Ref ID</span>
                            <span className="font-mono font-semibold">{report.id}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">Latency</span>
                            <span className="font-mono font-semibold">{report.latencyMs ? `${report.latencyMs} ms` : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">Retry Attempts</span>
                            <span className="font-mono font-semibold">{report.retryCount || 0}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">File Scope</span>
                            <span className="font-mono font-semibold truncate block">{report.fileRef || 'Global'}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
                          <span className="text-[10px] text-slate-500">Dispatched via Google Workspace OAuth API</span>
                          <div className="flex items-center gap-2">
                            {onDeleteReport && (
                              <button
                                onClick={() => onDeleteReport(report.id)}
                                className="px-2.5 py-1 rounded text-[10px] text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Remove Record
                              </button>
                            )}
                            {(report.status === 'Failed' || report.status === 'Pending') && (
                              <button
                                onClick={() => onRetry(report)}
                                className={`px-3 py-1 rounded text-[10px] font-bold text-white transition-all cursor-pointer flex items-center gap-1 ${accentClass}`}
                              >
                                <RotateCcw className="w-3 h-3" /> Re-dispatch Report Now
                              </button>
                            )}
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
