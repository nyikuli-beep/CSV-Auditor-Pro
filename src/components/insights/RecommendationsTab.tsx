import React, { useState } from 'react';
import { 
  Zap, 
  Copy, 
  Check, 
  ArrowRight, 
  Code2, 
  ShieldCheck, 
  Trash2, 
  HelpCircle,
  Database,
  Sparkles
} from 'lucide-react';
import { RecommendationsInsights } from '../../lib/ai/insightsEngine';

interface RecommendationsTabProps {
  data: RecommendationsInsights;
  isDarkMode: boolean;
  onAskAuditor?: (prompt: string) => void;
  onNavigateClean?: () => void;
}

export default function RecommendationsTab({ 
  data, 
  isDarkMode, 
  onAskAuditor, 
  onNavigateClean 
}: RecommendationsTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Immediate':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'Scheduled':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      default:
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div 
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0 border border-emerald-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Targeted Remediation & Quality Roadmap
            </h3>
            <p className="text-xs text-slate-500">
              Prioritized recommendations to elevate dataset reliability, eliminate formula threats, and prepare data for production.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Remediation Effort:</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            data.overallRemediationEffort === 'Low'
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 border-emerald-300'
              : data.overallRemediationEffort === 'Medium'
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 border-amber-300'
              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 border-rose-300'
          }`}>
            {data.overallRemediationEffort} Effort
          </span>
        </div>
      </div>

      {/* Priority Action Items */}
      {data.priorityActions.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed text-center border-slate-300 dark:border-slate-800">
          <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Remediation Actions Needed</h4>
          <p className="text-xs text-slate-500 mt-1">This dataset is production-ready and complies with all hygiene checks.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.priorityActions.map(action => (
            <div
              key={action.id}
              className={`p-5 rounded-2xl border transition-all ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUrgencyBadge(action.urgency)}`}>
                    {action.urgency}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">
                    {action.category}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {action.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    +{action.estimatedQualityGain} Score Gain
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                {action.description}
              </p>

              {/* Code Snippets Accordion */}
              {(action.sqlSnippet || action.pythonSnippet) && (
                <div className="space-y-2 mb-4">
                  {action.sqlSnippet && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                      <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-blue-500" />
                          PostgreSQL / SQL Remediation Script
                        </span>
                        <button
                          onClick={() => handleCopyCode(`${action.id}-sql`, action.sqlSnippet!)}
                          className="hover:text-blue-500 flex items-center gap-1 cursor-pointer font-sans"
                        >
                          {copiedId === `${action.id}-sql` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy SQL</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto whitespace-pre">
                        {action.sqlSnippet}
                      </pre>
                    </div>
                  )}

                  {action.pythonSnippet && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                      <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-amber-500" />
                          Python (Pandas) Pipeline
                        </span>
                        <button
                          onClick={() => handleCopyCode(`${action.id}-py`, action.pythonSnippet!)}
                          className="hover:text-amber-500 flex items-center gap-1 cursor-pointer font-sans"
                        >
                          {copiedId === `${action.id}-py` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Python</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto whitespace-pre">
                        {action.pythonSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-400">
                  Evidence: <span className="font-mono text-slate-700 dark:text-slate-300">{String(action.evidence.calculatedValue || action.evidence.analyticalMethod)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {onNavigateClean && (
                    <button
                      onClick={onNavigateClean}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clean in Workspace
                    </button>
                  )}
                  {onAskAuditor && (
                    <button
                      onClick={() => onAskAuditor(`How should I implement the remediation plan for: "${action.title}"?`)}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      Ask AI Assistant
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
