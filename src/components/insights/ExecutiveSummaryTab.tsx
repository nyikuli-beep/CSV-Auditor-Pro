import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  FileText, 
  Database, 
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { ExecutiveSummaryInsight } from '../../lib/ai/insightsEngine';
import EvidenceCard from './EvidenceCard';

interface ExecutiveSummaryTabProps {
  data: ExecutiveSummaryInsight;
  isDarkMode: boolean;
  onAskAuditor?: (prompt: string) => void;
}

export default function ExecutiveSummaryTab({ data, isDarkMode, onAskAuditor }: ExecutiveSummaryTabProps) {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
      case 'B':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800';
      case 'C':
        return 'text-amber-500 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';
      default:
        return 'text-rose-500 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Production Ready':
        return 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'Remediation Required':
        return 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      default:
        return 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Score, Grade & Readiness */}
      <div 
        className={`p-6 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Automated Audit Assessment
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(data.readinessStatus)}`}>
                {data.readinessStatus}
              </span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {data.headline}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated across {data.totalRecords.toLocaleString()} records and {data.totalColumns} attributes using deterministic profiler metrics.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Grade Badge */}
            <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border ${getGradeColor(data.healthGrade)}`}>
              <span className="text-2xl font-black">{data.healthGrade}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider">Grade</span>
            </div>

            {/* Score Box */}
            <div className="flex flex-col">
              <span className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none">
                {data.overallScore}
                <span className="text-lg text-slate-400 font-medium">/100</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Data Quality Score
              </span>
            </div>
          </div>
        </div>

        {/* Vital Metric Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Total Records</span>
            <span className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100">
              {data.totalRecords.toLocaleString()}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Total Issues</span>
            <span className={`text-lg font-mono font-bold ${data.totalIssues > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {data.totalIssues.toLocaleString()}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Duplicate Rate</span>
            <span className={`text-lg font-mono font-bold ${data.duplicateRate > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {data.duplicateRate.toFixed(1)}%
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Missing Cells</span>
            <span className={`text-lg font-mono font-bold ${data.missingRate > 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {data.missingRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Narrative Synthesis */}
      <div 
        className={`p-5 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-blue-50/40 border-blue-100'
        }`}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          Executive Synthesis
        </h3>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {data.narrative}
        </p>
      </div>

      {/* Strengths & Vulnerabilities Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <div 
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Verified Strengths ({data.keyStrengths.length})
          </h4>
          {data.keyStrengths.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No significant positive structural indicators detected.</p>
          ) : (
            <ul className="space-y-2">
              {data.keyStrengths.map((str, idx) => (
                <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Vulnerabilities */}
        <div 
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Key Vulnerabilities ({data.primaryVulnerabilities.length})
          </h4>
          {data.primaryVulnerabilities.length === 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Zero structural vulnerabilities identified in the active dataset.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.primaryVulnerabilities.map((vuln, idx) => (
                <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>{vuln}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Core Grounded Evidence Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
          <span>Traceable Metric Evidence</span>
          <span className="text-xs font-semibold text-slate-400 font-mono">
            {data.evidenceCards.length} Verified Anchors
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.evidenceCards.map(card => (
            <EvidenceCard 
              key={card.id} 
              item={card} 
              isDarkMode={isDarkMode} 
              onExecuteAction={onAskAuditor}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
