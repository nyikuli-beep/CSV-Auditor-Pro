import React from 'react';
import { 
  CheckCircle2, 
  Activity, 
  HelpCircle, 
  Sparkles, 
  Layers, 
  ArrowRight,
  Database,
  Search,
  Scale
} from 'lucide-react';
import { InsightCardItem } from '../../lib/ai/insightsEngine';

interface EvidenceCardProps {
  item: InsightCardItem;
  isDarkMode: boolean;
  onExecuteAction?: (actionText: string) => void;
}

export default function EvidenceCard({ item, isDarkMode, onExecuteAction }: EvidenceCardProps) {
  const getBadgeStyle = () => {
    switch (item.badgeType) {
      case 'verified':
        return isDarkMode 
          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' 
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'derived':
        return isDarkMode 
          ? 'bg-blue-950/60 text-blue-300 border-blue-800/80' 
          : 'bg-blue-50 text-blue-700 border-blue-200';
      case 'warning':
        return isDarkMode 
          ? 'bg-amber-950/60 text-amber-300 border-amber-800/80' 
          : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'review':
        return isDarkMode 
          ? 'bg-purple-950/60 text-purple-300 border-purple-800/80' 
          : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'success':
        return isDarkMode 
          ? 'bg-teal-950/60 text-teal-300 border-teal-800/80' 
          : 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return isDarkMode 
          ? 'bg-slate-800 text-slate-300 border-slate-700' 
          : 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getBadgeIcon = () => {
    switch (item.badgeType) {
      case 'verified':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'derived':
        return <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'warning':
        return <AlertIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'review':
        return <HelpCircle className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  const ev = item.evidence;

  return (
    <div 
      className={`p-4 rounded-xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/70 border-slate-800/90 text-slate-100 hover:border-slate-700' 
          : 'bg-white border-slate-200/90 text-slate-900 hover:border-slate-300 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {item.title}
        </h4>
        <span 
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1.5 shrink-0 ${getBadgeStyle()}`}
        >
          {getBadgeIcon()}
          {item.badge}
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
        {item.summary}
      </p>

      {/* Traceable Evidence Grid */}
      <div 
        className={`grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg text-[11px] mb-3 ${
          isDarkMode ? 'bg-slate-950/60 border border-slate-800/60' : 'bg-slate-50 border border-slate-100'
        }`}
      >
        {ev.column && (
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
              Column
            </span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate block">
              {ev.column}
            </span>
          </div>
        )}

        {ev.calculatedValue !== undefined && (
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
              Calculated Value
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 truncate block">
              {String(ev.calculatedValue)}
            </span>
          </div>
        )}

        {ev.percentage !== undefined && (
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
              Percentage
            </span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {ev.percentage.toFixed(1)}%
            </span>
          </div>
        )}

        {ev.affectedRowCount !== undefined && (
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
              Affected Rows
            </span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {ev.affectedRowCount.toLocaleString()}
            </span>
          </div>
        )}

        {ev.comparisonValue && (
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
              Comparison / Range
            </span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300 truncate block">
              {String(ev.comparisonValue)}
            </span>
          </div>
        )}

        {ev.timePeriod && (
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
              Time Period
            </span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300 truncate block">
              {ev.timePeriod}
            </span>
          </div>
        )}

        {ev.analyticalMethod && (
          <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Scale className="w-3 h-3 text-slate-400" />
              Method:
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {ev.analyticalMethod}
            </span>
          </div>
        )}
      </div>

      {item.actionableStep && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5">
            <ArrowRight className="w-3 h-3 text-blue-500 shrink-0" />
            {item.actionableStep}
          </span>
          {onExecuteAction && (
            <button
              onClick={() => onExecuteAction(item.actionableStep || item.summary)}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              Ask Auditor
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
