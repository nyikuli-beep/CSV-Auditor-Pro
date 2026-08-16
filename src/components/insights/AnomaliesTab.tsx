import React from 'react';
import { 
  HelpCircle, 
  AlertCircle, 
  Info, 
  Scale, 
  Layers, 
  Sparkles, 
  ArrowRight,
  Database
} from 'lucide-react';
import { PotentialAnomaliesInsights } from '../../lib/ai/insightsEngine';
import EvidenceCard from './EvidenceCard';

interface AnomaliesTabProps {
  data: PotentialAnomaliesInsights;
  isDarkMode: boolean;
  onAskAuditor?: (prompt: string) => void;
}

export default function AnomaliesTab({ data, isDarkMode, onAskAuditor }: AnomaliesTabProps) {
  return (
    <div className="space-y-6">
      {/* Top Banner Metric */}
      <div 
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 shrink-0 border border-purple-500/20">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Potential Statistical Anomalies & Outliers
            </h3>
            <p className="text-xs text-slate-500">
              Identified deviations outside standard Tukey IQR fences (1.5x) or Z-score thresholds (|z| &gt; 3.0).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xl font-mono font-black text-purple-600 dark:text-purple-400 block leading-none">
              {data.totalPotentialAnomalies.toLocaleString()}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              Flagged Values ({data.anomalyRate.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Scientific Disclaimer Note */}
      <div 
        className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
          isDarkMode ? 'bg-purple-950/20 border-purple-900/40 text-purple-200' : 'bg-purple-50/60 border-purple-200 text-purple-900'
        }`}
      >
        <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Statistical Guidance: </span>
          {data.disclaimer}
        </div>
      </div>

      {/* Anomaly Items Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Items Requiring Review
            </h3>
            <p className="text-xs text-slate-500">
              Values located beyond parametric distribution boundaries.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {data.items.length} Records Flagged
          </span>
        </div>

        {data.items.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed text-center border-slate-300 dark:border-slate-800">
            <AlertCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Zero Extreme Outliers Detected</h4>
            <p className="text-xs text-slate-500 mt-1">All recorded numeric values fall within expected mathematical confidence intervals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.items.map(item => (
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
