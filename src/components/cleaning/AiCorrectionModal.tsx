import { useState } from 'react';
import { X, Sparkles, Check, CheckCheck, Trash2, ShieldCheck, ArrowRight } from 'lucide-react';
import { CorrectionItem } from '../../lib/cleaning/aiCorrectionEngine';

interface AiCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CorrectionItem[];
  onApplyCorrections: (acceptedItems: CorrectionItem[]) => void;
  isDarkMode: boolean;
}

export default function AiCorrectionModal({
  isOpen,
  onClose,
  items,
  onApplyCorrections,
  isDarkMode
}: AiCorrectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(items.map(i => i.id)));

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleApply = () => {
    const accepted = items.filter((i) => selectedIds.has(i.id));
    onApplyCorrections(accepted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-4xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                AI Smart Data Correction Review
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {items.length} Candidates
                </span>
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Review spelling corrections, company/city/country standardizations, and abbreviation expansions with AI confidence ratings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className={`px-5 py-3 border-b flex items-center justify-between gap-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-100 bg-slate-50'}`}>
          <button
            onClick={toggleSelectAll}
            className="text-xs font-bold text-blue-500 hover:underline cursor-pointer flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            {selectedIds.size === items.length ? 'Deselect All' : 'Select All (' + items.length + ')'}
          </button>
          <span className="text-xs font-mono text-slate-400">
            Selected: <strong className="text-blue-500">{selectedIds.size}</strong> / {items.length}
          </span>
        </div>

        {/* Items List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {items.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No spelling errors or capitalization issues detected in this dataset.
            </div>
          ) : (
            items.map((item) => {
              const isChecked = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all ${
                    isChecked
                      ? isDarkMode
                        ? 'bg-blue-950/30 border-blue-600/50'
                        : 'bg-blue-50/60 border-blue-200'
                      : isDarkMode
                      ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase font-mono">
                          {item.category}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          Row {item.rowIndex + 1} · {item.columnName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono font-bold">
                        <span className="line-through text-rose-500/80">{item.originalValue}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-emerald-500 font-bold">{item.suggestedValue}</span>
                      </div>

                      <p className="text-[11px] text-slate-400">{item.reason}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {item.confidence}% Match
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={selectedIds.size === 0}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Apply {selectedIds.size} Corrections
          </button>
        </div>
      </div>
    </div>
  );
}
