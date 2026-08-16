import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  FileCode, 
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';
import { DataQualityInsights } from '../../lib/ai/insightsEngine';
import EvidenceCard from './EvidenceCard';

interface DataQualityTabProps {
  data: DataQualityInsights;
  isDarkMode: boolean;
  onAskAuditor?: (prompt: string) => void;
  onNavigateClean?: () => void;
}

export default function DataQualityTab({ data, isDarkMode, onAskAuditor, onNavigateClean }: DataQualityTabProps) {
  return (
    <div className="space-y-6">
      {/* Overview Category Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Missing Values Card */}
        <div 
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Missing Values</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
              {data.missingValuesSummary.affectedColumnsCount} Cols
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {data.missingValuesSummary.totalMissingCells.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {data.missingValuesSummary.highestMissingColumn 
              ? `Highest in "${data.missingValuesSummary.highestMissingColumn.name}" (${data.missingValuesSummary.highestMissingColumn.percentage.toFixed(1)}%)`
              : 'All matrix cells are fully populated.'}
          </p>
        </div>

        {/* Duplicate Rows Card */}
        <div 
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Duplicate Records</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
              {data.duplicatesSummary.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {data.duplicatesSummary.duplicateRows.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {data.duplicatesSummary.duplicateRows > 0 
              ? 'Redundant rows detected across SHA-256 signatures.' 
              : 'Zero duplicate rows detected.'}
          </p>
        </div>

        {/* Formatting & Security Risks Card */}
        <div 
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Formatting & Security</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              data.formattingSummary.formulaRisks > 0 
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 border border-rose-300 dark:border-rose-800' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              {data.formattingSummary.formulaRisks > 0 ? 'Risk Detected' : 'Clean'}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {(data.formattingSummary.whitespaceIssues + data.formattingSummary.formulaRisks + data.formattingSummary.invalidTypeCells).toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {data.formattingSummary.formulaRisks} formula risks · {data.formattingSummary.whitespaceIssues} whitespace errors
          </p>
        </div>
      </div>

      {/* Hygiene Action Callout */}
      {onNavigateClean && (
        <div 
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            isDarkMode ? 'bg-blue-950/30 border-blue-900/60 text-blue-200' : 'bg-blue-50/70 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Automated Remediation Available</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Execute 1-click hygiene routines in the Hygiene Workspace to eliminate duplicates, whitespace, and nulls.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateClean}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Open Hygiene
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Detailed Quality Findings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Itemized Quality Findings
            </h3>
            <p className="text-xs text-slate-500">
              Every finding is mathematically validated against dataset records.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {data.findings.length} Quality Rules Evaluated
          </span>
        </div>

        {data.findings.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed text-center border-slate-300 dark:border-slate-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Zero Quality Issues Detected</h4>
            <p className="text-xs text-slate-500 mt-1">This dataset passes all standard schema and hygiene rules.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.findings.map(finding => (
              <EvidenceCard
                key={finding.id}
                item={finding}
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
