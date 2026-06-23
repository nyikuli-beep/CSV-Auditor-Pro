import { useState } from 'react';
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
  Sparkles
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
  const [historyIndex, setHistoryIndex] = useState(0);
  const [appliedSteps, setAppliedSteps] = useState<string[]>([]);

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

  const pushState = (newRows: Record<string, string>[], stepLabel: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newRows);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setAppliedSteps(prev => [...prev.slice(0, historyIndex), stepLabel]);

    // Propagate up to central App file
    onUpdateFile({
      ...activeFile,
      cleanedRows: newRows,
      score: Math.min(100, activeFile.score + 5) // Boost score upon cleaning
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      onUpdateFile({
        ...activeFile,
        cleanedRows: history[historyIndex - 1]
      });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      onUpdateFile({
        ...activeFile,
        cleanedRows: history[historyIndex + 1]
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

  // Helper to check if a row value differs from original raw row (to highlight changes in preview)
  const isValueModified = (rowIndex: number, column: string, val: string) => {
    const originalRow = activeFile.rows[rowIndex];
    if (!originalRow) return false;
    return originalRow[column] !== val;
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-base">Live Dataset Preview</h3>
                <p className="text-xs text-slate-400 mt-0.5">Rows updated with active rules are highlighted in yellow/green.</p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider ${isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                {currentRows.length} Rows remaining
              </span>
            </div>

            {/* Responsive Comparison Table Container */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[420px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    <th className="p-3.5 font-bold font-mono">Row</th>
                    {activeFile.headers.map((header) => (
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
                        {activeFile.headers.map((col) => {
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
    </div>
  );
}
