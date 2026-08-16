import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  Sparkles, 
  ArrowRight,
  Database,
  Calculator
} from 'lucide-react';
import { StatisticalInsights } from '../../lib/ai/insightsEngine';
import EvidenceCard from './EvidenceCard';

interface StatisticalTabProps {
  data: StatisticalInsights;
  isDarkMode: boolean;
  onAskAuditor?: (prompt: string) => void;
}

export default function StatisticalTab({ data, isDarkMode, onAskAuditor }: StatisticalTabProps) {
  const colKeys = Object.keys(data.columnProfiles);

  return (
    <div className="space-y-6">
      {/* Header Stat Bar */}
      <div 
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0 border border-blue-500/20">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Parametric Statistical Distributions
            </h3>
            <p className="text-xs text-slate-500">
              Calculated central tendency, dispersion, and quartile metrics across numeric columns.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <span>{data.numericColumnsCount} Numeric Columns Validated</span>
        </div>
      </div>

      {/* Column Statistical Profiles Table/Grid */}
      {colKeys.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed text-center border-slate-300 dark:border-slate-800">
          <BarChart3 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Numeric Columns Detected</h4>
          <p className="text-xs text-slate-500 mt-1">This dataset contains categorical, textual, or identifier data without continuous numeric scales.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {colKeys.map(colName => {
            const stats = data.columnProfiles[colName];
            return (
              <div
                key={colName}
                className={`p-5 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Metric Column</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {colName}
                    </h4>
                  </div>
                  {stats.skewnessDirection && stats.skewnessDirection !== 'symmetrical' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                      {stats.skewnessDirection}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Mean</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {stats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Median</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {stats.median.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Std Dev (σ)</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {stats.stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">IQR Fence</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {stats.iqr.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Min</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {stats.min.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Max</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {stats.max.toLocaleString()}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block font-semibold">Calculated Sum</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {stats.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {onAskAuditor && (
                  <button
                    onClick={() => onAskAuditor(`Analyze the statistical distribution of column "${colName}"`)}
                    className="w-full text-center py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Deep Dive in Auditor
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Notable Statistical Observations */}
      {data.notableFindings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Notable Distribution Observations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.notableFindings.map(finding => (
              <EvidenceCard
                key={finding.id}
                item={finding}
                isDarkMode={isDarkMode}
                onExecuteAction={onAskAuditor}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
