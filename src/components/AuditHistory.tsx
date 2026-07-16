import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { CSVFile } from '../types';

interface AuditHistoryProps {
  files: CSVFile[];
  onSelectFile: (file: CSVFile) => void;
  onNavigate: (tab: string) => void;
  isDarkMode: boolean;
  accentClass: string;
}

export default function AuditHistory({ files, onSelectFile, onNavigate, isDarkMode, accentClass }: AuditHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Workspace Archives
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Audit Archive</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Search, filter, and inspect previous spreadsheet evaluation logs and compliance history profiles.
        </p>
      </div>

      {/* Toolbar controls */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-center justify-between ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search files by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-950'}`}
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
            className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 font-semibold hover:bg-slate-800/40 transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" /> Sort Score
          </button>
          
          <button 
            onClick={() => toggleSort('date')}
            className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 font-semibold hover:bg-slate-800/40 transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" /> Sort Date
          </button>
        </div>
      </div>

      {/* History log list table */}
      <div className={`p-6 rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80 shadow-2xl shadow-blue-500/1' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <th className="p-4 font-semibold">File Name</th>
                <th className="p-4 font-semibold">Audited Date</th>
                <th className="p-4 font-semibold">File Size</th>
                <th className="p-4 font-semibold">Compliance Rating</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedFiles.map((file) => (
                <tr 
                  key={file.id}
                  className={`hover:bg-slate-800/10 transition-colors ${isDarkMode ? '' : 'hover:bg-slate-50/50'}`}
                >
                  <td className="p-4 font-bold flex items-center gap-2.5 truncate max-w-[240px]">
                    <FileSpreadsheet className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{file.name}</span>
                  </td>
                  <td className="p-4 text-slate-400 font-mono text-[10px]">{file.uploadedAt}</td>
                  <td className="p-4 text-slate-400 font-mono text-[10px]">
                    {file.size > 1024 * 1024 
                      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
                      : `${(file.size / 1024).toFixed(1)} KB`}
                  </td>
                  <td className="p-4">
                    {file.status === 'completed' ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${file.score > 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {file.score}%
                        </span>
                        <div className="w-16 bg-slate-700/20 rounded-full h-1">
                          <div className={`h-full rounded-full ${file.score > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${file.score}%` }}></div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Not available</span>
                    )}
                  </td>
                  <td className="p-4">
                    {file.status === 'completed' ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><AlertCircle className="w-3.5 h-3.5" /> Corrupted</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => {
                          onSelectFile(file);
                          onNavigate('results');
                        }}
                        className={`p-2 rounded-lg border hover:scale-105 transition-all text-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-850 hover:bg-slate-900' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
                        title="View Report"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => downloadHistoryReport(file)}
                        disabled={file.status !== 'completed'}
                        className={`p-2 rounded-lg border hover:scale-105 transition-all text-emerald-500 disabled:opacity-30 disabled:pointer-events-none ${isDarkMode ? 'bg-slate-950 border-slate-850 hover:bg-slate-900' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
                        title="Download Report"
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
    </div>
  );
}
