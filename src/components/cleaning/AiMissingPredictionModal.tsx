import { useState } from 'react';
import { X, Sparkles, Check, CheckCheck, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { PredictionItem } from '../../lib/cleaning/aiCorrectionEngine';

interface AiMissingPredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  predictions: PredictionItem[];
  onApplyPredictions: (acceptedItems: PredictionItem[]) => void;
  isDarkMode: boolean;
}

export default function AiMissingPredictionModal({
  isOpen,
  onClose,
  predictions,
  onApplyPredictions,
  isDarkMode
}: AiMissingPredictionModalProps) {
  const [minConfidence, setMinConfidence] = useState(80);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(predictions.filter((p) => p.confidence >= 80).map((p) => p.id))
  );

  if (!isOpen) return null;

  const filteredPredictions = predictions.filter((p) => p.confidence >= minConfidence);

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleApply = () => {
    const accepted = predictions.filter((p) => selectedIds.has(p.id));
    onApplyPredictions(accepted);
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
                AI Missing Value Contextual Imputation
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {predictions.length} Predictions
                </span>
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Contextually predicts missing departments, categories, countries, and currencies based on cross-column relational cues.
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

        {/* Confidence Filter Bar */}
        <div className={`p-4 border-b flex items-center justify-between gap-6 ${isDarkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3 flex-1">
            <SlidersHorizontal className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-xs font-bold text-slate-400 shrink-0">Confidence Threshold:</span>
            <input
              type="range"
              min="50"
              max="99"
              value={minConfidence}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMinConfidence(val);
                setSelectedIds(new Set(predictions.filter((p) => p.confidence >= val).map((p) => p.id)));
              }}
              className="w-full max-w-xs accent-blue-600 cursor-pointer"
            />
            <span className="px-2 py-1 text-xs font-mono font-bold rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
              ≥ {minConfidence}%
            </span>
          </div>

          <span className="text-xs font-mono text-slate-400 shrink-0">
            Selected: <strong className="text-blue-500">{selectedIds.size}</strong> predictions
          </span>
        </div>

        {/* Prediction Cards */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {filteredPredictions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No predictions meet the selected confidence threshold of ≥ {minConfidence}%. Try lowering the threshold slider.
            </div>
          ) : (
            filteredPredictions.map((pred) => {
              const isChecked = selectedIds.has(pred.id);
              return (
                <div
                  key={pred.id}
                  onClick={() => toggleItem(pred.id)}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all ${
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
                        <span className="text-xs font-bold text-blue-500">
                          Row {pred.rowIndex + 1} · Column '{pred.targetColumn}'
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono font-bold">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">[Blank]</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {pred.predictedValue}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        {pred.reasoning} (Source: {pred.sourceColumnsUsed.join(', ')})
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {pred.confidence}% Conf.
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
            <Check className="w-4 h-4" /> Impute {selectedIds.size} Values
          </button>
        </div>
      </div>
    </div>
  );
}
