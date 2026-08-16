import React from 'react';
import { 
  TrendingUp, 
  PieChart, 
  Layers, 
  GitCommit, 
  ArrowRight,
  Database,
  Sparkles
} from 'lucide-react';
import { TrendsPatternsInsights } from '../../lib/ai/insightsEngine';
import EvidenceCard from './EvidenceCard';

interface TrendsPatternsTabProps {
  data: TrendsPatternsInsights;
  isDarkMode: boolean;
  onAskAuditor?: (prompt: string) => void;
}

export default function TrendsPatternsTab({ data, isDarkMode, onAskAuditor }: TrendsPatternsTabProps) {
  return (
    <div className="space-y-6">
      {/* Category Concentration Overview */}
      {data.categoricalDistributions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Categorical Class Concentration</span>
            <span className="text-xs font-semibold text-slate-400 font-mono">
              {data.categoricalDistributions.length} Columns Evaluated
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.categoricalDistributions.map(cat => (
              <div
                key={cat.column}
                className={`p-4 rounded-xl border space-y-3 ${
                  isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                    {cat.column}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    cat.distributionEntropy === 'concentrated'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300'
                  }`}>
                    {cat.distributionEntropy.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Distinct Classes</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {cat.uniqueCount} distinct values
                  </span>
                </div>

                {cat.dominantCategory && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 truncate">Top: "{cat.dominantCategory.name}"</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {cat.dominantCategory.percentage.toFixed(1)}% ({cat.dominantCategory.count.toLocaleString()} rows)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.min(cat.dominantCategory.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correlation Matrix Cards */}
      {data.correlations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Variable Cross-Correlations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.correlations.map((corr, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                  isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {corr.columnA} ↔ {corr.columnB}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Relationship: <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{corr.relationship}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-mono font-black text-blue-600 dark:text-blue-400">
                    {corr.coefficient >= 0 ? `+${corr.coefficient.toFixed(3)}` : corr.coefficient.toFixed(3)}
                  </div>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Pearson r</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend & Pattern Evidence Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Traceable Patterns & Trends
        </h3>
        {data.patternFindings.length === 0 && data.temporalPatterns.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed text-center border-slate-300 dark:border-slate-800">
            <TrendingUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Notable Longitudinal Trends</h4>
            <p className="text-xs text-slate-500 mt-1">Add datetime or numeric series columns to discover time-series patterns.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...data.temporalPatterns, ...data.patternFindings].map(item => (
              <EvidenceCard
                key={item.id}
                item={item}
                isDarkMode={isDarkMode}
                onExecuteAction={onAskAuditor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
