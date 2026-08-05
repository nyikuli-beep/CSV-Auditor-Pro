import { useState } from 'react';
import { X, GitMerge, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { FuzzyDuplicatePair } from '../../lib/cleaning/fuzzyDuplicateEngine';

interface FuzzyDuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairs: FuzzyDuplicatePair[];
  onApplyFuzzyDeduplication: (strategy: 'merge' | 'keep_most_complete' | 'keep_newest', selectedPairs: FuzzyDuplicatePair[]) => void;
  isDarkMode: boolean;
}

export default function FuzzyDuplicateModal({
  isOpen,
  onClose,
  pairs,
  onApplyFuzzyDeduplication,
  isDarkMode
}: FuzzyDuplicateModalProps) {
  const [strategy, setStrategy] = useState<'merge' | 'keep_most_complete' | 'keep_newest'>('merge');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(pairs.map(p => p.id)));

  if (!isOpen) return null;

  const togglePair = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleExecute = () => {
    const selected = pairs.filter(p => selectedIds.has(p.id));
    onApplyFuzzyDeduplication(strategy, selected);
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
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Intelligent Fuzzy Duplicate Resolution
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {pairs.length} Similarity Pairs
                </span>
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Detects near-identical records (e.g., 'Jon Smith' vs 'John Smith') using Levenshtein distance & Jaro-Winkler similarity.
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

        {/* Resolution Strategy Chooser */}
        <div className={`p-4 border-b flex items-center justify-between gap-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Resolution Strategy:</span>
            <div className={`flex rounded-xl p-1 border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
              <button
                onClick={() => setStrategy('merge')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  strategy === 'merge' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Merge Non-Null
              </button>
              <button
                onClick={() => setStrategy('keep_most_complete')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  strategy === 'keep_most_complete' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Keep Most Complete
              </button>
              <button
                onClick={() => setStrategy('keep_newest')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  strategy === 'keep_newest' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Keep Newest
              </button>
            </div>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Selected: <strong className="text-blue-500">{selectedIds.size}</strong> pairs
          </span>
        </div>

        {/* Candidates List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {pairs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No fuzzy duplicate record pairs detected above 85% similarity threshold.
            </div>
          ) : (
            pairs.map((pair) => {
              const isChecked = selectedIds.has(pair.id);
              return (
                <div
                  key={pair.id}
                  onClick={() => togglePair(pair.id)}
                  className={`p-4 rounded-xl border space-y-2 cursor-pointer transition-all ${
                    isChecked
                      ? isDarkMode
                        ? 'bg-blue-950/30 border-blue-600/50'
                        : 'bg-blue-50/60 border-blue-200'
                      : isDarkMode
                      ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-blue-500">
                        Row #{pair.rowIndexA + 1} ↔ Row #{pair.rowIndexB + 1}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {pair.similarityScore}% Similarity Match
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">Record A (Row {pair.rowIndexA + 1})</span>
                      <p className="truncate text-slate-300">
                        {Object.entries(pair.rowA).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">Record B (Row {pair.rowIndexB + 1})</span>
                      <p className="truncate text-slate-300">
                        {Object.entries(pair.rowB).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                      </p>
                    </div>
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
            onClick={handleExecute}
            disabled={selectedIds.size === 0}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <GitMerge className="w-4 h-4" /> Resolve {selectedIds.size} Fuzzy Pairs ({strategy})
          </button>
        </div>
      </div>
    </div>
  );
}
